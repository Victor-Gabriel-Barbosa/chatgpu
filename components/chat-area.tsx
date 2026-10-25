"use client";

import { useRef } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useState, type ChangeEvent, type ClipboardEvent } from "react";
import { ACCEPTED_FILE_TYPES } from "@/config/file-types";
import type { SendMessage } from "@/types/chat";
import {
  File as FileIcon,
  HardDrive,
  Plus,
  ArrowUp,
  Square,
  X,
} from "lucide-react"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Kbd } from "@/components/ui/kbd"

import { cn } from "@/lib/utils"

/** Propriedades do componente de entrada do chat {@link ChatArea}. */
interface ChatInputProps {
  /**
   * Função chamada para enviar uma mensagem.
   * @param message - Mensagem do usuário a ser enviada ao modelo.
   */
  onSend: (message: SendMessage) => void;

  /** Função chamada para interromper a geração de texto. */
  onStop: () => void;

  /** Função chamada para abrir o gerenciador de modelos. */
  onOpen: () => void;

  /** Indica se o chat está pronto para enviar mensagens. */
  isReady: boolean;

  /** Indica se uma resposta está sendo gerada. */
  isGenerating: boolean;

  /** Indica se o chat esta vazio. */
  isEmpty: boolean;

  /** Nome do modelo selecionado. */
  modelName?: string;

  /** Classe CSS adicional para o componente. */
  className?: string;
}

/**
 * Exibe a área de entrada de mensagens do chat.
 *
 * @remarks
 * Permite enviar mensagens de texto e arquivos para o modelo.
 *
 * @param props - Propriedades utilizadas para configurar a área de entrada do chat.
 */
