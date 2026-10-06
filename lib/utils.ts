import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { toast } from "sonner";

/**
 * Combina classes CSS de forma condicional e resolve conflitos de estilo do Tailwind CSS.
 * @param inputs - Lista de classes CSS ou expressões condicionais a serem combinadas.
 * @returns String resultante com as classes finais unificadas.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Arredonda um valor numérico para a quantidade de casas decimais especificada.
 * @param value - Valor a ser arredondado. Retorna `undefined` quando omitido.
 * @param digits - Número de casas decimais desejadas.
 * @defaultValue 1
 * @returns Valor arredondado ou `undefined` caso `value` seja `undefined`.
 */
export function round(value?: number, digits = 1) {
  return value !== undefined ? Number(value.toFixed(digits)) : undefined;
}

/**
 * Aguarda um tempo determinado.
 * @param ms - Tempo em milissegundos a ser aguardado.
 * @returns Promessa que será resolvida após o tempo determinado.
 */
export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Copia um texto para a área de transferência.
 * @param content - Conteúdo que será copiado.
 */
export async function copyToClipboard(content: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(content);
    toast.success("Copiado para a área de transferência");
  } catch (error) {
    console.error("Erro ao copiar mensagem:", error);
    toast.error("Falha ao copiar a mensagem. Tente novamente");
  }
}
