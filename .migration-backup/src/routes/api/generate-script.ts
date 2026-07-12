import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/generate-script")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as {
          hosts: { name: string; role: string }[];
          style: string;
          content: string;
          userPrompt?: string;
        };
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

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

        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": key,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: sys },
              { role: "user", content: userMsg },
            ],
          }),
        });
        if (!res.ok) {
          const t = await res.text();
          return new Response(t, { status: res.status });
        }
        const data = (await res.json()) as any;
        const script = data.choices?.[0]?.message?.content ?? "";
        return Response.json({ script });
      },
    },
  },
});
