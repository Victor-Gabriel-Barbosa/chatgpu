import { useState } from 'react';
import { Copy, ChevronDown, Pencil, File, Gauge, ArrowUpFromLine, ArrowDownToLine, WholeWord, Activity, Clock, Timer, Check} from 'lucide-react';
import { Metric } from "@/components/metric"
import { Message as MessageType, TextFile } from '@/types/chat';
import { Button } from "@/components/ui/button";
import { reasoningComponents, messageComponents, Markdown } from '@/components/markdown-components';
import 'katex/dist/katex.min.css';
import {
  Avatar,
  AvatarFallback,
  AvatarImage
} from "@/components/ui/avatar";
import {
  Bubble,
  BubbleContent
} from "@/components/ui/bubble";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter
} from "@/components/ui/message";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group"

import { cn } from "@/lib/utils";

/** Propriedades do componente {@link ChatMessage}. */
export interface ChatMessageProps {
  /** Dados completos da mensagem, incluindo papel (role), texto e métricas. */
  message: MessageType;

  /** Posição/índice da mensagem no histórico da conversa. */
  index: number;

  /**
   * Função opcional disparada ao salvar a edição do conteúdo de uma mensagem.
   * @param input - Novo conteúdo textual da mensagem.
   * @param index - Índice da mensagem que foi editada.
   */
  handleEdit?: (input: string, index: number, files?: TextFile[]) => void;

  /** Define se a mensagem é a última resposta gerada pelo assistente no histórico. */
  isLast?: boolean;

  /** Define se há uma resposta em streaming sendo gerada no momento. */
  isGenerating?: boolean;

  /** Define se a engine está pronta. */
  isReady?: boolean;

  /** Classe CSS adicional para o componente. */
  className?: string;
}

/**
 * Exibe uma mensagem individual na interface de chat.
 *
 * @remarks
 * Suporta renderização de Markdown com fórmulas LaTeX (KaTeX), realce de sintaxe de código com {@link CodeBlock},
 * bloco colapsável de raciocínio (`<think>`), expansão de arquivos embutidos (`<file>`), edição de mensagens
 * do usuário e exibição de métricas de desempenho de geração de tokens do assistente.
 *
 * @param props - Propriedades utilizadas para configurar o componente {@link ChatMessage}.
 * @returns Elemento JSX que representa a mensagem no chat.
 */
