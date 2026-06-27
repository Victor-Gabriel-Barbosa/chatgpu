import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm"

// Worker para lidar com mensagens relacionadas ao MLCEngine
const handler = new WebWorkerMLCEngineHandler();

/**
 * Captura e processa as mensagens recebidas pelo worker, repassando-as ao manipulador do motor de IA.
 *
 * @param msg Evento de mensagem recebido pelo contexto do Web Worker.
 */
globalThis.onmessage = async (msg: MessageEvent) => {
  handler.onmessage(msg)
}
