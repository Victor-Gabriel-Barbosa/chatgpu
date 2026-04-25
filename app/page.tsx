"use client";

import { useState, useEffect, useRef } from "react";
import { WebWorkerMLCEngine, InitProgressReport } from "@mlc-ai/web-llm";
import type { ChatCompletionMessageParam } from "@mlc-ai/web-llm";
import { SendHorizontal, Plus, Square, PanelLeft } from "lucide-react";
import Image from "next/image";
import { ChatSession } from "./types/chat";
import { ChatMessage } from "./components/ChatMessage";
import { Sidebar } from './components/Sidebar';
import { SettingsModal } from './components/SettingsModal';
import { SUPPORTED_MODELS, DEFAULT_MODEL_ID } from "./constants/models";

export default function ChatInterface() {
  // Estados principais do chat, modelo, UI e controle de execução
  const [engine, setEngine] = useState<WebWorkerMLCEngine | null>(null);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL_ID);
  const [messages, setMessages] = useState<ChatCompletionMessageParam[]>([]);
  const [input, setInput] = useState("");
  const [progressText, setProgressText] = useState("Inicializando motor WebGPU...");
  const [isReady, setIsReady] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [theme, setTheme] = useState('system');

  // Referências para controle da textarea e scroll automático das mensagens
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Carrega as sessões de chat salvas do localStorage ao iniciar o componente
  useEffect(() => {
    const savedChats = localStorage.getItem("chatgpu-sessions");

    if (savedChats) {
      try {
        const parsedChats = JSON.parse(savedChats);
        Promise.resolve().then(() => setChats(parsedChats));
      } catch (error) {
        console.error("Erro ao carregar sessões de chat salvas:", error);
      }
    }
  }, []);

  // Carrega o tema salvo do localStorage e aplica a classe de tema ao elemento raiz
  useEffect(() => {
    const savedTheme = localStorage.getItem("chatgpu-theme") as "light" | "dark" | "system" | null;
    if (savedTheme) {
      Promise.resolve().then(() => setTheme(savedTheme));
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    }
  }, []);

  // Aplica a classe de tema ao elemento raiz e salva a preferência no localStorage sempre que o tema mudar
  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const isDark = theme === 'dark' || (theme === 'system' && media.matches);
      root.classList.toggle('dark', isDark);
    };

    applyTheme();
    localStorage.setItem("chatgpu-theme", theme);

    media.addEventListener('change', applyTheme);
    return () => media.removeEventListener('change', applyTheme);
  }, [theme]);

  // Carrega o modelo selecionado do localStorage ao iniciar o componente
  useEffect(() => {
    const savedModel = localStorage.getItem("chatgpu-model");
    if (savedModel) Promise.resolve().then(() => setSelectedModel(savedModel));
  }, []);

  // Salva o modelo selecionado no localStorage sempre que ele mudar
  useEffect(() => {
    if (selectedModel) localStorage.setItem("chatgpu-model", selectedModel);
  }, [selectedModel]);

  // Salva as sessões de chat no localStorage sempre que elas mudarem
  useEffect(() => {
    localStorage.setItem("chatgpu-sessions", JSON.stringify(chats));
  }, [chats]);

  // Inicializa o motor de inferência usando um Web Worker e carrega o modelo selecionado
  useEffect(() => {
    let worker: Worker;

    const initEngine = async () => {
      worker = new Worker(new URL("../lib/worker.ts", import.meta.url), {
        type: "module",
      });

      // Cria uma nova instância do motor usando o Web Worker
      const newEngine = new WebWorkerMLCEngine(worker);

      // Configura o callback de progresso para atualizar o texto de status
      newEngine.setInitProgressCallback((report: InitProgressReport) => {
        setProgressText(report.text);
      });

      // Tenta carregar o modelo e atualiza o status de pronto ou erro
      try {
        await newEngine.reload(selectedModel);
        setEngine(newEngine);
        setIsReady(true);
        setProgressText("Pronto!");
      } catch (error) {
        console.error("Erro ao carregar o modelo:", error);
        setProgressText("Erro ao carregar o WebGPU. Verifique suporte no navegador.");
      }
    };

    initEngine();

    return () => {
      if (worker) worker.terminate();
    };
  }, [selectedModel]);

  // Scroll suave até o final das mensagens
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Rola automaticamente para o final quando as mensagens mudam ou o chat atual é trocado
  useEffect(() => {
    scrollToBottom();
  }, [messages.length, currentChatId]);

  // Ajusta a altura do textarea conforme o conteúdo
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  // Lida com a mudança de modelo, reinicializando o motor e atualizando o status
  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    setIsReady(false);
    setProgressText("Inicializando novo modelo...");
    setEngine(null);
  };

  // Copia o conteúdo de uma mensagem para a área de transferência
  const handleCopyMessage = (content: string, index: number) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageIndex(index);
    setTimeout(() => setCopiedMessageIndex(null), 2000);
  };

  // Inicia um novo chat limpando as mensagens
  const handleNewChat = () => {
    if (isGenerating) return;
    setMessages([]);
    setCurrentChatId(null);
  };

  // Renomeia uma sessão de chat específica
  const handleRenameChat = (chatId: string, newTitle: string) => {
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === chatId ? { ...chat, title: newTitle } : chat
      )
    );
  };

  // Lida com a edição de uma mensagem do usuário, atualizando o histórico e gerando uma nova resposta do modelo
  const handleSubmitEdit = async (newContent: string, index: number) => {
    if (isGenerating || !engine || !isReady) return;

    // Corta o histórico até a mensagem editada (excluindo as mensagens da IA que vieram depois)
    const updatedMessages = messages.slice(0, index);

    // Adiciona a mensagem editada com o novo conteúdo
    updatedMessages.push({ role: "user", content: newContent });

    setMessages(updatedMessages);
    setIsGenerating(true);

    if (currentChatId) updateChatMessages(currentChatId, updatedMessages);

    // Prepara para gerar a nova resposta
    const chatHistory = [...updatedMessages];
    setMessages(prev => [...prev, { role: "assistant", content: "" }]);

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
          setMessages(prev => {
            const newMsgList = [...prev];
            const lastIndex = newMsgList.length - 1;
            newMsgList[lastIndex] = { ...newMsgList[lastIndex], content: resp };
            return newMsgList;
          });
        }
      }

      setMessages(currentMessages => {
        updateChatMessages(currentChatId as string, currentMessages);
        return currentMessages;
      });
    } catch (error) {
      console.error("Erro na inferência (edição):", error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Carrega uma sessão de chat existente selecionada
  const loadChat = (chatId: string) => {
    if (isGenerating) return;
    const chat = chats.find((c) => c.id === chatId);
    if (chat) {
      setMessages(chat.messages);
      setCurrentChatId(chatId);
    }
  };

  // Exclui uma sessão de chat e limpa a área de mensagens se o chat atual for excluído
  const deleteChat = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    if (currentChatId === chatId) handleNewChat();
  };

  // Atualiza as mensagens de uma sessão de chat específica e ordena as sessões por data de atualização
  const updateChatMessages = (chatId: string, newMessages: ChatCompletionMessageParam[]) => {
    setChats((prev) =>
      prev.map((chat) => (chat.id === chatId ? { ...chat, messages: newMessages } : chat)).sort((a, b) => b.updatedAt - a.updatedAt)
    );
  };

  // Lida com o envio de mensagens
  const handleSend = async () => {
    if (!input.trim() || !engine || !isReady) return;

    const userMsg = input;
    setInput("");

    const newMessages: ChatCompletionMessageParam[] = [...messages, { role: "user", content: userMsg }];
    setMessages(newMessages);
    setIsGenerating(true);

    let activeChatId = currentChatId;

    // Se não há chat ativo, cria um novo
    if (!activeChatId) {
      activeChatId = Date.now().toString();
      setCurrentChatId(activeChatId);

      const newTitle = userMsg.slice(0, 30) + (userMsg.length > 30 ? "..." : "");
      const newChat: ChatSession = {
        id: activeChatId,
        title: newTitle,
        messages: newMessages,
        updatedAt: Date.now()
      };

      setChats(prev => [newChat, ...prev]);
    } else updateChatMessages(activeChatId, newMessages);

    // Prepara o histórico de mensagens para enviar ao modelo
    const chatHistory = [...newMessages];

    // Adiciona uma mensagem de assistente vazia para começar a resposta
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    // Solicita uma resposta do modelo com streaming
    try {
      const completion = await engine.chat.completions.create({
        stream: true,
        messages: chatHistory,
      });

      let resp = "";

      // Itera sobre os chunks de resposta à medida que chegam
      for await (const chunk of completion) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          resp += delta;

          // Atualiza a última mensagem do assistente com o conteúdo recebido até agora
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastIndex = newMessages.length - 1;
            newMessages[lastIndex] = { ...newMessages[lastIndex], content: resp };
            return newMessages;
          });
        }
      }

      // Após a conclusão, garante que a mensagem final esteja atualizada e salva o histórico
      setMessages(currentMessages => {
        updateChatMessages(activeChatId as string, currentMessages);
        return currentMessages;
      });
    } catch (error) {
      console.error("Erro na inferência:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Interrompe a geração atual do modelo
  const handleStop = () => {
    if (engine && isGenerating) {
      engine.interruptGenerate();

      if (currentChatId) updateChatMessages(currentChatId, messages);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      {/* Barra Lateral */}
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        chats={chats}
        currentChatId={currentChatId}
        setCurrentChatId={loadChat}
        createNewChat={handleNewChat}
        deleteChat={deleteChat}
        renameChat={handleRenameChat}
        setSettingsOpen={setIsSettingsOpen}
        theme={theme}
        setTheme={setTheme}
      />

      {/* Área Principal */}
      <main id="main-chat-area" className="flex-1 flex flex-col relative">
        <div className="md:hidden flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-950 z-10 transition-colors duration-200">
          <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 transition-colors">
            <PanelLeft size={20} />
          </button>
          <span className="font-medium truncate max-w-50 text-slate-800 dark:text-slate-200">{
            chats.find((chat) => chat.id === currentChatId)?.title || "Novo Chat"
          }</span>
          <button onClick={handleNewChat} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 transition-colors">
            <Plus size={20} />
          </button>
        </div>

        {!isReady && (
          <div className="flex items-center justify-center w-full text-sky-600 dark:text-sky-200 p-2 text-center text-sm z-10">
            {progressText}
          </div>
        )}

        {/* Mensagens */}
        <div className="flex-1 relative overflow-y-auto">
          <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-8">
            {messages.length === 0 && isReady ? (
              <div className="flex flex-col items-center justify-center gap-4 mt-20 text-2xl">
                <Image
                  src="/icon0.svg"
                  alt="ChatGPU"
                  width={64}
                  height={64}
                  className="mb-2"
                />
                <span className="font-bold bg-linear-to-r from-sky-500 to-indigo-500 bg-clip-text text-center text-transparent">
                  Como posso ajudar hoje?
                </span>
              </div>
            ) : (
              <>
                {messages.map((msg, index) => (
                  <ChatMessage
                    key={index}
                    msg={msg}
                    index={index}
                    copiedMessageIndex={copiedMessageIndex}
                    handleCopyMessage={handleCopyMessage}
                    handleSubmitEdit={handleSubmitEdit}
                  />
                ))}
                {/* Elemento âncora para o scroll */}
                <div ref={messagesEndRef} className="h-36" />
              </>
            )}
          </div>
        </div>

        {/* Entrada de Texto */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-linear-to-b from-transparent via-slate-100 dark:via-slate-900 to-slate-100 dark:to-slate-900">
          <div className="max-w-180 mx-auto bg-slate-100 dark:bg-slate-800 rounded-3xl shadow-md">
            <div className="flex items-center">
              <textarea
                ref={textareaRef}
                id="chat-input"
                value={input}
                onChange={handleChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                    if (textareaRef.current && input.trim()) textareaRef.current.style.height = "auto";
                  }
                }}
                placeholder={isReady ? "Envie uma mensagem..." : "Carregando modelo..."}
                disabled={!isReady || isGenerating}
                className="flex-1 px-4 pt-4 pb-2 outline-none resize-none max-h-35 overflow-y-auto"
                rows={1}
              />
            </div>
            <div className="flex items-center justify-between px-2">
              <select
                id="model-select"
                value={selectedModel}
                onChange={(e) => handleModelChange(e.target.value)}
                className="p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-sm"
                title="Selecionar modelo"
              >
                {SUPPORTED_MODELS.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.options.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>

              {/* Botões condicionais Enviar/Parar */}
              {isGenerating ? (
                <button
                  onClick={handleStop}
                  className="p-3 m-1 bg-sky-500 text-white rounded-full hover:bg-sky-600 transition-colors shadow-sm"
                  title="Parar geração"
                >
                  <Square fill="currentColor" size={20} />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || !isReady}
                  className={`p-3 m-1 text-white rounded-full disabled:bg-slate-300 dark:disabled:bg-slate-400 transition-colors shadow-sm ${(input.trim() && isReady) ? "bg-sky-500 hover:bg-sky-600" : ''
                    }`}
                  title="Enviar"
                >
                  <SendHorizontal size={20} />
                </button>
              )}
            </div>
          </div>
          <div className="text-center text-xs text-slate-500 mt-2">
            A IA pode cometer erros. Processamento 100% local via WebGPU
          </div>
        </div>
      </main>

      {isSettingsOpen && (
        <SettingsModal
          selectedModel={selectedModel}
          setSelectedModel={handleModelChange}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
}
