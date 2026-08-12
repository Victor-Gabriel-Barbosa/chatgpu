"use client";

import { useState } from "react";
import { Download, HardDrive, Loader2, RefreshCw, Trash2, X } from "lucide-react";
import { useModelCache, type ManagedModel } from "@/hooks/useModelCache";

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[80vh] flex flex-col rounded-2xl bg-white dark:bg-slate-800 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <HardDrive size={18} className="text-blue-500" />
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">
              Modelos baixados
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => refreshCacheStatus()}
              disabled={isChecking}
              aria-label="Verificar novamente"
              title="Verificar novamente"
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-40 transition-colors"
            >
              <RefreshCw size={16} className={isChecking ? "animate-spin" : ""} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              title="Fechar"
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Lista de modelos */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {isChecking && models.length === 0 ? (
            <div className="flex items-center justify-center gap-2 text-sm text-slate-500 py-8">
              <Loader2 size={16} className="animate-spin" />
              Verificando modelos baixados...
            </div>
          ) : (
            Object.entries(groups).map(([groupLabel, groupModels]) => (
              <div key={groupLabel}>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">
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
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                            {model.name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {isActive
                              ? "Baixado · em uso"
                              : model.isCached
                              ? "Baixado"
                              : "Não baixado"}
                          </p>
                        </div>

                        {isConfirming ? (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleConfirmDelete(model.id)}
                              className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
                            >
                              Remover
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmingDeleteId(null)}
                              className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : model.isCached ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(model)}
                            disabled={isDeleting || isGenerating}
                            title="Desinstalar modelo"
                            aria-label={`Desinstalar ${model.name}`}
                            className="shrink-0 p-2 rounded-lg text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-500 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                          >
                            {isDeleting ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleDownload(model.id)}
                            disabled={isGenerating}
                            title="Baixar modelo"
                            aria-label={`Baixar ${model.name}`}
                            className="shrink-0 flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white transition-colors"
                          >
                            <Download size={14} />
                            Baixar
                          </button>
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
          <div className="border-t border-slate-200 dark:border-slate-700 p-4 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center justify-between mb-1.5">
              <span>Armazenamento usado no navegador</span>
              <span>
                {storageEstimate.usedGB} GB / {storageEstimate.quotaGB} GB
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.min(100, storageEstimate.percent)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
