import React, { useState } from 'react';
import { Check, Copy, Lightbulb, ChevronDown, Pencil, Paperclip } from 'lucide-react';
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

import { cn } from "@/lib/utils";

export interface ChatMessageProps {
  msg: MessageType;
  index: number;
  copiedMessageIndex: number | null;
  handleCopyMessage: (content: string, index: number) => void;
  handleSubmitEdit?: (newContent: string, index: number) => void;
  isLastAssistant?: boolean;
  isGenerating?: boolean;
}

/**
 * Preprocessa o conteúdo substituindo delimitadores LaTeX para o formato compatível com o renderizador.
 *
 * @param content Conteúdo original da mensagem.
 * @returns Conteúdo formatado para renderização de fórmulas matemáticas.
 */
const preprocessLaTeX = (content: string) => {
  if (!content) return '';
  return content
    .replaceAll(String.raw`\[`, '$$$$')
    .replaceAll(String.raw`\]`, '$$$$')
    .replaceAll(String.raw`\(`, '$')
    .replaceAll(String.raw`\)`, '$');
};

/**
 * Separa o bloco de raciocínio e os arquivos do conteúdo principal da mensagem.
 *
 * @param content Conteúdo completo da mensagem.
 * @returns Um objeto contendo o raciocínio, o conteúdo principal e a lista de arquivos.
 */
const parseMessageContent = (content: string) => {
  if (!content) return { think: null, mainContent: '', files: [] };

  const files: { name: string, content: string }[] = [];
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
 * Componente para exibir mensagens de chat, com suporte a edição, cópia e renderização de Markdown com LaTeX e tags <think>.
 *
 * @param props Propriedades do componente.
 * @param props.msg Objeto representando os dados da mensagem.
 * @param props.index Índice da mensagem atual na lista.
 * @param props.copiedMessageIndex Índice da mensagem copiada, se houver.
 * @param props.handleCopyMessage Função para lidar com a cópia da mensagem.
 * @param props.handleSubmitEdit Função para submeter edições feitas pelo usuário.
 * @param props.isLastAssistant Flag que identifica se é a última mensagem do assistente.
 * @returns Elemento React contendo a mensagem renderizada.
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
        <MessageAvatar className={isGenerating && isLastAssistant ? "animate-[spin_2s_linear_infinite]" : ""}>
          <Avatar>
            <AvatarImage src="/icon0.svg" alt="ChatGPU" />
            <AvatarFallback>AI</AvatarFallback>
          </Avatar>
        </MessageAvatar>
      )}

      <MessageContent className="min-h-16">
        {/* Bloco de Raciocínio */}
        {displayReasoning && !isUser && (
          <div className="mb-3 pb-3">
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
              <div className="mt-2 p-3 border border-primary/20 bg-primary/5 text-primary rounded-lg text-xs leading-relaxed animate-in fade-in slide-in-from-top-2 duration-200">
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

        {/* Rodapé da mensagem para ações extras */}
        {!isEditing && (
          <MessageFooter className="m-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              onClick={() => handleCopyMessage(msg.content, index)}
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
          </MessageFooter>
        )}
      </MessageContent>
    </Message>
  );
};
