# 💬 ChatGPU

Um chat de IA rodando **100% no navegador**, utilizando **WebLLM (MLC)** para executar modelos localmente com aceleração por GPU (quando disponível).

> Sem backend. Sem API paga. Tudo direto no seu browser.

---

## 🚀 Demo

> https://chatgpu-nu.vercel.app/

---

## ✨ Features

* ⚡ Execução de LLMs diretamente no navegador (WebGPU)
* 🧠 Suporte a múltiplos modelos (Qwen, Llama, Phi, Gemma...)
* 💬 Interface de chat moderna (estilo ChatGPT)
* 🧾 Histórico de conversas salvo no `localStorage`
* 🧵 Streaming de respostas em tempo real
* ⏹️ Interrupção de geração de resposta
* 📝 Edição de mensagens e regeneração
* 🎨 Tema claro/escuro
* 📱 Layout responsivo

---

## 📷 Capturas de Tela

> <img width="1919" height="1079" alt="image" src="https://github.com/user-attachments/assets/6655e5a7-61ae-4808-8142-5497e4e14fbb" />

> <img width="1919" height="1079" alt="image" src="https://github.com/user-attachments/assets/bc43e479-5fa4-49c3-87f1-a33fc579604f" />

> <img width="1919" height="1079" alt="image" src="https://github.com/user-attachments/assets/1db3b125-2c71-4082-85d3-8872715777c4" />

> <img width="1919" height="1079" alt="image" src="https://github.com/user-attachments/assets/089115ff-9b3e-4427-92b8-7cf1e4fdd7eb" />

---

## 🛠️ Tecnologias

| Tecnologia           | Uso                         |
| -------------------- | --------------------------- |
| Next.js (App Router) | Frontend / estrutura do app |
| React                | Interface e estados         |
| TypeScript           | Tipagem                     |
| Tailwind CSS         | Estilização                 |
| WebLLM (MLC)         | Execução dos modelos LLM    |
| Web Workers          | Processamento em background |

---

## 📦 Instalação

```bash
# Clone o repositório
git clone https://github.com/Victor-Gabriel-Barbosa/chatgpu.git

# Entre na pasta
cd chatgpu

# Instale as dependências
npm install

# Rode o projeto
npm run dev
```

Abra em:

```
http://localhost:3000
```

---

## ⚙️ Como funciona

O projeto utiliza o **@mlc-ai/web-llm**, que permite rodar modelos de linguagem diretamente no navegador usando:

* WebGPU
* WebAssembly
* Web Workers

O fluxo é basicamente:

1. O modelo é carregado no browser
2. As mensagens são enviadas para o worker
3. O modelo gera a resposta em streaming
4. A UI atualiza em tempo real

---

## 🧠 Modelos suportados

Os modelos são definidos em:

```
/constants/models.ts
```

Exemplos:

* Qwen2.5
* Llama 3
* Phi-3
* Gemma

> ⚠️ Modelos mais pesados exigem mais RAM/VRAM e podem não rodar em todos os dispositivos.

---

## 📁 Estrutura do projeto

```
app/
 ├── components/
 │   ├── ChatMessage.tsx
 │   ├── Sidebar.tsx
 │   ├── SettingsModal.tsx
 │   └── CodeBlock.tsx
 │
 ├── page.tsx
 │
lib/
 └── worker.ts

constants/
 └── models.ts
```

---

## 💾 Persistência

Os dados são armazenados no navegador:

* `chatgpu-sessions` → histórico de chats
* `chatgpu-model` → modelo selecionado
* `chatgpu-theme` → tema

---

## ⚠️ Limitações

* Depende de **WebGPU** (nem todos navegadores suportam)
* Pode consumir bastante memória
* Tempo de carregamento do modelo pode ser alto
* Performance varia muito por hardware

---

## 🧪 Melhorias futuras

* [ ] Exportar/importar conversas
* [ ] Suporte a mais modelos
* [ ] Melhor gerenciamento de memória
* [ ] Deploy otimizado (lazy loading de modelos)
* [ ] Suporte a plugins/tools

---

## 🤝 Contribuição

Pull requests são bem-vindos.

1. Fork o projeto
2. Crie uma branch (`feature/minha-feature`)
3. Commit suas mudanças
4. Abra um PR

---

## 📄 Licença

MIT

---

## 👨‍💻 Autor

Feito por **Victor Gabriel Barbosa**

* GitHub: https://github.com/Victor-Gabriel-Barbosa

---

## ⭐ Se curtir o projeto

Deixa uma estrela no repositório — ajuda bastante 🚀
