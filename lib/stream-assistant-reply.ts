import { Message, MessageMetrics } from "@/types/chat";
import { round } from "./utils";
import { WebWorkerMLCEngine } from "@mlc-ai/web-llm";

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
export async function streamAssistantReply(
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
  let tokenCount = 0;
  let firstTokenTime: number | null = null;
  let pendingText = "";
  let insideThink = false;
  let metrics: MessageMetrics = {};

  const updateParsedOutput = () => {
    const append = (text: string) => {
      if (insideThink) think += text;
      else resp += text;
    };

    while (pendingText.length > 0) {
      const tag = insideThink ? "</think>" : "<think>";
      const tagIndex = pendingText.indexOf(tag);

      if (tagIndex !== -1) {
        append(pendingText.slice(0, tagIndex));
        pendingText = pendingText.slice(tagIndex + tag.length);
        insideThink = !insideThink;
        continue;
      }

      const lastLt = pendingText.lastIndexOf("<");
      const isPartialTag = lastLt >= 0 && tag.startsWith(pendingText.slice(lastLt));
      const cut = isPartialTag ? lastLt : pendingText.length;

      append(pendingText.slice(0, cut));
      pendingText = pendingText.slice(cut);
      return;
    }
  };

  const commit = (persist = false) => {
    setMessages((prev) => {
      const next = [...prev];
      next[next.length - 1] = { ...next[next.length - 1], content: resp, think, metrics };
      if (persist) updateChatMessages(chatId, next);
      return next;
    });
  };

  for await (const chunk of completion) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) {
      pendingText += delta;
      updateParsedOutput();
      tokenCount++;
      firstTokenTime ??= performance.now();

      const elapsed = (performance.now() - firstTokenTime) / 1000;
      const liveSpeed = elapsed > 0.05 ? (tokenCount - 1) / elapsed : undefined;

      metrics = {
        ...metrics,
        tokensPerSecond: round(liveSpeed),
        completionTokens: tokenCount,
        timeToFirstToken: round((firstTokenTime - startTime) / 1000, 2),
      };
      onSpeedUpdate?.(metrics.tokensPerSecond ?? null);
      commit();
    }

    if (chunk.usage) {
      const extra = chunk.usage.extra ?? {};
      metrics = {
        ...metrics,
        tokensPerSecond: round(extra.decode_tokens_per_s) ?? metrics.tokensPerSecond,
        prefillTokensPerSecond: round(extra.prefill_tokens_per_s),
        completionTokens: chunk.usage.completion_tokens ?? tokenCount,
        promptTokens: chunk.usage.prompt_tokens,
        totalTokens: chunk.usage.total_tokens,
      };
      onSpeedUpdate?.(metrics.tokensPerSecond ?? null);
    }
  }

  metrics.elapsedTime ??= round((performance.now() - startTime) / 1000, 2);
  commit(true);
}