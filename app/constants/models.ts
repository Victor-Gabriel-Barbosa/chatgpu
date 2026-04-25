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
    label: "Modelos leves",
    options: [
      { id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC", name: "Qwen 2.5 1.5B" },
      { id: "Llama-3.2-1B-Instruct-q4f16_1-MLC", name: "Llama 3.2 1B" },
      { id: "Llama-3.2-3B-Instruct-q4f16_1-MLC", name: "Llama 3.2 3B" },
      { id: "Phi-3-mini-4k-instruct-q4f16_1-MLC", name: "Phi 3-mini 4k" },
      { id: "gemma-2-2b-it-q4f16_1-MLC", name: "Gemma 2 2B" },
    ],
  },
  {
    label: "Modelos pesados",
    options: [
      { id: "Llama-3.1-8B-Instruct-q4f16_1-MLC", name: "Llama 3.1 8B" },
      { id: "Mistral-7B-Instruct-v0.3-q4f16_1-MLC", name: "Mistral 7B" },
      { id: "Qwen2.5-7B-Instruct-q4f16_1-MLC", name: "Qwen 2.5 7B" },
    ],
  },
];

export const DEFAULT_MODEL_ID = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";
