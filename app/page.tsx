"use client";

import { useState, useEffect } from "react";
import { WebWorkerMLCEngine, InitProgressReport, ChatCompletionMessageParam } from "@mlc-ai/web-llm";
import { SendHorizontal, Plus } from "lucide-react";
import Image from "next/image";

export default function ChatInterface() {
  // Estados para o motor de inferência, mensagens, entrada do usuário, progresso e status
  const [engine, setEngine] = useState<WebWorkerMLCEngine | null>(null);
  const [messages, setMessages] = useState<ChatCompletionMessageParam[]>([]);
  const [input, setInput] = useState("");
  const [progressText, setProgressText] = useState("Inicializando motor WebGPU...");
  const [isReady, setIsReady] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const initEngine = async () => {
      const worker = new Worker(new URL("../lib/worker.ts", import.meta.url), {
        type: "module",
      });

      // Cria uma nova instância do motor usando o Web Worker
      const newEngine = new WebWorkerMLCEngine(worker);
      setEngine(newEngine);

      // Configura o callback de progresso para atualizar o texto de status
      newEngine.setInitProgressCallback((report: InitProgressReport) => {
        setProgressText(report.text);
      });

      // Tenta carregar o modelo e atualiza o status de pronto ou erro
      try {
        await newEngine.reload("Qwen2.5-1.5B-Instruct-q4f16_1-MLC");
        setIsReady(true);
        setProgressText("Pronto!");
      } catch (error) {
        console.error("Erro ao carregar o modelo:", error);
        setProgressText("Erro ao carregar o WebGPU. Verifique suporte no navegador.");
      }
    };

    initEngine();
  }, []);

  // Inicia um novo chat limpando as mensagens
  const handleNewChat = () => {
    if (isGenerating) return;
    setMessages([]);
  };

  // Lida com o envio de mensagens
  const handleSend = async () => {
    if (!input.trim() || !engine || !isReady) return;

    // Adiciona a mensagem do usuário à conversa
    const userMessage = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsGenerating(true);

    // Prepara o histórico de mensagens para enviar ao modelo
    const chatHistory: ChatCompletionMessageParam[] = [
      ...messages,
      { role: "user", content: userMessage },
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
            newMessages[newMessages.length - 1].content = resp;
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

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      {/* Barra Lateral */}
      <aside className="w-64 bg-white border-r p-4 hidden md:flex flex-col">
        <div className="flex items-center gap-2 text-xl font-bold mb-6">
          <Image src="/icon0.svg" alt="ChatGPU" width={24} height={24} />
          ChatGPU
        </div>
        <button
          onClick={handleNewChat}
          className="flex items-center gap-2 p-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm"
        >
          <Plus size={18} /> Novo Chat
        </button>
        <div className="mt-auto text-xs text-gray-400">WebGPU Local</div>
      </aside>

      {/* Área Principal */}
      <main className="flex-1 flex flex-col relative">
        {!isReady && (
          <div className="absolute top-0 w-full bg-blue-100 text-blue-800 p-2 text-center text-sm z-10">
            {progressText}
          </div>
        )}

        {/* Mensagens */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4">
          {messages.length === 0 && isReady ? (
            <div className="text-center text-gray-400 mt-20 text-lg">
              Como posso ajudar hoje?
            </div>
          ) : (
            messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] p-3 rounded-lg ${msg.role === "user" ? "bg-blue-600 text-white" : "bg-white border text-gray-800"
                  }`}
                >
                  {msg.content as string}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Entrada de Texto */}
        <div className="p-4 border-t bg-white">
          <div className="flex gap-2 max-w-4xl mx-auto">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={isReady ? "Envie uma mensagem..." : "Aguarde..."}
              disabled={!isReady || isGenerating}
              className="flex-1 border rounded-md p-3 outline-none focus:border-blue-500 disabled:bg-gray-50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || !isReady || isGenerating}
              className="p-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
            >
              <SendHorizontal size={20} />
            </button>
          </div>
          <div className="text-center text-xs text-gray-400 mt-2">
            O processamento ocorre 100% no seu dispositivo.
          </div>
        </div>
      </main>
    </div>
  );
}