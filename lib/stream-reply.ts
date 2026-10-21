import { Message, MessageMetrics } from "@/types/chat";
import { round } from "./utils";
import { WebWorkerMLCEngine } from "@mlc-ai/web-llm";

/** Tag que marca o início do conteúdo de raciocínio. */
const THINK_OPEN = "<think>";

/** Tag que marca o final do conteúdo de raciocínio. */
const THINK_CLOSE = "</think>";

/** Intervalo de tempo em milissegundos entre cada atualização de renderização. */
const INTERVAL_MS = 50;

/**
 * Executa o streaming da resposta do assistente via WebLLM e atualiza as mensagens e métricas progressivamente.
 *
 * @remarks
 * Adiciona uma mensagem vazia com papel `assistant` ao histórico, consome o stream retornado
 * pelo motor MLC, calcula métricas de geração (como tokens por segundo e tempo até o primeiro token)
 * e persiste o resultado final no banco de dados local.
 *
 * @param engine - Instância ativa do motor Web Worker MLC.
 * @param chatHistory - Histórico de mensagens a ser enviado como contexto para o modelo.
 * @param chatId - Identificador do chat atual para persistência das mensagens.
 * @param setMessages - Função de atualização do estado local de mensagens.
 * @param updateChatMessages - Função responsável por atualizar as mensagens na lista de chats e no IndexedDB.
 * @param onSpeedUpdate - Callback opcional para notificar a velocidade atual de geração em tokens por segundo.
 */
export async function streamReply(
  engine: WebWorkerMLCEngine,
  chatHistory: Message[],
  chatId: string,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  updateChatMessages: (id: string, msgs: Message[]) => void,
  onSpeedUpdate?: (speed: number | null) => void,
) {
  setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

  const completion = await engine.chat.completions.create({
    stream: true,
    messages: chatHistory.map(({ role, content, files }) => ({
      role,
      content: [
        content,
        ...(files ?? []).map(
          (file) => `<file>\n${file.name}\n${file.content}\n</file>`,
        ),
      ]
        .filter(Boolean)
        .join("\n\n"),
    })),
    stream_options: { include_usage: true },
  });

  const startTime = performance.now();
  let resp = "";
  let think = "";
  let buffer = "";
  let insideThink = false;
  let tokenCount = 0;
  let firstTokenTime: number | null = null;
  let hasUsage = false;
  let lastRender = Number.NEGATIVE_INFINITY;
  let metrics: MessageMetrics = {};

  /** Processa o buffer, separando o conteúdo de raciocínio do texto da resposta. */
  const consume = (flush = false) => {
    while (buffer) {
      const tag = insideThink ? THINK_CLOSE : THINK_OPEN;
      const tagIndex = buffer.indexOf(tag);

      if (tagIndex !== -1) {
        const text = buffer.slice(0, tagIndex);
        if (insideThink) think += text;
        else resp += text;
        buffer = buffer.slice(tagIndex + tag.length);
        insideThink = !insideThink;
        continue;
      }

      let keep = 0;
      if (!flush) {
        const lastLt = buffer.lastIndexOf("<");
        if (lastLt !== -1 && tag.startsWith(buffer.slice(lastLt))) keep = buffer.length - lastLt;
      }

      const text = buffer.slice(0, buffer.length - keep);
      if (insideThink) think += text;
      else resp += text;
      buffer = buffer.slice(buffer.length - keep);
      return;
    }
  };

  /** Atualiza as métricas de geração em tempo real. */
  const updateMetrics = () => {
    if (hasUsage || firstTokenTime === null) return;

    const elapsed = (performance.now() - firstTokenTime) / 1000;
    metrics = {
      ...metrics,
      tokensPerSecond:
        elapsed > 0.05 ? round((tokenCount - 1) / elapsed) : metrics.tokensPerSecond,
      completionTokens: tokenCount,
      timeToFirstToken: round((firstTokenTime - startTime) / 1000, 2),
    };
  };

  /** Atualiza o estado da mensagem e notifica a velocidade de geração. */
  const render = () => {
    updateMetrics();

    const snapshot = { content: resp, think, metrics };
    setMessages((prev) => {
      const next = prev.slice();
      next[next.length - 1] = { ...next[next.length - 1], ...snapshot };
      return next;
    });
    onSpeedUpdate?.(metrics.tokensPerSecond ?? null);
  };

  try {
    for await (const chunk of completion) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        const now = performance.now();
        firstTokenTime ??= now;
        tokenCount++;

        buffer += delta;
        consume();

        if (now - lastRender >= INTERVAL_MS) {
          lastRender = now;
          render();
        }
      }

      if (chunk.usage) {
        const extra = chunk.usage.extra ?? {};
        hasUsage = true;
        metrics = {
          ...metrics,
          tokensPerSecond: round(extra.decode_tokens_per_s) ?? metrics.tokensPerSecond,
          prefillTokensPerSecond: round(extra.prefill_tokens_per_s),
          completionTokens: chunk.usage.completion_tokens ?? tokenCount,
          promptTokens: chunk.usage.prompt_tokens,
          totalTokens: chunk.usage.total_tokens,
        };
      }
    }
  } finally {
    consume(true);
    updateMetrics();
    metrics = {
      ...metrics,
      elapsedTime: round((performance.now() - startTime) / 1000, 2),
    };
    render();

    updateChatMessages(chatId, [
      ...chatHistory,
      { role: "assistant", content: resp, think, metrics },
    ]);
  }
}
