import { memo, useMemo } from 'react';
import { CodeBlock } from '@/components/code-block';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import rehypeKatex from 'rehype-katex';

import { normalizeMarkdown } from "@/lib/utils";

const remarkPlugins = [remarkGfm, remarkMath, remarkBreaks];
const rehypePlugins = [rehypeKatex];

/**
 * Componente genérico para renderização de Markdown.
 *
 * @param children - Conteúdo em Markdown para renderização.
 * @param components - Componentes customizados para substituição dos padrões do Markdown.
 */
export const Markdown = memo(function Markdown({
  children,
  components,
}: {
  children: string;
  components?: Components;
}) {
  const content = useMemo(() => normalizeMarkdown(children), [children]);
  return (
    <ReactMarkdown
      remarkPlugins={remarkPlugins}
      rehypePlugins={rehypePlugins}
      components={components}
    >
      {content}
    </ReactMarkdown>
  );
});

/** Mapeamento de componentes customizados para renderização de Markdown no bloco de raciocínio. */
export const reasoningComponents: Components = {
  pre: ({ children }) => <div className="w-full max-w-full min-w-0 overflow-x-auto">{children}</div>,
  code(props) {
    const { children, className, ...rest } = props;
    const match = /language-(\w+)/.exec(className || '');
    return match ? (
      <CodeBlock lang={match[1]} code={(children as string ?? '').replace(/\n$/, '')} />
    ) : (
      <code className="px-1.5 py-0.5 rounded text-xs font-mono wrap-break-word" {...rest}>
        {children}
      </code>
    );
  },
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">{children}</a>,
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>
}

/** Mapeamento de componentes customizados para renderização de Markdown no corpo da mensagem. */
export const messageComponents: Components = {
  pre: ({ children }) => <div className="w-full max-w-full min-w-0 overflow-x-auto">{children}</div>,
  code(props) {
    const { children, className, ...rest } = props;
    const match = /language-(\w+)/.exec(className || '');
    return match ? (
      <CodeBlock lang={match[1]} code={(children as string ?? '').replace(/\n$/, '')} />
    ) : (
      <code className="px-1.5 py-0.5 rounded text-sm font-mono wrap-break-word" {...rest}>
        {children}
      </code>
    );
  },
  h1: ({ children }) => <h1 className="text-2xl font-bold mt-4 mb-2">{children}</h1>,
  h2: ({ children }) => <h2 className="text-xl font-bold mt-3 mb-2">{children}</h2>,
  h3: ({ children }) => <h3 className="text-lg font-bold mt-2 mb-1">{children}</h3>,
  ul: ({ children }) => <ul className="list-disc list-inside my-2 space-y-1 ml-2">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside my-2 space-y-1 ml-2">{children}</ol>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  hr: () => <hr className="border border-border my-4" />,
  a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer" className="hover:underline break-all">{children}</a>,
  p: ({ children }) => <p className="mb-2 last:mb-0 max-w-full">{children}</p>
}
