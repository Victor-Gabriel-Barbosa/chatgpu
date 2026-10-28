import { useCallback, useEffect, useRef, useState } from "react";
import { WebWorkerMLCEngine, InitProgressReport, deleteModelAllInfoInCache, hasModelInCache } from "@mlc-ai/web-llm";
import { toast } from "sonner";

/** Identificador fixo do toast de progresso de carregamento do modelo. */
const LOADING_TOAST_ID = "loading-model";

/** Identificador fixo do toast da mensagem de erro. */
const ERROR_TOAST_ID = "loading-model-error";

/** Chave do `localStorage` usada para persistir o modelo selecionado entre sessões. */
const STORAGE_KEY = "chatgpu-model";

/** Instância singleton do motor WebLLM compartilhada entre invocações do hook. */
let engine: WebWorkerMLCEngine | null = null;

/** Instância singleton do Web Worker que executa o motor de IA em segundo plano. */
let worker: Worker | null = null;

/**
 * Retorna a instância singleton do motor WebLLM, criando o Web Worker e o motor na primeira chamada.
 *
 * @returns Instância compartilhada do {@link WebWorkerMLCEngine}.
 */
function getEngine(): WebWorkerMLCEngine {
  if (!engine) {
    worker = new Worker(new URL("@/lib/worker.ts", import.meta.url), {
      type: "module",
    });
    engine = new WebWorkerMLCEngine(worker);
  }
  return engine;
}

/**
 * Destrói as instâncias singleton do motor e do Web Worker, liberando seus recursos.
 *
 * @remarks
 * Termina o Web Worker e anula as referências do singleton para que sejam
 * recriados na próxima chamada a {@link getEngine}.
 */
function destroyEngineSingleton() {
  if (worker) {
    worker.terminate();
    worker = null;
  }
  engine = null;
}

/**
 * Cria um executor que serializa tarefas assíncronas, garantindo que apenas uma execute por vez.
 *
 * @remarks
 * Cada tarefa submetida via `run` é encadeada à anterior por meio de uma cadeia de Promises.
 * Isso evita condições de corrida ao recarregar o modelo durante carregamentos simultâneos.
 *
 * O método `reset` permite destravar a cadeia quando uma tarefa pendente nunca
 * resolve (ex.: worker terminado), possibilitando que novas tarefas executem.
 *
 * @returns Objeto com `run` (submete uma tarefa) e `reset` (destrava a cadeia).
 */
function createTaskQueue() {
  let chain = Promise.resolve();
  return {
    run<T>(task: () => Promise<T> | T): Promise<T> {
      const res = chain.then(task, task);
      chain = res.then(() => undefined, () => undefined);
      return res;
    },
    reset() {
      chain = Promise.resolve();
    },
  };
}

const taskQueue = createTaskQueue();

/**
 * Gerencia a inicialização, seleção e carregamento do motor de IA WebLLM via Web Worker.
 *
 * @remarks
 * - Restaura automaticamente o último modelo selecionado a partir do `localStorage`.
 * - Serializa recarregamentos de modelo para evitar condições de corrida.
 * - Exibe toasts de progresso/sucesso/erro durante o carregamento, incluindo botão "Cancelar".
 * - Emite o evento global `model-cache-updated` ao concluir o download de um modelo.
 *
 * @returns Objeto contendo a instância do motor, estado de prontidão,
 * estado de carregamento, modelo selecionado, função para alterar o modelo
 * e função para cancelar o carregamento em andamento.
 */
export function useEngine() {
  const [engine, setEngine] = useState<WebWorkerMLCEngine | null>(null);
  const [selectedModel, setSelectedModel] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const loadIdRef = useRef(0);

  /**
   * Cancela o carregamento do modelo em andamento.
   *
   * @remarks
   * Invalida o identificador de carregamento atual, destrói o Web Worker
   * e o motor singleton (que serão recriados sob demanda), limpa a seleção
   * de modelo e exibe um toast informativo.
   */
  const cancelLoading = useCallback(async () => {
    loadIdRef.current++;
    destroyEngineSingleton();
    taskQueue.reset();
    setEngine(null);
    setSelectedModel("");
    setIsReady(false);
    setIsLoading(false);

    try {
      const isCached = await hasModelInCache(selectedModel);
      if (!isCached) await deleteModelAllInfoInCache(selectedModel);
    } catch(e) {
      console.warn("Erro ao limpar cache do modelo:", e);
    }
  }, [selectedModel]);

  /**
   * Exibe ou atualiza o toast de progresso de carregamento do modelo.
   * @param percent - Percentual de progresso (0–100).
   */
  const showLoadingToast = useCallback((percent: number) => {
    const clamped = Math.min(100, Math.max(0, Math.round(percent)));
    toast.loading(`Carregando modelo (${clamped}%)`, {
      id: LOADING_TOAST_ID,
      duration: Infinity,
      description: "O download inicial pode demorar um pouco. Depois disso, as próximas aberturas serão muito mais rápidas",
      action: {
        label: "Cancelar",
        onClick: cancelLoading,
      },
    });
  },
    [cancelLoading]
  );

  /** Restaura o último modelo selecionado a partir do `localStorage`. */
  useEffect(() => {
    const savedModel = localStorage.getItem(STORAGE_KEY);
    if (savedModel) queueMicrotask(() => setSelectedModel(savedModel));
  }, []);

  /** Atualiza o `localStorage` com o modelo selecionado. */
  useEffect(() => {
    if (selectedModel) localStorage.setItem(STORAGE_KEY, selectedModel);
    else localStorage.removeItem(STORAGE_KEY);
  }, [selectedModel]);

  /** Carrega o modelo selecionado e atualiza o estado do hook. */
  useEffect(() => {
    if (!selectedModel) return;
    const currentLoadId = ++loadIdRef.current;
    const sharedEngine = getEngine();

    showLoadingToast(0);

    queueMicrotask(() => {
      setIsReady(false);
      setIsLoading(true);
    });

    sharedEngine.setInitProgressCallback((report: InitProgressReport) => {
      if (currentLoadId !== loadIdRef.current) return;
      showLoadingToast((report.progress ?? 0) * 100);
    });

    taskQueue.run(() => {
      if (currentLoadId !== loadIdRef.current) return;
      return sharedEngine.reload(selectedModel);
    })
      .then(() => {
        if (currentLoadId !== loadIdRef.current) return;
        setEngine(sharedEngine);
        setIsReady(true);
        setIsLoading(false);
        window.dispatchEvent(new CustomEvent("model-cache-updated"));
        toast.success("Modelo carregado e pronto para uso!", {
          id: LOADING_TOAST_ID,
          description: null,
          duration: 1000,
          action: null
        });
      })
      .catch((e) => {
        if (currentLoadId !== loadIdRef.current) return;
        setIsLoading(false);
        setSelectedModel("");
        console.error("Erro ao carregar o modelo:", e);
        toast.error("Erro ao carregar o WebGPU", {
          id: ERROR_TOAST_ID,
          description: "Utilize uma versão atualizada do Chrome ou Edge, verifique se o WebGPU é compatível com seu dispositivo e atualize os drivers de vídeo. Depois, recarregue a página e tente novamente",
          duration: Infinity,
          closeButton: true,
          action: {
            label: "Ver suporte",
            onClick: () => window.open("https://webgpureport.org/", "_blank"),
          },
        });
      });

    return () => {
      toast.dismiss(LOADING_TOAST_ID);
    };
  }, [selectedModel, showLoadingToast]);

  return { engine, isReady, isLoading, selectedModel, setSelectedModel, cancelLoading };
}
