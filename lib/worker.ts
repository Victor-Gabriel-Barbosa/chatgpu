import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm"

const handler = new WebWorkerMLCEngineHandler();

self.onmessage = async (msg: MessageEvent) => {
  handler.onmessage(msg)
}