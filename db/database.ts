import Dexie, { type Table } from "dexie";
import { ChatSession } from "@/types/chat";

/**
 * Registro simples de configuração, armazenado como par chave/valor
 * (usado, por exemplo, para guardar o ID do chat atualmente selecionado).
 */
export interface AppSetting {
  key: string;
  value: string;
}

/**
 * Banco de dados IndexedDB da aplicação, gerenciado via Dexie.js.
 *
 * Tabelas:
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