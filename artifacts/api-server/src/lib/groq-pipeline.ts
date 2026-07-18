export type AudioResult = {
  transcript: string;
  claimed_purpose: string | null;
  claimed_amount: number | null;
  claimed_counterparty: string | null;
  claimed_date: string | null;
  confidence: number;
};

export type ReceiptResult = {
  vendor: string;
  line_items: { description: string; amount: number }[];
  total: number;
  date: string | null;
  category_guess: string;
  field_confidence: Record<string, number>;
};

export type ReconciledExpense = {
  category: string;
  amount: number;
  vendor: string;
  date: string;
  business_justification: string;
  flags: { field: string; reason: string; severity: "low" | "medium" | "high" }[];
  overall_confidence: number;
  reasoning?: string;
};

const GROQ_API_BASE = "https://api.groq.com/openai/v1";

function getKey(): string {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY not set — add it to your environment variables (Vercel: Settings → Environment Variables; Replit: Secrets tab)");
  return key;
}

// ─── Step 1a: Whisper transcription ───────────────────────────────────────────
export async function transcribeAudio(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<string> {
  const key = getKey();
  const blob = new Blob([buffer], { type: mimeType });
  const form = new FormData();
  form.append("file", blob, filename);
  form.append("model", "whisper-large-v3");
  form.append("response_format", "text");

  const res = await fetch(`${GROQ_API_BASE}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Whisper transcription failed (${res.status}): ${err}`);
  }

  return res.text();
}

// ─── Step 1b: Extract structured intent from transcript ────────────────────────
export async function extractAudioIntent(transcript: string): Promise<AudioResult> {
  const key = getKey();

  const res = await fetch(`${GROQ_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You extract structured expense information from voice memo transcripts.
Return ONLY valid JSON with this exact schema — no markdown fences, no extra text:
{
  "claimed_purpose": string or null,
  "claimed_amount": number or null,
  "claimed_counterparty": string or null,
  "claimed_date": "YYYY-MM-DD" or null,
  "confidence": 0.0 to 1.0
}
Set confidence low (< 0.6) if the speaker is vague or contradicts themselves.`,
        },
        {
          role: "user",
          content: `Voice memo transcript:\n\n"${transcript}"\n\nExtract the structured expense intent.`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Audio intent extraction failed (${res.status}): ${err}`);
  }

  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  const parsed = JSON.parse(data.choices[0].message.content);
  return {
    transcript,
    claimed_purpose: parsed.claimed_purpose ?? null,
    claimed_amount: parsed.claimed_amount ?? null,
    claimed_counterparty: parsed.claimed_counterparty ?? null,
    claimed_date: parsed.claimed_date ?? null,
    confidence: parsed.confidence ?? 0.5,
  };
}

// ─── Step 2: Receipt OCR + LLM analysis ───────────────────────────────────────
// Uses Tesseract OCR to extract text from the receipt image, then sends the
// raw text to the LLM for structured parsing. This avoids needing a vision
// model and works with any Groq text model.
import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

const execFileAsync = promisify(execFile);

async function ocrReceipt(imageBuffer: Buffer, mimeType: string): Promise<string> {
  const ext = mimeType.includes("png") ? "png" : mimeType.includes("gif") ? "gif" : "jpg";
  const tmpPath = join(tmpdir(), `receipt-${Date.now()}.${ext}`);
  await writeFile(tmpPath, imageBuffer);
  try {
    const { stdout } = await execFileAsync("tesseract", [tmpPath, "stdout"], {
      timeout: 30_000,
    });
    return stdout.trim();
  } finally {
    await unlink(tmpPath).catch(() => {});
  }
}

export async function analyzeReceipt(
  imageBuffer: Buffer,
  mimeType: string
): Promise<ReceiptResult> {
  const key = getKey();

  // Step 2a: OCR the image
  const ocrText = await ocrReceipt(imageBuffer, mimeType);
  if (!ocrText) throw new Error("Tesseract returned empty text — image may be unreadable");

  // Step 2b: LLM parses the raw OCR text into structured data
  const res = await fetch(`${GROQ_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are parsing raw OCR text extracted from a receipt image. The OCR may contain noise, mis-spellings, or garbled characters — interpret charitably.
Return ONLY valid JSON with this exact schema — no markdown fences, no extra text:
{
  "vendor": string,
  "line_items": [{"description": string, "amount": number}],
  "total": number,
  "date": "YYYY-MM-DD" or null,
  "category_guess": string,
  "field_confidence": {
    "vendor": 0.0–1.0,
    "total": 0.0–1.0,
    "date": 0.0–1.0,
    "line_items": 0.0–1.0
  }
}
Field confidence rules:
- Set below 0.7 for any field with heavy OCR noise or ambiguity
- Set below 0.5 if the field is absent or clearly garbled
- Only set above 0.9 if the field is cleanly readable`,
        },
        {
          role: "user",
          content: `Raw OCR text from receipt:\n\n${ocrText}\n\nParse into the structured receipt JSON.`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Receipt analysis failed (${res.status}): ${err}`);
  }

  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  return JSON.parse(data.choices[0].message.content) as ReceiptResult;
}

