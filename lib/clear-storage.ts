import { db } from "@/db/database";
import { toast } from "sonner";

/** Limpa todos os dados salvos da aplicação. */
export async function clearStorage() {
  try {
    await db.transaction("rw", db.chats, db.settings, async () => {
      await db.chats.clear();
      await db.settings.clear();
    });

    const keys = await caches.keys();
    await Promise.all(
      keys.map((key) => caches.delete(key))
    );

    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));

    localStorage.clear();

    toast.success("Dados removidos com sucesso");
  } catch (error) {
    console.error("Erro ao limpar os dados:", error);
    toast.error("Erro ao limpar os dados");
    throw error;
  }
}