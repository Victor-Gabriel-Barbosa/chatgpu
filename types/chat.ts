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
 * Métricas de desempenho e velocidade de geração de uma mensagem.
 */
export interface MessageMetrics {
  /** Velocidade de decodificação/geração em tokens por segundo. */
  tokensPerSecond?: number;
  /** Quantidade total de tokens gerados na resposta. */
  completionTokens?: number;
  /** Quantidade de tokens no prompt de entrada. */
  promptTokens?: number;
  /** Total combinado de tokens (prompt + completion). */
  totalTokens?: number;
  /** Tempo total decorrido na geração em segundos. */
  elapsedTime?: number;
  /** Velocidade de pré-processamento do prompt em tokens por segundo. */
  prefillTokensPerSecond?: number;
  /** Tempo até o primeiro token (TTFT) em segundos. */
  timeToFirstToken?: number;
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
  /** Métricas de desempenho da geração da mensagem. */
  metrics?: MessageMetrics;
}