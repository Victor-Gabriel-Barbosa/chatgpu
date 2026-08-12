import { useState, useEffect } from "react";
import { WebWorkerMLCEngine } from "@mlc-ai/web-llm";
import { ChatSession, Message } from "@/types/chat";
import { toast } from "sonner";
import { fileToPlainText } from "@/lib/fileToText";

/**
 * Propriedades para inicialização do hook useSession.
 */
export interface UseSessionProps {
  /** Instância do motor WebGPU responsável pela inferência. */
  engine: WebWorkerMLCEngine | null;
  /** Indica se o motor de IA está carregado e pronto para uso. */
  isReady: boolean;
}

/**
 * Processa a resposta do assistente de forma iterativa, atualizando o estado das mensagens em tempo real.
 * @param engine Instância do motor de inferência.
 * @param chatHistory Histórico de mensagens do chat.
 * @param chatId Identificador da sessão de chat atual.
 * @param setMessages Função para atualizar o estado das mensagens.
 * @param updateChatMessages Função para atualizar as mensagens de uma sessão específica.
 * @returns Promise que resolve quando a resposta do assistente é completamente processada.
 */
async function streamAssistantReply(
  engine: WebWorkerMLCEngine,
  chatHistory: Message[],
  chatId: string,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  updateChatMessages: (id: string, msgs: Message[]) => void,
) {
  setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
  const completion = await engine.chat.completions.create({ stream: true, messages: chatHistory });
  let resp = "";
  for await (const chunk of completion) {
    const delta = chunk.choices[0]?.delta?.content;
    if (!delta) continue;
    resp += delta;
    setMessages((prev) => {
      const next = [...prev];
      next[next.length - 1] = { ...next[next.length - 1], content: resp };
      return next;
    });
  }
  setMessages((current) => {
    updateChatMessages(chatId, current);
    return current;
  });
}

/**
 * Gerencia o estado e a lógica de uma sessão de chat.
 *
 * @param props Propriedades do hook.
 * @param props.engine Instância do motor de IA.
 * @param props.isReady Estado que indica se o motor está carregado.
 * @returns Objeto contendo as mensagens, estado do chat e funções de manipulação.
 */