export function ChatArea({
  onSend,
  onStop,
  isReady,
  isGenerating,
  isEmpty,
  modelName,
  onOpen,
  className,
}: Readonly<ChatInputProps>) {
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null)

  /** Adiciona os arquivos escolhidos pelo usuário à lista de anexos. */
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length > 0) setFiles((prev) => [...prev, ...selected]);
    e.target.value = "";
  };

  /** Adiciona arquivos copiados para a área de transferência à lista de anexos. */
  const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(e.clipboardData.files);
    if (files.length === 0) return;
    e.preventDefault();
    setFiles((prev) => [...prev, ...files]);
  };

  /** Remove um anexo da lista pelo índice. */
  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  /** Envia a mensagem digitada pelo usuário. */
  const handleSend = () => {
    if (isReady && (files.length > 0 || input.trim().length > 0) && !isGenerating) {
      onSend({ content: input.trim(), files: files });
      setInput("");
      setFiles([]);
    }
  }

  /**
   * Lida com eventos de teclado no campo de entrada.
   * @param e - Evento de teclado.
   */
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (isReady && (files.length > 0 || input.trim().length > 0) && !isGenerating) handleSend()
    }
  }

  /** Foca no campo de entrada de texto (Shift + Esc). */
  useHotkeys("shift+esc", () => document.getElementById("chat-input")?.focus(), {
    enableOnFormTags: true,
    preventDefault: true,
  });

  /** Abre o seletor de arquivos (Ctrl + U). */
  useHotkeys("ctrl+u", () => fileInputRef.current?.click(), {
    enableOnFormTags: true,
    preventDefault: true,
  });

  /** Abre o seletor de modelos (Ctrl + M). */
  useHotkeys("ctrl+m", () => onOpen(), {
    enableOnFormTags: true,
    preventDefault: true,
  });

  /** Envia a mensagem (Ctrl + Enter). */
  useHotkeys("ctrl+enter", () => handleSend(), {
    enableOnFormTags: true,
    preventDefault: true,
  });

  /** Para a geração (Shift + P). */
  useHotkeys("mod+p", () => onStop(), {
    enabled: isGenerating,
    enableOnFormTags: true,
    preventDefault: true,
  });

  return (
    <div className={cn("mx-auto w-full max-w-190 px-5", className)}>
      <div
        className={cn(
          "flex flex-row items-center justify-center gap-2 text-2xl transition-all duration-400 ease-in-out",
          isEmpty
            ? "opacity-100 translate-y-0 mb-8 max-h-20"
            : "opacity-0 -translate-y-2 mb-0 max-h-0 pointer-events-none"
        )}
      >
        <span className="font-bold text-primary text-center shimmer">
          {(isEmpty && isReady) ? "Como posso ajudar hoje?" : "Selecione um modelo..."}
        </span>
      </div>

      <InputGroup className="rounded-xl bg-card shadow-md">
        {/* Chips dos arquivos anexados */}
        {files.length > 0 && (
          <InputGroupAddon align="block-start" className="flex-wrap gap-2">
            {files.map((file, i) => (
              <div
                key={`${file.name}-${i}`}
                className="flex items-center gap-1.5 rounded-lg border bg-card p-1.5 text-xs shadow-sm"
              >
                <FileIcon className="shrink-0" size={16} />
                <span className="max-w-32 truncate">{file.name}</span>
                <InputGroupButton
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Remover ${file.name}`}
                  onClick={() => removeFile(i)}
                >
                  <X />
                </InputGroupButton>
              </div>
            ))}
          </InputGroupAddon>
        )}

        {/* Entrada de texto */}
        <InputGroupTextarea
          id="chat-input"
          value={input}
          rows={1}
          placeholder={
            (isGenerating && "Gerando resposta...") ||
            (isReady && "Envie uma mensagem...") ||
            (modelName && "Carregando modelo...") ||
            "Selecione um modelo..."
          }
          onChange={(e) => setInput(e.target.value)}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          className="max-h-55 min-h-12 resize-none overflow-y-auto leading-6 field-sizing-content px-3"
        />

        <InputGroupAddon align="block-end" className="min-w-0">
          {/* Anexar arquivos */}
          <Tooltip>
            <TooltipTrigger asChild>
              <InputGroupButton
                variant="outline"
                size="icon-sm"
                aria-label="Anexar arquivos"
                onClick={() => fileInputRef.current?.click()}
                className="shrink-0"
              >
                <Plus strokeWidth={2.5} />
              </InputGroupButton>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <span>Anexar arquivos</span>
              <Kbd>
                Ctrl + U
              </Kbd>
            </TooltipContent>
          </Tooltip>

          <input
            id="file-input"
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_FILE_TYPES.join(",")}
            multiple
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Gerenciar modelos */}
          <Tooltip>
            <TooltipTrigger asChild>
              <InputGroupButton
                variant="outline"
                size="sm"
                aria-label="Gerenciar modelos"
                onClick={onOpen}
                className="min-w-0 shrink justify-start"
              >
                <HardDrive />
                <span className="truncate">{modelName ?? "Selecionar modelo"}</span>
              </InputGroupButton>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <span>Gerenciar modelos</span>
              <Kbd>
                Ctrl + M
              </Kbd>
            </TooltipContent>
          </Tooltip>

          {/* Enviar ou parar geração */}
          {isGenerating ? (
            <div className="ml-auto flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <InputGroupButton
                    variant="default"
                    size="icon-sm"
                    aria-label="Parar resposta"
                    onClick={onStop}
                  >
                    <Square fill="currentColor" />
                  </InputGroupButton>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <span>Parar resposta</span>
                  <Kbd>
                    Ctrl + P
                  </Kbd>
                </TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <InputGroupButton
                  variant="default"
                  size="icon-sm"
                  className="ml-auto"
                  aria-label="Enviar mensagem"
                  disabled={!isReady || (input.trim().length === 0 && files.length === 0)}
                  onClick={handleSend}
                >
                  <ArrowUp />
                </InputGroupButton>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <span>Enviar</span>
                <Kbd>
                  Ctrl + Enter
                </Kbd>
              </TooltipContent>
            </Tooltip>
          )}
        </InputGroupAddon>
      </InputGroup>
      <p className="mt-2 text-center text-xs text-muted-foreground max-sm:hidden">
        O ChatGPU é uma IA e pode cometer erros. Processamento 100% local
      </p>
    </div>
  )
}
