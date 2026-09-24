"use client";

import { useEffect } from "react";

/**
 * Registra o Service Worker da aplicação no navegador.
 *
 * @remarks
 * Atua como um componente utilitário de ciclo de vida (headless) que não renderiza
 * nenhum elemento visual na interface.
 *
 * @returns `null`, pois o componente atua apenas executando efeitos colaterais de inicialização.
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
