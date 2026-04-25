import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm"

// Worker para lidar com mensagens relacionadas ao MLCEngine
const handler = new WebWorkerMLCEngineHandler();

// Configura o listener para mensagens recebidas pelo worker
self.onmessage = async (msg: MessageEvent) => {
  handler.onmessage(msg)
}
