"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
// In‑browser LLM via WebLLM (WebGPU). Uncomment if you want browser‑only mode.
// npm i @mlc-ai/web-llm
// import { CreateMLCEngine, MLCEngine } from "@mlc-ai/web-llm";

// ---- Types ----
type Role = "user" | "assistant" | "system";
interface ChatMessage { role: Role; content: string }

// ---- Small helpers ----
function cn(...classes: (string | false | undefined)[]) { return classes.filter(Boolean).join(" ") }

function useAutoScroll<T>(dep: T) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [dep]);
  return ref;
}

// ---- Component ----
export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "system", content: "Hello! How can I assist you today?" },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [provider, setProvider] = useState<"webllm" | "ollama">("ollama");
  const [ollamaHost, setOllamaHost] = useState("http://localhost:11434");
  const [modelId, setModelId] = useState("gemma3:4b-ui"); // Ollama model tag (see Modelfile)

  // In-browser WebLLM state
  // const [engine, setEngine] = useState<MLCEngine | null>(null);
  // const [webllmModel, setWebllmModel] = useState("gemma-3-4b-instruct-q4f16_1");

  // tracks which message index we are streaming into (prevents frame mix-ups)
  const aiIndexRef = useRef<number | null>(null);
  const scrollRef = useAutoScroll(messages);

  // ---- WebLLM init (uncomment to enable) ----
  // useEffect(() => {
  //   if (provider !== "webllm" || engine) return;
  //   (async () => {
  //     const e = await CreateMLCEngine({
  //       modelList: [{ model: webllmModel }],
  //       model: webllmModel,
  //       cache: true,
  //     });
  //     setEngine(e);
  //   })();
  // }, [provider, engine, webllmModel]);

  async function handleSend() {
    if (!input.trim() || isStreaming) return;
    const userMsg: ChatMessage = { role: "user", content: input.trim() };

    // Append user and assistant placeholder ("Thinking…") in one atomic update
    setMessages((prev) => {
      const assistantPlaceholder: ChatMessage = { role: "assistant", content: "Thinking…" };
      const next = [...prev, userMsg, assistantPlaceholder];
      aiIndexRef.current = next.length - 1; // last item index
      return next;
    });

    setInput("");
    if (provider === "ollama") await streamFromOllama(userMsg);
    else await streamFromWebLLM(userMsg);
  }

  // Safely update the assistant content being streamed
  const pushDelta = (delta: string) => {
    const idx = aiIndexRef.current;
    if (idx == null) return;
    setMessages((prev) => prev.map((m, i) => i === idx ? { ...m, content: (m.content === "Thinking…" ? "" : m.content) + delta } : m));
  };

  // ---- Stream: Ollama local HTTP (no Next.js server needed) ----
  async function streamFromOllama(latest: ChatMessage) {
    setIsStreaming(true);
    const history = messages.filter(m => m.role !== "system").concat(latest);

    const res = await fetch(`${ollamaHost}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelId,
        messages: history,
        stream: true,
        options: { temperature: 0.7 },
      }),
    }).catch((e) => { console.error(e); setIsStreaming(false); return null });

    if (!res?.body) { setIsStreaming(false); return }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split("\n").filter(Boolean)) {
        try {
          const j = JSON.parse(line);
          if (j?.message?.content) pushDelta(j.message.content);
        } catch { /* ignore partial lines */ }
      }
    }
    setIsStreaming(false);
  }

  // ---- Stream: WebLLM (runs fully in the browser via WebGPU) ----
  async function streamFromWebLLM(latest: ChatMessage) {
    setIsStreaming(true);
    // if (!engine) { replaceThinkingWith("WebLLM engine not ready. Uncomment imports and init."); setIsStreaming(false); return }

    // const stream = await engine.chat.completions.create({
    //   messages: messages.concat(latest),
    //   stream: true,
    // });
    // for await (const part of stream) {
    //   const delta = part.choices?.[0]?.delta?.content ?? "";
    //   if (delta) pushDelta(delta);
    // }

    // demo text if WebLLM is disabled
    for (const d of ["This is an in‑browser WebLLM demo.", " Enable the import ", "and init code to run locally on WebGPU."]) {
      await new Promise(r => setTimeout(r, 300));
      pushDelta(d);
    }
    setIsStreaming(false);
  }

  // Visual typing dots when content is still "Thinking…"
  function TypingDots() {
    const [i, setI] = useState(0);
    useEffect(() => { const t = setInterval(()=>setI(v=> (v+1)%4), 350); return ()=>clearInterval(t) },[]);
    return <span>{"Thinking" + ".".repeat(i)}</span>;
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 flex flex-col">
      <header className="border-b border-neutral-800 p-4 sticky top-0 bg-neutral-950/80 backdrop-blur">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">WebLLM Chat</h1>
            <p className="text-sm text-neutral-400">All models running in browser or via local Ollama.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setProvider("webllm")} className={cn("px-3 py-1 rounded-2xl text-sm border", provider==="webllm"?"bg-white text-black":"border-neutral-700")}>WebLLM</button>
            <button onClick={() => setProvider("ollama")} className={cn("px-3 py-1 rounded-2xl text-sm border", provider==="ollama"?"bg-white text-black":"border-neutral-700")}>Ollama</button>
          </div>
        </div>
      </header>

      <main className="grid grid-cols-12 gap-4 max-w-5xl w-full mx-auto flex-1 p-4">
        <aside className="col-span-3 border border-neutral-800 rounded-2xl p-3 hidden md:block h-[calc(100vh-9rem)] sticky top-20 overflow-auto">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-medium">Settings</h2>
          </div>

          {provider === "ollama" ? (
            <div className="space-y-3">
              <label className="block">
                <span className="text-sm text-neutral-400">Ollama Host</span>
                <input value={ollamaHost} onChange={e=>setOllamaHost(e.target.value)} className="w-full mt-1 bg-neutral-900 border border-neutral-700 rounded-xl p-2 text-sm"/>
              </label>
              <label className="block">
                <span className="text-sm text-neutral-400">Model</span>
                <input value={modelId} onChange={e=>setModelId(e.target.value)} className="w-full mt-1 bg-neutral-900 border border-neutral-700 rounded-xl p-2 text-sm"/>
                <p className="text-xs text-neutral-500 mt-1">Use the tag created from the Modelfile (e.g., <code>gemma3:4b-ui</code>).</p>
              </label>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-neutral-400">WebLLM runs fully in-browser with WebGPU. Uncomment imports and code to enable.</p>
              {/* <label className="block">
                <span className="text-sm text-neutral-400">WebLLM Model ID</span>
                <input value={webllmModel} onChange={e=>setWebllmModel(e.target.value)} className="w-full mt-1 bg-neutral-900 border border-neutral-700 rounded-xl p-2 text-sm"/>
              </label> */}
            </div>
          )}
        </aside>

        <section className="col-span-12 md:col-span-9 border border-neutral-800 rounded-2xl flex flex-col h-[calc(100vh-9rem)]">
          {/* Scrollable chat area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
                className={cn("rounded-2xl p-3 border", m.role === "user" ? "bg-neutral-900 border-neutral-800" : m.role === "system" ? "bg-neutral-950 border-neutral-900" : "bg-neutral-950 border-neutral-800")}
              >
                <div className="text-xs uppercase tracking-wide text-neutral-500 mb-1">{m.role}</div>
                <div className="whitespace-pre-wrap leading-relaxed text-sm">
                  {m.content === "Thinking…" ? <TypingDots/> : m.content}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Sticky composer that stays visible while scrolling */}
          <div className="p-3 border-t border-neutral-800 sticky bottom-0 bg-neutral-950/95 backdrop-blur rounded-b-2xl">
            <div className="flex items-end gap-2">
              <textarea rows={2} placeholder="Type a message..." value={input} onChange={(e)=>setInput(e.target.value)}
                onKeyDown={(e)=>{ if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                className="flex-1 resize-none bg-neutral-900 border border-neutral-700 rounded-2xl p-3 text-sm"/>
              <button onClick={handleSend} disabled={isStreaming || !input.trim()} className="px-4 py-2 rounded-2xl bg-white text-black text-sm disabled:opacity-60">{isStreaming?"Streaming…":"Send"}</button>
            </div>
          </div>
        </section>
      </main>

      <footer className="text-center text-xs text-neutral-500 p-4">Tip: for Ollama direct-from-browser, set <code>OLLAMA_ORIGINS=http://localhost:3000</code> before running Ollama.</footer>
    </div>
  );
}
