import React, { useState } from 'react';
import { Check, Copy, Lightbulb, ChevronDown, Pencil, Paperclip, Zap } from 'lucide-react';
import { CodeBlock } from './code-block';
import { Message as MessageType } from '@/types/chat';
import { Button } from "@/components/ui/button";
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Message, MessageAvatar, MessageContent, MessageFooter } from "@/components/ui/message";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { cn } from "@/lib/utils";

/**
 * Representa um arquivo embutido no corpo da mensagem.
 */
export interface EmbeddedFile {
  /** Nome ou caminho do arquivo extraído. */
  name: string;

  /** Conteúdo textual interno do arquivo. */
  content: string;
}

/**
 * Estrutura resultante da separação do conteúdo bruto de uma mensagem.
 */
export interface ParsedMessageContent {
  /** Bloco de raciocínio da IA contido nas tags `<think>`, se presente. */
  think: string | null;
  /** Conteúdo textual principal da mensagem limpo de tags especiais. */
  mainContent: string;
  /** Lista de arquivos anexados ou embutidos no corpo da mensagem. */
  files: EmbeddedFile[];
}

/**
 * Propriedades do componente {@link ChatMessage}.
 */
export interface ChatMessageProps {
  /** Dados completos da mensagem, incluindo papel (role), texto e métricas. */
  msg: MessageType;

  /** Posição/índice da mensagem no histórico da conversa. */
  index: number;

  /** Índice da mensagem cujo conteúdo foi copiado para a área de transferência, ou `null`. */
  copiedMessageIndex: number | null;

  /**
   * Função disparada para copiar o texto principal da mensagem.
   *
   * @param content - Conteúdo textual a ser copiado.
   * @param index - Índice da mensagem copiada.
   */
  handleCopyMessage: (content: string, index: number) => void;

  /**
   * Função opcional disparada ao salvar a edição do conteúdo de uma mensagem.
   *
   * @param newContent - Novo conteúdo textual da mensagem.
   * @param index - Índice da mensagem que foi editada.
   */
  handleSubmitEdit?: (newContent: string, index: number) => void;

  /** Define se a mensagem é a última resposta gerada pelo assistente no histórico. */
  isLastAssistant?: boolean;

  /** Define se há uma resposta em streaming sendo gerada no momento. */
  isGenerating?: boolean;
}

/**
 * Pré-processa o conteúdo textual substituindo delimitadores LaTeX para o formato compatível com KaTeX.
 *
 * @remarks
 * Converte blocos `\[ ... \]` em `$$ ... $$` e expressões inline `\( ... \)` em `$ ... $`.
 *
 * @param content - Conteúdo original da mensagem com notação matemática.
 * @returns Conteúdo formatado para renderização de fórmulas matemáticas.
 */
const preprocessLaTeX = (content: string): string => {
  if (!content) return '';
  return content
    .replaceAll(String.raw`\[`, '$$$$')
    .replaceAll(String.raw`\]`, '$$$$')
    .replaceAll(String.raw`\(`, '$')
    .replaceAll(String.raw`\)`, '$');
};

/**
 * Separa o bloco de raciocínio e os arquivos embutidos do conteúdo principal da mensagem.
 *
 * @remarks
 * Extrai dados das tags `<file name="...">...</file>` e blocos `<think>...</think>`,
 * tratando inclusive tags incompletas durante streaming.
 *
 * @param content - Conteúdo completo e bruto da mensagem.
 * @returns Objeto contendo o raciocínio extraído, o conteúdo principal e a lista de arquivos.
 */
const parseMessageContent = (content: string): ParsedMessageContent => {
  if (!content) return { think: null, mainContent: '', files: [] };

  const files: EmbeddedFile[] = [];
  let processedContent = content;

  const fileRegex = /<file name="([^"]+)">([\s\S]*?)<\/file>/g;
  let match;
  while ((match = fileRegex.exec(processedContent)) !== null) {
    files.push({
      name: match[1],
      content: match[2].trim()
    });
  }

  processedContent = processedContent.replace(/<file name="[^"]+">[\s\S]*?<\/file>/g, '').trim();

  const thinkMatch = new RegExp(/<think>([\s\S]*?)<\/think>/).exec(processedContent);
  if (thinkMatch) {
    return {
      think: thinkMatch[1].trim(),
      mainContent: processedContent.replace(/<think>[\s\S]*?<\/think>/, '').trim(),
      files
    };
  }

  const openThinkMatch = new RegExp(/<think>([\s\S]*)/).exec(processedContent);
  if (openThinkMatch) {
    return {
      think: openThinkMatch[1].trim(),
      mainContent: processedContent.replace(/<think>[\s\S]*/, '').trim(),
      files
    };
  }

  return { think: null, mainContent: processedContent, files };
};

/**
 * Mapeamento de componentes customizados para renderização de Markdown no bloco de raciocínio.
 */
const reasoningComponents: Components = {
  pre: ({ children }) => <div className="w-full max-w-full min-w-0 overflow-x-auto">{children}</div>,
  code(props) {
    const { children, className, ...rest } = props;
    const match = /language-(\w+)/.exec(className || '');
    return match ? (
      <CodeBlock language={match[1]} code={String(children).replace(/\n$/, '')} />
    ) : (
      <code className="px-1.5 py-0.5 rounded text-xs font-mono wrap-break-word transition-colors" {...rest}>
        {children}
      </code>
    );
  },
  strong: ({ children }) => <strong className="font-semibold text-blue-950 dark:text-blue-100 transition-colors">{children}</strong>,
  a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:underline break-all transition-colors">{children}</a>,
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>
};

