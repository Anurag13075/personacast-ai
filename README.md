# Expense Reconciler — Heva AI Assignment 3

## The User Problem

Finance teams waste hours chasing discrepancies between what employees claim on expense reports and what receipts actually say. The amounts don't match. The dates are off. The vendor names differ. The business purpose is vague. By the time a policy violation surfaces, it's already in the accounting system.

**This product solves it at the point of submission.** The employee describes the expense out loud — the way they'd explain it to their manager — while uploading the receipt. The AI cross-checks every field between what was *said* and what the receipt *shows*, flags every mismatch with a severity and reason, and produces a structured report before the expense ever reaches finance.

## Why It Requires Multiple Modalities

Removing either modality breaks the product:

- **Without audio:** You have a receipt scanner. It tells you what was spent, not why or whether the story matches. You cannot detect a misrepresented purpose, a conflated date, or an amount that was rounded suspiciously. The reconciliation has nothing to reconcile against.
- **Without the receipt:** You have a voice memo parser. You know what the employee claims — but claims are unverified. There is no ground truth to compare against.

The value comes entirely from the *tension* between the two sources. The AI's job is to find where they agree and where they conflict. That reasoning is non-trivial to do manually and impossible without both inputs.

## Pipeline Architecture

```
[Audio File] ──▶ Groq Whisper ──▶ transcript
                                       │
                                       ▼
                              Groq Llama 3.3-70B ──▶ AudioResult
                              (intent extraction)      { claimed_amount,
                                                         claimed_counterparty,
                                                         claimed_date,
                                                         claimed_purpose,
                                                         confidence }
                                                              │
[Receipt Image] ──▶ displayed ──▶ user fills fields           │
                   to user                                    │
                                       │                      │
                              ReceiptResult                   │
                              { vendor, total,                │
                                date, category,               │
                                field_confidence }            │
                                       │                      │
                                       └──────────┬───────────┘
                                                  ▼
                                       Groq Llama 3.3-70B
                                       (cross-modal reconciliation)
                                                  │
                                                  ▼
                                       ReconciledExpense
                                       { amount, vendor, date,
                                         category, justification,
                                         flags[], overall_confidence,
                                         reasoning }
```

### Step 1 — Audio Understanding (non-text modality → structured intent)
**Input:** Audio file (WAV/MP3/M4A/WebM) or live browser mic recording  
**Processing:** Groq Whisper large-v3 transcribes the audio to text, then Groq Llama 3.3-70B extracts structured intent via JSON-mode  
**Output:** `AudioResult` — claimed amount, vendor, date, purpose, and a confidence score  
**Schema is strict:** the model must return `null` for fields it cannot extract; it cannot hallucinate values

### Step 2 — Receipt Data (non-text reference → structured fields)
**Input:** Receipt image (displayed to the user as reference) + manually entered fields  
**Processing:** Instant — no API call. The user reads their own receipt and enters vendor, total, date, and category  
**Output:** `ReceiptResult` — same shape as Step 1's output, with field-level confidence set to 1.0 for user-entered fields  
**Design decision:** Human verification over vision-model guessing. The receipt is the ground truth; accuracy here matters more than automation.

### Step 3 — Cross-Modal Reconciliation (reasoning across both)
**Input:** `AudioResult` + `ReceiptResult` + optional policy notes  
**Processing:** Groq Llama 3.3-70B with a structured reasoning protocol — compares each field pair, checks policy rules, assigns flag severity  
**Output:** `ReconciledExpense` — final amounts, flags with severity (high/medium/low), overall confidence, and step-by-step reasoning text

The pipeline streams results via SSE. Steps 1 and 2 run in parallel. The UI updates each step card the moment its result arrives — the user never stares at a blank screen.

## Handling Uncertainty

Uncertainty is surfaced at three levels:

1. **Per-field audio confidence** — extracted from Llama's JSON output. Fields the model is unsure about (e.g. a mumbled amount) get `< 0.7` confidence and trigger a ⚠ badge in the UI.
2. **Flag severity** — each mismatch is tagged `high` / `medium` / `low`. Amount mismatches > 10% are high. Date mismatches are medium. Vague purpose matches are low.
3. **Overall confidence** — a 0–1 score on the reconciled output, displayed as a color-coded percentage. It reflects how well the two sources agree and whether any policy rules were violated.

Uncertainty is never silently absorbed. If a field cannot be extracted from audio, the model returns `null` — the flag system then surfaces it as a low-confidence data point, not a fabricated value.

## What I Would Build Next

1. **Vision model for receipt OCR** — When Groq ships vision model access, Step 2 becomes fully automated. The human verification step was a pragmatic choice, not the target architecture.
2. **Batch reconciliation** — Upload a folder of receipts + a voice memo dump from a business trip. The pipeline fans out, reconciles each receipt independently, and produces a summary report.
3. **Policy rule library** — A persistent, editable set of company expense rules that applies to every submission without the user having to paste them each time.
4. **Integration with expense management systems** — Push reconciled, approved expenses directly to Expensify, Concur, or a custom ERP via webhook.
5. **Mismatch pattern detection** — Flag employees who systematically round up amounts or consistently misstate dates — a compliance signal that single-run reconciliation cannot detect.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS v4, Wouter, Framer Motion, Zustand |
| Backend | Express 5, TypeScript, esbuild |
| AI | Groq Whisper large-v3 (audio), Groq Llama 3.3-70B (intent + reconciliation) |
| Database | SQLite via better-sqlite3 |
| Streaming | Server-Sent Events (SSE) |

## Running Locally

```bash
pnpm install
# Set GROQ_API_KEY in environment
# Terminal 1:
pnpm --filter @workspace/api-server run dev   # port 8080
# Terminal 2:
pnpm --filter @workspace/heva-ai run dev      # port 5173
```

## Sample Inputs

The `demo/` folder contains:
- `demo/voice-memo.wav` — audio memo claiming ~$35, July 14th, Coffee Collective
- `demo/receipt.png` — The Coffee Collective receipt: $37.99, July 15th

These inputs are designed to produce two medium-severity flags (amount mismatch 8.5%, date off by one day) — a realistic scenario that demonstrates the reconciliation working correctly.

Author 
Anurag
