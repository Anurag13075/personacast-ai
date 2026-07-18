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

// ─── Step 2: Receipt analysis via Groq Llama 4 Scout Vision ──────────────────
// Sends the receipt image as a base64 data URL to Groq's vision model, which
// reads and parses every field in a single API call.
// Pure REST — no native binaries, no WASM, works on Vercel serverless.

export async function analyzeReceipt(
  imageBuffer: Buffer,
  mimeType: string
): Promise<ReceiptResult> {
  const key = getKey();
  const base64 = imageBuffer.toString("base64");
  const dataUrl = `data:${mimeType};base64,${base64}`;

  const res = await fetch(`${GROQ_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: dataUrl },
            },
            {
              type: "text",
              text: `Analyze this receipt image and return structured data.
Return ONLY valid JSON with this exact schema — no markdown fences, no extra text:
{
  "vendor": "store or restaurant name",
  "line_items": [{"description": "item name", "amount": 0.00}],
  "total": 0.00,
  "date": "YYYY-MM-DD or null",
  "category_guess": "one of: Food and Beverage, Travel, Accommodation, Office Supplies, Entertainment, Healthcare, Other",
  "field_confidence": {
    "vendor": 0.0,
    "total": 0.0,
    "date": 0.0,
    "line_items": 0.0
  }
}
Set confidence values low (< 0.7) for fields that are hard to read or ambiguous.
Set confidence values high (> 0.9) only when the field is clearly legible.`,
            },
          ],
        },
      ],
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Receipt analysis failed (${res.status}): ${err}`);
  }

  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  const raw = data.choices[0].message.content ?? "";
  const clean = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
  const parsed = JSON.parse(clean) as ReceiptResult;

  return {
    vendor: parsed.vendor ?? "Unknown",
    line_items: parsed.line_items ?? [],
    total: parsed.total ?? 0,
    date: parsed.date ?? null,
    category_guess: parsed.category_guess ?? "Other",
    field_confidence: parsed.field_confidence ?? {},
  };
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
