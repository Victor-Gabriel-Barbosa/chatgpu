import { useState, useEffect } from "react";
import type { Theme } from "@/types/theme";

// Gerencia o estado e a lógica do tema, incluindo a aplicação da classe de tema e a persistência da preferência do usuário
export function useTheme() {
  const [theme, setTheme] = useState<Theme>("system");

  // Carrega o tema salvo do localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem("chatgpu-theme") as Theme | null;
    if (savedTheme) {
      Promise.resolve().then(() => setTheme(savedTheme));
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    }
  }, []);

  // Aplica a classe de tema e salva a preferência
  useEffect(() => {
    const root = document.documentElement;
    const media = globalThis.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = () => {
      const isDark = theme === "dark" || (theme === "system" && media.matches);
      root.classList.toggle("dark", isDark);
    };

    applyTheme();
    localStorage.setItem("chatgpu-theme", theme);

    media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [theme]);

  return { theme, setTheme };
}
