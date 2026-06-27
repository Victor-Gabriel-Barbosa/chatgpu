import { useState, useEffect } from "react";
import { WebWorkerMLCEngine } from "@mlc-ai/web-llm";
import { ChatSession, Message } from "@/types/chat";
import { toast } from "sonner";

interface UseSessionProps {
  engine: WebWorkerMLCEngine | null;
  isReady: boolean;
}

// Gerencia o estado e a lógica de uma sessão de chat
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

  // Cria uma nova sessão de chat, limpando as mensagens e resetando o estado atual
  const handleNewChat = () => {
    if (isGenerating) return;
    setMessages([]);
    setCurrentChatId(null);
  };

  // Renomeia uma sessão de chat específica, atualizando o título do chat correspondente
  const handleRenameChat = (chatId: string, newTitle: string) => {
    setChats((prev) =>
      prev.map((chat) => (chat.id === chatId ? { ...chat, title: newTitle } : chat))
    );
  };

  // Carrega uma sessão de chat específica, definindo as mensagens e o chat atual com base no ID fornecido
  const loadChat = (chatId: string) => {
    if (isGenerating) return;
    const chat = chats.find((c) => c.id === chatId);
    if (chat) {
      setMessages(chat.messages);
      setCurrentChatId(chatId);
    }
  };

  // Exclui uma sessão de chat específica, removendo-a da lista de chats e, se for a sessão atual, criando uma nova sessão vazia
  const deleteChat = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    if (currentChatId === chatId) handleNewChat();
  };

  // Atualiza as mensagens de um chat específico, garantindo que a lista de chats seja reordenada com base na data de atualização
  const updateChatMessages = (chatId: string, newMessages: Message[]) => {
    setChats((prev) =>
      prev
        .map((chat) => (chat.id === chatId ? { ...chat, messages: newMessages } : chat))
        .sort((a, b) => b.updatedAt - a.updatedAt)
    );
  };

  // Exibe um toast de carregamento com progresso, atualizando o texto e a porcentagem conforme o progresso é reportado
  const handleSend = async () => {
    if (!input.trim() || !engine || !isReady) return;

    const userMsg = input;
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
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const completion = await engine.chat.completions.create({
        stream: true,
        messages: chatHistory,
      });

      let resp = "";

      for await (const chunk of completion) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          resp += delta;
          setMessages((prev) => {
            const newMsgList = [...prev];
            const lastIndex = newMsgList.length - 1;
            newMsgList[lastIndex] = { ...newMsgList[lastIndex], content: resp };
            return newMsgList;
          });
        }
      }

      setMessages((currentMessages) => {
        updateChatMessages(activeChatId, currentMessages);
        return currentMessages;
      });
    } catch (error) {
      console.error("Erro na inferência:", error);
      toast.error(`Erro na inferência: ${error}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Edita uma mensagem do usuário, descartando as respostas posteriores e gerando uma nova resposta da IA
  const handleSubmitEdit = async (newContent: string, index: number) => {
    if (isGenerating || !engine || !isReady) return;

    const updatedMessages = messages.slice(0, index);
    updatedMessages.push({ role: "user", content: newContent });

    setMessages(updatedMessages);
    setIsGenerating(true);

    if (currentChatId) updateChatMessages(currentChatId, updatedMessages);

    const chatHistory = [...updatedMessages];
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const completion = await engine.chat.completions.create({
        stream: true,
        messages: chatHistory,
      });

      let resp = "";

      for await (const chunk of completion) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          resp += delta;
          setMessages((prev) => {
            const newMsgList = [...prev];
            const lastIndex = newMsgList.length - 1;
            newMsgList[lastIndex] = { ...newMsgList[lastIndex], content: resp };
            return newMsgList;
          });
        }
      }

      setMessages((currentMessages) => {
        updateChatMessages(currentChatId as string, currentMessages);
        return currentMessages;
      });
    } catch (error) {
      console.error("Erro na inferência (edição):", error);
      toast.error(`Erro na inferência (edição): ${error}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Interrompe a geração da resposta da IA e salva o estado atual da conversa
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
    handleSend,
    handleSubmitEdit,
    handleStop,
  };
}