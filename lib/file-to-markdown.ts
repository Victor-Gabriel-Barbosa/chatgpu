import mammoth from "mammoth";
import TurndownService from 'turndown'
import { gfm } from "@truto/turndown-plugin-gfm";
import { createWorker, type Worker } from "tesseract.js";
import { IMAGE_EXTENSIONS } from "@/config/file-types";

/** Promessa de carregamento da biblioteca `pdfjs-dist`. */
let pdfjsLibPromise: ReturnType<typeof loadPdfjs> | null = null;

/** Idiomas usados pelo Tesseract para reconhecimento de texto em imagens. */
const OCR_LANGUAGES = "por+eng";

/** Promessa de criação do worker do Tesseract. */
let tesseractWorkerPromise: Promise<Worker> | null = null;

/** Instância reutilizável do conversor Turndown. */
let turndownService: TurndownService | null = null;

/**
 * Carrega a biblioteca `pdfjs-dist` e configura o caminho do worker.
 * @returns Promise que resolve para a instância do `pdfjsLib`.
 */
async function loadPdfjs() {
  return import("pdfjs-dist").then((pdfjsLib) => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
    return pdfjsLib;
  });
}

/**
 * Retorna a instância do `pdfjsLib`, carregando-a se ainda não estiver disponível.
 * @returns Instância do `pdfjsLib`.
 * @throws {@link TypeError}
 */
function getPdfjs() {
  if (typeof window === "undefined") throw new TypeError("A extração de PDF só funciona no navegador (client-side).");
  pdfjsLibPromise ??= loadPdfjs();
  return pdfjsLibPromise;
}

/**
 * Retorna o worker do Tesseract, criando-o se ainda não estiver disponível.
 * @returns Instância do worker do Tesseract.
 * @throws {@link TypeError}
 */
function getTesseractWorker(): Promise<Worker> {
  if (typeof window === "undefined") throw new TypeError("A extração de texto de imagens só funciona no navegador (client-side).");
  tesseractWorkerPromise ??= createWorker(OCR_LANGUAGES);
  return tesseractWorkerPromise;
}

/**
 * Retorna o conversor de HTML para Markdown, criando-o se ainda não estiver disponível.
 *
 * @remarks
 * Usa o plugin GFM para suportar tabelas, e remove imagens (o mammoth as incorporaria
 * como `data:` URIs em base64, inflando o resultado).
 *
 * @returns Instância do `TurndownService`.
 */
function getTurndown(): TurndownService {
  if (!turndownService) {
    turndownService = new TurndownService({
      headingStyle: "atx",
      bulletListMarker: "-",
      codeBlockStyle: "fenced",
      emDelimiter: "*",
    });
    turndownService.use(gfm);
    turndownService.remove("img");
  }
  return turndownService;
}

/**
 * Encerra o worker do Tesseract, liberando os recursos alocados.
 *
 * @remarks
 * Após a chamada, um novo worker será criado automaticamente na próxima operação de OCR.
 */
export async function terminateOcrWorker(): Promise<void> {
  if (!tesseractWorkerPromise) return;
  const worker = await tesseractWorkerPromise;
  await worker.terminate();
  tesseractWorkerPromise = null;
}

/**
 * Obtém a extensão de um nome de arquivo.
 * @param fileName - Nome do arquivo.
 * @returns Extensão do arquivo em letras minúsculas, ou string vazia se não houver extensão.
 */
function getExtension(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

/**
 * Extrai o texto de um arquivo PDF página por página, formatado em Markdown.
 * @param file - Arquivo PDF a ser extraído.
 * @returns Conteúdo extraído do arquivo em Markdown, separado por página.
 */
async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await getPdfjs();
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  const pageTexts: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    const items = content.items
      .filter((item) => "str" in item && item.str.trim())
      .map((item) => {
        if (!("str" in item)) return null;

        return {
          text: item.str,
          x: item.transform[4],
          y: item.transform[5],
        };
      })
      .filter(Boolean) as {
        text: string;
        x: number;
        y: number;
      }[];

    const lines: string[] = [];
    let currentLine: typeof items = [];
    let previousY: number | null = null;

    for (const item of items) {
      if (previousY !== null && Math.abs(item.y - previousY) > 5) {
        lines.push(currentLine.toSorted((a, b) => a.x - b.x).map((item) => item.text).join(" "));
        currentLine = [];
      }

      currentLine.push(item);
      previousY = item.y;
    }

    if (currentLine.length > 0) lines.push(currentLine.toSorted((a, b) => a.x - b.x).map((item) => item.text).join(" "));

    pageTexts.push(lines.join("\n"));
  }

  return pageTexts.join("\n\n---\n\n");
}

/**
 * Extrai o conteúdo de um arquivo DOCX (Word) em Markdown.
 *
 * @remarks
 * Converte o DOCX para HTML via `mammoth` (preservando títulos, listas, tabelas,
 * negrito e itálico) e depois para Markdown via `turndown`. Imagens são descartadas.
 *
 * @param file - Arquivo DOCX a ser extraído.
 * @returns Conteúdo extraído do arquivo em Markdown.
 */
async function extractDocxMarkdown(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer: buffer });
  return getTurndown().turndown(html).trim();
}

/**
 * Extrai o texto de uma imagem via OCR (reconhecimento óptico de caracteres)
 * e retorna o resultado formatado em Markdown.
 * @param file - Arquivo de imagem a ser extraído.
 * @returns Conteúdo reconhecido na imagem, formatado em Markdown.
 */
async function extractImageText(file: File): Promise<string> {
  const worker = await getTesseractWorker();
  const { data } = await worker.recognize(file);
  const text = data.text.trim();
  return text ? `\`\`\`\n${text}\n\`\`\`` : "";
}

/**
 * Converte um arquivo enviado pelo usuário em Markdown, escolhendo a
 * estratégia de extração adequada de acordo com o tipo do arquivo.
 *
 * @remarks
 * Suporta PDF (via `pdfjs-dist`), DOCX (via `mammoth`), imagens (via Tesseract OCR)
 * e arquivos de texto puro. Para tipos desconhecidos, lê o arquivo diretamente como
 * texto e o envolve em um bloco de código Markdown com a extensão como dica de linguagem.
 *
 * @param file - Arquivo a ser convertido.
 * @returns Conteúdo do arquivo convertido em Markdown.
 */
export async function fileToMarkdown(file: File): Promise<string> {
  const ext = getExtension(file.name);
  if (ext === "pdf" || file.type === "application/pdf") return extractPdfText(file);
  if (ext === "docx") return extractDocxMarkdown(file);
  if (IMAGE_EXTENSIONS.has(ext) || file.type.startsWith("image/")) return extractImageText(file);

  const text = await file.text();
  return `\`\`\`${ext}\n${text}\n\`\`\``;
}