/**
 * Mapeamento de componentes customizados para renderização de Markdown no corpo da mensagem.
 */
const messageComponents: Components = {
  pre: ({ children }) => <div className="w-full max-w-full min-w-0 overflow-x-auto">{children}</div>,
  code(props) {
    const { children, className, ...rest } = props;
    const match = /language-(\w+)/.exec(className || '');
    return match ? (
      <CodeBlock language={match[1]} code={String(children).replace(/\n$/, '')} />
    ) : (
      <code className="px-1.5 py-0.5 rounded text-sm font-mono wrap-break-word transition-colors" {...rest}>
        {children}
      </code>
    );
  },
  h1: ({ children }) => <h1 className="text-2xl font-bold mt-4 mb-2">{children}</h1>,
  h2: ({ children }) => <h2 className="text-xl font-bold mt-3 mb-2">{children}</h2>,
  h3: ({ children }) => <h3 className="text-lg font-bold mt-2 mb-1">{children}</h3>,
  ul: ({ children }) => <ul className="list-disc list-inside my-2 space-y-1 ml-2">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside my-2 space-y-1 ml-2">{children}</ol>,
  strong: ({ children }) => <strong className="font-semibold text-slate-900 dark:text-white transition-colors">{children}</strong>,
  hr: () => <hr className="border-slate-300 dark:border-slate-700 my-4 transition-colors" />,
  a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline dark:text-blue-400 break-all transition-colors">{children}</a>,
  p: ({ children }) => <p className="mb-2 last:mb-0 max-w-full">{children}</p>
};

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
export const ChatMessage: React.FC<ChatMessageProps> = ({ msg, index, copiedMessageIndex, handleCopyMessage, handleSubmitEdit, isLastAssistant, isGenerating }) => {
  const [showReasoning, setShowReasoning] = useState(false);
  const [expandedFiles, setExpandedFiles] = useState<Record<number, boolean>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(msg.content);

  const { think: parsedThink, mainContent, files } = parseMessageContent(msg.content);
  const displayReasoning = parsedThink || msg.reasoning;
  const isUser = msg.role === 'user';

  const toggleFile = (idx: number) => {
    setExpandedFiles(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const onSaveEdit = () => {
    const trimmedValue = editValue.trim();
    if (trimmedValue && trimmedValue !== msg.content && handleSubmitEdit) {
      handleSubmitEdit(trimmedValue, index);
    }
    setIsEditing(false);
  };

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
        {/* Bloco de Raciocínio */}
        {displayReasoning && !isUser && (
          <div key="reasoning">
            <Button
              variant="link"
              onClick={() => setShowReasoning(!showReasoning)}
              className="max-w-full min-w-0 p-0 h-auto"
            >
              <Lightbulb className="w-4 h-4 shrink-0 mr-1" />
              <span className={cn("min-w-0 truncate text-xs", isGenerating && isLastAssistant ? 'shimmer' : '')}>
                Raciocínio
              </span>
              <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${showReasoning ? 'rotate-180' : ''}`} />
            </Button>
            {showReasoning && (
              <div className="mt-2 p-3 border border-primary text-primary rounded-lg text-xs leading-relaxed animate-in fade-in slide-in-from-top-2 duration-200">
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={reasoningComponents}>
                  {preprocessLaTeX(displayReasoning)}
                </ReactMarkdown>
              </div>
            )}
          </div>
        )}

        <Bubble variant={isUser && !isEditing ? "default" : "ghost"}>
          <BubbleContent className={cn("wrap-break-word", isEditing && "w-full p-0")}>
            {isEditing ? (
              <div className="flex flex-col gap-2 w-full min-w-62.5 sm:min-w-100">
                <textarea
                  id="edit-input"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      onSaveEdit();
                    }
                  }}
                  className="field-sizing-content leading-6 w-full bg-secondary p-3 resize-none overflow-y-auto max-h-55 rounded-xl text-sm outline-none border"
                  rows={1}
                />
                <div className="flex justify-end gap-2 mt-1">
                  <Button variant="secondary" size="sm" onClick={onCancelEdit}>Cancelar</Button>
                  <Button size="sm" onClick={onSaveEdit} disabled={editValue.trim() === '' || editValue.trim() === msg.content}>Atualizar</Button>
                </div>
              </div>
            ) : (
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={messageComponents}>
                {preprocessLaTeX(mainContent)}
              </ReactMarkdown>
            )}

            {/* Arquivos Anexados */}
            {files.length > 0 && !isEditing && (
              <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap gap-2">
                {files.map((file, idx) => {
                  const isExpanded = expandedFiles[idx];
                  const fileExtension = file.name.split('.').pop() || 'text';

                  return (
                    <div key={idx} className="flex flex-col gap-2 w-full">
                      <Button variant="ghost" size="sm" onClick={() => toggleFile(idx)} className="justify-start">
                        <Paperclip className="w-4 h-4 mr-1" />
                        <span className="font-medium truncate">{file.name}</span>
                        <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </Button>
                      {isExpanded && (
                        <div className="w-full animate-in fade-in slide-in-from-top-1 duration-200">
                          <CodeBlock language={fileExtension} code={file.content} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </BubbleContent>
        </Bubble>

        {/* Rodapé da mensagem para ações extras e métricas de desempenho */}
        {!isEditing && (
          <MessageFooter className="m-1 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground"
                onClick={() => handleCopyMessage(mainContent, index)}
                title="Copiar mensagem"
              >
                {copiedMessageIndex === index ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>

              {isUser && handleSubmitEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground"
                  onClick={() => setIsEditing(true)}
                  title="Editar mensagem"
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
};