export function useSession({ engine, isReady }: UseSessionProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  // Carrega as sessões de chat salvas e o chat atual do localStorage ao montar o componente
  useEffect(() => {
    const savedChats = localStorage.getItem("chatgpu-sessions");
    const savedCurrentChatId = localStorage.getItem("chatgpu-current-session");

    if (savedChats) {
      try {
        const parsedChats: ChatSession[] = JSON.parse(savedChats);

        Promise.resolve().then(() => {
          setChats(parsedChats);

          // Se houver um ID de chat salvo, sincroniza restaurando as mensagens e o ID atual
          if (savedCurrentChatId) {
            const activeChat = parsedChats.find((c) => c.id === savedCurrentChatId);
            if (activeChat) {
              setCurrentChatId(savedCurrentChatId);
              setMessages(activeChat.messages);
            }
          }
        });
      } catch (error) {
        console.error("Erro ao carregar sessões de chat salvas:", error);
        toast.error("Erro ao carregar sessões de chat salvas");
      }
    }
  }, []);

  // Salva as sessões de chat no localStorage sempre que elas mudarem
  useEffect(() => {
    localStorage.setItem("chatgpu-sessions", JSON.stringify(chats));
  }, [chats]);

  // Salva o ID do chat atual no localStorage sempre que ele mudar
  useEffect(() => {
    if (currentChatId) localStorage.setItem("chatgpu-current-session", currentChatId);
    else localStorage.removeItem("chatgpu-current-session");
  }, [currentChatId]);

  /**
   * Cria uma nova sessão de chat, limpando as mensagens e resetando o estado atual.
   */
  const handleNewChat = () => {
    if (isGenerating) return;
    setMessages([]);
    setCurrentChatId(null);
  };

  /**
   * Renomeia uma sessão de chat específica, atualizando o título do chat correspondente.
   *
   * @param chatId Identificador do chat a ser renomeado.
   * @param newTitle Novo título para o chat.
   */
  const handleRenameChat = (chatId: string, newTitle: string) => {
    setChats((prev) =>
      prev.map((chat) => (chat.id === chatId ? { ...chat, title: newTitle } : chat))
    );
  };

  /**
   * Carrega uma sessão de chat específica, definindo as mensagens e o chat atual com base no ID fornecido.
   *
   * @param chatId Identificador do chat a ser carregado.
   */
  const loadChat = (chatId: string) => {
    if (isGenerating) return;
    const chat = chats.find((c) => c.id === chatId);
    if (chat) {
      setMessages(chat.messages);
      setCurrentChatId(chatId);
    }
  };

  /**
   * Exclui uma sessão de chat específica, removendo-a da lista de chats e, se for a sessão atual, criando uma nova sessão vazia.
   *
   * @param e Evento de clique do mouse.
   * @param chatId Identificador do chat a ser excluído.
   */
  const deleteChat = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    if (currentChatId === chatId) handleNewChat();
  };

  /**
   * Exporta uma sessão de chat específica como um arquivo JSON.
   *
   * @param chatId Identificador do chat a ser exportado.
   */
  const exportChat = (chatId: string) => {
    const chat = chats.find((c) => c.id === chatId);
    if (!chat) {
      toast.error("Chat não encontrado para exportação");
      return;
    }

    const chatData = JSON.stringify(chat, null, 2);
    const blob = new Blob([chatData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${chat.title || "chat"}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  /**
   * Atualiza as mensagens de um chat específico reordenando com base na data de atualização.
   *
   * @param chatId Identificador do chat a ser atualizado.
   * @param newMessages Nova lista de mensagens do chat.
   */
  const updateChatMessages = (chatId: string, newMessages: Message[]) => {
    setChats((prev) =>
      prev
        .map((chat) => (chat.id === chatId ? { ...chat, messages: newMessages } : chat))
        .sort((a, b) => b.updatedAt - a.updatedAt)
    );
  };

  /**
   * Envia a entrada atual do usuário para o motor de IA e processa a resposta gerada de forma iterativa.
   */
  const handleSend = async (files: File[] = []) => {
    if (engine == null || (!input.trim() && files.length === 0)) return;

    let prompt = input;

    if (files.length > 0) {
      prompt += "\n\n";

      for (const file of files) {
        try {
          const textContent = await fileToPlainText(file);
          prompt += `<file name="${file.name}">\n${textContent}\n</file>\n`;
        } catch (error) {
          console.error(`Erro ao ler o arquivo ${file.name}`, error);
          toast.error(`Erro ao ler o arquivo ${file.name}`);
        }
      }
    }

    const userMsg = prompt;
    setInput("");

    const newMessages: Message[] = [...messages, { role: "user", content: userMsg }];
    setMessages(newMessages);
    setIsGenerating(true);

    let activeChatId = currentChatId;

    if (activeChatId) updateChatMessages(activeChatId, newMessages);
    else {
      activeChatId = Date.now().toString();
      setCurrentChatId(activeChatId);

      const newTitle = userMsg.slice(0, 30) + (userMsg.length > 30 ? "..." : "");
      const newChat: ChatSession = {
        id: activeChatId,
        title: newTitle,
        messages: newMessages,
        updatedAt: Date.now(),
      };

      setChats((prev) => [newChat, ...prev]);
    }

    const chatHistory = [...newMessages];

    try {
      await streamAssistantReply(engine, chatHistory, activeChatId, setMessages, updateChatMessages);
    } catch (error) {
      console.error("Erro na inferência:", error);
      toast.error(`Erro na inferência: ${error}`);
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Edita uma mensagem do usuário, descartando as respostas posteriores e gerando uma nova resposta da IA.
   *
   * @param newContent Novo conteúdo da mensagem editada.
   * @param index Índice da mensagem a ser editada no histórico.
   */
  const handleSubmitEdit = async (newContent: string, index: number) => {
    if (isGenerating || !engine || !isReady) return;

    const updatedMessages = messages.slice(0, index);
    updatedMessages.push({ role: "user", content: newContent });

    setMessages(updatedMessages);
    setIsGenerating(true);

    if (currentChatId) updateChatMessages(currentChatId, updatedMessages);

    const chatHistory = [...updatedMessages];

    try {
      await streamAssistantReply(engine, chatHistory, currentChatId!, setMessages, updateChatMessages);
    } catch (error) {
      console.error("Erro na inferência (edição):", error);
      toast.error(`Erro na inferência (edição): ${error}`);
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Interrompe a geração da resposta da IA e salva o estado atual da conversa.
   */
  const handleStop = () => {
    if (engine && isGenerating) {
      engine.interruptGenerate();
      if (currentChatId) updateChatMessages(currentChatId, messages);
    }
  };

  return {
    messages,
    input,
    setInput,
    isGenerating,
    chats,
    currentChatId,
    handleNewChat,
    handleRenameChat,
    loadChat,
    deleteChat,
    exportChat,
    handleSend,
    handleSubmitEdit,
    handleStop,
  };
}
