"use client";

import React from 'react';
import { Settings, Cpu, Film, HardDrive, Sun, Moon, Monitor } from 'lucide-react';
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils"

/**
 * Propriedades do componente {@link SettingsModal}.
 */
export interface SettingsModalProps {
  /** Nome do modelo atualmente selecionado ou indefinido se nenhum estiver ativo. */
  modelName: string | undefined;

  /** Função de callback acionada para fechar o modal. */
  onClose: () => void;

  /** Função de callback opcional para exibir o vídeo de introdução. */
  onWatchIntroVideo?: () => void;

  /**
   * Função acionada para controlar a visibilidade do modal de gerenciamento de modelos.
   * 
   * @param isOpen - Valor booleano indicando se o modal de gerenciamento de modelos deve ser aberto.
   */
  setIsModelManagerOpen: (isOpen: boolean) => void;
}

/**
 * Exibe o modal de configurações da aplicação.
 *
 * @remarks
 * O modal permite gerenciar modelos WebGPU locais, alterar o tema visual
 * (claro, escuro ou sistema), acessar o vídeo introdutório e exibe informações
 * sobre o uso de hardware e cache do navegador.
 *
 * @param props - Propriedades utilizadas para configurar o componente.
 * @returns Elemento JSX representando o modal de configurações.
 */
export const SettingsModal: React.FC<SettingsModalProps> = ({
  modelName, onClose, onWatchIntroVideo, setIsModelManagerOpen
}) => {
  const { theme, setTheme } = useTheme();

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent aria-describedby="Configurações" className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings />
            Configurações
          </DialogTitle>
        </DialogHeader>

        {/* Botão de gerenciamento de modelos */}
        <Tooltip key="settings-model-manager-tooltip">
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              onClick={() => setIsModelManagerOpen(true)}
              aria-label="Gerenciar modelos"
            >
              <HardDrive /> {modelName ?? "Selecionar modelo"}
            </Button>
          </TooltipTrigger>
          <TooltipContent side={"right"}>
            <p>Gerenciar modelos</p>
          </TooltipContent>
        </Tooltip>

        {onWatchIntroVideo && (
          <Button
            variant="outline"
            className="w-full flex items-center justify-center"
            onClick={() => {
              onClose();
              onWatchIntroVideo();
            }}
          >
            <Film />
            Assistir introdução
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <Sun className="dark:hidden" />
              <Moon className="hidden dark:block" />
              <span>Tema</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              className={cn("justify-center", theme === "light" && "bg-accent")}
              onClick={() => setTheme("light")}
            >
              <Sun /> Claro
            </DropdownMenuItem>
            <DropdownMenuItem
              className={cn("justify-center", theme === "dark" && "bg-accent")}
              onClick={() => setTheme("dark")}
            >
              <Moon /> Escuro
            </DropdownMenuItem>
            <DropdownMenuItem
              className={cn("justify-center", theme === "system" && "bg-accent")}
              onClick={() => setTheme("system")}
            >
              <Monitor /> Sistema
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DialogFooter>
          <p className="text-xs text-foreground flex gap-3 items-center">
            <Cpu className="shrink-0" />
            <span>
              <strong>Modelos WebGPU</strong> rodam no seu navegador usando o hardware do seu dispositivo. A primeira execução fará o download de múltiplos MB/GB de dados para o cache.
            </span>
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
