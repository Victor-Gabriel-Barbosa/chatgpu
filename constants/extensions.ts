/**
 * Retorna a extensão de arquivo correspondente a uma dada linguagem de programação.
 *
 * @param lang Nome da linguagem de programação.
 * @returns Extensão do arquivo associada à linguagem, a própria linguagem se não mapeada, ou "txt" como padrão.
 */
export const getExtension = (lang: string) => {
  const map: Record<string, string> = {
    javascript: "js",
    typescript: "ts",
    python: "py",
    html: "html",
    css: "css",
    json: "json",
    markdown: "md",
    bash: "sh",
    shell: "sh",
    sql: "sql",
  };

  return map[lang] || lang || "txt";
};