import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, Download, Code2, Maximize2, Minimize2, LayoutTemplate } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

/**
 * Propriedades para o componente CodeBlock.
 */
export interface CodeBlockProps {
  /** Linguagem de programação do bloco de código. */
  language: string;
  /** O código fonte a ser renderizado. */
  code: string;
}

/**
 * Componente para exibir blocos de código com destaque de sintaxe, cópia para área de transferência e preview para HTML.
 *
 * @param props Propriedades do componente.
 * @param props.language Linguagem do código para formatação.
 * @param props.code Conteúdo do código.
 * @returns Elemento React contendo o bloco de código formatado e suas ferramentas.
 */
export const CodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Lida com a cópia do código para a área de transferência
  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Copiado para a área de transferência");
    }).catch(err => {
      console.error('Copy failed', err);
      toast.error("Falha ao copiar o código. Tente novamente");
    });
  };

  // Lida com o download do código
  const handleDownload = () => {
    const filename = `snippet.${ext}`;

    // Cria um Blob com o conteúdo do código
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    // Cria um elemento <a> temporário para forçar o download
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;

    // Adiciona ao DOM, clica e remove em seguida
    document.body.appendChild(link);
    link.click();
    link.remove();

    // Limpa a URL criada para liberar memória
    URL.revokeObjectURL(url);
  };

  // Controla o overflow do body quando o preview está em fullscreen para evitar scroll indesejado
  useEffect(() => {
    if (isFullscreen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isFullscreen]);

  const ext = language ? language.toLowerCase() : 'txt';
  const isHtml = ext === 'html';

  return (
    <div className="my-4 bg-background border rounded-xl overflow-hidden shadow-sm w-full">
      <div className="bg-card px-4 py-2 text-xs flex justify-between items-center border-b min-w-0 overflow-auto">
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

        <div className="flex items-center gap-2">
          {isHtml && activeTab === 'preview' && (
            <Button
              variant="ghost"
              onClick={() => setIsFullscreen(true)}
              title="Maximizar preview"
              size="icon"
            >
              <Maximize2 />
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={handleDownload}
            title="Download"
            className="text-muted-foreground"
            size="icon"
          >
            <Download />
          </Button>
          <Button
            variant="ghost"
            onClick={handleCopy}
            title="Copiar código"
            className="text-muted-foreground"
            size="icon"
          >
            {copied ? <Check /> : <Copy />}
          </Button>
        </div>
      </div>

      {isHtml && activeTab === 'preview' ? (
        <div className="bg-white w-full">
          <iframe
            srcDoc={code}
            title="HTML Preview"
            className="w-full min-h-75 border-0"
            sandbox="allow-scripts allow-forms"
          />
        </div>
      ) : (
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
              customStyle={{ margin: 0, padding: '1rem', background: 'transparent', fontSize: '0.875rem', lineHeight: '1.5' }}
              PreTag="div"
            >
              {code}
            </SyntaxHighlighter>
          </div>
        </div>
      )}

      {isFullscreen && typeof document !== 'undefined' ? createPortal(
        <div className="absolute inset-0 z-10 bg-background flex flex-col animate-in fade-in duration-200">
          <div className="flex items-center justify-between px-4 py-3 bg-background">
            <div className="flex items-center gap-2">
              <LayoutTemplate className="text-foreground" />
              <span className="text-xl font-semibold text-foreground">Preview</span>
            </div>
            <Button
              variant="ghost"
              onClick={() => setIsFullscreen(false)}
              title="Minimizar preview"
              size="icon"
            >
              <Minimize2 />
            </Button>
          </div>
          <div className="flex-1 bg-white">
            <iframe
              srcDoc={code}
              title="HTML Preview Fullscreen"
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-forms"
            />
          </div>
        </div>,
        document.getElementById('main-chat-area') || document.body
      ) : null}
    </div>
  );
};
