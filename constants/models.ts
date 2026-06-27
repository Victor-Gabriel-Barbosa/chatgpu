export interface ModelOption {
  id: string;
  name: string;
}

export interface ModelGroups {
  label: string;
  options: ModelOption[];
}

export const SUPPORTED_MODELS: ModelGroups[] = [
  {
    label: "Leves (1–3GB VRAM)",
    options: [
      { id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC", name: "Qwen 2.5 1.5B" },
      { id: "SmolLM2-1.7B-Instruct-q4f16_1-MLC", name: "SmolLM2 1.7B" },
      { id: "Llama-3.2-1B-Instruct-q4f16_1-MLC", name: "Llama 3.2 1B" },
      { id: "Llama-3.2-3B-Instruct-q4f16_1-MLC", name: "Llama 3.2 3B" },
      { id: "Qwen2.5-3B-Instruct-q4f16_1-MLC", name: "Qwen 2.5 3B" },
    ],
  },
  {
    label: "Pesados (4–6GB VRAM)",
    options: [
      { id: "Llama-3.1-8B-Instruct-q4f16_1-MLC", name: "Llama 3.1 8B" },
      { id: "Mistral-7B-Instruct-v0.3-q4f16_1-MLC", name: "Mistral 7B v0.3" },
      { id: "Qwen2.5-7B-Instruct-q4f16_1-MLC", name: "Qwen 2.5 7B" },
      { id: "Hermes-3-Llama-3.1-8B-q4f16_1-MLC", name: "Hermes 3 Llama 3.1 8B" },
      { id: "gemma-2-9b-it-q4f16_1-MLC", name: "Gemma 2 9B" },
    ],
  },
  {
    label: "Pensamento (7–12GB VRAM)",
    options: [
      { id: "DeepSeek-R1-Distill-Qwen-7B-q4f16_1-MLC", name: "DeepSeek R1 Qwen 7B" },
      { id: "DeepSeek-R1-Distill-Llama-8B-q4f16_1-MLC", name: "DeepSeek R1 Llama 8B" },
    ],
  },
  {
    label: "Código (3–6GB VRAM)",
    options: [
      { id: "Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC", name: "Qwen 2.5 Coder 0.5B" },
      { id: "Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC", name: "Qwen 2.5 Coder 1.5B" },
      { id: "Qwen2.5-Coder-3B-Instruct-q4f16_1-MLC", name: "Qwen 2.5 Coder 3B" },
      { id: "Qwen2.5-Coder-7B-Instruct-q4f16_1-MLC", name: "Qwen 2.5 Coder 7B" },
    ],
  },
];

export const DEFAULT_MODEL_ID = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";
