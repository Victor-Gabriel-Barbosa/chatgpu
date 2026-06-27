"use client";

import { useState, useRef, useEffect } from "react";
import { SendHorizontal, Plus, Square, PanelLeft } from "lucide-react";
import Image from "next/image";
import { ChatMessage } from "@/components/layout/ChatMessage";
import { Sidebar } from "@/components/layout/Sidebar";
import { SettingsModal } from "@/components/layout/SettingsModal";
import { SUPPORTED_MODELS } from "@/constants/models";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { useTheme } from "@/hooks/useTheme";
import { useEngine } from "@/hooks/useEngine";
import { useSession } from "@/hooks/useSession";

/**
 * Renderiza a interface principal do aplicativo de chat, integrando a barra lateral, a área de exibição de mensagens e os controles de entrada e configuração do modelo.
 *
 * @returns Elemento React contendo a estrutura visual e lógica principal da aplicação.
 */
export default function ChatInterface() {
  // Estados do chat, modelo, UI e controle de execução
  const { theme, setTheme } = useTheme();
  const { engine, isReady, selectedModel, handleModelChange } = useEngine();
  const {
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
  } = useSession({ engine, isReady });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);

  // Refs para textarea e para o final da lista de mensagens
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Encontrar o índice da última mensagem do assistente para controle de UI
  const lastAssistantIndex = messages.map((m) => m.role).lastIndexOf("assistant");

  // Faz scroll para a última mensagem
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Faz scroll para o final sempre que as mensagens ou o chat atual mudarem
  useEffect(() => {
    scrollToBottom();
  }, [messages.length, currentChatId]);

  // Ajusta a altura do textarea conforme o conteúdo muda
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  // Copia o conteúdo de uma mensagem para a área de transferência
  const handleCopyMessage = (content: string, index: number) => {
    navigator.clipboard
      .writeText(content)
      .then(() => {
        setCopiedMessageIndex(index);
        setTimeout(() => setCopiedMessageIndex(null), 2000);
        toast.success("Copiado para a área de transferência");
      })
      .catch((error) => {
        console.error("Erro ao copiar mensagem:", error);
        toast.error("Falha ao copiar a mensagem. Tente novamente");
      });
  };

  return (
    <div className="flex h-dvh bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      {/* Barra Lateral */}
      <Sidebar
        isSidebarOpen={sidebarOpen}
        setIsSidebarOpen={setSidebarOpen}
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
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 transition-colors"
          >
            <PanelLeft size={20} />
          </button>
          <span className="font-medium truncate max-w-50 text-slate-800 dark:text-slate-200">
            {chats.find((chat) => chat.id === currentChatId)?.title || "Novo Chat"}
          </span>
          <button
            onClick={handleNewChat}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Mensagens */}
        <div className="flex-1 relative overflow-y-auto">
          <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-8">
            {messages.length === 0 && isReady ? (
              <div className="flex flex-col items-center justify-center gap-4 mt-20 text-2xl">
                <Image src="/icon0.svg" alt="ChatGPU" width={64} height={64} className="mb-2" />
                <span className="font-bold text-blue-500 text-center">Como posso ajudar hoje?</span>
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
                    isLastAssistant={index === lastAssistantIndex}
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
                  <optgroup key={group.label} label={group.label} className="bg-slate-100 dark:bg-slate-800">
                    {group.options.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>

              {isGenerating ? (
                <button
                  onClick={handleStop}
                  className="p-3 m-1 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors shadow-sm"
                  title="Parar geração"
                >
                  <Square fill="currentColor" size={20} />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || !isReady}
                  className={`p-3 m-1 text-white rounded-full disabled:bg-slate-300 dark:disabled:bg-slate-400 transition-colors shadow-sm ${input.trim() && isReady ? "bg-blue-600 hover:bg-blue-700" : ""
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

      { /* Modal de Configurações */}
      {isSettingsOpen && (
        <SettingsModal
          selectedModel={selectedModel}
          setSelectedModel={handleModelChange}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      { /* Toaster para notificações */}
      <Toaster
        position="bottom-left"
        theme={theme === "dark" || theme === "light" || theme === "system" ? theme : "system"}
        richColors
        closeButton
      />
    </div>
  );
}
