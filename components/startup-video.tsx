"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

/**
 * Propriedades do componente {@link StartupVideo}.
 */
export interface StartupVideoProps {
  /** Determina se a sobreposição com o vídeo de inicialização está ativa e visível. */
  isOpen: boolean;

  /** Callback acionado para fechar a exibição do vídeo. */
  onClose: () => void;

  /** Caminho ou URL do arquivo de vídeo a ser exibido. */
  src?: string;
}

/**
 * Exibe um vídeo em tela cheia durante a inicialização da aplicação.
 *
 * @remarks
 * O vídeo é reproduzido automaticamente e pode ser dispensado por clique, término da reprodução,
 * ou pelas teclas `Escape`, `Enter` e `Espaço`. Inclui uma transição suave de fade-out antes de disparar o fechamento.
 *
 * @param props - Propriedades utilizadas para configurar o componente.
 * @returns Elemento JSX do modal de vídeo ou `null` caso `isOpen` seja falso.
 */
export const StartupVideo: React.FC<StartupVideoProps> = ({
  isOpen,
  onClose,
  src = "/chatgpu-video.mp4",
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isClosing, setIsClosing] = useState(false);

  /**
   * Inicia o encerramento da exibição pausando o vídeo e disparando a animação de fade-out.
   */
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
