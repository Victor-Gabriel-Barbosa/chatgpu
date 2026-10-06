"use client"

import Image from "next/image";
import * as React from "react";
import { ACCEPTED_FILE_TYPES } from "@/config/file-types";
import { useState, type ChangeEvent, type ClipboardEvent } from "react";
import {
  File as FileIcon,
  HardDrive,
  Plus,
  SendHorizontal,
  Square,
  X,
  Zap,
} from "lucide-react"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import { cn } from "@/lib/utils"

/** Propriedades do componente de entrada do chat {@link ChatArea}. */
interface ChatInputProps {
  /**
   * Função chamada para enviar uma mensagem.
   * @param files - Arquivos anexados à mensagem.
   */
  onSend: (message: string, files: File[]) => void

  /** Função chamada para interromper a geração de texto. */
  onStop: () => void

  /** Função chamada para abrir o gerenciador de modelos. */
  onOpenModelManager: () => void

  /** Indica se o chat está pronto para enviar mensagens. */
  isReady: boolean

  /** Indica se uma resposta está sendo gerada. */
  isGenerating: boolean

  /** Indica se um modelo foi selecionado. */
  hasSelectedModel: boolean

  /** Indica se há mensagens no chat. */
  hasMessages: boolean

  /** Nome do modelo selecionado. */
  selectedModelName?: string | null

  /** Velocidade atual de geração. */
  currentSpeed?: number | null

  /** Classe CSS adicional para o componente. */
  className?: string
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
  hasSelectedModel,
  hasMessages,
  selectedModelName,
  currentSpeed,
  onOpenModelManager,
  className,
}: Readonly<ChatInputProps>) {
  const [input, setInput] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  /** Adiciona os arquivos escolhidos pelo usuário à lista de anexos. */
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length > 0) setAttachedFiles((prev) => [...prev, ...selected]);
    e.target.value = "";
  };

  /** Adiciona arquivos copiados para a área de transferência à lista de anexos. */
  const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData.items);

    const files = items
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null);

    if (files.length === 0) return;

    e.preventDefault();

    setAttachedFiles((prev) => [...prev, ...files]);
  };

  /** Remove um anexo da lista pelo índice. */
  const removeAttachedFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  /**
   * Lida com eventos de teclado no campo de entrada.
   * @param e - Evento de teclado.
   */
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (isReady && (attachedFiles.length > 0 || input.trim().length > 0) && !isGenerating) {
        onSend(input.trim(), attachedFiles);
        setInput("");
        setAttachedFiles([]);
      }
    }
  }

  return (
    <div className={cn("mx-auto w-full max-w-190 px-5", className)}>
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

      <InputGroup className="rounded-xl bg-card shadow-md">
        {/* Chips dos arquivos anexados */}
        {attachedFiles.length > 0 && (
          <InputGroupAddon align="block-start" className="flex-wrap gap-2">
            {attachedFiles.map((file, i) => (
              <div
                key={`${file.name}-${i}`}
                className="flex items-center gap-1.5 rounded-lg border bg-card py-1 pr-1.5 pl-2.5 text-xs shadow-sm"
              >
                <FileIcon className="shrink-0" size={16} />
                <span className="max-w-32 truncate">{file.name}</span>
                <InputGroupButton
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Remover ${file.name}`}
                  onClick={() => removeAttachedFile(i)}
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
          disabled={!isReady}
          placeholder={
            isReady
              ? "Envie uma mensagem..."
              : hasSelectedModel
                ? "Carregando modelo..."
                : "Selecione um modelo..."
          }
          onChange={(e) => setInput(e.target.value)}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          className="max-h-55 min-h-12 resize-none overflow-y-auto leading-6 field-sizing-content px-3"
        />

        <InputGroupAddon align="block-end" className="min-w-0">
          {/* Anexar arquivo(s) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <InputGroupButton
                variant="default"
                size="icon-sm"
                aria-label="Anexar arquivo"
                disabled={!isReady}
                onClick={() => fileInputRef.current?.click()}
                className="shrink-0"
              >
                <Plus strokeWidth={2.5} />
              </InputGroupButton>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Anexar arquivo(s)</p>
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
                onClick={onOpenModelManager}
                className="min-w-0 shrink justify-start"
              >
                <HardDrive />
                <span className="truncate">{selectedModelName ?? "Selecionar modelo"}</span>
              </InputGroupButton>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Gerenciar modelos</p>
            </TooltipContent>
          </Tooltip>

          {/* Enviar ou parar geração */}
          {isGenerating ? (
            <div className="ml-auto flex items-center gap-2">
              {currentSpeed !== null && currentSpeed !== undefined && (
                <InputGroupText className="font-mono text-xs">
                  <Zap className="size-3.5 animate-pulse fill-primary text-primary" />
                  {currentSpeed} tokens/s
                </InputGroupText>
              )}
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
                  <p>Parar resposta</p>
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
                  disabled={!isReady || (input.trim().length === 0 && attachedFiles.length === 0)}
                  onClick={() => { 
                    onSend(input.trim(), attachedFiles); 
                    setInput(""); 
                    setAttachedFiles([]); 
                  }}
                >
                  <SendHorizontal />
                </InputGroupButton>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Enviar</p>
              </TooltipContent>
            </Tooltip>
          )}
        </InputGroupAddon>
      </InputGroup>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        O ChatGPU é uma IA e pode cometer erros. Processamento 100% local via WebGPU
      </p>
    </div>
  )
}