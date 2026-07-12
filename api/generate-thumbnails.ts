import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") { res.status(405).end("Method Not Allowed"); return; }

  const { topic, styles } = req.body as { topic: string; styles: string[] };

  const key = process.env.GEMINI_API_KEY;
  if (!key) { res.status(500).send("Missing GEMINI_API_KEY in environment"); return; }

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

        if (!gemRes.ok) return { style, url: null, error: (await gemRes.text()).slice(0, 200) };

        const data = (await gemRes.json()) as any;
        const parts: any[] = data.candidates?.[0]?.content?.parts ?? [];
        for (const part of parts) {
          if (part.inlineData?.data) {
            return { style, url: `data:${part.inlineData.mimeType ?? "image/png"};base64,${part.inlineData.data}` };
          }
        }
        return { style, url: null, error: "No image data in Gemini response" };
      } catch (e: any) {
        return { style, url: null, error: String(e?.message ?? e) };
      }
    })
  );

  res.json({ results });
}
