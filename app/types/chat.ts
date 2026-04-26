// Tipos relacionados a chats e sessões de chat, incluindo mensagens, blocos de código e propriedades de chat
export interface Chat {
  id: string;
  title: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

export interface CodeBlockProps {
  language: string;
  code: string;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  reasoning?: string;
}