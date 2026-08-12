import mammoth from "mammoth";
import * as XLSX from "xlsx";

/** 
 * Variável para armazenar a promessa de carregamento da biblioteca pdfjs-dist.
 * Isso evita múltiplos carregamentos da biblioteca em chamadas subsequentes.
 */
let pdfjsLibPromise: ReturnType<typeof loadPdfjs> | null = null;

/** 
 * Carrega a biblioteca pdfjs-dist.
 * @returns Promise que resolve para a instância do pdfjsLib.
 */
function loadPdfjs() {
  return import("pdfjs-dist").then((pdfjsLib) => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();
    return pdfjsLib;
  });
}

/** 
 * Retorna a instância do pdfjsLib, carregando-a se ainda não estiver disponível.
 * @throws {TypeError} Se chamado no lado do servidor (server-side).
 * @returns Instância do pdfjsLib.
 */
function getPdfjs() {
  if (typeof window === "undefined") throw new TypeError("A extração de PDF só funciona no navegador (client-side).");
  pdfjsLibPromise ??= loadPdfjs();
  return pdfjsLibPromise;
}

/**
 * Obtém a extensão de um nome de arquivo.
 *
 * @param fileName Nome do arquivo.
 * @returns Extensão do arquivo.
 */
function getExtension(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

/**
 * Extrai o texto de um arquivo PDF.
 *
 * @param file Arquivo PDF a ser extraído.
 * @returns Conteúdo textual extraído do arquivo.
 */
async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await getPdfjs();
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pageTexts: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items
      .filter((item) => "str" in item)
      .map((item) => item.str)
      .join(" ");
    pageTexts.push(`--- Página ${pageNum} ---\n${pageText}`);
  }

  return pageTexts.join("\n\n");
}

/**
 * Extrai o texto de um arquivo DOCX (Word).
 *
 * @param file Arquivo DOCX a ser extraído.
 * @returns Conteúdo textual extraído do arquivo.
 */
async function extractDocxText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value;
}

/**
 * Extrai o texto de um arquivo XLSX (Excel).
 *
 * @param file Arquivo XLSX a ser extraído.
 * @returns Conteúdo textual extraído do arquivo.
 */
async function extractXlsxText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  return workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    return `--- Planilha: ${sheetName} ---\n${csv}`;
  }).join("\n\n");
}

/**
 * Converte um arquivo enviado pelo usuário em texto puro, escolhendo a
 * estratégia de extração adequada de acordo com o tipo do arquivo.
 *
 * @param file Arquivo a ser convertido.
 * @returns Conteúdo textual extraído do arquivo.
 */
export async function fileToPlainText(file: File): Promise<string> {
  const ext = getExtension(file.name);
  if (ext === "pdf" || file.type === "application/pdf") return extractPdfText(file);
  if (ext === "docx") return extractDocxText(file);
  if (ext === "xlsx" || ext === "xls") return extractXlsxText(file);

  return file.text();
}
