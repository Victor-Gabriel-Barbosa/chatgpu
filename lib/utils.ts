import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combina classes CSS de forma condicional e resolve conflitos de estilo do Tailwind CSS.
 *
 * @param inputs Lista de classes CSS ou expressões condicionais a serem combinadas.
 * @returns String resultante com as classes finais unificadas.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function round(value?: number, digits = 1) {
  return value !== undefined ? Number(value.toFixed(digits)) : undefined;
}