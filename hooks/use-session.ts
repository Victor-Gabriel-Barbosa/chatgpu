import { useState, useEffect } from "react";
import { WebWorkerMLCEngine } from "@mlc-ai/web-llm";
import { ChatSession, Message, MessageMetrics } from "@/types/chat";
import { toast } from "sonner";
import { fileToPlainText } from "@/lib/fileToText";
import { db, CURRENT_CHAT_SETTING_KEY } from "@/db/database";
import { round } from "@/lib/utils"

/** Propriedades para inicialização do hook {@link useSession}. */
export interface UseSessionProps {
  /** Instância do motor WebLLM em Web Worker, ou `null` se ainda não inicializado. */
  engine: WebWorkerMLCEngine | null;

  /** Indica se o modelo foi carregado e está pronto para inferência. */
  isReady: boolean;
}

/**
 * Executa o streaming da resposta do assistente via WebLLM e atualiza as mensagens e métricas progressivamente.
 *
 * @remarks
 * Adiciona uma mensagem vazia com papel `assistant` ao histórico, consome o stream retornado
 * pelo motor MLC, calcula métricas de geração (como tokens por segundo e tempo até o primeiro token)
 * e persiste o resultado final no banco de dados local.
 *
 * @param engine - Instância ativa do motor Web Worker MLC.
 * @param chatHistory - Histórico de mensagens a ser enviado como contexto para o modelo.
 * @param chatId - Identificador do chat atual para persistência das mensagens.
 * @param setMessages - Função de atualização do estado local de mensagens.
 * @param updateChatMessages - Função responsável por atualizar as mensagens na lista de chats e no IndexedDB.
 * @param onSpeedUpdate - Callback opcional para notificar a velocidade atual de geração em tokens por segundo.
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

  const completion = await engine.chat.completions.create({
    stream: true,
    messages: chatHistory.map(({ role, content }) => ({ role, content })),
    stream_options: { include_usage: true },
  });

  const startTime = performance.now();
  let resp = "";
  let tokenCount = 0;
  let firstTokenTime: number | null = null;
  let metrics: MessageMetrics = {};

  const commit = (persist = false) => {
    setMessages((prev) => {
      const next = [...prev];
      next[next.length - 1] = { ...next[next.length - 1], content: resp, metrics };
      if (persist) updateChatMessages(chatId, next);
      return next;
    });
  };

  for await (const chunk of completion) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) {
      resp += delta;
      tokenCount++;
      firstTokenTime ??= performance.now();

      const elapsed = (performance.now() - firstTokenTime) / 1000;
      const liveSpeed = elapsed > 0.05 ? tokenCount / elapsed : undefined;

      metrics = {
        ...metrics,
        tokensPerSecond: round(liveSpeed),
        completionTokens: tokenCount,
        timeToFirstToken: round((firstTokenTime - startTime) / 1000, 2),
      };
      onSpeedUpdate?.(metrics.tokensPerSecond ?? null);
      commit();
    }

    if (chunk.usage) {
      const extra = chunk.usage.extra ?? {};
      metrics = {
        ...metrics,
        tokensPerSecond: round(extra.decode_tokens_per_s) ?? metrics.tokensPerSecond,
        prefillTokensPerSecond: round(extra.prefill_tokens_per_s),
        completionTokens: chunk.usage.completion_tokens ?? tokenCount,
        promptTokens: chunk.usage.prompt_tokens,
        totalTokens: chunk.usage.total_tokens,
      };
      onSpeedUpdate?.(metrics.tokensPerSecond ?? null);
    }
  }

  metrics.elapsedTime ??= round((performance.now() - startTime) / 1000, 2);
  commit(true);
}

/**
 * Gerencia o ciclo de vida, persistência e interações de sessões de chat com o modelo de IA.
 *
 * @remarks
 * O hook lida com:
 * - Carregamento e sincronização com o banco de dados IndexedDB via Dexie.
 * - Envio e edição de mensagens, incluindo leitura e formatação de arquivos anexados.
 * - Controle de inferência com streaming em tempo real, interrupção e cálculo de métricas.
 * - Gerenciamento de histórico de conversas (criação, seleção, renomeação, exclusão e exportação).
 *
 * @param props - Propriedades de inicialização do hook {@link UseSessionProps}.
 * @returns Objeto contendo os estados reativos e manipuladores de sessão de chat.
 */
