"use client";

import { useState } from "react"
import { useTheme } from "next-themes";
import { Settings as SettingsIcon, Cpu, HardDrive, Sun, Moon, Monitor, Trash2, TriangleAlert } from 'lucide-react';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { cn } from "@/lib/utils"
import { clearStorage } from "@/lib/clear-storage"

/** Propriedades do componente {@link Settings}. */
export interface SettingsProps {
  /** Nome do modelo atualmente selecionado ou indefinido se nenhum estiver ativo. */
  modelName: string | undefined;

  /** Função de callback acionada para fechar o modal. */
  onClose: () => void;

  /**
   * Função acionada para controlar a visibilidade do modal de gerenciamento de modelos.
   * @param isOpen - Valor booleano indicando se o modal de gerenciamento de modelos deve ser aberto.
   */
  setIsModelManagerOpen: (isOpen: boolean) => void;

  /** Classe CSS adicional para o componente. */
  className?: string;
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
export function Settings({
  modelName,
  onClose,
  setIsModelManagerOpen,
  className
}: Readonly<SettingsProps>) {
  const { theme, setTheme } = useTheme();
  const [confirmText, setConfirmText] = useState("");

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent aria-describedby="Configurações" className={cn("max-w-md max-h-[85vh] overflow-y-auto", className)}>
        {/* Cabeçalho */}
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SettingsIcon />
            Configurações
          </DialogTitle>

          <DialogDescription className="sr-only">
            Configure o tema da aplicação, gerencie os modelos locais e acesse outras opções.
          </DialogDescription>
        </DialogHeader>

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

        <Dialog onOpenChange={(open) => { if (!open) setConfirmText(""); }}>
          <DialogTrigger asChild>
            <Button variant="destructive">
              <Trash2 />
              Limpar dados
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <TriangleAlert />
                Limpar dados da aplicação?
              </DialogTitle>
              <DialogDescription className="pt-2">
                <span className="block">Essa ação é irreversível. Todas as conversas, configurações e modelos baixados armazenados localmente serão removidos.</span>
                <span className="block pt-2">Para continuar, digite <strong className="text-foreground">Confirmar</strong>.</span>
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-2">
              <Label htmlFor="confirm-clear" className="sr-only">
                Digite Confirmar para continuar
              </Label>

              <Input
                id="confirm-clear"
                placeholder="Digite Confirmar"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                autoComplete="off"
              />
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>

              <DialogClose asChild>
                <Button
                  variant="destructive"
                  disabled={confirmText !== "Confirmar"}
                  onClick={clearStorage}
                >
                  Limpar dados
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
}
