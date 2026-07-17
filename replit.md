# Heva AI — Expense Reconciler + PDF-to-Podcast Studio

## Project overview
A full-stack pnpm workspace ported from Vercel, consisting of two artifacts:

- **`artifacts/heva-ai/`** — React + Vite SPA (port 5000). Routing via `wouter`. Two main product flows:
  - **Expense Reconciler** (`/`, `/expenses/*`) — multimodal AI pipeline: voice memo transcription, receipt vision analysis, and cross-modal reconciliation with flags
  - **PDF-to-Podcast Studio** (`/studio`, `/chat`) — upload PDFs, generate podcast scripts, AI thumbnails, and audio playback

- **`artifacts/api-server/`** — Express 5 API server (port 3001). Handles:
  - `POST /api/chat` — Groq/xAI streaming chat for the producer assistant
  - `POST /api/generate-script` — Groq/xAI script generation from PDF content
  - `POST /api/generate-thumbnails` — Gemini image generation for podcast covers
  - `POST /api/expenses` and related — full expense reconciliation pipeline (Whisper transcription + Llama 4 Scout vision + Llama 3.3 70B reconciliation), backed by SQLite (`data/expenses.db`)

## Running the app
Two workflows must be running:
- **Start application** — `cd artifacts/heva-ai && pnpm dev` (webview, port 5000)
- **Start Backend** — `cd artifacts/api-server && pnpm dev` (console, port 3001)

The Vite dev server proxies all `/api/*` requests to the backend at `localhost:3001`.

## Secrets needed
Set these in Replit Secrets before using AI features:
- `GROQ_API_KEY` — for script generation, chat, and expense pipeline (Groq preferred)
- `XAI_API_KEY` — alternative to Groq for chat and script generation (xAI/Grok)
- `GEMINI_API_KEY` — for podcast thumbnail image generation

## Architecture notes
- The frontend is a plain Vite React SPA (not TanStack Start SSR). `main.tsx` → `App.tsx` → `wouter` router.
- The Lovable AI dependency (`@lovable.dev/vite-tanstack-config`) has been removed; APIs use Groq/xAI and Gemini directly.
- SQLite database is stored at `data/expenses.db` (auto-created on first run).
- Shared libraries live in `lib/` (api-client-react, api-zod, api-spec, db).

## User preferences
- Keep workflows minimal; use port 5000 for webview and 3001 for the backend.
