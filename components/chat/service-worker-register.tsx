"use client";
import { useEffect } from "react";

/**
 * Componente responsável por registrar o Service Worker da aplicação, permitindo funcionalidades como cache e notificações push.
 * O registro é feito apenas em ambiente de produção e se o navegador suportar Service Workers.
 *
 * @returns null, pois não renderiza nenhum elemento visual.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        console.log("Service Worker registrado com sucesso", reg);
      })
      .catch((err) => {
        console.error("Falha ao registrar o Service Worker", err);
      });
  }, []);

  return null;
}
