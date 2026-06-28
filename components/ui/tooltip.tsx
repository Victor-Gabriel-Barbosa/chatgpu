"use client"

import * as React from "react"
import { Tooltip as TooltipPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * Provedor de contexto global para os tooltips da aplicação.
 *
 * @param props Propriedades do provedor, incluindo o tempo de atraso (delay).
 * @returns Elemento React encapsulando o contexto de tooltips.
 */
function TooltipProvider({
  delayDuration = 0,
  ...props
}: Readonly<React.ComponentProps<typeof TooltipPrimitive.Provider>>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  )
}

/**
 * Componente raiz que agrupa o gatilho e o conteúdo de um tooltip.
 *
 * @param props Propriedades raiz de estado e comportamento do tooltip.
 * @returns Elemento React base do tooltip.
 */
function Tooltip({
  ...props
}: Readonly<React.ComponentProps<typeof TooltipPrimitive.Root>>) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />
}

/**
 * Elemento interativo que dispara a exibição do tooltip ao ser focado ou sobreposto pelo mouse.
 *
 * @param props Propriedades do elemento de gatilho.
 * @returns Elemento React atuando como gatilho do tooltip.
 */
function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

/**
 * Conteúdo visual do tooltip exibido ao interagir com o gatilho.
 * Aplica estilos, animações de entrada/saída e exibe uma seta indicativa direcional.
 *
 * @param props Propriedades do conteúdo, incluindo classes adicionais e distância de deslocamento.
 * @returns Elemento React contendo o balão de informação do tooltip.
 */
function TooltipContent({
  className,
  sideOffset = 0,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "z-50 inline-flex w-fit max-w-xs origin-(--radix-tooltip-content-transform-origin) items-center gap-1.5 rounded-md px-3 py-1.5 text-xs",
          "bg-slate-900 text-slate-50 dark:bg-slate-100 dark:text-slate-900",
          "has-data-[slot=kbd]:pr-1.5",
          "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          "**:data-[slot=kbd]:relative **:data-[slot=kbd]:isolate **:data-[slot=kbd]:z-50 **:data-[slot=kbd]:rounded-sm",
          "**:data-[slot=kbd]:bg-slate-700 **:data-[slot=kbd]:text-slate-200 dark:**:data-[slot=kbd]:bg-slate-300 dark:**:data-[slot=kbd]:text-slate-800",
          "data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95",
          "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95",
          "data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="z-50 size-2.5 translate-y-[calc(-50%-2px)] rotate-45 rounded-xs bg-slate-900 fill-slate-900 dark:bg-slate-100 dark:fill-slate-100" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
