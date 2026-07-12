import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages, context } = (await request.json()) as {
          messages: { role: "user" | "assistant" | "system"; content: string }[];
          context?: string;
        };
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const sys = `You are Heva AI's podcast producer. Help the user shape their podcast: suggest angles, structure, hooks, host dynamics, length, and tone. Be concise, actionable, and warm.${
          context ? `\n\nCurrent project context:\n${context.slice(0, 8000)}` : ""
        }`;

        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            stream: true,
            messages: [{ role: "system", content: sys }, ...messages],
          }),
        });
        if (!res.ok || !res.body) {
          return new Response(await res.text(), { status: res.status });
        }
        return new Response(res.body, {
          headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
        });
      },
    },
  },
});
