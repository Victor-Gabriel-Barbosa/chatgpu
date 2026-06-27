import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Plus, EllipsisVertical, Settings, PanelLeftClose, PanelLeft, Pencil, Trash2, Sun, Moon, Monitor } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Chat } from '@/types/chat';
import type { Theme } from "@/types/theme";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/**
 * Propriedades para o componente Sidebar.
 */
interface SidebarProps {
  /** Indica se a barra lateral está expandida (aberta). */
  isSidebarOpen: boolean;
  /** Função para atualizar o estado de expansão da barra lateral. */
  setIsSidebarOpen: (isOpen: boolean) => void;
  /** Lista das conversas (chats) existentes. */
  chats: Chat[];
  /** Identificador da conversa atualmente selecionada, ou nulo se nenhuma estiver. */
  currentChatId: string | null;
  /** Função para selecionar uma conversa a partir do seu ID. */
  setCurrentChatId: (id: string) => void;
  /** Função para iniciar uma nova conversa. */
  createNewChat: () => void;
  /** Função para excluir uma conversa selecionada. */
  deleteChat: (e: React.MouseEvent<HTMLButtonElement>, id: string) => void;
  /** Função para alterar o título de uma conversa. */
  renameChat: (id: string, newTitle: string) => void;
  /** Função para exibir o modal de configurações. */
  setSettingsOpen: (isOpen: boolean) => void;
  /** Tema de interface ativo (claro, escuro ou do sistema). */
  theme?: Theme;
  /** Função para atualizar o tema de interface. */
  setTheme?: (theme: Theme) => void;
}

/**
 * Componente de barra lateral para navegação entre chats, criação de novos chats e acesso às configurações.
 *
 * @param props Propriedades do componente.
 * @param props.isSidebarOpen Estado de abertura da barra lateral.
 * @param props.setIsSidebarOpen Função para alternar a abertura.
 * @param props.chats Lista de chats disponíveis.
 * @param props.currentChatId ID do chat atualmente ativo.
 * @param props.setCurrentChatId Função para alterar o chat ativo.
 * @param props.createNewChat Função para criar um novo chat.
 * @param props.deleteChat Função para excluir um chat.
 * @param props.renameChat Função para renomear um chat.
 * @param props.setSettingsOpen Função para abrir as configurações.
 * @param props.theme Tema visual atualmente aplicado.
 * @param props.setTheme Função para aplicar novo tema visual.
 * @returns Elemento React contendo o layout da barra lateral de navegação.
 */
