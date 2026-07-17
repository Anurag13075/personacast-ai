# Assignment Writeup — Expense Reconciler

**Candidate project for the Heva AI Full-Stack Engineer role.**

---

## The Assignment Brief (Summarised)

> Build a web app that accepts at least two different input modalities, passes them through a multi-step AI pipeline, and presents structured, editable output. Demonstrate real multimodal reasoning — not just stitching inputs together.

---

## How Every Requirement Is Met

### ✅ Two or more input modalities

| Modality | Implementation |
|----------|---------------|
| **Audio** | Voice memo (MP3 / WAV / M4A / OGG / WEBM) — user records or uploads |
| **Image** | Receipt photo (JPEG / PNG / WEBP / PDF) — camera or file upload |
| **Text** | Policy & Context Notes — plain-text field for expense rules and extra context |

Three distinct input types, each processed by a different model.

---

### ✅ Multi-step AI pipeline

The pipeline has three discrete steps, each depending on the previous:

```
Step 1  Whisper-large-v3     Audio  →  verbatim transcript
        Llama 3.3 70B        text   →  structured intent (amount, vendor, date, purpose, confidence)

Step 2  Llama 4 Scout        Image  →  per-field receipt extraction with confidence scores
        (vision)

Step 3  Llama 3.3 70B        All    →  cross-modal reconciliation, flag generation, confidence
```

Steps run sequentially; each result is stored before the next begins. The frontend polls every second and reveals each step's output as it completes — users see the transcript appear, then the receipt fields, then the flags.

---

### ✅ Structured, editable output

The reconciled expense is:

1. **Structured** — typed JSON with canonical fields (`amount`, `vendor`, `date`, `category`, `business_justification`, `flags[]`, `overall_confidence`, `reasoning`)
2. **Editable** — every field in the review UI can be clicked and edited inline
3. **Audited** — every edit is recorded as `{ field, old_value, new_value, edited_at }` — nothing is silently overwritten
4. **Exportable** — JSON and Markdown exports via dedicated endpoints

---

### ✅ Real multimodal reasoning — not just concatenation

The reconciliation step (Step 3) receives the audio extraction and receipt extraction as **separate structured objects** and is prompted to reason explicitly across them:

```
REASONING PROTOCOL:
1. Compare claimed_amount vs receipt total — flag if difference > 1%
2. Compare claimed_counterparty vs receipt vendor — flag if different
3. Compare claimed_date vs receipt date — flag if different
4. Assess whether claimed_purpose matches receipt line items
5. Check each policy/context note and flag any violations
6. Set overall_confidence based on how well the two sources agree
```

The model outputs a `reasoning` field explaining every decision in plain English. Flags include the specific `field`, a human-readable `reason`, and a `severity` (`low / medium / high`). This is auditor-grade reasoning, not a confidence number bolted onto a lookup.

---

### ✅ Confidence scoring

Confidence appears at three levels:

| Level | Where |
|-------|-------|
| Per-field on receipt | `field_confidence.vendor`, `field_confidence.total`, etc. — shown as ⚠ on low-confidence fields |
| Overall audio confidence | Extracted in Step 1, shown on the processing screen |
| Overall reconciliation confidence | Computed in Step 3 — shown as a large badge on the review page |

---

### ✅ Progress visibility

The processing page shows three step cards. Each card:
- Is dimmed while pending
- Shows a blue spinner while running
- Reveals the step's extracted data inline when done
- Turns green with a checkmark on completion

This gives the user live visibility into exactly where the AI is in the pipeline.

---

## Technical Decisions and Why

### Why Groq?

Groq's inference is fast enough (~5–8s per LLM call) for the three-step pipeline to complete in 15–25 seconds total. This makes real-time polling feel responsive rather than glacial. OpenAI or Anthropic would add latency that makes the step-by-step UX feel slow.

### Why three separate model calls for Step 1?

