/**
 * Representa as informações básicas de uma conversa.
 */
export interface Chat {
  /** Identificador único do chat. */
  id: string;
  /** Título descritivo do chat. */
  title: string;
}

/**
 * Representa uma sessão completa de chat, incluindo seu histórico de mensagens.
 */
export interface ChatSession {
  /** Identificador único da sessão de chat. */
  id: string;
  /** Título descritivo da sessão. */
  title: string;
  /** Lista de mensagens trocadas na sessão. */
  messages: Message[];
  /** Timestamp da última atualização da sessão em milissegundos. */
  updatedAt: number;
}

/**
 * Representa uma mensagem individual dentro de um chat.
 */
export interface Message {
  /** Papel do autor da mensagem. */
  role: 'user' | 'assistant' | 'system';
  /** Conteúdo de texto da mensagem. */
  content: string;
  /** Texto de raciocínio interno opcional gerado pelo modelo antes da resposta. */
  reasoning?: string;
}