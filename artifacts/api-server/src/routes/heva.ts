import { Router } from "express";

const router = Router();

// POST /api/chat — streaming chat via Groq
router.post("/chat", async (req, res) => {
  const { messages, context } = req.body as {
    messages: { role: "user" | "assistant" | "system"; content: string }[];
    context?: string;
  };

  // Support both Groq (api.groq.com) and xAI Grok (api.x.ai)
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
    res.status(500).send("Missing GROQ_API_KEY or XAI_API_KEY — add one in Replit Secrets");
    return;
  }

  const sys = `You are Heva AI's podcast producer. Help the user shape their podcast: suggest angles, structure, hooks, host dynamics, length, and tone. Be concise, actionable, and warm.${
    context ? `\n\nCurrent project context:\n${context.slice(0, 8000)}` : ""
  }`;

  try {
    const groqRes = await fetch(`${apiBase}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        stream: true,
        messages: [{ role: "system", content: sys }, ...messages],
      }),
    });

    if (!groqRes.ok || !groqRes.body) {
      const text = await groqRes.text();
      res.status(groqRes.status).send(text);
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("X-Accel-Buffering", "no");

    // Stream the response body directly to the client
    const reader = (groqRes.body as any).getReader?.() as
      | ReadableStreamDefaultReader<Uint8Array>
      | undefined;

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    } else {
      // Fallback for Node native streams
      (groqRes.body as any).pipe(res);
    }
  } catch (err: any) {
    res.status(500).send(String(err?.message ?? err));
  }
});

// POST /api/generate-script — full script via Groq
router.post("/generate-script", async (req, res) => {
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
    res.status(500).send("Missing GROQ_API_KEY or XAI_API_KEY — add one in Replit Secrets");
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

  const userMsg = `DOCUMENT CONTENT:
"""
${body.content.slice(0, 60000)}
"""

${body.userPrompt ? `USER DIRECTION: ${body.userPrompt}` : ""}

Write the full podcast script now.`;

  try {
    const groqRes = await fetch(`${apiBase}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: userMsg },
        ],
      }),
    });

    if (!groqRes.ok) {
      const text = await groqRes.text();
      res.status(groqRes.status).send(text);
      return;
    }

    const data = (await groqRes.json()) as any;
    const script = data.choices?.[0]?.message?.content ?? "";
    res.json({ script });
  } catch (err: any) {
    res.status(500).send(String(err?.message ?? err));
  }
});

// POST /api/generate-thumbnails — images via Gemini
router.post("/generate-thumbnails", async (req, res) => {
  const { topic, styles } = req.body as { topic: string; styles: string[] };

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    res.status(500).send("Missing GEMINI_API_KEY — add it in Replit Secrets");
    return;
  }

  const results = await Promise.all(
    styles.map(async (style) => {
      const prompt = `Podcast cover art thumbnail, square 1:1, no text, purely visual, cinematic, high detail. Style: ${style}. Topic: ${topic}`;
      try {
        const gemRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${encodeURIComponent(key)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseModalities: ["IMAGE"] },
            }),
          }
        );

        if (!gemRes.ok) {
          const errText = await gemRes.text();
          return { style, url: null, error: errText.slice(0, 200) };
        }

        const data = (await gemRes.json()) as any;
        const parts: any[] = data.candidates?.[0]?.content?.parts ?? [];

        for (const part of parts) {
          if (part.inlineData?.data) {
            const mime = part.inlineData.mimeType ?? "image/png";
            const url = `data:${mime};base64,${part.inlineData.data}`;
            return { style, url };
          }
        }

        return { style, url: null, error: "No image data in Gemini response" };
      } catch (e: any) {
        return { style, url: null, error: String(e?.message ?? e) };
      }
    })
  );

  res.json({ results });
});

export default router;
