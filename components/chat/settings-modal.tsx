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
 * Propriedades para o componente SettingsModal.
 */
export interface SettingsModalProps {
  /** Nome do modelo de IA atualmente selecionado. */
  modelName: string | undefined;
  /** Função acionada ao tentar fechar o modal. */
  onClose: () => void;
  /** Função para abrir e assistir ao vídeo de introdução novamente. */
  onWatchIntroVideo?: () => void;
  /** Função para abrir ou fechar o modal de gerenciamento de modelos. */
  setIsModelManagerOpen: (isOpen: boolean) => void;
}

/**
 * Componente de modal para configurações, permitindo ao usuário selecionar o modelo de IA a ser utilizado.
 *
 * @param props Propriedades do componente.
 * @param props.selectedModel Modelo atualmente selecionado.
 * @param props.setSelectedModel Função para atualizar o modelo ativo.
 * @param props.onClose Função para fechar o modal.
 * @returns Elemento React contendo o modal de configurações.
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
