# Expense Reconciler

**Multimodal AI expense auditing.** Upload a receipt photo + voice memo + optional policy notes. Three Groq-powered AI models cross-check every field and flag real mismatches before the expense hits finance.

![Pipeline](https://img.shields.io/badge/pipeline-Whisper%20%2B%20Vision%20%2B%20LLM-blue)
![Stack](https://img.shields.io/badge/stack-React%20%2B%20Express%20%2B%20Groq-black)
![Deployed](https://img.shields.io/badge/deployed-Vercel-green)

---

## Live Demo

**[expense-reconciler.vercel.app](https://personacast-ai.vercel.app)**

Use the files in `demo/` to try it immediately:
- `demo/receipt.png` — The Coffee Collective, SF · $37.99 total
- `demo/voice-memo.wav` — Claims ~$35, July 14th (receipt says July 15th — intentional mismatch)

---

## What It Does

```
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│  🎙 Voice Memo   │   │  🧾 Receipt Photo │   │  📝 Policy Notes │
│  (audio/*)      │   │  (image/*)       │   │  (plain text)   │
└────────┬────────┘   └────────┬────────┘   └────────┬────────┘
         │                     │                     │
         ▼                     ▼                     │
  ┌──────────────┐    ┌──────────────────┐           │
  │ Whisper v3   │    │ Llama 4 Scout    │           │
  │ Transcribe   │    │ Vision — reads   │           │
  │ + LLM intent │    │ every field      │           │
  │ extraction   │    │ w/ confidence    │           │
  └──────┬───────┘    └────────┬─────────┘           │
         │                     │                     │
         └─────────────────────┴─────────────────────┘
                               │
                               ▼
                   ┌───────────────────────┐
                   │  Llama 3.3 70B         │
                   │  Cross-modal reasoning │
                   │  + policy enforcement  │
                   └───────────┬───────────┘
                               │
                               ▼
                   ┌───────────────────────┐
                   │  Reconciled Expense   │
                   │  • Flagged mismatches │
                   │  • Confidence scores  │
                   │  • Edit tracking      │
                   │  • JSON / MD export   │
                   └───────────────────────┘
```

### Step 1 — Audio Understanding (Groq Whisper + Llama 3.3 70B)

Whisper-large-v3 transcribes the voice memo verbatim. A second LLM call extracts structured intent: claimed amount, vendor, date, purpose, and an overall confidence score.

### Step 2 — Receipt Analysis (Llama 4 Scout Vision)

The vision model reads every field on the receipt image — vendor, total, date, every line item — and assigns per-field confidence scores (below 0.7 = flagged).

### Step 3 — Reconciliation (Llama 3.3 70B)

A reasoning LLM receives all three inputs (audio extraction, receipt extraction, policy notes) and produces:
- A canonical reconciled expense record
- A list of flags with `low / medium / high` severity and human-readable reasons
- A reasoning trace explaining every decision
- An overall confidence score

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, Tailwind CSS v4, Wouter |
| Backend | Express 5, TypeScript, esbuild |
| AI | Groq API — Whisper-large-v3, Llama 4 Scout (vision), Llama 3.3 70B |
| Database | SQLite via better-sqlite3 (local) · /tmp SQLite (Vercel) |
| File uploads | Multer (memory storage, 50 MB limit) |
| Monorepo | pnpm workspaces |
| Deployment | Vercel (frontend SPA + serverless API function) |

---

## Running Locally

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 10
- A [Groq API key](https://console.groq.com) (free tier works)

### Setup

```bash
git clone https://github.com/Anurag13075/personacast-ai
cd personacast-ai

# Install all workspace dependencies
pnpm install

# Set your Groq API key
echo "GROQ_API_KEY=gsk_..." > .env   # or set in your shell

# Start the API server (port 3001)
PORT=3001 pnpm --filter @workspace/api-server run dev &

# Start the frontend (port 5000)
PORT=5000 pnpm --filter @workspace/heva-ai run dev
```

Open **http://localhost:5000**.

### Testing with demo files

```bash
# Run the pipeline via curl
curl -X POST http://localhost:3001/api/expenses \
  -F "receipt=@demo/receipt.png" \
  -F "audio=@demo/voice-memo.wav" \
  -F "policyNotes=Meals over $40 require manager sign-off"
```

---

## Deploying to Vercel

### 1. Set environment variable

In your Vercel project → Settings → Environment Variables:

```
GROQ_API_KEY = gsk_...your_key_here...
```

### 2. Push to GitHub

Vercel auto-deploys on every push to `main`.

```bash
git add -A && git commit -m "deploy" && git push origin main
```

### 3. Important limits on Vercel

| Concern | Detail |
|---------|--------|
| Request body size | 4.5 MB on Hobby plan — keep receipt + audio under that combined |
| Function timeout | Set to 60s in vercel.json — sufficient for Groq's ~15-25s pipeline |
| Storage | SQLite uses `/tmp` on Vercel — history resets on cold starts (fine for demo) |
| Pipeline mode | On Vercel the POST blocks until the pipeline completes (no polling) |

---

## API Reference

### `POST /api/expenses`
Upload receipt + audio, start the pipeline.

```
Content-Type: multipart/form-data
Fields:
  receipt      (file, required) image/jpeg · image/png · image/webp · application/pdf
  audio        (file, required) audio/*
  policyNotes  (string, optional) Plain-text expense policy or context
```

Response:
```json
{ "id": "uuid", "status": "pending" }
```

---

### `GET /api/expenses/:id`
Poll for pipeline progress.

```json
{
  "id": "...",
  "status": "pending | step1 | step2 | step3 | done | error",
  "audio_result": { "transcript": "...", "claimed_amount": 39, ... },
  "receipt_result": { "vendor": "...", "total": 39.13, ... },
  "reconciled": {
    "amount": 39.13,
    "vendor": "...",
    "flags": [{ "field": "...", "reason": "...", "severity": "medium" }],
    "overall_confidence": 0.85
  }
}
```

---

### `POST /api/expenses/:id/edits`
Track a manual correction.

```json
{ "field": "vendor", "old_value": "Urban Grand Cafe", "new_value": "Urban Grind Cafe" }
```

---

### `GET /api/expenses/:id/export/json`
Download full report as JSON.

### `GET /api/expenses/:id/export/markdown`
Download full report as Markdown.

---

## Project Structure

```
/
├── api/
│   └── index.js              # Vercel serverless entry point (wraps Express app)
├── artifacts/
│   ├── api-server/           # Express API
│   │   └── src/
│   │       ├── app.ts        # Express app setup
│   │       ├── index.ts      # Server entry / Vercel export
│   │       ├── lib/
│   │       │   ├── database.ts       # SQLite schema + prepared queries
│   │       │   └── groq-pipeline.ts  # All Groq API calls (3 steps)
│   │       └── routes/
│   │           └── expenses.ts       # All expense endpoints
│   └── heva-ai/              # React SPA (Vite)
│       └── src/
│           ├── App.tsx        # Wouter router
│           └── pages/
│               ├── Landing.tsx              # Marketing landing page
│               └── expenses/
│                   ├── New.tsx              # Upload form (3 inputs)
│                   ├── Processing.tsx       # Step-by-step progress polling
│                   ├── Review.tsx           # Editable reconciled report
│                   └── History.tsx          # All past runs
├── demo/
│   ├── receipt.png           # Demo receipt — The Coffee Collective
│   └── voice-memo.wav        # Demo voice memo (has intentional mismatches)
├── vercel.json               # Vercel build + function config
└── pnpm-workspace.yaml
```
