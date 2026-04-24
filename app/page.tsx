"use client";

import { useState, useEffect, useRef } from "react";
import { WebWorkerMLCEngine, InitProgressReport } from "@mlc-ai/web-llm";
import type { ChatCompletionMessageParam } from "@mlc-ai/web-llm";
import { SendHorizontal, Plus, Square } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function ChatInterface() {
  // Estados para o motor de inferência, mensagens, entrada do usuário, progresso e status
  const [engine, setEngine] = useState<WebWorkerMLCEngine | null>(null);
  const [selectedModel, setSelectedModel] = useState("Qwen2.5-1.5B-Instruct-q4f16_1-MLC");
  const [messages, setMessages] = useState<ChatCompletionMessageParam[]>([]);
  const [input, setInput] = useState("");
  const [progressText, setProgressText] = useState("Inicializando motor WebGPU...");
  const [isReady, setIsReady] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    let worker: Worker;

    const initEngine = async () => {
      worker = new Worker(new URL("../lib/worker.ts", import.meta.url), {
        type: "module",
      });

      // Cria uma nova instância do motor usando o Web Worker
      const newEngine = new WebWorkerMLCEngine(worker);
      setEngine(newEngine);

      // Configura o callback de progresso para atualizar o texto de status
      newEngine.setInitProgressCallback((report: InitProgressReport) => {
        setProgressText(report.text);
      });

      setIsReady(false);
      setProgressText("")

      // Tenta carregar o modelo e atualiza o status de pronto ou erro
      try {
        await newEngine.reload(selectedModel);
        setIsReady(true);
        setProgressText("Pronto!");
      } catch (error) {
        console.error("Erro ao carregar o modelo:", error);
        setProgressText("Erro ao carregar o WebGPU. Verifique suporte no navegador.");
      }
    };

    initEngine();

    return () => {
      if (worker) worker.terminate();
    };
  }, [selectedModel]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Ajusta a altura do textarea conforme o conteúdo
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  // Inicia um novo chat limpando as mensagens
  const handleNewChat = () => {
    if (isGenerating) return;
    setMessages([]);
  };

  // Lida com o envio de mensagens
  const handleSend = async () => {
    if (!input.trim() || !engine || !isReady) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: input }]);
    setIsGenerating(true);

    // Prepara o histórico de mensagens para enviar ao modelo
    const chatHistory: ChatCompletionMessageParam[] = [
      ...messages,
      { role: "user", content: input },
    ];

    // Adiciona uma mensagem de assistente vazia para começar a resposta
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    // Solicita uma resposta do modelo com streaming
    try {
      const completion = await engine.chat.completions.create({
        stream: true,
        messages: chatHistory,
      });

      let resp = "";

      // Itera sobre os chunks de resposta à medida que chegam
      for await (const chunk of completion) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          resp += delta;

          // Atualiza a última mensagem do assistente com o conteúdo recebido até agora
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastIndex = newMessages.length - 1;
            newMessages[lastIndex] = { ...newMessages[lastIndex], content: resp };
            return newMessages;
          });
        }
      }
    } catch (error) {
      console.error("Erro na inferência:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Interrompe a geração atual do modelo
  const handleStop = () => {
    if (engine && isGenerating) engine.interruptGenerate();
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      {/* Barra Lateral */}
      <aside className="w-64 bg-slate-100 dark:bg-slate-950 p-3 hidden md:flex flex-col">
        <Link href="/" className="flex items-center p-3 gap-2 text-xl font-bold">
          <Image src="/icon0.svg" alt="ChatGPU" width={24} height={24} />
          ChatGPU
        </Link>
        <button
          onClick={handleNewChat}
          className="flex items-center p-3 gap-2 hover:bg-slate-200 dark:hover:bg-slate-900 rounded-3xl text-md transition-colors" disabled={isGenerating}
        >
          <Plus size={18} /> Novo Chat
        </button>
        <div className="mt-auto text-xs text-slate-400">WebGPU Local</div>
      </aside>

      {/* Área Principal */}
      <main className="flex-1 flex flex-col relative">
        {!isReady && (
          <div className="absolute top-0 w-full text-sky-600 dark:text-sky-200 p-2 text-center text-sm z-10">
            {progressText}
          </div>
        )}

        {/* Mensagens */}
        <div className="flex-1 relative overflow-y-auto">
          <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-4">
            {messages.length === 0 && isReady ? (
              <div className="flex items-center justify-center gap-2 text-sky-500 mt-20 text-lg">
                <Image src="/icon0.svg" alt="ChatGPU" width={48} height={48} />
                Como posso ajudar hoje?
              </div>
            ) : (
              <>
                {messages.map((msg, index) => (
                  <div key={index} className={`flex ${msg.role === "user" ? "justify-end ml-3" : "justify-start mr-3"}`}>
                    <div className={`p-3 rounded-3xl shadow-md ${msg.role === "user" ? "text-white bg-sky-600" : "bg-slate-100 dark:bg-slate-800"}`}>
                      {msg.content as string}
                    </div>
                  </div>
                ))}
                <div className="h-36"></div>
              </>
            )}
          </div>
        </div>

        {/* Entrada de Texto */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-linear-to-b from-transparent via-slate-100 dark:via-slate-900 to-slate-100 dark:to-slate-900">
          <div className="max-w-180 mx-auto bg-slate-100 dark:bg-slate-800 rounded-3xl shadow-md">
            <div className="flex items-center">
              <textarea
                ref={textareaRef}
                id="chat-input"
                value={input}
                onChange={handleChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();

                    if (textareaRef.current && input.trim()) textareaRef.current.style.height = "auto";
                  }
                }}
                placeholder={isReady ? "Envie uma mensagem..." : "Carregando modelo..."}
                disabled={!isReady || isGenerating}
                className="flex-1 px-4 pt-4 pb-2 outline-none resize-none max-h-35 overflow-y-auto"
                rows={1}
              />
            </div>
            <div className="flex items-center justify-between px-2">
              <select 
                id="model-select"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="focus:outline-none bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 p-3 rounded-3xl text-sm" disabled={!isReady || isGenerating}
                title="Selecionar modelo"
              >
                <optgroup label="Modelos leves">
                  <option value="Qwen2.5-1.5B-Instruct-q4f16_1-MLC">Qwen2.5-1.5B</option>
                  <option value="Llama-3.2-1B-Instruct-q4f16_1-MLC">Llama-3.2-1B</option>
                  <option value="Llama-3.2-3B-Instruct-q4f16_1-MLC">Llama-3.2-3B</option>
                  <option value="Phi-3-mini-4k-instruct-q4f16_1-MLC">Phi-3-mini-4k</option>
                  <option value="gemma-2-2b-it-q4f16_1-MLC">Gemma-2-2B</option>
                </optgroup>
                <optgroup label="Modelos pesados">
                  <option value="Llama-3.1-8B-Instruct-q4f16_1-MLC">Llama-3.1-8B</option>
                  <option value="Mistral-7B-Instruct-v0.3-q4f16_1-MLC">Mistral-7B</option>
                  <option value="Qwen2.5-7B-Instruct-q4f16_1-MLC">Qwen2.5-7B</option>
                </optgroup>
              </select>

              {/* Botões condicionais Enviar/Parar */}
              {isGenerating ? (
                <button
                  onClick={handleStop}
                  className="p-3 m-1 bg-sky-500 text-white rounded-full hover:bg-sky-600 transition-colors shadow-sm"
                  title="Parar geração"
                >
                  <Square fill="currentColor" size={20} />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || !isReady}
                  className="p-3 m-1 bg-sky-600 text-white rounded-full hover:bg-sky-700 disabled:bg-slate-300 dark:disabled:bg-slate-400 transition-colors shadow-sm"
                  title="Enviar"
                >
                  <SendHorizontal size={20} />
                </button>
              )}
            </div>
          </div>
          <div className="text-center text-xs text-slate-400 mt-2">
            A IA pode cometer erros. Processamento 100% local via WebGPU
          </div>
        </div>
      </main>
    </div>
  );
}
