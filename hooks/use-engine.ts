import { useCallback, useEffect, useRef, useState } from "react";
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
 * Destrói as instâncias singleton do motor e do Web Worker, liberando seus recursos.
 *
 * @remarks
 * Termina o Web Worker e anula as referências do singleton para que sejam
 * recriados na próxima chamada a {@link getEngineSingleton}.
 */
function destroyEngineSingleton() {
  if (workerSingleton) {
    workerSingleton.terminate();
    workerSingleton = null;
  }
  engineSingleton = null;
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
function createExclusiveRunner() {
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

const exclusiveRunner = createExclusiveRunner();

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
  const cancelLoading = useCallback(() => {
    loadIdRef.current++;
    destroyEngineSingleton();
    exclusiveRunner.reset();
    setEngine(null);
    setSelectedModel("");
    setIsReady(false);
    setIsLoading(false);
    localStorage.removeItem(STORAGE_KEY);
    toast.info("Carregamento do modelo cancelado.", {
      id: LOADING_TOAST_ID,
      duration: 2000,
    });
  }, []);

  /**
   * Exibe ou atualiza o toast de progresso de carregamento do modelo.
   * @param percent - Percentual de progresso (0–100).
   */
  const showLoadingToast = useCallback(
    (percent: number) => {
      const clamped = Math.min(100, Math.max(0, Math.round(percent)));
      toast.loading(`Carregando modelo (${clamped}%)`, {
        id: LOADING_TOAST_ID,
        duration: Infinity,
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
    const sharedEngine = getEngineSingleton();

    queueMicrotask(() => {
      setIsReady(false);
      setIsLoading(true);
    });
    showLoadingToast(0);

    sharedEngine.setInitProgressCallback((report: InitProgressReport) => {
      if (currentLoadId !== loadIdRef.current) return;
      showLoadingToast((report.progress ?? 0) * 100);
    });

    exclusiveRunner.run(() => {
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
          duration: 1000,
        });
      })
      .catch((error) => {
        if (currentLoadId !== loadIdRef.current) return;
        setIsLoading(false);
        console.error("Erro ao carregar o modelo:", error);
        toast.error(`Erro ao carregar o WebGPU. Verifique suporte no navegador: ${error}`, {
          id: LOADING_TOAST_ID,
          duration: 5000,
        });
      });

    return () => {
      toast.dismiss(LOADING_TOAST_ID);
    };
  }, [selectedModel, showLoadingToast]);

  return { engine, isReady, isLoading, selectedModel, setSelectedModel, cancelLoading };
}
