"use client";

import { useState, useCallback } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import { cn } from "@/lib/utils";

/** Propriedades do componente {@link StartupVideo}. */
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
 * ou pressionar qualquer tecla. Inclui uma transição suave de fade-out antes de disparar o fechamento.
 *
 * @param props - Propriedades utilizadas para configurar o componente.
 * @returns Elemento JSX do modal de vídeo ou `null` caso `isOpen` seja falso.
 */
export function StartupVideo({
  isOpen,
  onClose,
  src = "/chatgpu-video.mp4",
}: Readonly<StartupVideoProps>) {
  const [isClosing, setIsClosing] = useState(false);

  /** Inicia o encerramento da exibição pausando o vídeo e disparando a animação de fade-out. */
  const handleDismiss = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 600);
  }, [onClose]);

  /** Gerencia eventos de teclado para permitir o fechamento do modal de vídeo. */
  useHotkeys("*", handleDismiss, {
    enabled: isOpen,
    preventDefault: true,
  });

  if (!isOpen) return null;

  return (
    <dialog
      open
      aria-modal="true"
      aria-label="Vídeo de Apresentação ChatGPU"
      className={cn(
        "fixed inset-0 z-50 h-screen w-screen max-h-none max-w-none overflow-hidden border-0 bg-black p-0 transition-opacity duration-600",
        isClosing ? "pointer-events-none opacity-0" : "opacity-100"
      )}
    >
      <button
        type="button"
        aria-label="Fechar vídeo de apresentação"
        onClick={handleDismiss}
        className="h-full w-full cursor-pointer"
      >
        <video
          src={src}
          autoPlay
          muted
          playsInline
          onEnded={handleDismiss}
          className="h-full w-full object-cover"
        />
      </button>
    </dialog>
  );
}
