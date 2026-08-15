import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Plus, EllipsisVertical, Settings, PanelLeftClose, PanelLeftOpen, Pencil, Trash2, Sun, Moon, Monitor, Minus, Upload } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Chat } from '@/types/chat';
import type { Theme } from "@/types/theme";
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/**
 * Propriedades para o componente Sidebar.
 */
export interface SidebarProps {
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
  deleteChat: (id: string) => void;
  /** Função para exportar uma conversa selecionada. */
  exportChat: (id: string) => void;
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
 * @param props.exportChat Função para exportar um chat.
 * @param props.renameChat Função para renomear um chat.
 * @param props.setSettingsOpen Função para abrir as configurações.
 * @param props.theme Tema visual atualmente aplicado.
 * @param props.setTheme Função para aplicar novo tema visual.
 * @returns Elemento React contendo o layout da barra lateral de navegação.
 */
export const Sidebar: React.FC<SidebarProps> = ({
  isSidebarOpen, setIsSidebarOpen, chats, currentChatId, setCurrentChatId, createNewChat, deleteChat, exportChat, renameChat, setSettingsOpen, theme = 'system', setTheme = () => { }
}) => {
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

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
        className={`fixed inset-0 z-30 md:hidden transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      <div className={`
        ${isSidebarOpen ? 'translate-x-0 w-64 visible' : '-translate-x-full w-64 invisible md:visible md:translate-x-0 md:w-16'} 
        fixed md:relative p-2 inset-y-0 left-0 z-40 
        bg-background flex flex-col transition-all duration-300 ease-in-out shrink-0 
      `}>
        {/* Cabeçalho (Logo e Toggle) */}
        <div className="relative flex items-center h-14 w-full shrink-0">
          <Link
            href="/"
            tabIndex={isSidebarOpen ? 0 : -1}
            className={`flex items-center overflow-hidden transition-all duration-300 absolute left-0 ${isSidebarOpen ? 'w-50 opacity-100' : 'w-0 opacity-0'}`}
          >
            <div className={`w-12 h-14 flex items-center justify-center shrink-0 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
              <Image src="/icon0.svg" alt="ChatGPU" width={24} height={24} />
            </div>
            <span className="font-semibold text-primary shimmer whitespace-nowrap">
              ChatGPU
            </span>
          </Link>

          <Tooltip key={`toggle-${isSidebarOpen}`}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={`group w-12 h-10 flex items-center justify-center shrink-0 dark:hover:text-white dark:hover:bg-slate-900 transition-all duration-300 absolute ${isSidebarOpen ? 'right-0' : 'left-0'}`}
                size="icon"
              >
                {isSidebarOpen ? <PanelLeftClose /> : (
                  <div className="relative w-6 h-6 flex items-center justify-center">
                    <Image className="absolute transition-opacity duration-200 opacity-100 group-hover:opacity-0" src="/icon0.svg" alt="ChatGPU" width={24} height={24} />
                    <PanelLeftOpen className="absolute transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
                  </div>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side={"right"}>
              <p>{isSidebarOpen ? "Minimizar" : "Expandir"}</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Botão Novo Chat */}
        <Tooltip key={`newchat-${isSidebarOpen}`}>
          <TooltipTrigger asChild>
            <Button
              onClick={createNewChat}
              className="items-center justify-start w-full"
              size="icon"
            >
              <div className="w-12 h-10 flex items-center justify-center shrink-0">
                <div className="w-6 h-6 flex items-center justify-center transition-colors">
                  <Plus strokeWidth={2.5} />
                </div>
              </div>
              <span className={`font-medium text-sm whitespace-nowrap transition-all duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
                Novo Chat
              </span>
            </Button>
          </TooltipTrigger>
          {!isSidebarOpen && (
            <TooltipContent side={"right"}>
              <p>Novo Chat</p>
            </TooltipContent>
          )}
        </Tooltip>

        {/* Lista de Conversas */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col gap-1 custom-scrollbar -mx-2">
          <div className={`overflow-hidden transition-all duration-300 shrink-0 flex items-end h-6 opacity-100 mb-1 ${!isSidebarOpen && 'w-15 justify-center'}`}>
            <p className="px-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">
              {isSidebarOpen ? "Conversas" : <Minus />}
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
                    className={`hover:bg-secondary group flex items-center h-10 cursor-pointer rounded-lg transition-all duration-300 shrink-0 ${currentChatId === chat.id
                      ? 'bg-secondary'
                      : ''
                      }`}
                  >
                    <div className="w-12 h-10 -mx-0.5 flex items-center justify-center shrink-0">
                      <MessageSquare size={20} />
                    </div>

                    {/* Título ou Input */}
                    <div className={`flex items-center transition-all duration-300 overflow-hidden ${isSidebarOpen ? 'flex-1 opacity-100 pr-2' : 'w-0 opacity-0 pr-0'
                      }`}>
                      {editingChatId === chat.id ? (
                        <input
                          id={`chat-title-input-${chat.id}`}
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
                    >
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            onClick={(e) => e.stopPropagation()}
                            tabIndex={isSidebarOpen ? 0 : -1}
                            className={`rounded-full opacity-0 max-md:opacity-100 group-hover:opacity-100 focus:opacity-100 transition-opacity ${currentChatId === chat.id ? 'opacity-100' : ''}`}
                            size="icon"
                          >
                            <EllipsisVertical />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side="right" align="start">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              exportChat(chat.id);
                            }}
                          >
                            <Upload />
                            Exportar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingChatId(chat.id);
                              setEditingName(chat.title);
                            }}
                          >
                            <Pencil />
                            Renomear
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteChat(chat.id);
                            }}
                          >
                            <Trash2 />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </TooltipTrigger>
                {(!isSidebarOpen || chat.title.length > 20) && (
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
          <DropdownMenu modal={false}>
            <Tooltip key={`theme-${isSidebarOpen}`}>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="items-center justify-start w-full"
                    size="icon"
                  >
                    <div className="w-12 h-10 flex items-center justify-center shrink-0">
                      {theme === 'light' ? <Sun /> : theme === 'dark' ? <Moon /> : <Monitor />}
                    </div>
                    <span className={`text-sm font-medium whitespace-nowrap transition-all duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'
                      }`}>
                      Tema
                    </span>
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              {!isSidebarOpen && (
                <TooltipContent side={"right"}>
                  <p>Tema</p>
                </TooltipContent>
              )}
            </Tooltip>

            <DropdownMenuContent
              side={isSidebarOpen ? "top" : "right"}
              align="start"
            >
              <DropdownMenuItem
                className={theme === "light" ? "bg-accent text-accent-foreground" : ""}
                onClick={() => setTheme('light')}
              >
                <Sun /> Claro
              </DropdownMenuItem>
              <DropdownMenuItem
                className={theme === "dark" ? "bg-accent text-accent-foreground" : ""}
                onClick={() => setTheme('dark')}
              >
                <Moon /> Escuro
              </DropdownMenuItem>
              <DropdownMenuItem
                className={theme === "system" ? "bg-accent text-accent-foreground" : ""}
                onClick={() => setTheme('system')}
              >
                <Monitor /> Sistema
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Tooltip key={`config-${isSidebarOpen}`}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                onClick={() => setSettingsOpen(true)}
                className="items-center justify-start w-full"
                size="icon"
              >
                <div className="w-12 h-10 flex items-center justify-center shrink-0">
                  <Settings />
                </div>
                <span className={`text-sm font-medium whitespace-nowrap transition-all duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'
                  }`}>
                  Configurações
                </span>
              </Button>
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
