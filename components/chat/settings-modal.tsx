import React, { useState } from 'react';
import { Settings, Cpu, Download, Loader, RefreshCw, Trash2, Film } from 'lucide-react';
import { models as Models } from '@/config/models.json';
import { useModelCache, type ManagedModel } from '@/hooks/useModelCache';
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
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
  /** Função para abrir e assistir ao vídeo de introdução novamente. */
  onWatchIntroVideo?: () => void;
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
  selectedModel, setSelectedModel, onClose, isGenerating = false, onWatchIntroVideo
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

  // Baixa um modelo diretamente a partir da lista
  const handleDownload = (modelId: string) => {
    setSelectedModel(modelId);
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

        <div className="space-y-4">
          <div>
            <label htmlFor="settings-model" className="block mb-1 transition-colors">
              Motor / Modelo
            </label>

            <Select name="settings-model" value={selectMode} onValueChange={handleSelectChange}>
              <SelectTrigger
                id="settings-model"
                title="Selecionar modelo"
                className="w-full truncate"
              >
                <SelectValue placeholder="Selecionar modelo" />
              </SelectTrigger>
              <SelectContent position="popper">
                {Models.map((group) => (
                  <SelectGroup key={group.label}>
                    <SelectLabel>{group.label}</SelectLabel>
                    {group.options.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
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
              <label htmlFor="downloaded-models" className="block transition-colors">
                Modelos baixados
              </label>
              <Button
                id="downloaded-models"
                variant="ghost"
                onClick={() => refreshCacheStatus()}
                disabled={isChecking}
                title="Verificar novamente"
                aria-label="Verificar novamente"
                size="icon"
              >
                <RefreshCw className={isChecking ? "animate-spin" : ""} />
              </Button>
            </div>

            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {isChecking && models.length === 0 ? (
                <div className="flex items-center gap-2 text-xs py-3">
                  <Loader className="animate-spin" />
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
                      className="flex items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">
                          {model.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {isActive ? "Baixado · em uso" : model.isCached ? "Baixado" : "Não baixado"}
                        </p>
                      </div>

                      {isConfirming ? (
                        <div className="flex items-center gap-1 shrink-0">
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
                })
              )}
            </div>

            {storageEstimate && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                {storageEstimate.usedGB} GB usados de {storageEstimate.quotaGB} GB no navegador
              </p>
            )}
          </div>
        </div>

        <div className="mt-2 p-2 border rounded-lg">
          <p className="text-xs text-foreground flex gap-2 items-center">
            <Cpu className="shrink-0 mt-0.5" />
            <span>
              <strong>Modelos WebGPU</strong> rodam no seu navegador usando o hardware do seu dispositivo. A primeira execução fará o download de múltiplos MB/GB de dados para o cache.
            </span>
          </p>
        </div>

        {onWatchIntroVideo && (
          <div className="pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              className="w-full flex items-center justify-center gap-2 text-xs"
              onClick={() => {
                onClose();
                onWatchIntroVideo();
              }}
            >
              <Film className="size-4 text-primary" />
              Assistir vídeo de introdução
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button onClick={handleSave}>
            Salvar & Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
