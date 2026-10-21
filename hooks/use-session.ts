import { useState, useEffect } from "react";
import { WebWorkerMLCEngine } from "@mlc-ai/web-llm";
import { ChatSession, Message, TextFile, type SendMessage } from "@/types/chat";
import { toast } from "sonner";
import { fileToMarkdown } from "@/lib/file-to-markdown";
import { db, CHAT_SETTING_KEY } from "@/db/database";
import { streamReply } from "@/lib/stream-reply";
import { downloadFile } from "@/lib/utils";

/** Propriedades para inicialização do hook {@link useSession}. */
export interface UseSessionProps {
  /** Instância do motor WebLLM em Web Worker, ou `null` se ainda não inicializado. */
  engine: WebWorkerMLCEngine | null;

  /** Indica se o modelo foi carregado e está pronto para inferência. */
  isReady: boolean;
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [speed, setSpeed] = useState<number | null>(null);
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [isSessionLoaded, setIsSessionLoaded] = useState(false);

  /** Carrega as sessões de chat salvas do banco de dados quando o hook é montado. */
  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      try {
        const savedChats = await db.chats
          .orderBy("updatedAt")
          .reverse()
          .toArray();
        const savedChatSetting = await db.settings.get(
          CHAT_SETTING_KEY,
        );

        if (!isMounted) return;

        setChats(savedChats);

        const savedChatId = savedChatSetting?.value ?? null;
        if (savedChatId) {
          const activeChat = savedChats.find(
            (c: ChatSession) => c.id === savedChatId,
          );
          if (activeChat) {
            setChatId(savedChatId);
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

  /** Persiste o chat ativo no banco de dados quando o hook é montado. */
  useEffect(() => {
    if (!isSessionLoaded) return;

    const persistCurrentChatId = async () => {
      try {
        if (chatId) {
          await db.settings.put({
            key: CHAT_SETTING_KEY,
            value: chatId,
          });
        } else await db.settings.delete(CHAT_SETTING_KEY);
      } catch (error) {
        console.error("Erro ao salvar sessão atual:", error);
      }
    };

    persistCurrentChatId();
  }, [chatId, isSessionLoaded]);

  /** Inicia uma nova conversa, limpando as mensagens exibidas e desmarcando o chat ativo. */
  const handleNewChat = () => {
    if (isGenerating) return;
    setMessages([]);
    setChatId(null);
  };

  /**
   * Altera o título de um chat e persiste a modificação no banco de dados.
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
   * @param chatId - Identificador do chat a ser carregado.
   */
  const loadChat = (chatId: string) => {
    if (isGenerating) return;
    const chat = chats.find((c) => c.id === chatId);
    if (chat) {
      setMessages(chat.messages);
      setChatId(chatId);
    }
  };

  /**
   * Remove uma conversa do estado local e do banco de dados.
   * @param chatId - Identificador do chat a ser excluído.
   */
  const deleteChat = (chatId: string) => {
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    if (chatId === chatId) handleNewChat();

    db.chats.delete(chatId).catch((error) => {
      console.error("Erro ao excluir chat:", error);
      toast.error("Erro ao excluir chat");
    });
  };

  /**
   * Exporta os dados da conversa em arquivo JSON.
   * @param chatId - Identificador do chat a ser exportado.
   */
  const exportChat = (chatId: string) => {
    const chat = chats.find((c) => c.id === chatId);

    if (!chat) {
      toast.error("Chat não encontrado para exportação");
      return;
    }

    try {
      downloadFile(
        `${chat.title || "chat"}.json`,
        JSON.stringify(chat, null, 2),
        "application/json"
      );
      toast.success("Chat exportado com sucesso");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao exportar o chat");
    }
  };

  /**
   * Atualiza a lista de mensagens de um chat no estado local e persiste a alteração no banco de dados.
   * @param chatId - Identificador do chat a ser atualizado.
   * @param newMessages - Nova lista de mensagens a ser associada ao chat.
   */
  const updateChatMessages = (chatId: string, newMessages: Message[]) => {
    const updatedAt = Date.now();

    setChats((prev) =>
      prev
        .map((chat) => chat.id === chatId ? { ...chat, messages: newMessages, updatedAt } : chat)
        .sort((a, b) => b.updatedAt - a.updatedAt),
    );

    db.chats.update(chatId, { messages: newMessages, updatedAt }).catch((error: unknown) => {
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
   * @param message - Mensagem do usuário a ser enviada ao modelo.
   */
  const handleSend = async (message: SendMessage) => {
    const { content, files } = message;

    if (engine == null || (!content.trim() && files?.length === 0)) return;

    const newMessage: Message = {
      role: "user",
      content: content.trim(),
    };

    if (files && files.length > 0) {
      await Promise.all(
        files.map(async (file) => {
          const markdown = await fileToMarkdown(file);
          newMessage.files = newMessage.files || [];
          newMessage.files.push({
            name: file.name,
            content: markdown
          });
        })
      );
    }

    const newMessages: Message[] = [
      ...messages,
      newMessage,
    ];
    setMessages(newMessages);
    setIsGenerating(true);

    let activeChatId = chatId;
    if (activeChatId) updateChatMessages(activeChatId, newMessages);
    else {
      activeChatId = Date.now().toString();
      setChatId(activeChatId);

      const title = newMessage.content?.trim() || newMessage.files?.[0]?.name || "Novo Chat";
      const newChat: ChatSession = {
        id: activeChatId,
        title: title.length > 50 ? title.slice(0, 47) + "..." : title,
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
      setSpeed(null);
      await streamReply(
        engine,
        chatHistory,
        activeChatId,
        setMessages,
        updateChatMessages,
        setSpeed,
      );
    } catch (error) {
      console.error("Erro na inferência:", error);
      toast.error(`Erro na inferência: ${error}`);
    } finally {
      setIsGenerating(false);
      setSpeed(null);
    }
  };

  /**
   * Edita uma mensagem do histórico, descartando as interações posteriores e solicitando nova resposta ao modelo.
   * @param newContent - Novo texto da mensagem editada.
   * @param index - Posição da mensagem no histórico a ser editada.
   * @param files - Arquivos anexados à mensagem editada.
   */
  const handleEdit = async (newContent: string, index: number, files?: TextFile[]) => {
    if (isGenerating || !engine || !isReady) return;

    const updatedMessages = messages.slice(0, index);
    updatedMessages.push({ role: "user", content: newContent.trim(), files: files || [] });

    setMessages(updatedMessages);
    setIsGenerating(true);

    if (chatId) updateChatMessages(chatId, updatedMessages);

    const chatHistory = [...updatedMessages];

    try {
      setSpeed(null);
      await streamReply(
        engine,
        chatHistory,
        chatId!,
        setMessages,
        updateChatMessages,
        setSpeed,
      );
    } catch (error) {
      console.error("Erro na inferência (edição):", error);
      toast.error(`Erro na inferência (edição): ${error}`);
    } finally {
      setIsGenerating(false);
      setSpeed(null);
    }
  };

  /** Interrompe imediatamente a geração de texto em andamento pelo modelo e salva o estado atual. */
  const handleStop = () => {
    if (engine && isGenerating) {
      engine.interruptGenerate();
      setSpeed(null);
      if (chatId) updateChatMessages(chatId, messages);
    }
  };

  return {
    messages,
    isGenerating,
    speed,
    chats,
    chatId,
    handleNewChat,
    handleRenameChat,
    loadChat,
    deleteChat,
    exportChat,
    handleSend,
    handleEdit,
    handleStop,
  };
}
