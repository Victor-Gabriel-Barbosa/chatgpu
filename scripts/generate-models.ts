import { prebuiltAppConfig, ModelType } from "@mlc-ai/web-llm";
import { writeFile } from "node:fs/promises";

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

/** Faixas de peso, da mais leve para a mais pesada, com limites máximos em GB. */
const tiers = [
  { label: "Modelos ultra leves (tarefas muito simples)", maxSizeGB: 0.5, maxVramGB: 1 },
  { label: "Modelos leves (tarefas simples)", maxSizeGB: 1.5, maxVramGB: 3 },
  { label: "Modelos intermediários (tarefas moderadas)", maxSizeGB: 4, maxVramGB: 6 },
  { label: "Modelos pesados (tarefas complexas)", maxSizeGB: 8, maxVramGB: 12 },
  { label: "Modelos ultra pesados (tarefas muito complexas)", maxSizeGB: Infinity, maxVramGB: Infinity },
];

/**
 * Classifica o modelo em uma faixa de peso.
 * Usa a faixa mais alta entre tamanho em disco e uso de VRAM.
 * @param sizeGB - Tamanho dos arquivos do modelo em GB.
 * @param vramGB - VRAM necessária em GB.
 * @returns Nome da faixa.
 */
function getTier(sizeGB: number, vramGB: number): string {
  const bySize = tiers.findIndex((t) => sizeGB <= t.maxSizeGB);
  const byVram = tiers.findIndex((t) => vramGB <= t.maxVramGB);
  return tiers[Math.max(bySize, byVram)]?.label ?? "Pesado";
}

/** Gera a lista de modelos e salva em um arquivo JSON. */
void (async () => {
  const chatModels = prebuiltAppConfig.model_list.filter((m) => m.model_type !== ModelType.embedding);

  const modelList = await Promise.all(
    chatModels.map(async (m) => {
      const repo = m.model.replace("https://huggingface.co/", "").replace(/\/$/, "");
      const r = await fetch(`https://huggingface.co/api/models/${repo}?blobs=true`);
      const { siblings } = await r.json();
      const bytes = siblings.reduce((s: number, f: { size?: number }) => s + (f.size || 0), 0);
      const sizeGB = fmtB(bytes);
      const vramGB = fmtMB(m.vram_required_MB as number);
      return { id: m.model_id, name: fmtName(m.model_id), tier: getTier(sizeGB, vramGB), sizeGB, vramGB };
    })
  );

  modelList.sort((a, b) => a.vramGB - b.vramGB || a.sizeGB - b.sizeGB);

  const grouped = Object.groupBy(modelList, (m) => m.tier);

  const models = tiers
    .filter(({ label }) => grouped[label])
    .map(({ label }) => ({
      label,
      options: grouped[label]!.map(({ id, name, sizeGB, vramGB }) => ({ id, name, sizeGB, vramGB })),
    }));

  await writeFile("config/models.json", JSON.stringify({ models }, null, 2), "utf-8");
})();
