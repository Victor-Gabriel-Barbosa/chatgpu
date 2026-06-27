import { useState, useEffect } from "react";
import { WebWorkerMLCEngine, InitProgressReport } from "@mlc-ai/web-llm";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_MODEL_ID } from "@/constants/models";

const LOADING_TOAST_ID = "carregamento-modelo";

/**
 * Gerencia o estado e a lógica do motor de IA, incluindo a inicialização, seleção de modelo e feedback de carregamento.
 *
 * @returns Objeto contendo a instância do motor, estado de prontidão, ID do modelo selecionado e função para troca de modelo.
 */
export function useEngine() {
  const [engine, setEngine] = useState<WebWorkerMLCEngine | null>(null);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL_ID);
  const [isReady, setIsReady] = useState(false);

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
            <Loader2 size={16} className="animate-spin text-sky-500 shrink-0" />
            <span className="text-sm font-medium text-slate-800 dark:text-slate-100 flex-1 truncate">
              Carregando modelo
            </span>
            <span className="text-xs font-semibold text-sky-500 shrink-0">
              {clampedPercent}%
            </span>
          </div>
          <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-sky-500 rounded-full transition-all duration-300 ease-out"
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

  // Inicializa o motor WebGPU, configurando o callback de progresso e lidando com erros de carregamento
  useEffect(() => {
    let worker: Worker;

    const initEngine = async () => {
      showLoadingToast(0, "Inicializando motor WebGPU...");

      worker = new Worker(new URL("@/lib/worker.ts", import.meta.url), {
        type: "module",
      });

      const newEngine = new WebWorkerMLCEngine(worker);

      newEngine.setInitProgressCallback((report: InitProgressReport) => {
        showLoadingToast((report.progress ?? 0) * 100, report.text);
      });

      try {
        await newEngine.reload(selectedModel);
        setEngine(newEngine);
        setIsReady(true);
        toast.success("Modelo carregado e pronto para uso!", {
          id: LOADING_TOAST_ID,
          duration: 1000,
        });
      } catch (error) {
        console.error("Erro ao carregar o modelo:", error);
        toast.error("Erro ao carregar o WebGPU. Verifique suporte no navegador", {
          id: LOADING_TOAST_ID,
          duration: 5000,
        });
      }
    };

    initEngine();

    return () => {
      if (worker) worker.terminate();
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
    setEngine(null);
  };

  return { engine, isReady, selectedModel, handleModelChange };
}
