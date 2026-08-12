"use client";
import { useEffect } from "react";

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
