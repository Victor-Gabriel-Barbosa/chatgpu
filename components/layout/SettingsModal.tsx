import React, { useState } from 'react';
import { Settings, X, Cpu, Download, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { SUPPORTED_MODELS } from '@/constants/models';
import { useModelCache, type ManagedModel } from '@/hooks/useModelCache';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectLabel
} from "@/components/ui/select"

/**
 * Propriedades para o componente SettingsModal.
 */
export interface SettingsModalProps {
  /** Identificador do modelo de IA atualmente selecionado. */
  selectedModel: string;
  /** Função para atualizar o modelo de IA. */
  setSelectedModel: (model: string) => void;
  /** Função acionada ao tentar fechar o modal. */
  onClose: () => void;
  /** Indica se uma resposta está sendo gerada, para desabilitar ações de download/exclusão. */
  isGenerating?: boolean;
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
  selectedModel, setSelectedModel, onClose, isGenerating = false
}) => {
  const [selectMode, setSelectMode] = useState<string>(selectedModel);
  const {
    models,
    isChecking,
    deletingModelId,
    storageEstimate,
    deleteModel,
    refreshCacheStatus,
  } = useModelCache();
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  // Lida com a mudança de seleção do modelo
  const handleSelectChange = (value: string) => {
    setSelectMode(value);
  };

  // Lida com o salvamento das configurações, atualizando o modelo selecionado e fechando o modal
  const handleSave = () => {
    setSelectedModel(selectMode);
    onClose();
  };

  // Baixa um modelo diretamente a partir da lista, sem precisar passar pelo seletor + Salvar
  const handleDownload = (modelId: string) => {
    setSelectedModel(modelId);
    onClose();
  };

  // Pede confirmação antes de desinstalar o modelo atualmente em uso
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
      className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-colors duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto shadow-xl dark:shadow-2xl relative transition-colors duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
        <h2 className="text-xl font-semibold mb-6 text-slate-900 dark:text-white flex items-center gap-2 transition-colors">
          <Settings size={20} />
          Configurações
        </h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="model-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 transition-colors">
              Motor / Modelo
            </label>

            <Select value={selectedModel} onValueChange={handleSelectChange}>
              <SelectTrigger
                id="model-select"
                title="Selecionar modelo"
                className="w-full truncate p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-sm border-none"
              >
                <SelectValue placeholder="Selecionar modelo" />
              </SelectTrigger>
              <SelectContent position="popper" className="bg-slate-100 dark:text-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                {SUPPORTED_MODELS.map((group) => (
                  <SelectGroup key={group.label}>
                    <SelectLabel>{group.label}</SelectLabel>
                    {group.options.map((model) => (
                      <SelectItem key={model.id} value={model.id} className="hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg">
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="downloaded-models" className="block text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors">
                Modelos baixados
              </label>
              <button
                id="downloaded-models"
                type="button"
                onClick={() => refreshCacheStatus()}
                disabled={isChecking}
                title="Verificar novamente"
                aria-label="Verificar novamente"
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
              >
                <RefreshCw size={14} className={isChecking ? "animate-spin" : ""} />
              </button>
            </div>

            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {isChecking && models.length === 0 ? (
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 py-3">
                  <Loader2 size={14} className="animate-spin" />
                  Verificando modelos baixados...
                </div>
              ) : (
                models.map((model) => {
                  const isActive = model.id === selectedModel;
                  const isDeleting = deletingModelId === model.id;
                  const isConfirming = confirmingDeleteId === model.id;

                  return (
                    <div
                      key={model.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-800 dark:text-slate-100 truncate">
                          {model.name}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {isActive ? "Baixado · em uso" : model.isCached ? "Baixado" : "Não baixado"}
                        </p>
                      </div>

                      {isConfirming ? (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleConfirmDelete(model.id)}
                            className="text-[11px] font-medium px-2 py-1 rounded-md bg-red-500 hover:bg-red-600 text-white transition-colors"
                          >
                            Remover
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingDeleteId(null)}
                            className="text-[11px] font-medium px-2 py-1 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
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
                          className="shrink-0 p-1.5 rounded-md text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-500 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                        >
                          {isDeleting ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDownload(model.id)}
                          disabled={isGenerating}
                          title="Baixar modelo"
                          aria-label={`Baixar ${model.name}`}
                          className="shrink-0 flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white transition-colors"
                        >
                          <Download size={12} />
                          Baixar
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {storageEstimate && (
              <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
                {storageEstimate.usedGB} GB usados de {storageEstimate.quotaGB} GB no navegador
              </p>
            )}
          </div>
        </div>

        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-lg">
          <p className="text-xs text-blue-800 dark:text-blue-200/80 flex gap-2 items-start">
            <Cpu size={14} className="shrink-0 mt-0.5" />
            <span>
              <strong>Modelos WebGPU</strong> rodam no seu navegador usando o hardware do seu dispositivo. A primeira execução fará o download de múltiplos MB/GB de dados para o cache.
            </span>
          </p>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 text-white dark:text-black bg-slate-900 dark:bg-slate-200 hover:bg-slate-800 dark:hover:bg-slate-200 rounded-md transition-colors"
          >
            Salvar & Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
