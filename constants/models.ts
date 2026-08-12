/**
 * Representa uma opção individual de modelo de IA.
 */
export interface ModelOption {
  /** Identificador único do modelo. */
  id: string;
  /** Nome de exibição do modelo. */
  name: string;
}

/**
 * Representa um agrupamento categórico de modelos de IA.
 */
export interface ModelGroups {
  /** Rótulo descritivo do grupo. */
  label: string;
  /** Lista de opções de modelos pertencentes a este grupo. */
  options: ModelOption[];
}

/**
 * Define a lista de todos os modelos suportados organizados por categorias.
 *
 * Lista revisada em ago/2026 com base no catálogo oficial de modelos
 * pré-compilados do WebLLM/MLC (prebuiltAppConfig.model_list), priorizando
 * o melhor custo-benefício (qualidade por GB de VRAM) disponível hoje.
 * Todos os IDs abaixo existem no catálogo oficial — não use IDs "inventados",
 * pois o WebLLM só consegue carregar modelos já compilados para WebGPU.
 */
export const SUPPORTED_MODELS: ModelGroups[] = [
  {
    label: "Modelos Leves (1–3GB VRAM)",
    options: [
      { id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC", name: "Qwen 2.5 1.5B" },
      { id: "SmolLM2-1.7B-Instruct-q4f16_1-MLC", name: "SmolLM2 1.7B" },
      { id: "Llama-3.2-1B-Instruct-q4f16_1-MLC", name: "Llama 3.2 1B" },
      { id: "Llama-3.2-3B-Instruct-q4f16_1-MLC", name: "Llama 3.2 3B" },
      { id: "Qwen2.5-3B-Instruct-q4f16_1-MLC", name: "Qwen 2.5 3B" },
      { id: "Qwen3-0.6B-q4f16_1-MLC", name: "Qwen 3 0.6B" },
      { id: "Qwen3-1.7B-q4f16_1-MLC", name: "Qwen 3 1.7B" },
      { id: "gemma-2-2b-it-q4f16_1-MLC", name: "Gemma 2 2B" },
    ],
  },
  {
    label: "Modelos Pesados (4–6GB VRAM)",
    options: [
      { id: "Llama-3.1-8B-Instruct-q4f16_1-MLC", name: "Llama 3.1 8B" },
      { id: "Mistral-7B-Instruct-v0.3-q4f16_1-MLC", name: "Mistral 7B v0.3" },
      { id: "Qwen2.5-7B-Instruct-q4f16_1-MLC", name: "Qwen 2.5 7B" },
      { id: "Hermes-3-Llama-3.1-8B-q4f16_1-MLC", name: "Hermes 3 Llama 3.1 8B" },
      { id: "gemma-2-9b-it-q4f16_1-MLC", name: "Gemma 2 9B" },
      { id: "Qwen3-8B-q4f16_1-MLC", name: "Qwen 3 8B" },
      { id: "Phi-4-mini-instruct-q4f16_1-MLC", name: "Phi-4 Mini" },
    ],
  },
  {
    label: "Modelos de Pensamento (7–12GB VRAM)",
    options: [
      { id: "DeepSeek-R1-Distill-Qwen-7B-q4f16_1-MLC", name: "DeepSeek R1 Qwen 7B" },
      { id: "DeepSeek-R1-Distill-Llama-8B-q4f16_1-MLC", name: "DeepSeek R1 Llama 8B" },
      { id: "Qwen3-4B-q4f16_1-MLC", name: "Qwen 3 4B (Thinking)" },
    ],
  },
  {
    label: "Modelos de Código (3–6GB VRAM)",
    options: [
      { id: "Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC", name: "Qwen 2.5 Coder 0.5B" },
      { id: "Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC", name: "Qwen 2.5 Coder 1.5B" },
      { id: "Qwen2.5-Coder-3B-Instruct-q4f16_1-MLC", name: "Qwen 2.5 Coder 3B" },
      { id: "Qwen2.5-Coder-7B-Instruct-q4f16_1-MLC", name: "Qwen 2.5 Coder 7B" },
    ],
  },
];

/**
 * Define o identificador do modelo padrão a ser utilizado.
 */
export const DEFAULT_MODEL_ID = "Qwen3-1.7B-q4f16_1-MLC";