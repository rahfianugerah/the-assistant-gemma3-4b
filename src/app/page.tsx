"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { FiSend } from "react-icons/fi";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

type Role = "user" | "assistant";
interface ChatMessage {
  role: Role;
  content: string;
}

function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function useAutoScroll<T>(dep: T) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [dep]);
  return ref;
}

function greeting() {
  const h = new Date().getHours();
  const t = h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
  return `Good ${t}! How can I help you today?`;
}

function collapseInlineCodeLines(md: string) {
  return md.replace(
    /(?:^|\n)((?:`[^\n`]+`\n){2,}`[^\n`]+`)(?=\n|$)/g,
    (block) => {
      const lines = block
        .trim()
        .split("\n")
        .map((l) => l.replace(/^`|`$/g, ""));
      return `\n\`\`\`text\n${lines.join("\n")}\n\`\`\`\n`;
    }
  );
}

function normalizeMarkdown(md: string) {
  let out = md.replace(/\n{3,}/g, "\n\n");
  out = collapseInlineCodeLines(out);

  const fenceLines = (out.match(/^```.*$/gm) || []).length;
  if (fenceLines % 2 === 1) out += "\n```";
  return out.trimEnd();
}

function PreWithCopy(props: React.HTMLAttributes<HTMLPreElement>) {
  const { children, className, ...rest } = props;
  const [copied, setCopied] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);

  const onCopy = async () => {
    const text = preRef.current?.innerText ?? "";
    await navigator.clipboard.writeText(text.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="relative group my-2">
      <button
        onClick={onCopy}
        className="absolute top-2 right-2 px-2 py-1 text-xs bg-neutral-800 text-neutral-300 rounded opacity-0 group-hover:opacity-100 transition"
      >
        {copied ? "Copied" : "Copy"}
      </button>
      <pre
        ref={preRef}
        {...rest}
        className={cn(
          "overflow-x-auto bg-neutral-950/80 border border-neutral-800 rounded-xl p-3 text-sm",
          className
        )}
      >
        {children}
      </pre>
    </div>
  );
}

function PrettyMarkdown({ children }: { children: string }) {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{

code: ({ className, children, ...rest }) => {
  const isBlock = String(className || "").startsWith("language-");
  if (isBlock) {

    return (
      <code {...rest} className={className}>
        {children}
      </code>
    );
  }

  return <code {...rest}>{children}</code>;
},
          pre: PreWithCopy,
          h1: (p) => <h1 className="text-xl font-bold mt-2 mb-2" {...p} />,
          h2: (p) => <h2 className="text-lg font-bold mt-2 mb-1.5" {...p} />,
          h3: (p) => <h3 className="text-base font-semibold mt-2 mb-1" {...p} />,
          ul: (p) => <ul className="list-disc pl-5 my-1.5 space-y-1" {...p} />,
          ol: (p) => <ol className="list-decimal pl-5 my-1.5 space-y-1" {...p} />,
          li: (p) => <li className="leading-relaxed" {...p} />,
          blockquote: (p) => (
            <blockquote
              className="border-l-2 border-neutral-700/70 pl-3 py-1 my-2 text-neutral-300 italic bg-neutral-900/40 rounded-r"
              {...p}
            />
          ),
          table: (p) => <table className="w-full text-sm my-2 border border-neutral-800" {...p} />,
          th: (p) => (
            <th className="border border-neutral-800 px-2 py-1 text-left font-semibold bg-neutral-900" {...p} />
          ),
          td: (p) => <td className="border border-neutral-800 px-2 py-1 align-top" {...p} />,
          a:  (p) => <a className="text-blue-400 underline hover:opacity-90" target="_blank" {...p} />,
          p:  (p) => <p className="my-1.5" {...p} />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [ollamaHost, setOllamaHost] = useState("http://localhost:11434");
  const [modelId, setModelId] = useState("the-assistant-gemma3-4b:latest");
  const aiIndexRef = useRef<number | null>(null);
  const scrollRef = useAutoScroll(messages);

  useEffect(() => {
    setMessages([{ role: "assistant", content: greeting() }]);
  }, []);

  async function handleSend() {
    if (!input.trim() || isStreaming) return;
    const userMsg: ChatMessage = { role: "user", content: input.trim() };
    setMessages((prev) => {
      const placeholder: ChatMessage = { role: "assistant", content: "Thinking…" };
      const next = [...prev, userMsg, placeholder];
      aiIndexRef.current = next.length - 1;
      return next;
    });
    setInput("");
    await streamFromOllama(userMsg);
  }

  const pushDelta = (delta: string) => {
    const idx = aiIndexRef.current;
    if (idx == null) return;
    setMessages((prev) =>
      prev.map((m, i) =>
        i === idx ? { ...m, content: (m.content === "Thinking…" ? "" : m.content) + delta } : m
      )
    );
  };

  async function streamFromOllama(latest: ChatMessage) {
    setIsStreaming(true);
    const history = messages.concat(latest);

    const res = await fetch(`${ollamaHost}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelId,
        messages: history,
        stream: true,
        options: { temperature: 0.7 },
      }),
    }).catch((e) => {
      console.error(e);
      setIsStreaming(false);
      return null;
    });

    if (!res?.body) {
      setIsStreaming(false);
      return;
    }

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
        } catch {}
      }
    }

    setIsStreaming(false);
    setMessages((prev) =>
      prev.map((m, i) =>
        i === aiIndexRef.current ? { ...m, content: normalizeMarkdown(m.content) } : m
      )
    );
  }

  function TypingDots() {
    const [i, setI] = useState(0);
    useEffect(() => {
      const t = setInterval(() => setI((v) => (v + 1) % 4), 350);
      return () => clearInterval(t);
    }, []);
    return <span>{"Thinking" + ".".repeat(i)}</span>;
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 flex flex-col">
      <header className="border-b border-neutral-800 p-4 sticky top-0 bg-neutral-950/80 backdrop-blur">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">The Assistant</h1>
            <p className="text-sm text-neutral-400">I&apos;m Ready to Help You</p>
          </div>
        </div>
      </header>

      <main className="grid grid-cols-12 gap-4 max-w-5xl w-full mx-auto flex-1 p-4">
        <aside className="col-span-12 md:col-span-3 border border-neutral-800 rounded-2xl p-3 hidden md:block h-[calc(100vh-9rem)] sticky top-20 overflow-auto no-scrollbar">
          <h2 className="font-medium mb-2">Settings</h2>
          <div className="space-y-3">
            <label className="block">
              <span className="text-sm text-neutral-400">Ollama Host</span>
              <input
                value={ollamaHost}
                onChange={(e) => setOllamaHost(e.target.value)}
                className="w-full mt-1 bg-neutral-900 border border-neutral-700 rounded-xl p-2 text-sm"
              />
              <p className="text-xs text-neutral-500 mt-1">
                e.g. <code>http://localhost:11434</code>
              </p>
            </label>
            <label className="block">
              <span className="text-sm text-neutral-400">Model</span>
              <input
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                className="w-full mt-1 bg-neutral-900 border border-neutral-700 rounded-xl p-2 text-sm"
              />
              <p className="text-xs text-neutral-500 mt-1">
                e.g. <code>the-assistant-gemma3-4b:latest</code>
              </p>
            </label>
          </div>
        </aside>

        <section className="col-span-12 md:col-span-9 border border-neutral-800 rounded-2xl flex flex-col h-[calc(100vh-9rem)]">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "rounded-2xl p-3 border",
                  m.role === "user" ? "bg-neutral-900 border-neutral-800" : "bg-neutral-950 border-neutral-800"
                )}
              >
                <div className="text-xs uppercase tracking-wide text-neutral-500 mb-1">{m.role}</div>
                <div className={cn("leading-relaxed text-sm", m.role === "user" ? "whitespace-pre-wrap" : "")}>
                  {m.content === "Thinking…" ? (
                    <TypingDots />
                  ) : m.role === "assistant" ? (
                    <PrettyMarkdown>{m.content}</PrettyMarkdown>
                  ) : (
                    m.content
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          <div className="p-3 border-t border-neutral-800 sticky bottom-0 bg-neutral-950/95 backdrop-blur rounded-b-2xl">
            <div className="flex items-center gap-2 px-3 py-2 bg-neutral-900 rounded-full border border-neutral-700 focus-within:ring-1 focus-within:ring-neutral-600 transition">
              <textarea
                rows={1}
                placeholder="Ask anything"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                className="flex-1 resize-none bg-transparent outline-none text-sm text-neutral-200 placeholder-neutral-500 px-2 py-2 no-scrollbar"
              />
              <button
                onClick={handleSend}
                disabled={isStreaming || !input.trim()}
                className="p-2 rounded-full hover:bg-neutral-800 transition disabled:opacity-60"
                aria-label="Send"
              >
                <FiSend />
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
