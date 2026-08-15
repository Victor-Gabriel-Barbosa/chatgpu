import { useState, useEffect, useCallback, useMemo } from "react";
import { hasModelInCache, deleteModelAllInfoInCache } from "@mlc-ai/web-llm";
import { toast } from "sonner";
import { models as Models } from "@/config/models.json";

export interface ManagedModel {
  id: string;
  name: string;
  groupLabel: string;
  isCached: boolean;
}

export interface StorageEstimateInfo {
  usedGB: string;
  quotaGB: string;
  percent: number;
}

/**
 * Gerencia o estado de download dos modelos suportados: verifica quais já estão
 * presentes no cache do navegador (Cache Storage/IndexedDB) e permite desinstalar
 * (remover do cache) um modelo específico.
 *
 * O download em si reaproveita o fluxo já existente em useEngine (trocar o modelo
 * selecionado aciona o carregamento/cache automaticamente); este hook cuida apenas
 * de consultar e limpar o que já foi baixado.
 *
 * @returns Lista de modelos com status de cache, estimativa de uso de armazenamento,
 * estados de carregamento/exclusão e funções para atualizar e desinstalar um modelo.
 */
export function useModelCache() {
  const flatModels = useMemo(
    () =>
      Models.flatMap((group) =>
        group.options.map((option) => ({
          id: option.id,
          name: option.name,
          groupLabel: group.label,
        }))
      ),
    []
  );

  const [cacheStatus, setCacheStatus] = useState<Record<string, boolean>>({});
  const [isChecking, setIsChecking] = useState(true);
  const [deletingModelId, setDeletingModelId] = useState<string | null>(null);
  const [storageEstimate, setStorageEstimate] =
    useState<StorageEstimateInfo | null>(null);

  // Atualiza a estimativa de uso de armazenamento do navegador (quando suportado)
  const refreshStorageEstimate = useCallback(async () => {
    if (!navigator.storage?.estimate) return;
    try {
      const { usage = 0, quota = 0 } = await navigator.storage.estimate();
      setStorageEstimate({
        usedGB: (usage / 1e9).toFixed(2),
        quotaGB: (quota / 1e9).toFixed(2),
        percent: quota > 0 ? Math.round((usage / quota) * 100) : 0,
      });
    } catch {
      setStorageEstimate(null);
    }
  }, []);

  /**
   * Verifica, para cada modelo suportado, se ele já está presente no cache do navegador.
   * 
   * @returns Um objeto mapeando o ID do modelo para um booleano indicando se ele está em cache.
   */
  const refreshCacheStatus = useCallback(async () => {
    setIsChecking(true);
    try {
      const entries = await Promise.all(
        flatModels.map(async (model) => {
          try {
            return [model.id, await hasModelInCache(model.id)] as const;
          } catch {
            return [model.id, false] as const;
          }
        })
      );
      setCacheStatus(Object.fromEntries(entries));
    } finally {
      setIsChecking(false);
    }
    refreshStorageEstimate();
  }, [flatModels, refreshStorageEstimate]);

  // Inicializa o estado de cache e estimativa de armazenamento ao montar o hook
  useEffect(() => {
    Promise.resolve().then(() => refreshCacheStatus());
  }, [refreshCacheStatus]);

  /**
   * Remove um modelo baixado do cache do navegador (pesos, biblioteca wasm e configuração).
   *
   * @param modelId Identificador do modelo a ser desinstalado.
   */
  const deleteModel = useCallback(
    async (modelId: string) => {
      setDeletingModelId(modelId);
      try {
        await deleteModelAllInfoInCache(modelId);
        setCacheStatus((prev) => ({ ...prev, [modelId]: false }));
        toast.success("Modelo removido do dispositivo");
      } catch (error) {
        console.error("Erro ao remover modelo do cache:", error);
        toast.error("Não foi possível remover o modelo. Tente novamente");
      } finally {
        setDeletingModelId(null);
        refreshStorageEstimate();
      }
    },
    [refreshStorageEstimate]
  );

  // Combina os dados dos modelos suportados com o status de cache para fornecer uma lista completa
  const models: ManagedModel[] = useMemo(
    () =>
      flatModels.map((model) => ({
        ...model,
        isCached: cacheStatus[model.id] ?? false,
      })),
    [flatModels, cacheStatus]
  );

  return {
    models,
    isChecking,
    deletingModelId,
    storageEstimate,
    deleteModel,
    refreshCacheStatus,
  };
}
