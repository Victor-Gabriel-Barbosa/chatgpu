import { useState, useEffect, useRef } from "react";
import { WebWorkerMLCEngine, InitProgressReport } from "@mlc-ai/web-llm";
import { toast } from "sonner";
import { DEFAULT_MODEL_ID } from "@/constants/models";

const LOADING_TOAST_ID = "carregamento-modelo";

// Singleton do motor WebGPU (worker + engine) para reaproveitamento entre trocas de modelo e remontagens do componente
let engineSingleton: WebWorkerMLCEngine | null = null;
let workerSingleton: Worker | null = null;

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
 * Gerencia o estado e a lógica do motor de IA, incluindo a inicialização, seleção de modelo e feedback de carregamento.
 *
 * O motor (worker + engine) é um singleton reaproveitado entre trocas de modelo
 * e remontagens do componente; apenas reload() é chamado ao trocar de modelo.
 *
 * @returns Objeto contendo a instância do motor, estado de prontidão, ID do modelo selecionado e função para troca de modelo.
 */
export function useEngine() {
  const [engine, setEngine] = useState<WebWorkerMLCEngine | null>(null);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL_ID);
  const [isReady, setIsReady] = useState(false);
  const loadIdRef = useRef(0);

  // Carrega o modelo selecionado do localStorage ao montar o componente
  useEffect(() => {
    const savedModel = localStorage.getItem("chatgpu-model");
    if (savedModel) Promise.resolve().then(() => setSelectedModel(savedModel));
  }, []);

  // Salva o modelo selecionado no localStorage sempre que ele mudar
  useEffect(() => {
    if (selectedModel) localStorage.setItem("chatgpu-model", selectedModel);
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

      try {
        await sharedEngine.reload(selectedModel);
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