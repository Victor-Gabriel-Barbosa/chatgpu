import { useState, useEffect, useCallback, useMemo } from "react";
import { hasModelInCache, deleteModelAllInfoInCache } from "@mlc-ai/web-llm";
import { toast } from "sonner";
import { models as Models } from "@/config/models.json";
import type { ManagedModel, StorageEstimateInfo } from "@/types/model";
import { sleep } from "@/lib/utils";

/**
 * Gerencia o cache de modelos, incluindo verificação de existência, exclusão e estimativa de uso.
 * @returns Estado do cache de modelos.
 */
export function useModelCache() {
  const flatModels = useMemo(
    () =>
      Models.flatMap((group) =>
        group.options.map((option) => ({
          id: option.id,
          name: option.name,
          groupLabel: group.label,
          sizeGB: option.sizeGB,
          vramGB: option.vramGB
        }))
      ),
    []
  );

  const [cacheStatus, setCacheStatus] = useState<Record<string, boolean>>({});
  const [isChecking, setIsChecking] = useState(true);
  const [deletingModelId, setDeletingModelId] = useState<string | null>(null);
  const [storageEstimate, setStorageEstimate] = useState<StorageEstimateInfo | null>(null);

  /** Atualiza a estimativa de uso do armazenamento. */
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

  /** Atualiza o estado do cache de modelos. */
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
      refreshStorageEstimate();
    }
  }, [flatModels, refreshStorageEstimate]);

  /** Inicializa a verificação de cache quando o hook é montado. */
  useEffect(() => {
    queueMicrotask(() => refreshCacheStatus());
  }, [refreshCacheStatus]);

  /** Deleta um modelo do cache. */
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
        await sleep(500);
        await refreshStorageEstimate();
      }
    },
    [refreshStorageEstimate]
  );

  /** Atualiza o cache quando o evento global `model-cache-updated` é emitido. */
  useEffect(() => {
    window.addEventListener("model-cache-updated", refreshCacheStatus);
    return () => {
      window.removeEventListener("model-cache-updated", refreshCacheStatus);
    };
  }, [refreshCacheStatus]);

  /** Modelos gerenciados com estado de cache. */
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
