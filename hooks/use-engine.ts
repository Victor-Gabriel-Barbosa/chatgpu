import { useState, useEffect, useRef } from "react";
import { WebWorkerMLCEngine, InitProgressReport } from "@mlc-ai/web-llm";
import { toast } from "sonner";
import { defaultModelId } from "@/config/models.json";

const LOADING_TOAST_ID = "loading-model";
const STORAGE_KEY = "chatgpu-model";

// Singleton do motor WebGPU (worker + engine) para reaproveitamento entre trocas de modelo e remontagens do componente
let engineSingleton: WebWorkerMLCEngine | null = null;
let workerSingleton: Worker | null = null;

// Fila de promessas para serializar chamadas a reload() e evitar concorrência entre múltiplas trocas de modelo
let reloadChain: Promise<void> = Promise.resolve();

/**
 * Retorna a instância singleton do motor WebGPU, criando se ainda não existir.
 *
 * @returns Instância do motor WebGPU.
 */
function getEngineSingleton(): WebWorkerMLCEngine {
  if (!engineSingleton) {
    workerSingleton = new Worker(new URL("@/lib/worker.ts", import.meta.url), {
      type: "module",
    });
    engineSingleton = new WebWorkerMLCEngine(workerSingleton);
  }
  return engineSingleton;
}

/**
 * Lê o modelo salvo no localStorage, se houver, ou o modelo padrão. Usado
 * como inicializador preguiçoso do estado para evitar uma segunda renderização
 * (e um segundo carregamento) logo após montar o componente.
 *
 * @returns ID do modelo a ser usado inicialmente.
 */
function getInitialModel(): string {
  if (typeof window === "undefined") return defaultModelId;
  return localStorage.getItem(STORAGE_KEY) || defaultModelId;
}

/**
 * Gerencia o estado e a lógica do motor de IA, incluindo a inicialização, seleção de modelo e feedback de carregamento.
 *
 * O motor (worker + engine) é um singleton reaproveitado entre trocas de modelo
 * e remontagens do componente; apenas reload() é chamado ao trocar de modelo.
 * As chamadas a reload() são serializadas numa fila para garantir que nunca
 * haja duas em andamento ao mesmo tempo.
 *
 * @returns Objeto contendo a instância do motor, estado de prontidão, ID do modelo selecionado e função para troca de modelo.
 */
export function useEngine() {
  const [engine, setEngine] = useState<WebWorkerMLCEngine | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>(getInitialModel);
  const [isReady, setIsReady] = useState(false);
  const loadIdRef = useRef(0);

  // Salva o modelo selecionado no localStorage sempre que ele mudar
  useEffect(() => {
    if (selectedModel) localStorage.setItem(STORAGE_KEY, selectedModel);
  }, [selectedModel]);

  /**
   * Exibe um toast de carregamento com progresso, atualizando o texto e a porcentagem conforme o progresso é reportado.
   *
   * @param percent Porcentagem de conclusão do carregamento.
   * @param text Texto descritivo do estado atual do carregamento.
   */
  const showLoadingToast = (percent: number, text: string) => {
    const clampedPercent = Math.min(100, Math.max(0, Math.round(percent)));

    toast.loading(`Carregando modelo (${clampedPercent}%)`, {
      id: LOADING_TOAST_ID,
      description: text,
      duration: Infinity,
    });
  };

  // Inicializa (ou reaproveita) o motor WebGPU singleton e carrega o modelo selecionado
  useEffect(() => {
    const currentLoadId = ++loadIdRef.current;

    const initEngine = async () => {
      setIsReady(false);
      showLoadingToast(0, "Inicializando motor WebGPU...");

      // Reaproveita o worker/engine já existente em vez de criar um novo
      const sharedEngine = getEngineSingleton();

      sharedEngine.setInitProgressCallback((report: InitProgressReport) => {
        if (currentLoadId !== loadIdRef.current) return;
        showLoadingToast((report.progress ?? 0) * 100, report.text);
      });

      // Serializa a chamada a reload() para evitar concorrência
      const runReload: Promise<void> = reloadChain.catch(() => {}).then(() => {
        if (currentLoadId !== loadIdRef.current) return;
        return sharedEngine.reload(selectedModel);
      });
      reloadChain = runReload;

      try {
        await runReload;
        if (currentLoadId !== loadIdRef.current) return;

        setEngine(sharedEngine);
        setIsReady(true);
        toast.success("Modelo carregado e pronto para uso!", {
          id: LOADING_TOAST_ID,
          duration: 1000,
        });
      } catch (error) {
        if (currentLoadId !== loadIdRef.current) return;
        console.error("Erro ao carregar o modelo:", error);
        toast.error("Erro ao carregar o WebGPU. Verifique suporte no navegador", {
          id: LOADING_TOAST_ID,
          duration: 5000,
        });
      }
    };

    initEngine();

    return () => {
      toast.dismiss(LOADING_TOAST_ID);
    };
  }, [selectedModel]);

  /**
   * Troca o modelo atualmente ativo.
   *
   * @param model Identificador do novo modelo a ser carregado.
   */
  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    setIsReady(false);
  };

  return { engine, isReady, selectedModel, handleModelChange };
}
