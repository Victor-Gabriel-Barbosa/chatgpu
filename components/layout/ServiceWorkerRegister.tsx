"use client";
import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("Service Worker registrado com sucesso", reg))
        .catch((err) => console.error("Falha ao registrar o Service Worker", err));
    }
  }, []);
  return null;
}
