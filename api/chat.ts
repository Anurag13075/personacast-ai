import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") { res.status(405).end("Method Not Allowed"); return; }

  const { messages, context } = req.body as {
    messages: { role: string; content: string }[];
    context?: string;
  };

  const groqKey = process.env.GROQ_API_KEY;
  const xaiKey = process.env.XAI_API_KEY;
  const key = groqKey || xaiKey;
  const apiBase = groqKey
    ? "https://api.groq.com/openai/v1"
    : xaiKey
      ? "https://api.x.ai/v1"
      : null;
  const model = groqKey ? "llama-3.3-70b-versatile" : "grok-3-latest";

  if (!key || !apiBase) {
    res.status(500).send("Missing GROQ_API_KEY or XAI_API_KEY in environment");
    return;
  }

  const sys = `You are Heva AI's podcast producer. Help the user shape their podcast: suggest angles, structure, hooks, host dynamics, length, and tone. Be concise, actionable, and warm.${
    context ? `\n\nCurrent project context:\n${context.slice(0, 8000)}` : ""
  }`;

  try {
    const upstream = await fetch(`${apiBase}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        stream: true,
        messages: [{ role: "system", content: sys }, ...messages],
      }),
    });

    if (!upstream.ok || !upstream.body) {
      res.status(upstream.status).send(await upstream.text());
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("X-Accel-Buffering", "no");

    const reader = (upstream.body as any).getReader?.() as ReadableStreamDefaultReader<Uint8Array> | undefined;
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    } else {
      (upstream.body as any).pipe(res);
    }
  } catch (err: any) {
    res.status(500).send(String(err?.message ?? err));
  }
}
