import { Link } from "wouter";
import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Loader2, ArrowLeft, Sparkles } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useStore } from "@/lib/store";

type Msg = { role: "user" | "assistant"; content: string };

export default function Chat() {
  const { projects, currentId } = useStore();
  const current = projects.find((p) => p.id === currentId);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const send = async () => {
    const t = input.trim();
    if (!t || loading) return;
    const next = [...messages, { role: "user", content: t } as Msg];
    setMessages(next);
    setInput("");
    setLoading(true);
    setMessages([...next, { role: "assistant", content: "" }]);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next,
          context: current ? `Project: ${current.title}\nHosts: ${current.hosts.map(h => `${h.name} (${h.role})`).join(", ")}\nScript excerpt: ${(current.script || "").slice(0, 2000)}` : undefined,
        }),
      });
      if (!res.ok || !res.body) throw new Error(await res.text());
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const p of parts) {
          for (const line of p.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            try {
              const json = JSON.parse(data);
              const delta = json.choices?.[0]?.delta?.content ?? "";
              if (delta) {
                acc += delta;
                setMessages((m) => {
                  const copy = [...m];
                  copy[copy.length - 1] = { role: "assistant", content: acc };
                  return copy;
                });
                requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }));
              }
            } catch {}
          }
        }
      }
    } catch (e: any) {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: "assistant", content: `Error: ${e.message}` };
        return copy;
      });
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    "Make the podcast feel like NPR, warm and curious",
    "Turn my script into a 2-min explainer for beginners",
    "Suggest 5 hook openings for a tech podcast",
    "Restructure the script into three chapters",
  ];

  return (
    <div className="flex h-screen flex-col bg-[#fafbfc]">
      <div className="flex items-center justify-between border-b border-border bg-white px-6 py-3">
        <div className="flex items-center gap-4">
          <Link to="/studio" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-ink">
            <ArrowLeft className="h-4 w-4" /> Studio
          </Link>
          <div className="h-4 w-px bg-border" />
          <Logo />
          <span className="text-sm text-muted-foreground">· Producer chat</span>
        </div>
        <Link to="/" className="text-sm text-muted-foreground hover:text-ink">Home</Link>
      </div>

      <div ref={scrollRef} className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-4 py-8">
        {messages.length === 0 ? (
          <div className="mt-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/30">
              <Sparkles className="h-6 w-6" />
            </div>
            <h1 className="mt-6 text-3xl font-semibold">How should we shape your podcast?</h1>
            <p className="mt-2 text-sm text-muted-foreground">Ask Heva for angles, hooks, structure, host dynamics, or a full rewrite.</p>
            <div className="mx-auto mt-8 grid max-w-2xl grid-cols-1 gap-3 md:grid-cols-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="rounded-xl border border-border bg-white p-4 text-left text-sm hover:border-blue-400 hover:shadow-sm"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
                {m.role === "user" ? (
                  <div className="max-w-[80%] rounded-2xl bg-blue-600 px-4 py-3 text-sm text-white">{m.content}</div>
                ) : (
                  <div className="flex gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div className="prose prose-sm max-w-none text-ink">
                      {m.content ? <ReactMarkdown>{m.content}</ReactMarkdown> : <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-border bg-white px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-border bg-white p-2 shadow-sm focus-within:border-blue-400">
          <textarea
            className="max-h-40 flex-1 resize-none bg-transparent p-2 text-sm outline-none"
            rows={1}
            placeholder="Message Heva..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
            }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white disabled:opacity-40 hover:bg-blue-500"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
        <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-muted-foreground">Heva can help write, restructure, and polish your podcast script.</p>
      </div>
    </div>
  );
}
