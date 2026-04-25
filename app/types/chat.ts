import type { ChatCompletionMessageParam } from "@mlc-ai/web-llm";

// Tipos relacionados a chats e sessões de chat, incluindo mensagens, blocos de código e propriedades de chat
export interface Chat {
  id: string;
  title: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatCompletionMessageParam[];
  updatedAt: number;
}

export interface CodeBlockProps {
  language: string;
  code: string;
}