Whisper is best-in-class for transcription but outputs plain text. A second LLM call is needed to turn the transcript into structured JSON (`claimed_amount`, `claimed_vendor`, etc.). Combining these into a single call would reduce accuracy — the transcription model isn't a reasoning model and vice versa.

### Why Llama 4 Scout for vision?

Llama 4 Scout is Groq's vision-capable model with good document-reading ability. Receipts are text-heavy structured documents — Scout handles them well and returns machine-parseable JSON with per-field confidence.

### Why SQLite?

SQLite is zero-config, file-based, and survives server restarts without a connection pool. For a demo app with one user, it's the right tool. On Vercel the database lives in `/tmp` (ephemeral per cold start), which is fine for a demo — the history view resets occasionally but the core pipeline always works.

### Why polling instead of SSE?

Server-Sent Events require a persistent connection, which is incompatible with Vercel's serverless model. Polling at 1-second intervals gives equivalent UX for a 15–25 second pipeline and works identically in both environments.

### Why a text input as the third modality?

The policy notes field is genuinely useful. It turns the app from a receipt scanner into an expense auditor. A finance team can encode rules like "meals over $50 need manager approval" or "client name required on entertainment receipts" and the AI enforces them — flagging violations with the specific rule cited. This is a real product feature, not a demo gimmick.

---

## Architectural Overview

```
Browser (React SPA, Vite)
│
│  /expenses/new      → Upload form (3 inputs)
│  /expenses/:id      → Live polling progress (step cards)
│  /expenses/:id/review → Editable reconciled output
│  /expenses/history  → All past runs
│
└── fetch /api/*  ──────────────────────────────────────┐
                                                         ▼
                                              Express API (Node.js)
                                              │
                                              ├── POST /api/expenses
                                              │   multer → SQLite → pipeline()
                                              │
                                              ├── GET  /api/expenses/:id
                                              │   SQLite → JSON (step + data)
                                              │
                                              ├── POST /api/expenses/:id/edits
                                              │   SQLite → patched reconciled JSON
                                              │
                                              └── GET /api/expenses/:id/export/*
                                                  SQLite → JSON | Markdown

                                              pipeline() calls:
                                                ① Groq Whisper  (audio → text)
                                                ② Groq Llama3   (text → JSON intent)
                                                ③ Groq Scout    (image → JSON fields)
                                                ④ Groq Llama3   (all → reconciled)
```

---

## Running the Demo

### Files included

```bash
demo/receipt.png      # The Coffee Collective, SF · $37.99
demo/voice-memo.wav   # Claims ~$35, says July 14 (receipt says July 15)
```

The demo files are designed to produce three real flags:
1. **Amount mismatch** — voice says ~$35, receipt shows $37.99 (~8.5% difference → MEDIUM)
2. **Date mismatch** — voice says July 14th, receipt shows July 15th → MEDIUM
3. **No attendee names** — voice says "me and three teammates" but receipt has no names → LOW

### Try it live

1. Go to the deployed app
2. Click **Reconcile your first expense**
3. Drop `demo/receipt.png` into the Receipt Photo zone
4. Drop `demo/voice-memo.wav` into the Voice Memo zone
5. Optionally type: `Meals over $40 require manager approval. Attendee names required for team events.`
6. Click **Analyze Expense**
7. Watch the three steps process in real time
8. Review the flagged mismatches on the reconciled output

---

## What I Would Add with More Time

1. **Vercel Blob for uploads** — removes the 4.5 MB serverless body limit
2. **Neon Postgres** — replaces ephemeral `/tmp` SQLite for persistent history on Vercel
3. **Receipt line-item approval UI** — let the user approve or dispute each line item individually
4. **Multi-receipt runs** — reconcile a full month of receipts against a bank statement (true batch reconciliation)
5. **Webhook export** — push approved expenses directly to Expensify, SAP Concur, or a Notion database
6. **OCR fallback** — for printed receipts where the vision model struggles with unusual fonts
