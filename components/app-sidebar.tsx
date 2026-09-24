"use client";

import Link from "next/link";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useState, useEffect, useRef } from "react";
import { Chat } from "@/types/chat";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  Plus,
  EllipsisVertical,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Trash2,
  Sun,
  Moon,
  Monitor,
  Upload,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

import { cn } from "@/lib/utils"

/**
 * Propriedades do componente {@link AppSidebar}.
 */
export interface AppSidebarProps {
  /** Lista das conversas (chats) existentes. */
  chats: Chat[];

  /** Identificador da conversa atualmente selecionada, ou nulo se nenhuma estiver. */
  currentChatId: string | null;

  /** Função para selecionar uma conversa a partir do seu ID. */
  setCurrentChatId: (id: string) => void;

  /** Função para iniciar uma nova conversa. */
  createNewChat: () => void;

  /**
   * Função acionada para excluir uma conversa selecionada.
   * 
   * @param id - Identificador da conversa a ser excluída.
   */
  deleteChat: (id: string) => void;

  /**
   * Função acionada para exportar uma conversa selecionada.
   * 
   * @param id - Identificador da conversa a ser exportada.
   */
  exportChat: (id: string) => void;

  /**
   * Função acionada para alterar o título de uma conversa.
   * 
   * @param id - Identificador da conversa a ser renomeada.
   * @param newTitle - Novo título da conversa.
   */
  renameChat: (id: string, newTitle: string) => void;

  /**
   * Função acionada para exibir o modal de configurações.
   * 
   * @param isOpen - Valor booleano indicando se o modal de configurações deve ser aberto.
   */
  setSettingsOpen: (isOpen: boolean) => void;
}

/**
 * Exibe a barra lateral principal da aplicação.
 * 
 * @remarks
 * Permite navegar entre as conversas, criar novos chats,
 * renomear, exportar e excluir conversas.
 * 
 * Também disponibiliza os controles de tema, configurações
 * da aplicação e expansão ou recolhimento da barra lateral.
 * 
 * @param props - Propriedades utilizadas para configurar a barra lateral.
*/
export const AppSidebar: React.FC<AppSidebarProps> = ({
  chats,
  currentChatId,
  setCurrentChatId,
  createNewChat,
  deleteChat,
  exportChat,
  renameChat,
  setSettingsOpen
}) => {
  const { theme, setTheme } = useTheme();
  const { state, isMobile, toggleSidebar, setOpenMobile } = useSidebar();
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const isExpanded = state === "expanded";
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
    setEditingName("");
  };

  // Cancela a renomeação e restaura o nome original
  const handleCancelRename = () => {
    setEditingChatId(null);
    setEditingName("");
  };

  // Lida com eventos de teclado no input de renomear
  const handleKeyDown = (e: React.KeyboardEvent, chatId: string) => {
    if (e.key === "Enter") handleSaveRename(chatId);
    else if (e.key === "Escape") handleCancelRename();
  };

  // Seleciona um chat e fecha a sidebar automaticamente no mobile
  const handleSelectChat = (id: string) => {
    if (editingChatId !== null) return;
    setCurrentChatId(id);
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon">
      {/* Cabeçalho (Logo e Toggle) */}
      <SidebarHeader>
        <div className="flex items-center">
          <Link
            href="/"
            className="flex flex-1 items-center mx-[6.5px] gap-2 overflow-hidden group-data-[collapsible=icon]:hidden"
          >
            <Image src="/icon0.svg" alt="ChatGPU" width={20} height={20} />
            <span className="font-semibold text-primary shimmer truncate whitespace-nowrap">
              ChatGPU
            </span>
          </Link>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                onClick={toggleSidebar}
                aria-label={isExpanded ? "Fechar barra lateral" : "Abrir barra lateral"}
                className="group/toggle text-muted-foreground"
                size="icon"
              >
                {isExpanded || isMobile ? (
                  <PanelLeftClose />
                ) : (
                  <>
                    <Image
                      className="absolute transition-opacity duration-200 opacity-100 group-hover/toggle:opacity-0"
                      src="/icon0.svg"
                      alt="ChatGPU"
                      width={20}
                      height={20}
                    />
                    <PanelLeftOpen className="absolute transition-opacity duration-400 opacity-0 group-hover/toggle:opacity-100" />
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{isExpanded ? "Minimizar" : "Expandir"}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton variant="outline" onClick={createNewChat} tooltip="Novo Chat">
                  <Plus strokeWidth={2.5} />
                  <span>Novo Chat</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Lista de Conversas */}
        <SidebarGroup>
          <SidebarGroupLabel>Conversas</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {chats.map((chat) => (
                <SidebarMenuItem key={chat.id}>
                  {editingChatId === chat.id ? (
                    <div className="flex h-8 items-center gap-2 rounded-md px-2">
                      <MessageSquare className="size-4 shrink-0" />
                      <input
                        id={`chat-title-input-${chat.id}`}
                        ref={inputRef}
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, chat.id)}
                        onBlur={() => handleSaveRename(chat.id)}
                        className="w-full min-w-0 truncate bg-transparent text-sm font-medium leading-none outline-none"
                      />
                    </div>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton
                          isActive={currentChatId === chat.id}
                          onClick={() => handleSelectChat(chat.id)}
                        >
                          <MessageSquare />
                          <span>{chat.title}</span>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      {!isMobile && (!isExpanded || chat.title.length > 20) && (
                        <TooltipContent side="right">
                          <p>{chat.title}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  )}

                  {editingChatId !== chat.id && (
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <SidebarMenuAction
                          showOnHover
                          className="peer-data-[active=true]/menu-button:opacity-100"
                        >
                          <EllipsisVertical />
                        </SidebarMenuAction>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent side={isMobile ? "bottom" : "right"} align="start">
                        <DropdownMenuItem onClick={() => exportChat(chat.id)}>
                          <Upload />
                          Exportar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingChatId(chat.id);
                            setEditingName(chat.title);
                          }}
                        >
                          <Pencil />
                          Renomear
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => deleteChat(chat.id)}
                        >
                          <Trash2 />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Rodapé (Tema e Configurações) */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton tooltip="Tema">
                  <Sun className="dark:hidden" />
                  <Moon className="hidden dark:block" />
                  <span>Tema</span>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side={isMobile ? "bottom" : isExpanded ? "top" : "right"} align="end">
                <DropdownMenuItem
                  className={cn(theme === "light" && "bg-accent")}
                  onClick={() => setTheme("light")}
                >
                  <Sun /> Claro
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={cn(theme === "dark" && "bg-accent")}
                  onClick={() => setTheme("dark")}
                >
                  <Moon /> Escuro
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={cn(theme === "system" && "bg-accent")}
                  onClick={() => setTheme("system")}
                >
                  <Monitor /> Sistema
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => setSettingsOpen(true)} tooltip="Configurações">
              <Settings />
              <span>Configurações</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
};
