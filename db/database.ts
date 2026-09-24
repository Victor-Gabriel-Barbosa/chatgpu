import Dexie, { type Table } from "dexie";
import { ChatSession } from "@/types/chat";

/**
 * Representa uma configuração da aplicação armazenada como par chave/valor
 */
export interface AppSetting {
  /** Chave única da configuração. */
  key: string;

  /** Valor da configuração. */
  value: string;
}

/**
 * Banco de dados da aplicação, gerenciado via Dexie.js.
 * 
 * Contém as seguintes tabelas:
 * - 'chats': sessões de chat completas (id, título, mensagens, updatedAt).
 * - 'settings': configurações avulsas em formato chave/valor.
 */
class ChatDatabase extends Dexie {
  chats!: Table<ChatSession, string>;
  settings!: Table<AppSetting, string>;

  constructor() {
    super("chatgpu-db");

    this.version(1).stores({
      chats: "id, updatedAt",
      settings: "key",
    });
  }
}

export const db = new ChatDatabase();

// Chave usada na tabela 'settings' para guardar o ID do chat atualmente selecionado
export const CURRENT_CHAT_SETTING_KEY = "chatgpu-current-session";