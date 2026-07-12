# Heva AI — PDF-to-Podcast Engine

Turn any PDF into insightful podcast-style conversations. Upload documents, customize hosts, generate scripts with AI, listen to audio, and export.

## Features

- 📄 PDF & image ingestion with text extraction
- 🤖 AI-generated podcast scripts (Lovable AI / Gemini)
- 🎙️ Multi-host conversations with fully customizable host names
- 🔊 In-browser audio playback with per-host voices
- 🖼️ AI-generated thumbnail images
- 💬 ChatGPT-style prompt interface to steer the podcast
- 💾 Local project library (no auth required)

## Deploy to Vercel (one click)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone)

1. Push this repo to GitHub.
2. Import into Vercel — no config needed (`vercel.json` sets everything).
3. Add environment variable `LOVABLE_API_KEY` in Vercel project settings.
4. Deploy.

## Local dev

```bash
bun install
bun run dev
```

Requires `LOVABLE_API_KEY` in your environment for AI features.
