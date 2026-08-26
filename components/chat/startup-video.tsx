"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

export interface StartupVideoProps {
  /** Indica se o vídeo deve ser exibido. */
  isOpen: boolean;
  /** Função chamada quando o vídeo termina ou é fechado pelo usuário. */
  onClose: () => void;
  /** Caminho do arquivo de vídeo. Padrão: "/chatgpu-video.mp4". */
  src?: string;
}

/**
 * Componente de introdução em vídeo em tela cheia sem distrações, controles ou logotipos.
 * Reproduz o vídeo de inicialização e fecha automaticamente ao finalizar.
 */
export const StartupVideo: React.FC<StartupVideoProps> = ({
  isOpen,
  onClose,
  src = "/chatgpu-video.mp4",
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isClosing, setIsClosing] = useState(false);

  // Executa o fechamento com animação suave de fade-out
  const handleDismiss = useCallback(() => {
    setIsClosing(true);
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 600);
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === " " || e.key === "Enter") {
        e.preventDefault();
        handleDismiss();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleDismiss]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Vídeo de Apresentação ChatGPU"
      onClick={handleDismiss}
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-black w-screen h-screen overflow-hidden cursor-pointer select-none transition-opacity duration-700 ease-in-out",
        isClosing ? "opacity-0 pointer-events-none" : "opacity-100"
      )}
    >
      <video
        src={src}
        playsInline
        autoPlay
        muted
        onEnded={handleDismiss}
        className="w-full h-full object-cover"
      />
    </div>
  );
};
