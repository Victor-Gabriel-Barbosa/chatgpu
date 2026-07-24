import { useState, useEffect, useRef } from "react";
import { WebWorkerMLCEngine, InitProgressReport } from "@mlc-ai/web-llm";
import { Loader2 } from "lucide-react";
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

    toast.custom(
      () => (
        <div className="w-80 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <Loader2 size={16} className="animate-spin text-blue-500 shrink-0" />
            <span className="text-sm font-medium text-slate-800 dark:text-slate-100 flex-1 truncate">
              Carregando modelo
            </span>
            <span className="text-xs font-semibold text-blue-500 shrink-0">
              {clampedPercent}%
            </span>
          </div>
          <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${clampedPercent}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 truncate">
            {text}
          </p>
        </div>
      ),
      { id: LOADING_TOAST_ID, duration: Infinity }
    );
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