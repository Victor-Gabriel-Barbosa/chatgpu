"use client";

import { useState } from "react";
import { Download, HardDrive, Loader, RefreshCw, Trash2, X } from "lucide-react";
import { useModelCache } from "@/hooks/use-model-cache";
import type { ManagedModel } from "@/types/model";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Propriedades do componente {@link ModelManagerModal}.
 */
interface ModelManagerModalProps {
  /** Identificador do modelo atualmente selecionado. */
  selectedModel: string;

  /** Indica se há uma geração de resposta em andamento. */
  isGenerating: boolean;

  /**
   * Disparado quando um modelo é selecionado para uso ou para início de download.
   *
   * @param modelId - Identificador do modelo selecionado.
   */
  onSelectModel: (modelId: string) => void;

  /** Função de retorno para fechar o diálogo modal. */
  onClose: () => void;
}

/**
 * Exibe o diálogo modal para gerenciamento de modelos de IA e do cache de armazenamento local.
 *
 * @remarks
 * Permite visualizar o status dos modelos baixados, selecionar o modelo ativo,
 * iniciar o download de novos modelos, remover modelos do cache e consultar
 * a estimativa de uso do armazenamento do navegador.
 *
 * @param props - Propriedades utilizadas para configurar o componente.
 * @returns Elemento JSX contendo a estrutura do modal de gerenciamento de modelos.
 */
export function ModelManagerModal({
  selectedModel,
  isGenerating,
  onSelectModel,
  onClose,
}: Readonly<ModelManagerModalProps>) {
  const { models, isChecking, deletingModelId, storageEstimate, deleteModel, refreshCacheStatus } = useModelCache();
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  // Agrupa os modelos pelo mesmo rótulo usado no seletor principal
  const groups: Record<string, ManagedModel[]> = {};
  for (const model of models) {
    if (!groups[model.groupLabel]) groups[model.groupLabel] = [];
    groups[model.groupLabel].push(model);
  }

  // Seleciona um modelo para download e fecha o modal
  const handleDownload = (modelId: string) => {
    onSelectModel(modelId);
  };

  // Inicia a exclusão de um modelo. Se o modelo estiver em uso, solicita confirmação
  const handleDeleteClick = (model: ManagedModel) => {
    if (model.id === selectedModel) {
      setConfirmingDeleteId(model.id);
      return;
    }
    deleteModel(model.id);
  };

  // Confirma a exclusão de um modelo que estava em uso
  const handleConfirmDelete = (modelId: string) => {
    setConfirmingDeleteId(null);
    deleteModel(modelId);
    onSelectModel("");
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col gap-0 p-0 rounded-2xl [&>button]:hidden">
        {/* Cabeçalho */}
        <DialogHeader className="flex-row items-center justify-between gap-2 p-4 space-y-0">
          <div className="flex items-center gap-2">
            <HardDrive />
            <DialogTitle className="font-semibold text-base">
              Modelos baixados
            </DialogTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              onClick={() => refreshCacheStatus()}
              disabled={isChecking}
              aria-label="Verificar novamente"
              title="Verificar novamente"
              size="icon"
            >
              <RefreshCw className={isChecking ? "animate-spin" : ""} />
            </Button>
            <DialogClose asChild>
              <Button
                variant="ghost"
                aria-label="Fechar"
                title="Fechar"
                size="icon"
              >
                <X />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <DialogDescription className="sr-only">
          Visualize os modelos já baixados, baixe novos modelos ou remova modelos que não são mais necessários.
        </DialogDescription>

        {/* Lista de modelos */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {isChecking && models.length === 0 ? (
            <div className="flex items-center justify-center gap-2 text-sm py-8">
              <Loader className="animate-spin" />
              Verificando modelos baixados...
            </div>
          ) : (
            <RadioGroup
              value={selectedModel}
              onValueChange={onSelectModel}
              className="space-y-6"
            >
              {Object.entries(groups).map(([groupLabel, groupModels]) => (
                <div key={groupLabel}>
                  <h3 className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-2">
                    {groupLabel}
                  </h3>
                  <div className="space-y-1.5">
                    {groupModels.map((model) => {
                      const isActive = model.id === selectedModel;
                      const isDeleting = deletingModelId === model.id;
                      const isConfirming = confirmingDeleteId === model.id;

                      return (
                        <div
                          key={model.id}
                          className={cn(
                            "flex items-center justify-between gap-3 rounded-xl border bg-card p-3 transition-colors",
                            isActive && "border-primary bg-accent/40"
                          )}
                        >
                          {/* Seletor de Modelo */}
                          <label
                            htmlFor={`model-${model.id}`}
                            className={cn(
                              "flex items-center gap-3 min-w-0 flex-1",
                              model.isCached && !isGenerating
                                ? "cursor-pointer"
                                : "cursor-not-allowed opacity-70"
                            )}
                          >
                            <RadioGroupItem
                              value={model.id}
                              id={`model-${model.id}`}
                              disabled={!model.isCached || isGenerating}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate leading-none">
                                {model.name}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {model.isCached ? "Baixado " : "Não baixado "}
                                (~{model.size} GB)
                              </p>
                            </div>
                          </label>

                          {/* Ações adicionais (Excluir/Baixar) */}
                          <div className="flex items-center justify-between gap-3 shrink-0">
                            {isConfirming ? (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleConfirmDelete(model.id)}
                                >
                                  Remover
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => setConfirmingDeleteId(null)}
                                >
                                  Cancelar
                                </Button>
                              </div>
                            ) : model.isCached ? (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteClick(model)}
                                disabled={isDeleting || isGenerating}
                                title="Desinstalar modelo"
                                aria-label={`Desinstalar ${model.name}`}
                              >
                                {isDeleting ? (
                                  <Loader className="animate-spin" />
                                ) : (
                                  <>
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    Excluir
                                  </>
                                )}
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => handleDownload(model.id)}
                                disabled={isGenerating}
                                title="Baixar modelo"
                                aria-label={`Baixar ${model.name}`}
                              >
                                <Download className="w-4 h-4 mr-1" />
                                Baixar
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </RadioGroup>
          )}
        </div>

        {/* Rodapé com uso de armazenamento */}
        {storageEstimate && (
          <DialogFooter className="m-2 text-xs text-muted-foreground sm:justify-start block">
            <div className="flex items-center justify-between mb-1.5">
              <span>Armazenamento usado no navegador</span>
              <span>
                {storageEstimate.usedGB} GB / {storageEstimate.quotaGB} GB
              </span>
            </div>
            <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.min(100, storageEstimate.percent)}%` }}
              />
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
