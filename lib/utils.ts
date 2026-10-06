import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { toast } from "sonner";
import type { ParsedMessageContent, EmbeddedFile } from '@/types/chat';

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

/**
 * Separa o bloco de raciocínio e os arquivos embutidos do conteúdo principal da mensagem.
 *
 * @remarks
 * Extrai dados das tags `<file name="...">...</file>` e blocos `<think>...</think>`,
 * tratando inclusive tags incompletas durante streaming.
 *
 * @param content - Conteúdo completo e bruto da mensagem.
 * @returns Objeto contendo o raciocínio extraído, o conteúdo principal e a lista de arquivos.
 */
export const parseMessageContent = (content: string): ParsedMessageContent => {
  if (!content) return { think: null, mainContent: '', files: [] };

  const files: EmbeddedFile[] = [];
  let processedContent = content;

  const fileRegex = /<file name="([^"]+)">([\s\S]*?)<\/file>/g;
  let match;
  while ((match = fileRegex.exec(processedContent)) !== null) {
    files.push({
      name: match[1],
      content: match[2].trim()
    });
  }

  processedContent = processedContent.replace(/<file name="[^"]+">[\s\S]*?<\/file>/g, '').trim();

  const thinkMatch = new RegExp(/<think>([\s\S]*?)<\/think>/).exec(processedContent);
  if (thinkMatch) {
    return {
      think: thinkMatch[1].trim(),
      mainContent: processedContent.replace(/<think>[\s\S]*?<\/think>/, '').trim(),
      files
    };
  }

  const openThinkMatch = new RegExp(/<think>([\s\S]*)/).exec(processedContent);
  if (openThinkMatch) {
    return {
      think: openThinkMatch[1].trim(),
      mainContent: processedContent.replace(/<think>[\s\S]*/, '').trim(),
      files
    };
  }

  return { think: null, mainContent: processedContent, files };
};
