import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm"

// Worker para lidar com mensagens relacionadas ao MLCEngine, utilizando o handler fornecido pela biblioteca @mlc-ai/web-llm
const handler = new WebWorkerMLCEngineHandler();

// Configura o listener para mensagens recebidas pelo worker, delegando o processamento ao handler
self.onmessage = async (msg: MessageEvent) => {
  handler.onmessage(msg)
}
