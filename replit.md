# Expense Reconciler

Multimodal AI expense auditing app. Upload a receipt photo + voice memo + optional policy notes. Three Groq-powered AI models cross-check every field and flag real mismatches before the expense hits finance.

## Stack

- **Frontend:** React + Vite + Tailwind (`artifacts/heva-ai/`)
- **Backend:** Express + SQLite (`artifacts/api-server/`)
- **AI:** Groq API — Whisper v3 (audio), Llama 4 Scout Vision (receipt), Llama 3 (reconciliation)

## How to run

Two workflows run in parallel:

| Workflow | Command | Port |
|----------|---------|------|
| `artifacts/heva-ai: web` | `pnpm --filter @workspace/heva-ai run dev` | 21511 |
| `artifacts/api-server: API Server` | `pnpm --filter @workspace/api-server run dev` | 8080 |

## Required secrets

| Secret | Where to get it |
|--------|----------------|
| `GROQ_API_KEY` | https://console.groq.com/keys |

## Demo files

The `demo/` folder has ready-to-use test assets:
- `demo/receipt.png` — The Coffee Collective, SF · $37.99 total
- `demo/voice-memo.wav` — Claims ~$35, July 14th (receipt says July 15th — intentional mismatch)

## Project structure

```
artifacts/
  heva-ai/          # React SPA (Vite)
  api-server/       # Express API
    src/
      lib/
        database.ts         # SQLite schema + queries
        groq-pipeline.ts    # All 3 Groq AI calls
      routes/
        expenses.ts         # REST endpoints
demo/               # Sample receipt + voice memo
lib/                # Shared API client / types / spec
```

## User preferences

- Keep existing project structure and stack
