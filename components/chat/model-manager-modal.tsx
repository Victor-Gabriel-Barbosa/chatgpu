"use client";

import { useState } from "react";
import { Download, HardDrive, Loader, RefreshCw, Trash2, X } from "lucide-react";
import { useModelCache, type ManagedModel } from "@/hooks/use-model-cache";
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"

interface ModelManagerModalProps {
  selectedModel: string;
  isGenerating: boolean;
  onSelectModel: (modelId: string) => void;
  onClose: () => void;
}

/**
 * Modal de gerenciamento de modelos baixados.
 * 
 * Permite visualizar os modelos baixados, desinstalar modelos do cache e baixar novos modelos.
 */
export function ModelManagerModal({
  selectedModel,
  isGenerating,
  onSelectModel,
  onClose,
}: Readonly<ModelManagerModalProps>) {
  const { models, isChecking, deletingModelId, storageEstimate, deleteModel, refreshCacheStatus } =
    useModelCache();
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
    onClose();
  };

  // Inicia a exclusão de um modelo. Se o modelo estiver em uso, solicita confirmação.
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
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-lg max-h-[80vh] flex flex-col gap-0 p-0 rounded-2xl [&>button]:hidden"
      >
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
            Object.entries(groups).map(([groupLabel, groupModels]) => (
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
                        className="flex items-center justify-between gap-3 rounded-xl border bg-card px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {model.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {isActive
                              ? "Baixado · em uso"
                              : model.isCached
                                ? "Baixado"
                                : "Não baixado"}
                          </p>
                        </div>

                        {isConfirming ? (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button
                              variant="destructive"
                              onClick={() => handleConfirmDelete(model.id)}
                            >
                              Remover
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={() => setConfirmingDeleteId(null)}
                            >
                              Cancelar
                            </Button>
                          </div>
                        ) : model.isCached ? (
                          <Button
                            variant="destructive"
                            onClick={() => handleDeleteClick(model)}
                            disabled={isDeleting || isGenerating}
                            title="Desinstalar modelo"
                            aria-label={`Desinstalar ${model.name}`}
                          >
                            {isDeleting ? (
                              <Loader className="animate-spin" />
                            ) : (
                              <>
                                <Trash2 />
                                Excluir
                              </>
                            )}
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleDownload(model.id)}
                            disabled={isGenerating}
                            title="Baixar modelo"
                            aria-label={`Baixar ${model.name}`}
                          >
                            <Download />
                            Baixar
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
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
