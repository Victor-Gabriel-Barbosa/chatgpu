// Retorna extensão baseada na linguagem
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
