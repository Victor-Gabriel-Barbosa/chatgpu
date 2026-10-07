import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Copy, Download, Code2, Maximize2, X, LayoutTemplate } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { copyToClipboard, downloadFile } from '@/lib/utils';

/** Propriedades do componente {@link CodeBlock}. */
export interface CodeBlockProps {
  /** Linguagem de programação do snippet de código (ex: 'typescript', 'html', 'python'). */
  language: string;

  /** Conteúdo textual do código a ser renderizado. */
  code: string;
}

/**
 * Exibe um bloco de código formatado com realce de sintaxe (syntax highlighting),
 * ações de cópia, download de arquivo e visualização em tempo real (preview) para código HTML.
 *
 * @remarks
 * Suporta alternância automática de estilo claro/escuro via Prism SyntaxHighlighter.
 * Quando o código for HTML, oferece uma aba de pré-visualização executada em iframe sandbox,
 * com suporte a modo de tela cheia renderizado através de portal React.
 *
 * @param props - Propriedades utilizadas para configurar o componente.
 * @returns Elemento JSX com a barra de ferramentas e o código ou preview renderizado.
 */
export function CodeBlock({
  language,
  code
}: Readonly<CodeBlockProps>) {
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const ext = language ? language.toLowerCase() : 'txt';
  const isHtml = ext === 'html';

  return (
    <div className="my-4 bg-background border border-border rounded-xl overflow-hidden shadow-sm w-full">
      <div className="bg-card px-4 py-2 text-xs flex justify-between items-center border-b border-border min-w-0 overflow-auto">
        <div className="flex items-center gap-4">
          <span className="font-sans lowercase">{language || 'code'}</span>

          {isHtml && (
            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as 'code' | 'preview')}
            >
              <TabsList>
                <TabsTrigger value="code">
                  <Code2 />
                  <span className="max-sm:hidden">Código</span>
                </TabsTrigger>
                <TabsTrigger value="preview">
                  <LayoutTemplate />
                  <span className="max-sm:hidden">Preview</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>

        {/* Botões de ação (maximizar preview, download e cópia) */}
        <div className="flex items-center gap-2">
          {isHtml && activeTab === 'preview' && (
            <Button
              variant="ghost"
              onClick={() => setIsFullscreen(true)}
              title="Maximizar preview"
              className="text-muted-foreground"
              size="icon"
            >
              <Maximize2 />
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => downloadFile(`snippet.${ext}`, code)}
            title="Download"
            className="text-muted-foreground"
            size="icon"
          >
            <Download />
          </Button>
          <Button
            variant="ghost"
            onClick={() => copyToClipboard(code)}
            title="Copiar código"
            className="text-muted-foreground"
            size="icon"
          >
            <Copy />
          </Button>
        </div>
      </div>

      {isHtml && activeTab === 'preview' ? (
        <div className="w-full">
          <iframe
            srcDoc={code}
            title="HTML Preview"
            className="w-full min-h-75 border-0"
            sandbox="allow-scripts allow-forms"
          />
        </div>
      ) : (
        /* Visualização do código */
        <div className="text-sm font-mono max-w-full overflow-x-auto">
          <div className="block dark:hidden">
            <SyntaxHighlighter
              language={ext}
              style={vs}
              customStyle={{ margin: 0, padding: '1rem', background: 'transparent', fontSize: '1rem', lineHeight: '1.5' }}
              PreTag="div"
            >
              {code}
            </SyntaxHighlighter>
          </div>
          <div className="hidden dark:block">
            <SyntaxHighlighter
              language={ext}
              style={vscDarkPlus}
              customStyle={{ margin: 0, padding: '1rem', background: 'transparent', fontSize: '1rem', lineHeight: '1.5' }}
              PreTag="div"
            >
              {code}
            </SyntaxHighlighter>
          </div>
        </div>
      )}

      {/* Preview em tela cheia */}
      {isFullscreen && typeof document !== 'undefined' ? createPortal(
        <div className="absolute inset-0 z-10 flex flex-col animate-in fade-in duration-800">
          <Button
            variant="secondary"
            onClick={() => setIsFullscreen(false)}
            title="Fechar preview"
            size="icon"
            className="absolute top-4 right-4"
          >
            <X />
          </Button>
          <iframe
            srcDoc={code}
            title="HTML Preview Fullscreen"
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-forms"
          />
        </div>,
        document.getElementById('main-chat-area') || document.body
      ) : null}
    </div>
  );
}
