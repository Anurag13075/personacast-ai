import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/generate-thumbnails")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { topic, styles } = (await request.json()) as { topic: string; styles: string[] };
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const results = await Promise.all(
          styles.map(async (style) => {
            const prompt = `Podcast cover art thumbnail, square 1:1, no text, purely visual, cinematic, high detail. Style: ${style}. Topic: ${topic}`;
            try {
              const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
                body: JSON.stringify({
                  model: "google/gemini-2.5-flash-image-preview",
                  messages: [{ role: "user", content: prompt }],
                  modalities: ["image", "text"],
                }),
              });
              if (!res.ok) return { style, url: null, error: await res.text() };
              const data = (await res.json()) as any;
              const url = data.choices?.[0]?.message?.images?.[0]?.image_url?.url ?? null;
              return { style, url };
            } catch (e: any) {
              return { style, url: null, error: String(e?.message ?? e) };
            }
          })
        );
        return Response.json({ results });
      },
    },
  },
});
