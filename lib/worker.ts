import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm"

/** Manipulador de mensagens do motor WebLLM executado no contexto do Web Worker. */
const handler = new WebWorkerMLCEngineHandler();

/**
 * Captura e processa as mensagens recebidas pelo worker, repassando-as ao manipulador do motor de IA.
 * @param msg - Evento de mensagem recebido pelo contexto do Web Worker.
 */
globalThis.onmessage = async (msg: MessageEvent) => {
  handler.onmessage(msg)
}
