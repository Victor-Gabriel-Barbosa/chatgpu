import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, Code2, Maximize2, Minimize2, LayoutTemplate } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { CodeBlockProps } from '../types/chat';

// Componente para exibir blocos de código com destaque de sintaxe, cópia para área de transferência e preview para HTML
export const CodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Lida com a cópia do código para a área de transferência
  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error('Copy failed', err);
    });
  };

  // Controla o overflow do body quando o preview está em fullscreen para evitar scroll indesejado
  useEffect(() => {
    if (isFullscreen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isFullscreen]);

  const validLanguage = language ? language.toLowerCase() : 'typescript';
  const isHtml = validLanguage === 'html';

  return (
    <div className="my-4 bg-gray-50 dark:bg-[#1E1E1E] rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm w-full">
      <div className="bg-gray-200/50 dark:bg-gray-800/80 px-4 py-2 text-xs text-gray-500 dark:text-gray-400 flex justify-between items-center border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-4">
          <span className="font-sans lowercase">{language || 'code'}</span>
          
          {isHtml && (
            <div className="flex items-center gap-1 bg-gray-300/50 dark:bg-gray-900/50 p-0.5 rounded-lg">
              <button
                onClick={() => setActiveTab('code')}
                className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${
                  activeTab === 'code' 
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
                    : 'hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Code2 size={14} />
                <span>Código</span>
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${
                  activeTab === 'preview' 
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
                    : 'hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <LayoutTemplate size={14} />
                <span>Preview</span>
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isHtml && activeTab === 'preview' && (
            <button 
              onClick={() => setIsFullscreen(true)}
              className="p-1.5 hover:bg-gray-300/50 dark:hover:bg-gray-700 rounded-md transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              title="Maximizar preview"
            >
              <Maximize2 size={14} />
            </button>
          )}
          <button 
            onClick={handleCopy}
            className="flex items-center gap-1.5 p-1.5 hover:bg-gray-300/50 dark:hover:bg-gray-700 rounded-md text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors font-sans"
            title="Copiar código"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
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
              language={validLanguage}
              style={vs}
              customStyle={{ margin: 0, padding: '1rem', background: 'transparent', fontSize: '1rem', lineHeight: '1.5' }}
              PreTag="div"
            >
              {code}
            </SyntaxHighlighter>
          </div>
          <div className="hidden dark:block">
            <SyntaxHighlighter
              language={validLanguage}
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
        <div className="absolute inset-0 z-9999 bg-white dark:bg-slate-900 flex flex-col animate-in fade-in duration-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-slate-800">
            <div className="flex items-center gap-2">
              <LayoutTemplate size={16} className="text-sky-500" />
              <span className="text-sm font-medium dark:text-white">Preview</span>
            </div>
            <button 
              onClick={() => setIsFullscreen(false)}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-900 transition-colors"
              title="Minimizar preview"
            >
              <Minimize2 size={20} />
            </button>
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
