"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { useState, useRef, type ChangeEvent } from "react";
import { SendHorizontal, Plus, Square, Paperclip, X, HardDrive, Zap } from "lucide-react";
import { ChatMessage } from "@/components/chat-message";
import { AppSidebar } from "@/components/app-sidebar";
import { SettingsModal } from "@/components/settings-modal";
import { ModelManagerModal } from "@/components/model-manager-modal";
import { StartupVideo } from "@/components/startup-video";
import { models } from "@/config/models.json";
import { ACCEPTED_FILE_TYPES } from "@/config/file-types"
import { Button } from "@/components/ui/button"
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { useEngine } from "@/hooks/use-engine";
import { useSession } from "@/hooks/use-session";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller"

import { cn } from "@/lib/utils"

/**
 * Exibe a interface principal de conversação do ChatGPU.
 *
 * @remarks
 * Gerencia a exibição das mensagens, entrada de texto, anexos,
 * seleção de modelos, geração de respostas e gerenciamento de chats.
 * 
 * Também controla a abertura dos modais de configurações,
 * gerenciamento de modelos e vídeo de introdução.
 */
export default function ChatInterface() {
  const { theme } = useTheme();
  const { engine, isReady, selectedModel, handleModelChange } = useEngine();
  const {
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
  } = useSession({ engine, isReady });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isModelManagerOpen, setIsModelManagerOpen] = useState(false);
  const [isStartupVideoOpen, setIsStartupVideoOpen] = useState(true);
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastAssistantIndex = messages.map((m) => m.role).lastIndexOf("assistant");
  const hasMessages = messages.length > 0;
  const selectedModelName = models
    .flatMap(group => group.options)
    .find(model => model.id === selectedModel)?.name;

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
    <>
      {/* Barra Lateral */}
      <AppSidebar
        chats={chats}
        currentChatId={currentChatId}
        setCurrentChatId={loadChat}
        createNewChat={handleNewChat}
        deleteChat={deleteChat}
        exportChat={exportChat}
        renameChat={handleRenameChat}
        setSettingsOpen={setIsSettingsOpen}
      />

      {/* Área Principal */}
      <SidebarInset
        id="main-chat-area"
        className="h-full min-h-0 overflow-hidden min-w-0 flex flex-col"
      >
        <div className="bg-background md:hidden sticky top-0 z-10 flex h-14 items-center justify-between p-3 transition-colors duration-200">
          <SidebarTrigger />

          <span className="font-medium truncate max-w-50">
            {chats.find((chat) => chat.id === currentChatId)?.title || "Novo Chat"}
          </span>

          <Button
            onClick={handleNewChat}
            aria-label="Novo Chat"
            size="icon"
          >
            <Plus />
          </Button>
        </div>

        <div
          className={cn(
            "flex-1 min-h-0 flex flex-col",
            !hasMessages && "justify-center"
          )}
        >
          {/* Mensagens */}
          {hasMessages && (
            <div className="flex min-h-0 flex-1 flex-col">
              <MessageScrollerProvider>
                <MessageScroller>
                  <MessageScrollerViewport>
                    <MessageScrollerContent className="max-w-3xl mx-auto w-full p-8">
                      {messages.map((message, index) => (
                        <MessageScrollerItem
                          key={index}
                          messageId={index.toString()}
                          scrollAnchor={message.role === "user"}
                        >
                          <ChatMessage
                            key={index}
                            msg={message}
                            index={index}
                            copiedMessageIndex={copiedMessageIndex}
                            handleCopyMessage={handleCopyMessage}
                            handleSubmitEdit={handleSubmitEdit}
                            isLastAssistant={index === lastAssistantIndex}
                            isGenerating={isGenerating}
                          />
                        </MessageScrollerItem>
                      ))}
                    </MessageScrollerContent>
                  </MessageScrollerViewport>
                  <MessageScrollerButton />
                </MessageScroller>
              </MessageScrollerProvider>
            </div>
          )}

          {/* Entrada de Texto */}
          <div className="max-w-3xl w-full mx-auto px-4 shrink-0">
            <div
              className={cn(
                "max-md:hidden flex flex-row items-center justify-center gap-2 text-2xl overflow-hidden transition-all duration-500 ease-in-out",
                !hasMessages && isReady
                  ? "opacity-100 translate-y-0 mb-8 max-h-20"
                  : "opacity-0 -translate-y-2 mb-0 max-h-0 pointer-events-none"
              )}
            >
              <Image src="/icon0.svg" alt="ChatGPU" width={34} height={34} />
              <span className="font-bold text-primary text-center shimmer">
                Como posso ajudar hoje?
              </span>
            </div>

            <div className="max-w-180 mx-auto bg-card rounded-2xl shadow-md">
              {/* Chips dos arquivos anexados */}
              {attachedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 px-4 pt-3">
                  {attachedFiles.map((file, i) => (
                    <div
                      key={`${file.name}-${i}`}
                      className="flex items-center gap-1.5 bg-card text-xs pl-2.5 pr-1.5 py-1 rounded-full border shadow-sm"
                    >
                      <Paperclip className="shrink-0" size={20} />
                      <span className="max-w-32 truncate">{file.name}</span>
                      <Button
                        variant="ghost"
                        onClick={() => removeAttachedFile(i)}
                        aria-label={`Remover ${file.name}`}
                        size="icon"
                      >
                        <X />
                      </Button>
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
                  placeholder={
                    isReady
                      ? "Envie uma mensagem..."
                      : selectedModel
                        ? "Carregando modelo..."
                        : "Selecione um modelo..."
                  }
                  disabled={!isReady || isGenerating}
                  className="flex-1 m-4 field-sizing-content leading-6 outline-none resize-none overflow-y-auto max-h-35 placeholder-muted-foreground disabled:placeholder-muted-foreground"
                  rows={1}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between m-2 p-2">
                <div className="flex flex-wrap min-w-0 items-center gap-2">
                  <div className="relative">
                    <Tooltip key="attach-file">
                      <TooltipTrigger asChild>
                        <Button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={!isReady}
                          aria-label={"Anexar arquivo"}
                          size="icon"
                        >
                          <Plus strokeWidth={2.5} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side={"bottom"}>
                        <p>Anexar arquivo(s)</p>
                      </TooltipContent>
                    </Tooltip>

                    <input
                      id="file-input"
                      ref={fileInputRef}
                      type="file"
                      accept={ACCEPTED_FILE_TYPES.join(',')}
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                  <Tooltip key="model-manager-tooltip">
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        onClick={() => setIsModelManagerOpen(true)}
                        aria-label="Gerenciar modelos"
                      >
                        <HardDrive /> {selectedModelName ?? "Selecionar modelo"}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side={"bottom"}>
                      <p>Gerenciar modelos</p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                {isGenerating ? (
                  <div className="flex items-center gap-2">
                    {currentSpeed !== null && currentSpeed !== undefined && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono text-muted-foreground">
                        <Zap className="w-3.5 h-3.5 text-primary fill-primary animate-pulse" />
                        <span>{currentSpeed} tokens/s</span>
                      </div>
                    )}
                    <Tooltip key="stop-generating">
                      <TooltipTrigger asChild>
                        <Button
                          onClick={handleStop}
                          size="icon"
                        >
                          <Square fill="currentColor" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side={"bottom"}>
                        <p>Parar resposta</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                ) : (
                  <Tooltip key="send-message">
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => {
                          handleSend(attachedFiles);
                          setAttachedFiles([]);
                        }}
                        disabled={!isReady || (attachedFiles.length === 0 && !input.trim())}
                        size="icon"
                      >
                        <SendHorizontal />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side={"bottom"}>
                      <p>Enviar</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
            <div className="text-center text-muted-foreground text-xs py-2">
              O ChatGPU é uma IA e pode cometer erros. Processamento 100% local via WebGPU
            </div>
          </div>
        </div>
      </SidebarInset>

      {/* Modal de Configurações */}
      {isSettingsOpen && (
        <SettingsModal
          modelName={selectedModelName}
          onClose={() => setIsSettingsOpen(false)}
          onWatchIntroVideo={() => setIsStartupVideoOpen(true)}
          setIsModelManagerOpen={setIsModelManagerOpen}
        />
      )}

      {/* Modal de Gerenciamento de Modelos Baixados */}
      {isModelManagerOpen && (
        <ModelManagerModal
          selectedModel={selectedModel}
          isGenerating={isGenerating}
          onSelectModel={handleModelChange}
          onClose={() => setIsModelManagerOpen(false)}
        />
      )}

      {/* Vídeo de Introdução na Inicialização */}
      <StartupVideo
        isOpen={isStartupVideoOpen}
        onClose={() => setIsStartupVideoOpen(false)}
      />

      {/* Toaster para Notificações*/}
      <Toaster
        position="bottom-right"
        theme={theme as "light" | "dark" | "system"}
        closeButton
        offset={{ bottom: 5, right: 5 }}
      />
    </>
  );
}