export const Sidebar: React.FC<SidebarProps> = ({
  isSidebarOpen, setIsSidebarOpen, chats, currentChatId, setCurrentChatId, createNewChat, deleteChat, renameChat, setSettingsOpen, theme = 'system', setTheme = () => { }
}) => {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fecha menus abertos ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-menu-trigger]')) setOpenMenuId(null);
      if (!target.closest('[data-theme-trigger]')) setThemeMenuOpen(false);
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Foca no input de renomear quando o modo de edição é ativado
  useEffect(() => {
    if (editingChatId !== null && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingChatId]);

  // Salva o novo nome do chat
  const handleSaveRename = (chatId: string) => {
    if (editingName.trim()) renameChat(chatId, editingName.trim());
    setEditingChatId(null);
    setEditingName('');
  };

  // Cancela a renomeação e restaura o nome original
  const handleCancelRename = () => {
    setEditingChatId(null);
    setEditingName('');
  };

  // Lida com eventos de teclado no input de renomear
  const handleKeyDown = (e: React.KeyboardEvent, chatId: string) => {
    if (e.key === 'Enter') handleSaveRename(chatId);
    else if (e.key === 'Escape') handleCancelRename();
  };

  return (
    <>
      {/* Overlay para mobile */}
      <div
        className={`fixed inset-0 bg-black/20 dark:bg-black/60 z-30 md:hidden transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      <div className={`
        ${isSidebarOpen ? 'translate-x-0 w-64 visible' : '-translate-x-full w-64 invisible md:visible md:translate-x-0 md:w-16'} 
        fixed md:relative p-2 inset-y-0 left-0 z-40 
        bg-slate-100 dark:bg-slate-950 flex flex-col transition-all duration-300 ease-in-out shrink-0 
      `}>
        {/* Cabeçalho (Logo e Toggle) */}
        <div className="relative flex items-center h-14 w-full shrink-0">
          <Link
            href="/"
            tabIndex={isSidebarOpen ? 0 : -1}
            className={`flex items-center overflow-hidden transition-all duration-300 absolute left-0 ${isSidebarOpen ? 'w-50 opacity-100' : 'w-0 opacity-0'}`}
          >
            <div className="w-12 h-14 flex items-center justify-center shrink-0">
              <Image src="/icon0.svg" alt="ChatGPU" width={24} height={24} />
            </div>
            <span className="font-semibold text-blue-500 whitespace-nowrap">
              ChatGPU
            </span>
          </Link>

          <Tooltip key={`toggle-${isSidebarOpen}`}>
            <TooltipTrigger asChild>
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={`group w-12 h-10 flex items-center justify-center shrink-0 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-900 transition-all duration-300 absolute ${isSidebarOpen ? 'right-0' : 'left-0'}`}
              >
                {isSidebarOpen ? <PanelLeftClose size={20} /> : (
                  <div className="relative w-6 h-6 flex items-center justify-center">
                    <Image className="absolute transition-opacity duration-200 opacity-100 group-hover:opacity-0" src="/icon0.svg" alt="ChatGPU" width={24} height={24} />
                    <PanelLeft className="absolute transition-opacity duration-200 opacity-0 group-hover:opacity-100" size={20} />
                  </div>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side={"right"}>
              <p>{isSidebarOpen ? "Minimizar" : "Expandir"}</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Botão Novo Chat */}
        <Tooltip key={`newchat-${isSidebarOpen}`}>
          <TooltipTrigger asChild>
            <button
              onClick={createNewChat}
              className="group flex items-center h-10 w-full bg-transparent hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors shrink-0 overflow-hidden"
            >
              <div className="w-12 h-10 flex items-center justify-center shrink-0">
                <div className="w-6 h-6 bg-slate-900 text-white dark:bg-white dark:text-black rounded-full flex items-center justify-center transition-colors">
                  <Plus size={16} strokeWidth={2.5} />
                </div>
              </div>
              <span className={`font-medium text-sm whitespace-nowrap transition-all duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
                Novo Chat
              </span>
            </button>
          </TooltipTrigger>
          {!isSidebarOpen && (
            <TooltipContent side={"right"}>
              <p>Novo Chat</p>
            </TooltipContent>
          )}
        </Tooltip>

        {/* Lista de Conversas */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col gap-1 custom-scrollbar -mx-2">
          <div className="overflow-hidden transition-all duration-300 shrink-0 flex items-end h-6 opacity-100 mb-1">
            <p className="px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
              {isSidebarOpen ? "Conversas" : ''}
            </p>
          </div>

          <div className={`${isSidebarOpen
            ? 'mx-2'
            : 'mx-2 mr-auto'
            }`}>
            {chats.map(chat => (
              <Tooltip key={`${chat.id}-${isSidebarOpen}`}>
                <TooltipTrigger asChild>
                  <div 
                    key={chat.id}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.target !== e.currentTarget) return;
                      if ((e.key === 'Enter' || e.key === ' ') && editingChatId === null) {
                        e.preventDefault();
                        setCurrentChatId(chat.id);
                        if (globalThis.window !== undefined && window.innerWidth < 768) setIsSidebarOpen(false);
                      }
                    }}
                    onClick={() => {
                      if (editingChatId === null) {
                        setCurrentChatId(chat.id);
                        if (globalThis.window !== undefined && window.innerWidth < 768) setIsSidebarOpen(false);
                      }
                    }}
                    className={`group flex items-center h-10 cursor-pointer rounded-lg transition-all duration-300 shrink-0 ${currentChatId === chat.id
                      ? 'bg-slate-300/60 text-slate-900 dark:bg-slate-800/80 dark:text-white'
                      : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white'
                      }`}
                  >
                    <div className="w-12 h-10 -mx-0.5 flex items-center justify-center shrink-0">
                      <MessageSquare size={16} />
                    </div>

                    {/* Título ou Input */}
                    <div className={`flex items-center transition-all duration-300 overflow-hidden ${isSidebarOpen ? 'flex-1 opacity-100 pr-2' : 'w-0 opacity-0 pr-0'
                      }`}>
                      {editingChatId === chat.id ? (
                        <input
                          ref={inputRef}
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, chat.id)}
                          onBlur={() => handleSaveRename(chat.id)}
                          className="w-full bg-transparent truncate text-sm font-medium rounded outline-none p-0 m-0 leading-none"
                        />
                      ) : (
                        <span className="truncate text-sm font-medium">{chat.title}</span>
                      )}
                    </div>

                    {/* Menu de Opções (Três pontinhos) */}
                    <div
                      className={`shrink-0 flex items-center justify-center transition-all duration-300 overflow-visible relative ${isSidebarOpen ? 'w-10 opacity-100' : 'w-0 opacity-0'}`}
                      data-menu-trigger
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === chat.id ? null : chat.id);
                        }}
                        tabIndex={isSidebarOpen ? 0 : -1}
                        className={`text-slate-500 hover:text-slate-900 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-800 dark:hover:text-white p-1 rounded-full opacity-0 max-md:opacity-100 group-hover:opacity-100 focus:opacity-100 transition-opacity ${currentChatId === chat.id ? 'opacity-100' : ''
                          }`}
                      >
                        <EllipsisVertical size={14} />
                      </button>

                      {openMenuId === chat.id && isSidebarOpen && (
                        <div className="absolute right-0 top-full mr-2 bg-white dark:bg-slate-900 rounded-lg shadow-md dark:shadow-lg z-50 min-w-32 transition-colors">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingChatId(chat.id);
                              setEditingName(chat.title);
                              setOpenMenuId(null);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 rounded-t-lg transition-colors"
                          >
                            <Pencil size={14} />
                            Renomear
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteChat(e, chat.id);
                              setOpenMenuId(null);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:text-red-600 hover:bg-red-50 dark:text-slate-300 dark:hover:text-red-400 dark:hover:bg-slate-800 rounded-b-lg transition-colors"
                          >
                            <Trash2 size={14} />
                            Excluir
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </TooltipTrigger>
                {(!isSidebarOpen || chat.title.length > 19) && (
                  <TooltipContent side={"right"}>
                    <p>{chat.title}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            ))}
          </div>
        </div>

        {/* Rodapé (Tema e Configurações) */}
        <div className="flex flex-col mt-auto gap-1 transition-colors shrink-0">
          <div className="relative" data-theme-trigger>
            <Tooltip key={`theme-${isSidebarOpen}`}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setThemeMenuOpen(!themeMenuOpen)}
                  className="flex items-center h-10 w-full hover:bg-slate-200 text-slate-600 hover:text-slate-900 dark:hover:bg-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg transition-all duration-300 overflow-hidden"
                >
                  <div className="w-12 h-10 flex items-center justify-center shrink-0">
                    {theme === 'light' ? <Sun size={18} /> : theme === 'dark' ? <Moon size={18} /> : <Monitor size={18} />}
                  </div>
                  <span className={`text-sm font-medium whitespace-nowrap transition-all duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'
                    }`}>
                    Tema
                  </span>
                </button>
              </TooltipTrigger>
              {!isSidebarOpen && (
                <TooltipContent side={"right"}>
                  <p>Tema</p>
                </TooltipContent>
              )}
            </Tooltip>

            {themeMenuOpen && (
              <div className={`absolute bottom-full mb-1 bg-white dark:bg-slate-800 rounded-lg shadow-lg z-50 p-1 flex flex-col gap-0.5 transition-colors ${isSidebarOpen ? 'left-0 w-full' : 'left-full ml-2 w-36'}`}>
                <button
                  onClick={() => { setTheme('light'); setThemeMenuOpen(false); }}
                  className={`flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${theme === 'light' ? 'bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-white' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'}`}
                >
                  <Sun size={14} /> Claro
                </button>
                <button
                  onClick={() => { setTheme('dark'); setThemeMenuOpen(false); }}
                  className={`flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${theme === 'dark' ? 'bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-white' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'}`}
                >
                  <Moon size={14} /> Escuro
                </button>
                <button
                  onClick={() => { setTheme('system'); setThemeMenuOpen(false); }}
                  className={`flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${theme === 'system' ? 'bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-white' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'}`}
                >
                  <Monitor size={14} /> Sistema
                </button>
              </div>
            )}
          </div>

          <Tooltip key={`config-${isSidebarOpen}`}>
            <TooltipTrigger asChild>
              <button
                onClick={() => setSettingsOpen(true)}
                className="flex items-center h-10 w-full text-slate-600 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-900 dark:text-slate-400 rounded-lg transition-all duration-300 overflow-hidden"
              >
                <div className="w-12 h-10 flex items-center justify-center shrink-0">
                  <Settings size={18} />
                </div>
                <span className={`text-sm font-medium whitespace-nowrap transition-all duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'
                  }`}>
                  Configurações
                </span>
              </button>
            </TooltipTrigger>
            {!isSidebarOpen && (
              <TooltipContent side={"right"}>
                <p>Configurações</p>
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </div>
    </>
  );
};