export function ChatMessage({
  message,
  index,
  handleEdit,
  isLast,
  isGenerating,
  isReady,
  className,
}: Readonly<ChatMessageProps>) {
  const [showReasoning, setShowReasoning] = useState(false);
  const [expandedFiles, setExpandedFiles] = useState<Record<number, boolean>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.content);
  const [isCopied, setIsCopied] = useState(false);
  const isUser = message.role === 'user';

  /** Alterna o estado de expansão de um arquivo específico. */
  const toggleFile = (idx: number) => {
    setExpandedFiles(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  /** Salva a edição da mensagem. */
  const onSaveEdit = () => {
    const value = editValue.trim();
    if (value && value !== message.content && handleEdit) handleEdit(value, index, message.files);
    setIsEditing(false);
  };

  /** Cancela a edição da mensagem. */
  const onCancelEdit = () => {
    setEditValue(message.content);
    setIsEditing(false);
  };

  return (
    <Message
      align={isUser ? 'end' : 'start'}
      className={cn("group w-full max-w-full min-w-0", className)}
    >
      {!isUser && (
        <MessageAvatar className={isGenerating && isLast ? "animate-[spin_2s_linear_infinite]" : ""}>
          <Avatar>
            <AvatarImage src="/icon0.svg" alt="ChatGPU" />
            <AvatarFallback>AI</AvatarFallback>
          </Avatar>
        </MessageAvatar>
      )}

      <MessageContent className="min-h-16">
        {/* Bloco de raciocínio */}
        {message?.think && !isUser && (
          <div key="reasoning">
            <Button
              variant="link"
              onClick={() => setShowReasoning(!showReasoning)}
              className="max-w-full min-w-0 p-0 h-auto"
            >
              <span className={cn("min-w-0 truncate text-xs", isGenerating && isLast && "shimmer")}>
                Raciocínio
              </span>
              <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${showReasoning ? 'rotate-180' : ''}`} />
            </Button>
            {showReasoning && (
              <div className="mt-2 p-3 bg-muted/30 border border-primary text-primary rounded-lg text-sm leading-relaxed animate-in fade-in slide-in-from-top-2 duration-200">
                <Markdown components={reasoningComponents}>{message.think}</Markdown>
              </div>
            )}
          </div>
        )}

        {/* Corpo da mensagem */}
        <Bubble variant={isUser && !isEditing ? "default" : "ghost"}>
          <BubbleContent className={cn("wrap-break-word", isEditing && "w-full p-0")}>
            {isEditing ? (
              <InputGroup>
                <InputGroupTextarea
                  id={`chat-input-${index}`}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      onSaveEdit();
                    }
                  }}
                  className="max-h-55 min-h-12 resize-none overflow-y-auto leading-6 field-sizing-content"
                  rows={1}
                />
                <InputGroupAddon align="block-end">
                  <InputGroupButton size="sm" className="ml-auto" variant="secondary" onClick={onCancelEdit}>
                    Cancelar
                  </InputGroupButton>
                  <InputGroupButton size="sm" variant="default" disabled={editValue.trim() === "" || editValue.trim() === message.content} onClick={onSaveEdit}>
                    Atualizar
                  </InputGroupButton>
                </InputGroupAddon>
                {message?.files && message.files.length > 0 && (
                  <InputGroupAddon align="block-start" className="min-w-0 flex-col items-start">
                    {message.files.map((file, idx) => (
                      <InputGroupText
                        key={`file-${idx}`}
                        className="min-w-0 max-w-full font-mono font-medium"
                      >
                        <File className="shrink-0" />
                        <span className="truncate">{file.name}</span>
                      </InputGroupText>
                    ))}
                  </InputGroupAddon>
                )}
              </InputGroup>
            ) : (
              <Markdown components={messageComponents}>{message.content}</Markdown>
            )}

            {/* Arquivos Anexados */}
            {message?.files && message?.files?.length > 0 && !isEditing && (
              <div className="flex flex-wrap gap-2">
                {message.files.map((file, idx) => {
                  const isExpanded = expandedFiles[idx];

                  return (
                    <div key={idx} className="flex flex-col gap-2 w-full text-secondary-foreground">
                      <Button variant="secondary" size="sm" onClick={() => toggleFile(idx)} className="justify-start">
                        <File className="w-4 h-4 mr-1" />
                        <span className="font-medium truncate">{file.name}</span>
                        <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </Button>
                      {isExpanded && (
                        <div className="w-full animate-in fade-in slide-in-from-top-1 duration-200 bg-secondary rounded-xl p-3">
                          <Markdown components={messageComponents}>{file.content}</Markdown>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </BubbleContent>
        </Bubble>

        {/* Rodapé da mensagem (ações e métricas) */}
        {!isEditing && (
          <MessageFooter className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1 opacity-0 max-md:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(message.content);
                  setIsCopied(true);
                  setTimeout(() => setIsCopied(false), 2000);
                }}
                title={isCopied ? "Copiado!" : "Copiar mensagem"}
                aria-label={isCopied ? "Mensagem copiada" : "Copiar mensagem"}
              >
                {isCopied ? <Check /> : <Copy />}
              </Button>

              {isUser && handleEdit && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setIsEditing(true)}
                  title="Editar mensagem"
                  aria-label="Editar mensagem"
                  disabled={!isReady || isGenerating}
                >
                  <Pencil />
                </Button>
              )}
            </div>

            {!isUser && (
              <div className="flex flex-row flex-wrap gap-2 text-xs">
                {message.metrics?.tokensPerSecond !== undefined && (
                  <Metric
                    icon={Gauge}
                    value={`${message.metrics.tokensPerSecond} tokens/s`}
                    label="Velocidade de geração"
                  />
                )}
                {message.metrics?.completionTokens !== undefined && (
                  <Metric
                    icon={ArrowUpFromLine}
                    value={`${message.metrics.completionTokens} tokens`}
                    label="Tokens da resposta"
                  />
                )}
                {message.metrics?.promptTokens !== undefined && (
                  <Metric
                    icon={ArrowDownToLine}
                    value={`${message.metrics.promptTokens} tokens`}
                    label="Tokens do prompt"
                  />
                )}
                {message.metrics?.totalTokens !== undefined && (
                  <Metric
                    icon={WholeWord}
                    value={`${message.metrics.totalTokens} tokens`}
                    label="Total de tokens"
                  />
                )}
                {message.metrics?.prefillTokensPerSecond !== undefined && (
                  <Metric
                    icon={Activity}
                    value={`${message.metrics.prefillTokensPerSecond} tokens/s`}
                    label="Velocidade de prefill"
                  />
                )}
                {message.metrics?.timeToFirstToken !== undefined && (
                  <Metric
                    icon={Timer}
                    value={`${message.metrics.timeToFirstToken}s`}
                    label="Tempo até o primeiro token (TTFT)"
                  />
                )}
                {message.metrics?.elapsedTime !== undefined && (
                  <Metric
                    icon={Clock}
                    value={`${message.metrics.elapsedTime}s`}
                    label="Tempo total"
                  />
                )}
              </div>
            )}
          </MessageFooter>
        )}
      </MessageContent>
    </Message>
  );
}
