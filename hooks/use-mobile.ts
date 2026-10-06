import * as React from "react"

/** Ponto de interrupção para detecção de mobile. */
const MOBILE_BREAKPOINT = 768

/**
 * Detecta se a largura da tela é menor que o ponto de interrupção mobile.
 * @returns {boolean} True se a tela for mobile.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    queueMicrotask(() => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT))
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
