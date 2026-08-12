"use client";

import { useState, useRef, useEffect, type ChangeEvent } from "react";
import { SendHorizontal, Plus, Square, PanelLeftOpen, PanelLeftClose, Paperclip, X, HardDrive } from "lucide-react";
import Image from "next/image";
import { ChatMessage } from "@/components/layout/ChatMessage";
import { Sidebar } from "@/components/layout/Sidebar";
import { SettingsModal } from "@/components/layout/SettingsModal";
import { ModelManagerModal } from "@/components/layout/ModelManagerModal";
import { SUPPORTED_MODELS } from "@/constants/models";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { useTheme } from "@/hooks/useTheme";
import { useEngine } from "@/hooks/useEngine";
import { useSession } from "@/hooks/useSession";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectLabel
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

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
    exportChat,
    handleSend,
    handleSubmitEdit,
    handleStop,
  } = useSession({ engine, isReady });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isModelManagerOpen, setIsModelManagerOpen] = useState(false);
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  // Ref para o final da lista de mensagens e para o input de arquivos
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Índice da última mensagem do assistente para controle de UI
  const lastAssistantIndex = messages.map((m) => m.role).lastIndexOf("assistant");

  // Faz scroll para a última mensagem
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Faz scroll para o final sempre que as mensagens ou o chat atual mudarem
  useEffect(() => {
    scrollToBottom();
  }, [messages.length, currentChatId]);

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

  // Adiciona os arquivos escolhidos (input genérico ou de imagem) à lista de anexos
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length > 0) setAttachedFiles((prev) => [...prev, ...selected]);
    e.target.value = "";
  };

  // Remove um anexo da lista pelo índice
  const removeAttachedFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div
      className={`flex h-dvh text-slate-900 dark:text-slate-100 ${messages.length === 0
        ? "bg-[radial-gradient(ellipse_at_center,#dbeafe_0%,#f0f4ff_60%,#f8fafc_100%)] dark:bg-[radial-gradient(ellipse_at_center,#0d1b3e_0%,#050d1a_40%,#000000_100%)]"
        : "bg-slate-100 dark:bg-slate-950"
        }`}
    >
      {/* Barra Lateral */}
      <Sidebar
        isSidebarOpen={sidebarOpen}
        setIsSidebarOpen={setSidebarOpen}
        chats={chats}
        currentChatId={currentChatId}
        setCurrentChatId={loadChat}
        createNewChat={handleNewChat}
        deleteChat={deleteChat}
        exportChat={exportChat}
        renameChat={handleRenameChat}
        setSettingsOpen={setIsSettingsOpen}
        theme={theme}
        setTheme={setTheme}
      />

      {/* Área Principal */}
      <main id="main-chat-area" className="flex-1 flex flex-col relative min-w-0">
        <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-950 transition-colors duration-200">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 transition-colors"
          >
            {sidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
          </button>
          <span className="font-medium truncate max-w-50 text-slate-800 dark:text-slate-200">
            {chats.find((chat) => chat.id === currentChatId)?.title || "Novo Chat"}
          </span>
          <button
            type="button"
            onClick={handleNewChat}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Mensagens */}
        <div className="flex-1 relative overflow-y-auto">
          <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-8">
            {messages.map((msg, index) => (
              <ChatMessage
                key={index}
                msg={msg}
                index={index}
                copiedMessageIndex={copiedMessageIndex}
                handleCopyMessage={handleCopyMessage}
                handleSubmitEdit={handleSubmitEdit}
                isLastAssistant={index === lastAssistantIndex}
                isGenerating={isGenerating}
              />
            ))}
            {/* Elemento âncora para o scroll */}
            <div className="h-40" ref={messagesEndRef} />
          </div>
        </div>

        {/* Entrada de Texto */}
        <div
          className={`absolute left-0 right-0 p-4 transition-all duration-500 ease-in-out z-10 ${messages.length === 0
            ? "bottom-1/2 translate-y-1/2"
            : "bottom-0 translate-y-0 bg-linear-to-b from-transparent to-slate-100 dark:to-slate-950 to-20%"
            }`}
        >
          {messages.length === 0 && isReady && (
            <div className="max-md:hidden flex flex-col items-center justify-center gap-4 mb-8 text-2xl">
              <Image src="/icon0.svg" alt="ChatGPU" width={54} height={54} className="mb-2" />
              <span className="font-bold text-blue-500 text-center">Como posso ajudar hoje?</span>
            </div>
          )}

          <div className="max-w-180 mx-auto bg-slate-100 dark:bg-slate-800 rounded-2xl shadow-md">
            {/* Chips dos arquivos anexados */}
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 px-4 pt-3">
                {attachedFiles.map((file, i) => (
                  <div
                    key={`${file.name}-${i}`}
                    className="flex items-center gap-1.5 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs pl-2.5 pr-1.5 py-1 rounded-full border border-slate-200 dark:border-slate-600 shadow-sm"
                  >
                    <Paperclip size={12} className="text-slate-400 dark:text-slate-500 shrink-0" />
                    <span className="max-w-32 truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachedFile(i)}
                      aria-label={`Remover ${file.name}`}
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-full p-0.5 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center">
              <textarea
                id="chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(attachedFiles);
                    setAttachedFiles([]);
                  }
                }}
                placeholder={isReady ? "Envie uma mensagem..." : "Carregando modelo..."}
                disabled={!isReady || isGenerating}
                className="flex-1 px-4 pt-4 me-2 pb-2 field-sizing-content leading-6 outline-none resize-none overflow-y-auto max-h-35 placeholder-slate-500 disabled:placeholder-slate-500"
                rows={1}
              />
            </div>
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                {/* Botão de anexo de arquivos */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!isReady}
                    aria-label={"Anexar arquivo"}
                    title="Anexar arquivo"
                    className={`group flex items-center w-full bg-transparent hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors shrink-0 overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:opacity-40 disabled:pointer-events-none 
                      }`}
                  >
                    <div className="w-10 h-10 flex items-center justify-center shrink-0">
                      <div className="w-6 h-6 bg-slate-900 text-white dark:bg-white dark:text-black rounded-full flex items-center justify-center transition-colors">
                        <Plus size={16} strokeWidth={2.5} />
                      </div>
                    </div>
                  </button>

                  <input
                    id="file-input"
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.md,.pdf,.csv,.json,.xml,.html,.css,.js,.jsx,.ts,.tsx,.java,.py,.c,.cpp,.h,.hpp,.kt,.rs,.go,.sql,.yml,.yaml,.ini,.toml,.log,.conf,.bat,.sh,.ps1"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                <Select value={selectedModel} onValueChange={handleModelChange}>
                  <SelectTrigger
                    id="model-select"
                    title="Selecionar modelo"
                    className="max-w-20 sm:max-w-40 truncate p-3 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-sm border-none"
                    disabled={isGenerating}
                  >
                    <SelectValue placeholder="Selecionar modelo" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-100 dark:text-white dark:bg-slate-800">
                    {SUPPORTED_MODELS.map((group) => (
                      <SelectGroup key={group.label}>
                        <SelectLabel>{group.label}</SelectLabel>
                        {group.options.map((model) => (
                          <SelectItem key={model.id} value={model.id} className="hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer">
                            {model.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>

                <Tooltip key="model-manager-tooltip">
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setIsModelManagerOpen(true)}
                      aria-label="Gerenciar modelos baixados"
                      className="p-3 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                    >
                      <HardDrive size={18} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side={"right"}>
                    <p>Gerenciar modelos baixados</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              {isGenerating ? (
                <button
                  type="button"
                  onClick={handleStop}
                  className="p-3 m-1 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors shadow-sm"
                  title="Parar geração"
                >
                  <Square fill="currentColor" size={20} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    handleSend(attachedFiles);
                    setAttachedFiles([]);
                  }}
                  disabled={!isReady || (attachedFiles.length === 0 && !input.trim())}
                  className="p-2 m-1 text-white rounded-full disabled:bg-slate-300 dark:disabled:bg-slate-400 transition-colors shadow-sm bg-blue-600 hover:bg-blue-700"
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

      { /* Modal de Gerenciamento de Modelos Baixados */}
      {isModelManagerOpen && (
        <ModelManagerModal
          selectedModel={selectedModel}
          isGenerating={isGenerating}
          onSelectModel={handleModelChange}
          onClose={() => setIsModelManagerOpen(false)}
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
