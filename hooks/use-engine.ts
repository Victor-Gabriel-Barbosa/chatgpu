import { useEffect, useRef, useState } from "react";
import { WebWorkerMLCEngine, InitProgressReport } from "@mlc-ai/web-llm";
import { toast } from "sonner";

/** Identificador fixo do toast de progresso de carregamento do modelo. */
const LOADING_TOAST_ID = "loading-model";

/** Chave do `localStorage` usada para persistir o modelo selecionado entre sessões. */
const STORAGE_KEY = "chatgpu-model";

/** Instância singleton do motor WebLLM compartilhada entre invocações do hook. */
let engineSingleton: WebWorkerMLCEngine | null = null;

/** Instância singleton do Web Worker que executa o motor de IA em segundo plano. */
let workerSingleton: Worker | null = null;

/**
 * Retorna a instância singleton do motor WebLLM, criando o Web Worker e o motor na primeira chamada.
 *
 * @returns Instância compartilhada do {@link WebWorkerMLCEngine}.
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
 * Exibe ou atualiza o toast de progresso de carregamento do modelo.
 *
 * @param percent - Percentual de progresso (0–100).
 */
function showLoadingToast(percent: number) {
  const clamped = Math.min(100, Math.max(0, Math.round(percent)));
  toast.loading(`Carregando modelo (${clamped}%)`, {
    id: LOADING_TOAST_ID,
    duration: Infinity,
  });
}

/**
 * Cria um executor que serializa tarefas assíncronas, garantindo que apenas uma execute por vez.
 *
 * @remarks
 * Cada tarefa submetida via `run` é encadeada à anterior por meio de uma cadeia de Promises.
 * Isso evita condições de corrida ao recarregar o modelo durante carregamentos simultâneos.
 *
 * @returns Função `run` que aceita uma tarefa e retorna sua Promise serializada.
 */
function createExclusiveRunner() {
  let chain = Promise.resolve();
  return function run<T>(task: () => Promise<T> | T): Promise<T> {
    const res = chain.then(task, task);
    chain = res.then(() => undefined, () => undefined);
    return res;
  };
}

const runExclusive = createExclusiveRunner();

/**
 * Gerencia a inicialização, seleção e carregamento do motor de IA WebLLM via Web Worker.
 *
 * @remarks
 * - Restaura automaticamente o último modelo selecionado a partir do `localStorage`.
 * - Serializa recarregamentos de modelo para evitar condições de corrida.
 * - Exibe toasts de progresso/sucesso/erro durante o carregamento.
 * - Emite o evento global `model-cache-updated` ao concluir o download de um modelo.
 *
 * @returns Objeto contendo a instância do motor, estado de prontidão,
 * modelo selecionado e função para alterar o modelo.
 */
export function useEngine() {
  const [engine, setEngine] = useState<WebWorkerMLCEngine | null>(null);
  const [selectedModel, setSelectedModel] = useState("");
  const [isReady, setIsReady] = useState(false);
  const loadIdRef = useRef(0);

  useEffect(() => {
    const savedModel = localStorage.getItem(STORAGE_KEY);
    if (savedModel) Promise.resolve().then(() => setSelectedModel(savedModel));
  }, []);

  useEffect(() => {
    if (selectedModel) localStorage.setItem(STORAGE_KEY, selectedModel);
    else localStorage.removeItem(STORAGE_KEY);
  }, [selectedModel]);

  useEffect(() => {
    if (!selectedModel) return;
    const currentLoadId = ++loadIdRef.current;
    const sharedEngine = getEngineSingleton();

    Promise.resolve().then(() => setIsReady(false));
    showLoadingToast(0);

    sharedEngine.setInitProgressCallback((report: InitProgressReport) => {
      if (currentLoadId !== loadIdRef.current) return;
      showLoadingToast((report.progress ?? 0) * 100);
    });

    runExclusive(() => {
      if (currentLoadId !== loadIdRef.current) return;
      return sharedEngine.reload(selectedModel);
    })
      .then(() => {
        if (currentLoadId !== loadIdRef.current) return;
        setEngine(sharedEngine);
        setIsReady(true);
        window.dispatchEvent(new CustomEvent("model-cache-updated"));
        toast.success("Modelo carregado e pronto para uso!", {
          id: LOADING_TOAST_ID,
          duration: 1000,
        });
      })
      .catch((error) => {
        if (currentLoadId !== loadIdRef.current) return;
        console.error("Erro ao carregar o modelo:", error);
        toast.error("Erro ao carregar o WebGPU. Verifique suporte no navegador", {
          id: LOADING_TOAST_ID,
          duration: 5000,
        });
      });

    return () => {
      toast.dismiss(LOADING_TOAST_ID);
    };
  }, [selectedModel]);

  return { engine, isReady, selectedModel, setSelectedModel };
}
