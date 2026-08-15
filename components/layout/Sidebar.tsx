"use client";

import { useState, useEffect, useRef } from "react";
import { useTheme } from "next-themes";
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
import Link from "next/link";
import Image from "next/image";
import { Chat } from "@/types/chat";
import { Button } from "@/components/ui/button";
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
  Sidebar as SidebarPrimitive,
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

/**
 * Propriedades para o componente Sidebar.
 *
 * O estado de abertura/colapso não é mais controlado por fora: ele é
 * gerenciado internamente pelo `SidebarProvider` (ver app/layout.tsx) e
 * acessado aqui via o hook `useSidebar`.
 */
export interface SidebarProps {
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
}

/**
 * Componente de barra lateral para navegação entre chats, criação de novos chats e acesso às configurações.
 * Construído sobre as primitivas `Sidebar` do shadcn/ui (colapsa para uma trilha de ícones no
 * desktop e vira um painel off-canvas no mobile).
 *
 * @param props Propriedades do componente.
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
  const isExpanded = state === "expanded";
  
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    Promise.resolve(() => setMounted(true));
  }, []);

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
    <SidebarPrimitive collapsible="icon">
      {/* Cabeçalho (Logo e Toggle) */}
      <SidebarHeader>
        <div className="flex h-10 items-center">
          <Link
            href="/"
            className="flex flex-1 items-center gap-2 overflow-hidden px-1 group-data-[collapsible=icon]:hidden"
          >
            <Image src="/icon0.svg" alt="ChatGPU" width={22} height={22} className="shrink-0" />
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
                className="group/toggle size-8 shrink-0"
                size="icon"
              >
                {isExpanded ? (
                  <PanelLeftClose />
                ) : (
                  <div className="relative size-5 flex items-center justify-center">
                    <Image
                      className="absolute transition-opacity duration-200 opacity-100 group-hover/toggle:opacity-0"
                      src="/icon0.svg"
                      alt="ChatGPU"
                      width={20}
                      height={20}
                    />
                    <PanelLeftOpen className="absolute transition-opacity duration-200 opacity-0 group-hover/toggle:opacity-100" />
                  </div>
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
        {/* Botão Novo Chat */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton variant="outline" onClick={createNewChat} tooltip="Novo Chat">
                  <Plus />
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
                        <DropdownMenuItem
                          onClick={() => exportChat(chat.id)}
                        >
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
                  {!mounted ? (
                    <Monitor />
                  ) : theme === "light" ? (
                    <Sun />
                  ) : theme === "dark" ? (
                    <Moon />
                  ) : (
                    <Monitor />
                  )}
                  <span>Tema</span>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side={isMobile ? "bottom" : "right"} align="end">
                <DropdownMenuItem
                  className={theme === "light" ? "bg-accent text-accent-foreground" : ""}
                  onClick={() => setTheme("light")}
                >
                  <Sun /> Claro
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={theme === "dark" ? "bg-accent text-accent-foreground" : ""}
                  onClick={() => setTheme("dark")}
                >
                  <Moon /> Escuro
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={theme === "system" ? "bg-accent text-accent-foreground" : ""}
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
    </SidebarPrimitive>
  );
};
