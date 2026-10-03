import { prebuiltAppConfig } from "@mlc-ai/web-llm";
import { writeFile } from "node:fs/promises";
import { ModelType } from "@mlc-ai/web-llm";

/**
 * Formata bytes para GB.
 * @param b - Bytes.
 * @returns Bytes formatados em GB.
 */
const fmtB = (b: number) => Number((b / 1024 ** 3).toFixed(2));

/**
 * Formata megabytes para GB.
 * @param mb - Megabytes.
 * @returns Megabytes formatados em GB.
 */
const fmtMB = (mb: number) => Number((mb / 1000).toFixed(2));

/**
 * Formata strings para title case.
 * @param s - String.
 * @returns String formatada.
 */
const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Formata o nome do modelo.
 * @param modelId - ID do modelo.
 * @returns Nome do modelo formatado.
 */
function fmtName(modelId: string): string {
  return titleCase(modelId
    .replace(/-MLC/i, "")
    .replace(/-/g, " ")
    .replace(/_/g, ".")
    .trim());
}

/** Mapeia expressões regulares para os nomes dos fornecedores dos modelos. */
const providers: Array<[RegExp, string]> = [
  [/^DeepSeek/i, "DeepSeek"],
  [/^Hermes|^OpenHermes|^NeuralHermes/i, "Hermes"],
  [/^Llama|^TinyLlama/i, "Llama"],
  [/^Qwen/i, "Qwen"],
  [/^gemma/i, "Gemma"],
  [/^Phi/i, "Phi"],
  [/^Mistral|^Ministral|^Mixtral/i, "Mistral"],
  [/^SmolLM/i, "SmolLM"],
  [/^snowflake/i, "Snowflake"],
  [/^stablelm/i, "StableLM"],
  [/^RedPajama/i, "RedPajama"],
  [/^WizardMath/i, "WizardLM"],
];

/**
 * Obtém o fornecedor do modelo a partir do ID.
 * @param modelId - ID do modelo.
 * @returns Nome do fornecedor.
 */
const getProvider = (id: string) => providers.find(([re]) => re.test(id))?.[1] ?? "Outros";

/** Gera a lista de modelos e salva em um arquivo JSON. */
(async () => {
  const chatModels = prebuiltAppConfig.model_list.filter((m) => m.model_type !== ModelType.embedding);

  const modelList = await Promise.all(
    chatModels.map(async (m) => {
      const repo = m.model.replace("https://huggingface.co/", "").replace(/\/$/, "");
      const r = await fetch(`https://huggingface.co/api/models/${repo}?blobs=true`);
      const { siblings } = await r.json();
      const bytes = siblings.reduce((s: number, f: { size?: number }) => s + (f.size || 0), 0);
      return { id: m.model_id, name: fmtName(m.model_id), label: getProvider(m.model_id), sizeGB: fmtB(bytes), vramGB: fmtMB(m.vram_required_MB as number) };
    })
  )

  modelList.sort((a, b) => a.vramGB - b.vramGB)

  const models = Object.entries(Object.groupBy(modelList, (m) => m.label)).map(
    ([label, options]) => ({
      label,
      options: options!.map(({ id, name, sizeGB, vramGB }) => ({ id, name, sizeGB, vramGB })),
    })
  );

  await writeFile("config/models.json", JSON.stringify({ models }, null, 2), "utf-8");
})();