export function useSession({ engine, isReady }: UseSessionProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState<number | null>(null);
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isSessionLoaded, setIsSessionLoaded] = useState(false);

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

  useEffect(() => {
    if (!isSessionLoaded) return;

    const persistCurrentChatId = async () => {
      try {
        if (currentChatId) {
          await db.settings.put({
            key: CURRENT_CHAT_SETTING_KEY,
            value: currentChatId,
          });
        } else await db.settings.delete(CURRENT_CHAT_SETTING_KEY);
      } catch (error) {
        console.error("Erro ao salvar sessão atual:", error);
      }
    };

    persistCurrentChatId();
  }, [currentChatId, isSessionLoaded]);

  /** Inicia uma nova conversa, limpando as mensagens exibidas e desmarcando o chat ativo. */
  const handleNewChat = () => {
    if (isGenerating) return;
    setMessages([]);
    setCurrentChatId(null);
  };

  /**
   * Altera o título de um chat e persiste a modificação no banco de dados.
   *
   * @param chatId - Identificador do chat a ser renomeado.
   * @param newTitle - Novo título a ser atribuído à conversa.
   */
  const handleRenameChat = (chatId: string, newTitle: string) => {
    setChats((prev) =>
      prev.map((chat) => chat.id === chatId ? { ...chat, title: newTitle } : chat),
    );

    db.chats.update(chatId, { title: newTitle }).catch((error: unknown) => {
      console.error("Erro ao renomear chat:", error);
      toast.error("Erro ao renomear chat");
    });
  };

  /**
   * Carrega as mensagens de uma conversa existente e a define como ativa.
   *
   * @param chatId - Identificador do chat a ser carregado.
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
   * Remove uma conversa do estado local e do banco de dados.
   *
   * @param chatId - Identificador do chat a ser excluído.
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
   * Exporta os dados da conversa em arquivo JSON, suportando download no navegador ou escrita nativa via Tauri.
   *
   * @param chatId - Identificador do chat a ser exportado.
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
   * Atualiza a lista de mensagens de um chat no estado local e persiste a alteração no banco de dados.
   *
   * @param chatId - Identificador do chat a ser atualizado.
   * @param newMessages - Nova lista de mensagens a ser associada ao chat.
   */
  const updateChatMessages = (chatId: string, newMessages: Message[]) => {
    setChats((prev) =>
      prev
        .map((chat) => chat.id === chatId ? { ...chat, messages: newMessages } : chat)
        .sort((a, b) => b.updatedAt - a.updatedAt),
    );

    db.chats.update(chatId, { messages: newMessages }).catch((error: unknown) => {
      console.error("Erro ao salvar mensagens do chat:", error);
      toast.error("Erro ao salvar mensagens do chat");
    });
  };

  /**
   * Envia uma nova mensagem do usuário, processando eventuais arquivos anexados e iniciando a inferência do modelo.
   *
   * @remarks
   * Converte arquivos anexados em texto plano delimitado por tags `<file>`, inicializa uma nova sessão
   * caso não haja chat ativo e gerencia o streaming da resposta do assistente.
   *
   * @param files - Lista opcional de arquivos anexados cujo conteúdo textual será incluído no prompt.
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
   * Edita uma mensagem do histórico, descartando as interações posteriores e solicitando nova resposta ao modelo.
   *
   * @param newContent - Novo texto da mensagem editada.
   * @param index - Posição da mensagem no histórico a ser editada.
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

  /** Interrompe imediatamente a geração de texto em andamento pelo modelo e salva o estado atual. */
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