// ─── Step 3: Cross-modal reconciliation ───────────────────────────────────────
export async function reconcileExpense(
  audioResult: AudioResult,
  receiptResult: ReceiptResult,
  policyNotes?: string
): Promise<ReconciledExpense> {
  const key = getKey();

  const policySection = policyNotes?.trim()
    ? `\n\nPOLICY & CONTEXT NOTES (provided by the user — apply these rules when flagging):\n${policyNotes.trim()}\n\nFor each policy rule, check if this expense complies. If it violates a rule, add a flag with severity "high" if it's a hard rule (e.g. amount limit, required field) or "medium" if it's a soft rule (e.g. preferred category). Reference the specific rule in the flag reason.`
    : "";

  const res = await fetch(`${GROQ_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are a senior expense auditor performing cross-modal reconciliation.
You receive data from two independent sources: a voice memo and a receipt scan, plus optional policy notes.
Your job is to reason explicitly about agreement and disagreement, then produce a structured report.

REASONING PROTOCOL (follow in order):
1. Compare claimed_amount vs receipt total — flag if difference > 1%
2. Compare claimed_counterparty vs receipt vendor — flag if different
3. Compare claimed_date vs receipt date — flag if different
4. Assess whether claimed_purpose matches receipt line items — flag if implausible
5. Consider low field_confidence values as additional uncertainty — flag accordingly
6. Check each policy/context note and flag any violations
7. Set overall_confidence based on how well the two sources agree and policy compliance

Flag severity guide:
- "high": amount mismatch > 10%, vendor mismatch, clearly implausible purpose, hard policy violation
- "medium": amount mismatch 1-10%, date mismatch, purpose partially unclear, soft policy concern
- "low": minor discrepancies, low confidence on minor fields

Return ONLY valid JSON — no markdown fences, no extra text:
{
  "category": string,
  "amount": number,
  "vendor": string,
  "date": "YYYY-MM-DD",
  "business_justification": string,
  "flags": [{"field": string, "reason": string, "severity": "low"|"medium"|"high"}],
  "overall_confidence": 0.0–1.0,
  "reasoning": "brief step-by-step reconciliation summary"
}`,
        },
        {
          role: "user",
          content: `VOICE MEMO DATA:
${JSON.stringify(audioResult, null, 2)}

RECEIPT DATA:
${JSON.stringify(receiptResult, null, 2)}${policySection}

Reason step-by-step and produce the reconciled expense report.`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Reconciliation failed (${res.status}): ${err}`);
  }

  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  return JSON.parse(data.choices[0].message.content) as ReconciledExpense;
}
