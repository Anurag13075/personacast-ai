import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") { res.status(405).end("Method Not Allowed"); return; }

  const body = req.body as {
    hosts: { name: string; role: string }[];
    style: string;
    content: string;
    userPrompt?: string;
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

  const hostLines = body.hosts.map((h) => `- ${h.name} (${h.role})`).join("\n");

  const sys = `You are a professional podcast script writer. Write a natural, engaging podcast conversation between the given hosts based on the provided document content.

Hosts:
${hostLines}

Rules:
- Format EACH line strictly as "HostName: line of dialogue" on its own line.
- Never break format. No stage directions, no markdown headers.
- Use natural spoken language, banter, transitions, and follow-up questions.
- Where relevant, cite facts with brackets like [cite: page 8].
- Keep the whole script between 350 and 700 words unless the user prompt says otherwise.
- Open with a warm intro naming the topic, and close with a takeaway.
Style: ${body.style || "Engaging, curious, ~4 minutes."}`;

  const userMsg = `DOCUMENT CONTENT:\n"""\n${body.content.slice(0, 60000)}\n"""\n\n${
    body.userPrompt ? `USER DIRECTION: ${body.userPrompt}` : ""
  }\n\nWrite the full podcast script now.`;

  try {
    const upstream = await fetch(`${apiBase}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: sys }, { role: "user", content: userMsg }],
      }),
    });

    if (!upstream.ok) { res.status(upstream.status).send(await upstream.text()); return; }

    const data = (await upstream.json()) as any;
    const script = data.choices?.[0]?.message?.content ?? "";
    res.json({ script });
  } catch (err: any) {
    res.status(500).send(String(err?.message ?? err));
  }
}
