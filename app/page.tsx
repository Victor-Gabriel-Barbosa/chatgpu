"use client";

import { useTheme } from "next-themes";
import { useState, type ChangeEvent, type ClipboardEvent } from "react";
import { ChatMessage } from "@/components/chat-message";
import { Plus } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { SettingsModal } from "@/components/settings-modal";
import { ModelManagerModal } from "@/components/model-manager-modal";
import { StartupVideo } from "@/components/startup-video";
import { models } from "@/config/models.json";
import { Button } from "@/components/ui/button"
import { Toaster } from "@/components/ui/sonner";
import { useEngine } from "@/hooks/use-engine";
import { useSession } from "@/hooks/use-session";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { ChatArea } from "@/components/chat-area";
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
  const { engine, isReady, selectedModel, setSelectedModel } = useEngine();
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

  const lastAssistantIndex = messages.map((m) => m.role).lastIndexOf("assistant");
  const hasMessages = messages.length > 0;
  const selectedModelName = models.flatMap(group => group.options).find(model => model.id === selectedModel)?.name;

  return (
    <>
      {/* Barra lateral */}
      <AppSidebar
        chats={chats}
        currentChatId={currentChatId}
        isGenerating={isGenerating}
        setCurrentChatId={loadChat}
        createNewChat={handleNewChat}
        deleteChat={deleteChat}
        exportChat={exportChat}
        renameChat={handleRenameChat}
        setSettingsOpen={setIsSettingsOpen}
      />

      {/* Área principal */}
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
                            handleSubmitEdit={handleSubmitEdit}
                            isLastAssistant={index === lastAssistantIndex}
                            isGenerating={isGenerating}
                            isReady={isReady}
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

          {/* Área de entrada */}
          <ChatArea
            className="pb-4"
            value={input}
            onValueChange={setInput}
            onSend={handleSend}
            onStop={handleStop}
            onOpenModelManager={() => setIsModelManagerOpen(true)}
            isReady={isReady}
            isGenerating={isGenerating}
            hasSelectedModel={!!selectedModel}
            hasMessages={hasMessages}
            selectedModelName={selectedModelName}
            currentSpeed={currentSpeed}
          />
        </div>
      </SidebarInset>

      {/* Modal de configurações */}
      {isSettingsOpen && (
        <SettingsModal
          modelName={selectedModelName}
          onClose={() => setIsSettingsOpen(false)}
          onWatchIntroVideo={() => setIsStartupVideoOpen(true)}
          setIsModelManagerOpen={setIsModelManagerOpen}
        />
      )}

      {/* Modal de gerenciamento de modelos baixados */}
      {isModelManagerOpen && (
        <ModelManagerModal
          selectedModel={selectedModel}
          isGenerating={isGenerating}
          setSelectModel={setSelectedModel}
          onClose={() => setIsModelManagerOpen(false)}
        />
      )}

      {/* Vídeo de introdução na inicialização */}
      <StartupVideo
        isOpen={isStartupVideoOpen}
        onClose={() => setIsStartupVideoOpen(false)}
      />

      {/* Toaster para notificações */}
      <Toaster
        position="bottom-right"
        theme={theme as "light" | "dark" | "system"}
        closeButton
        offset={{ bottom: 5, right: 5 }}
      />
    </>
  );
}
