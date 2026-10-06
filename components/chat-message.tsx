import { useState } from 'react';
import { Copy, Lightbulb, ChevronDown, Pencil, File, Zap } from 'lucide-react';
import { Message as MessageType } from '@/types/chat';
import { Button } from "@/components/ui/button";
import { reasoningComponents, messageComponents } from '@/components/markdown-components';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import rehypeKatex from 'rehype-katex';
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { cn, copyToClipboard } from "@/lib/utils";

/** Propriedades do componente {@link ChatMessage}. */
export interface ChatMessageProps {
  /** Dados completos da mensagem, incluindo papel (role), texto e métricas. */
  msg: MessageType;

  /** Posição/índice da mensagem no histórico da conversa. */
  index: number;

  /**
   * Função opcional disparada ao salvar a edição do conteúdo de uma mensagem.
   * @param newContent - Novo conteúdo textual da mensagem.
   * @param index - Índice da mensagem que foi editada.
   */
  handleSubmitEdit?: (newContent: string, index: number) => void;

  /** Define se a mensagem é a última resposta gerada pelo assistente no histórico. */
  isLastAssistant?: boolean;

  /** Define se há uma resposta em streaming sendo gerada no momento. */
  isGenerating?: boolean;

  /** Define se a engine está pronta. */
  isReady?: boolean;
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
  msg,
  index,
  handleSubmitEdit,
  isLastAssistant,
  isGenerating,
  isReady,
}: Readonly<ChatMessageProps>) {
  const [showReasoning, setShowReasoning] = useState(false);
  const [expandedFiles, setExpandedFiles] = useState<Record<number, boolean>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(msg.content);

  const isUser = msg.role === 'user';

  /** Alterna o estado de expansão de um arquivo específico. */
  const toggleFile = (idx: number) => {
    setExpandedFiles(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  /** Salva a edição da mensagem. */
  const onSaveEdit = () => {
    const trimmedValue = editValue.trim();
    if (trimmedValue && trimmedValue !== msg.content && handleSubmitEdit) handleSubmitEdit(trimmedValue, index);
    setIsEditing(false);
  };

  /** Cancela a edição da mensagem. */
  const onCancelEdit = () => {
    setEditValue(msg.content);
    setIsEditing(false);
  };

  return (
    <Message
      align={isUser ? 'end' : 'start'}
      className="group w-full max-w-full min-w-0"
    >
      {!isUser && (
        <MessageAvatar className={isGenerating && isLastAssistant ? "animate-spin" : ""}>
          <Avatar>
            <AvatarImage src="/icon0.svg" alt="ChatGPU" />
            <AvatarFallback>AI</AvatarFallback>
          </Avatar>
        </MessageAvatar>
      )}

      <MessageContent className="min-h-16">
        {/* Bloco de raciocínio */}
        {msg?.think && !isUser && (
          <div key="reasoning">
            <Button
              variant="link"
              onClick={() => setShowReasoning(!showReasoning)}
              className="max-w-full min-w-0 p-0 h-auto"
            >
              <Lightbulb className="w-4 h-4 shrink-0 mr-1" />
              <span className={cn("min-w-0 truncate text-xs", isGenerating && isLastAssistant && "shimmer")}>
                Raciocínio
              </span>
              <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${showReasoning ? 'rotate-180' : ''}`} />
            </Button>
            {showReasoning && (
              <div className="mt-2 p-3 bg-muted/30 border border-primary text-primary rounded-lg text-xs leading-relaxed animate-in fade-in slide-in-from-top-2 duration-200">
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]} rehypePlugins={[rehypeKatex]} components={reasoningComponents}>
                  {msg.think}
                </ReactMarkdown>
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
                  <InputGroupButton size="sm" variant="default" disabled={editValue.trim() === "" || editValue.trim() === msg.content} onClick={onSaveEdit}>
                    Atualizar
                  </InputGroupButton>
                </InputGroupAddon>
                {msg?.files && msg.files.length > 0 && (
                  <InputGroupAddon align="block-start" className="min-w-0 flex-col items-start">
                  {msg.files.map((file, idx) => (
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
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]} rehypePlugins={[rehypeKatex]} components={messageComponents}>
                {msg.content}
              </ReactMarkdown>
            )}

            {/* Arquivos Anexados */}
            {msg?.files && msg?.files?.length > 0 && !isEditing && (
              <div className="flex flex-wrap gap-2">
                {msg.files.map((file, idx) => {
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
                          <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]} rehypePlugins={[rehypeKatex]} components={messageComponents}>
                            {file.content}
                          </ReactMarkdown>
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
          <MessageFooter className="m-1 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 opacity-0 max-md:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground"
                onClick={() => copyToClipboard(msg.content)}
                title="Copiar mensagem"
              >
                <Copy className="w-4 h-4" />
              </Button>

              {isUser && handleSubmitEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground"
                  onClick={() => setIsEditing(true)}
                  title="Editar mensagem"
                  aria-label="Editar mensagem"
                  disabled={!isReady || isGenerating}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              )}
            </div>

            {!isUser && (msg.metrics?.tokensPerSecond !== undefined || (isGenerating && isLastAssistant)) && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 font-mono text-muted-foreground py-0.5 px-2 rounded-md hover:bg-muted transition-colors cursor-default select-none">
                    <Zap
                      className={cn(
                        "w-3 h-3 shrink-0",
                        isGenerating && isLastAssistant
                          ? "text-primary fill-primary animate-pulse"
                          : "text-muted-foreground"
                      )}
                    />
                    <span>
                      {msg.metrics?.tokensPerSecond !== undefined
                        ? `${msg.metrics.tokensPerSecond} tokens/s`
                        : isGenerating && isLastAssistant
                          ? "Calculando..."
                          : ""}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <div className="flex flex-col gap-1 font-mono text-xs">
                    <p className="font-semibold text-center pb-1 border-b border-secondary text-secondary">Desempenho da Geração</p>
                    {msg.metrics?.tokensPerSecond !== undefined && (
                      <div className="flex justify-between gap-4">
                        <span className="text-secondary">Velocidade:</span>
                        <span className="font-medium">{msg.metrics.tokensPerSecond} tokens/s</span>
                      </div>
                    )}
                    {msg.metrics?.completionTokens !== undefined && (
                      <div className="flex justify-between gap-4">
                        <span className="text-secondary">Tokens gerados:</span>
                        <span className="font-medium">{msg.metrics.completionTokens}</span>
                      </div>
                    )}
                    {msg.metrics?.promptTokens !== undefined && (
                      <div className="flex justify-between gap-4">
                        <span className="text-secondary">Tokens do prompt:</span>
                        <span className="font-medium">{msg.metrics.promptTokens}</span>
                      </div>
                    )}
                    {msg.metrics?.totalTokens !== undefined && (
                      <div className="flex justify-between gap-4">
                        <span className="text-secondary">Total de tokens:</span>
                        <span className="font-medium">{msg.metrics.totalTokens}</span>
                      </div>
                    )}
                    {msg.metrics?.prefillTokensPerSecond !== undefined && (
                      <div className="flex justify-between gap-4">
                        <span className="text-secondary">Velocidade prefill:</span>
                        <span className="font-medium">{msg.metrics.prefillTokensPerSecond} tokens/s</span>
                      </div>
                    )}
                    {msg.metrics?.timeToFirstToken !== undefined && (
                      <div className="flex justify-between gap-4">
                        <span className="text-secondary">TTFT:</span>
                        <span className="font-medium">{msg.metrics.timeToFirstToken}s</span>
                      </div>
                    )}
                    {msg.metrics?.elapsedTime !== undefined && (
                      <div className="flex justify-between gap-4">
                        <span className="text-secondary">Tempo total:</span>
                        <span className="font-medium">{msg.metrics.elapsedTime}s</span>
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
          </MessageFooter>
        )}
      </MessageContent>
    </Message>
  );
}
