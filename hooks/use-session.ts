import { useState, useEffect } from "react";
import { WebWorkerMLCEngine } from "@mlc-ai/web-llm";
import { ChatSession, Message, MessageMetrics } from "@/types/chat";
import { toast } from "sonner";
import { fileToPlainText } from "@/lib/fileToText";
import { db, CURRENT_CHAT_SETTING_KEY } from "@/db/database";

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
 * Processa a resposta do assistente de forma iterativa, atualizando o estado das mensagens e métricas em tempo real.
 * @param engine Instância do motor de inferência.
 * @param chatHistory Histórico de mensagens do chat.
 * @param chatId Identificador da sessão de chat atual.
 * @param setMessages Função para atualizar o estado das mensagens.
 * @param updateChatMessages Função para atualizar as mensagens de uma sessão específica.
 * @param onSpeedUpdate Callback opcional para notificar a velocidade atual em tokens/s.
 * @returns Promise que resolve quando a resposta do assistente é completamente processada.
 */
async function streamAssistantReply(
  engine: WebWorkerMLCEngine,
  chatHistory: Message[],
  chatId: string,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  updateChatMessages: (id: string, msgs: Message[]) => void,
  onSpeedUpdate?: (speed: number | null) => void,
) {
  setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

  const cleanMessages = chatHistory.map(({ role, content }) => ({ role, content }));

  const completion = await engine.chat.completions.create({
    stream: true,
    messages: cleanMessages,
    stream_options: { include_usage: true },
  });

  let resp = "";
  const startTime = performance.now();
  let firstTokenTime: number | null = null;
  let tokenCount = 0;
  let latestTokensPerSec: number | undefined;
  let finalMetrics: MessageMetrics | undefined;

  for await (const chunk of completion) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) {
      resp += delta;
      tokenCount++;

      const now = performance.now();
      if (!firstTokenTime) {
        firstTokenTime = now;
      } else {
        const elapsedSec = (now - firstTokenTime) / 1000;
        if (elapsedSec > 0.05 && tokenCount > 1) {
          latestTokensPerSec = Number((tokenCount / elapsedSec).toFixed(1));
          onSpeedUpdate?.(latestTokensPerSec);
        }
      }

      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          ...next[next.length - 1],
          content: resp,
          metrics: {
            tokensPerSecond: latestTokensPerSec,
            completionTokens: tokenCount,
            timeToFirstToken: firstTokenTime ? Number(((firstTokenTime - startTime) / 1000).toFixed(2)) : undefined,
          },
        };
        return next;
      });
    }

    if (chunk.usage) {
      const {extra} = chunk.usage;
      const speed = extra?.decode_tokens_per_s
        ? Number(extra.decode_tokens_per_s.toFixed(1))
        : latestTokensPerSec;

      const ttft = extra?.time_to_first_token_s !== undefined
        ? Number(extra.time_to_first_token_s.toFixed(2))
        : (firstTokenTime ? Number(((firstTokenTime - startTime) / 1000).toFixed(2)) : undefined);

      finalMetrics = {
        tokensPerSecond: speed,
        completionTokens: chunk.usage.completion_tokens ?? tokenCount,
        promptTokens: chunk.usage.prompt_tokens,
        totalTokens: chunk.usage.total_tokens,
        elapsedTime: extra?.e2e_latency_s ? Number(extra.e2e_latency_s.toFixed(2)) : undefined,
        prefillTokensPerSecond: extra?.prefill_tokens_per_s
          ? Number(extra.prefill_tokens_per_s.toFixed(1))
          : undefined,
        timeToFirstToken: ttft,
      };

      if (speed !== undefined) {
        onSpeedUpdate?.(speed);
      }
    }
  }

  // Se a geração for finalizada ou interrompida antes do chunk.usage, computa as métricas calculadas
  if (!finalMetrics && tokenCount > 0) {
    const now = performance.now();
    const duration = firstTokenTime ? (now - firstTokenTime) / 1000 : (now - startTime) / 1000;
    const speed = duration > 0 ? Number((tokenCount / duration).toFixed(1)) : latestTokensPerSec;
    const ttft = firstTokenTime ? Number(((firstTokenTime - startTime) / 1000).toFixed(2)) : undefined;

    finalMetrics = {
      tokensPerSecond: speed,
      completionTokens: tokenCount,
      elapsedTime: Number(((now - startTime) / 1000).toFixed(2)),
      timeToFirstToken: ttft,
    };
  }

  setMessages((current) => {
    const updated = [...current];
    if (updated.length > 0 && finalMetrics) {
      updated[updated.length - 1] = {
        ...updated[updated.length - 1],
        content: resp,
        metrics: finalMetrics,
      };
    }
    updateChatMessages(chatId, updated);
    return updated;
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
  const [currentSpeed, setCurrentSpeed] = useState<number | null>(null);
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isSessionLoaded, setIsSessionLoaded] = useState(false);

  // Carrega as sessões de chat salvas e o chat atual do IndexedDB (via Dexie) ao montar o componente
  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      try {
        const savedChats = await db.chats
          .orderBy("updatedAt")
          .reverse()
          .toArray();
        const savedCurrentChatSetting = await db.settings.get(
          CURRENT_CHAT_SETTING_KEY,
        );

        if (!isMounted) return;

        setChats(savedChats);

        // Se houver um ID de chat salvo, sincroniza restaurando as mensagens e o ID atual
        const savedCurrentChatId = savedCurrentChatSetting?.value ?? null;
        if (savedCurrentChatId) {
          const activeChat = savedChats.find(
            (c: ChatSession) => c.id === savedCurrentChatId,
          );
          if (activeChat) {
            setCurrentChatId(savedCurrentChatId);
            setMessages(activeChat.messages);
          }
        }
      } catch (error: unknown) {
        console.error("Erro ao carregar sessões de chat salvas:", error);
        toast.error("Erro ao carregar sessões de chat salvas");
      } finally {
        if (isMounted) setIsSessionLoaded(true);
      }
    };

    loadSession();

    return () => {
      isMounted = false;
    };
  }, []);

  // Salva o ID do chat atual no IndexedDB sempre que ele mudar
  useEffect(() => {
    if (!isSessionLoaded) return;

    const persistCurrentChatId = async () => {
      try {
        if (currentChatId) {
          await db.settings.put({
            key: CURRENT_CHAT_SETTING_KEY,
            value: currentChatId,
          });
        } else {
          await db.settings.delete(CURRENT_CHAT_SETTING_KEY);
        }
      } catch (error) {
        console.error("Erro ao salvar sessão atual:", error);
      }
    };

    persistCurrentChatId();
  }, [currentChatId, isSessionLoaded]);

  // Cria uma nova sessão de chat, limpando as mensagens e resetando o estado atual.
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
      prev.map((chat) =>
        chat.id === chatId ? { ...chat, title: newTitle } : chat,
      ),
    );

    db.chats.update(chatId, { title: newTitle }).catch((error: unknown) => {
      console.error("Erro ao renomear chat:", error);
      toast.error("Erro ao renomear chat");
    });
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
  const deleteChat = (chatId: string) => {
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    if (currentChatId === chatId) handleNewChat();

    db.chats.delete(chatId).catch((error) => {
      console.error("Erro ao excluir chat:", error);
      toast.error("Erro ao excluir chat");
    });
  };

  /**
   * Exporta uma sessão de chat específica como um arquivo JSON.
   *
   * @param chatId Identificador do chat a ser exportado.
   */
  const exportChat = async (chatId: string) => {
    const chat = chats.find((c) => c.id === chatId);
    if (!chat) {
      toast.error("Chat não encontrado para exportação");
      return;
    }

    const chatData = JSON.stringify(chat, null, 2);
    const fileName = `${chat.title || "chat"}.json`;
    try {
      if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
        const { save } = await import("@tauri-apps/plugin-dialog");
        const { writeTextFile } = await import("@tauri-apps/plugin-fs");

        const filePath = await save({
          defaultPath: fileName,
          filters: [{ name: "JSON", extensions: ["json"] }],
        });

        if (!filePath) return;

        await writeTextFile(filePath, chatData);
      } else {
        const blob = new Blob([chatData], {
          type: "application/json",
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = fileName;
        link.click();

        URL.revokeObjectURL(url);
      }

      toast.success("Chat exportado com sucesso");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao exportar o chat");
    }
  };

  /**
   * Atualiza as mensagens de um chat específico reordenando com base na data de atualização.
   *
   * @param chatId Identificador do chat a ser atualizado.
   * @param newMessages Nova lista de mensagens do chat.
   */
  const updateChatMessages = (chatId: string, newMessages: Message[]) => {
    setChats((prev) =>
      prev
        .map((chat) =>
          chat.id === chatId ? { ...chat, messages: newMessages } : chat,
        )
        .sort((a, b) => b.updatedAt - a.updatedAt),
    );

    db.chats.update(chatId, { messages: newMessages }).catch((error: unknown) => {
      console.error("Erro ao salvar mensagens do chat:", error);
      toast.error("Erro ao salvar mensagens do chat");
    });
  };

  /**
   * Envia a entrada atual do usuário para o motor de IA e processa a resposta gerada de forma iterativa.
   * 
   * @param files Lista de arquivos anexados que serão incluídos na entrada do usuário.
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

    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: userMsg },
    ];
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

      db.chats.add(newChat).catch((error) => {
        console.error("Erro ao criar chat:", error);
        toast.error("Erro ao criar chat");
      });
    }

    const chatHistory = [...newMessages];

    try {
      setCurrentSpeed(null);
      await streamAssistantReply(
        engine,
        chatHistory,
        activeChatId,
        setMessages,
        updateChatMessages,
        setCurrentSpeed,
      );
    } catch (error) {
      console.error("Erro na inferência:", error);
      toast.error(`Erro na inferência: ${error}`);
    } finally {
      setIsGenerating(false);
      setCurrentSpeed(null);
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
      setCurrentSpeed(null);
      await streamAssistantReply(
        engine,
        chatHistory,
        currentChatId!,
        setMessages,
        updateChatMessages,
        setCurrentSpeed,
      );
    } catch (error) {
      console.error("Erro na inferência (edição):", error);
      toast.error(`Erro na inferência (edição): ${error}`);
    } finally {
      setIsGenerating(false);
      setCurrentSpeed(null);
    }
  };

  // Interrompe a geração da resposta da IA e salva o estado atual da conversa.
  const handleStop = () => {
    if (engine && isGenerating) {
      engine.interruptGenerate();
      setCurrentSpeed(null);
      if (currentChatId) updateChatMessages(currentChatId, messages);
    }
  };

  return {
    messages,
    input,
    setInput,
    isGenerating,
    currentSpeed,
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
