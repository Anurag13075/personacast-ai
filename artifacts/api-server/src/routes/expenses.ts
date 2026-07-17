import { Router } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { queries } from "../lib/database.js";
import {
  transcribeAudio,
  extractAudioIntent,
  analyzeReceipt,
  reconcileExpense,
  type AudioResult,
  type ReceiptResult,
  type ReconciledExpense,
} from "../lib/groq-pipeline.js";
import { logger } from "../lib/logger.js";

const router = Router();

// Multer: keep files in memory (max 50 MB each)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

// ─── Background pipeline ────────────────────────────────────────────────────
async function runPipeline(
  runId: string,
  audioBuffer: Buffer,
  audioFilename: string,
  audioMimeType: string,
  imageBuffer: Buffer,
  imageMimeType: string
) {
  try {
    // Step 1 — Audio understanding
    queries.updateRunStatus.run("step1", runId);
    logger.info({ runId }, "Pipeline: step 1 — transcribing audio");

    const transcript = await transcribeAudio(audioBuffer, audioFilename, audioMimeType);
    const audioResult = await extractAudioIntent(transcript);
    queries.updateAudioResult.run(JSON.stringify(audioResult), runId);

    logger.info({ runId }, "Pipeline: step 2 — analyzing receipt");

    // Step 2 — Receipt understanding
    const receiptResult = await analyzeReceipt(imageBuffer, imageMimeType);
    queries.updateReceiptResult.run(JSON.stringify(receiptResult), runId);

    logger.info({ runId }, "Pipeline: step 3 — reconciling");

    // Step 3 — Cross-modal reconciliation
    const reconciled = await reconcileExpense(audioResult, receiptResult);
    queries.updateReconciled.run(
      JSON.stringify(reconciled),
      reconciled.overall_confidence,
      runId
    );

    logger.info({ runId }, "Pipeline: done");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ runId, err: msg }, "Pipeline error");
    queries.setError.run(msg, runId);
  }
}

// ─── POST /api/expenses — create run ─────────────────────────────────────────
router.post(
  "/",
  upload.fields([
    { name: "receipt", maxCount: 1 },
    { name: "audio", maxCount: 1 },
  ]),
  (req, res) => {
    const files = req.files as Record<string, Express.Multer.File[]> | undefined;
    const receiptFile = files?.receipt?.[0];
    const audioFile = files?.audio?.[0];

    if (!receiptFile || !audioFile) {
      res.status(400).json({ error: "Both 'receipt' (image) and 'audio' files are required" });
      return;
    }

    const runId = randomUUID();
    const now = new Date().toISOString();

    queries.createRun.run(
      runId,
      now,
      audioFile.originalname,
      receiptFile.originalname
    );

    // Fire-and-forget pipeline
    setImmediate(() => {
      void runPipeline(
        runId,
        audioFile.buffer,
        audioFile.originalname,
        audioFile.mimetype,
        receiptFile.buffer,
        receiptFile.mimetype
      );
    });

    res.status(201).json({ id: runId, status: "pending" });
  }
);

// ─── GET /api/expenses — list all runs ───────────────────────────────────────
router.get("/", (_req, res) => {
  const runs = queries.listAll.all();
  res.json(runs.map(parseRun));
});

// ─── GET /api/expenses/:id — get run ─────────────────────────────────────────
router.get("/:id", (req, res) => {
  const run = queries.getById.get(req.params.id);
  if (!run) {
    res.status(404).json({ error: "Run not found" });
    return;
  }

  const edits = queries.getEditsForRun.all(req.params.id);
  res.json({ ...parseRun(run), edits });
});

// ─── POST /api/expenses/:id/edits — track an edit ────────────────────────────
router.post("/:id/edits", (req, res) => {
  const { field, old_value, new_value } = req.body as {
    field: string;
    old_value: string | null;
    new_value: string | null;
  };

  if (!field) {
    res.status(400).json({ error: "'field' is required" });
    return;
  }

  const run = queries.getById.get(req.params.id);
  if (!run) {
    res.status(404).json({ error: "Run not found" });
    return;
  }

  // Apply edit to reconciled JSON
  if (run.reconciled) {
    const reconciled = JSON.parse(run.reconciled) as ReconciledExpense;
    const parts = field.split(".");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let obj: any = reconciled;
    for (let i = 0; i < parts.length - 1; i++) {
      obj = obj[parts[i]];
    }
    obj[parts[parts.length - 1]] = new_value;
    queries.updateReconciled2.run(JSON.stringify(reconciled), req.params.id);
  }

  const editId = randomUUID();
  queries.createEdit.run(
    editId,
    req.params.id,
    field,
    old_value !== undefined ? String(old_value) : null,
    new_value !== undefined ? String(new_value) : null,
    new Date().toISOString()
  );

  res.status(201).json({ id: editId });
});

// ─── GET /api/expenses/:id/export/json ───────────────────────────────────────
router.get("/:id/export/json", (req, res) => {
  const run = queries.getById.get(req.params.id);
  if (!run || !run.reconciled) {
    res.status(404).json({ error: "Run not found or not complete" });
    return;
  }

  const edits = queries.getEditsForRun.all(req.params.id);
  const parsed = parseRun(run);

  const payload = {
    id: run.id,
    created_at: run.created_at,
    expense: parsed.reconciled,
    audio_understanding: parsed.audio_result,
    receipt_understanding: parsed.receipt_result,
    edits: edits.map((e) => ({
      field: e.field,
      from: e.old_value,
      to: e.new_value,
      at: e.edited_at,
    })),
  };

  res.setHeader("Content-Disposition", `attachment; filename="expense-${run.id.slice(0, 8)}.json"`);
  res.json(payload);
});

// ─── GET /api/expenses/:id/export/markdown ────────────────────────────────────
router.get("/:id/export/markdown", (req, res) => {
  const run = queries.getById.get(req.params.id);
  if (!run || !run.reconciled) {
    res.status(404).json({ error: "Run not found or not complete" });
    return;
  }

  const parsed = parseRun(run);
  const r = parsed.reconciled as ReconciledExpense;
  const a = parsed.audio_result as AudioResult | null;
  const rc = parsed.receipt_result as ReceiptResult | null;
  const edits = queries.getEditsForRun.all(req.params.id);

  const severityEmoji = { high: "🔴", medium: "🟡", low: "🟢" };

  const lines: string[] = [
    `# Expense Report`,
    ``,
    `**Created:** ${run.created_at}`,
    `**Confidence:** ${Math.round((r.overall_confidence ?? 0) * 100)}%`,
    ``,
    `## Reconciled Expense`,
    ``,
    `| Field | Value |`,
    `|-------|-------|`,
    `| Vendor | ${r.vendor} |`,
    `| Amount | $${r.amount?.toFixed(2)} |`,
    `| Date | ${r.date} |`,
    `| Category | ${r.category} |`,
    `| Justification | ${r.business_justification} |`,
    ``,
  ];

  if (r.flags?.length) {
    lines.push(`## Flags`, ``);
    for (const f of r.flags) {
      const emoji = severityEmoji[f.severity] ?? "⚪";
      lines.push(`- ${emoji} **${f.severity.toUpperCase()} — ${f.field}**: ${f.reason}`);
    }
    lines.push(``);
  }

  if (r.reasoning) {
    lines.push(`## Reconciliation Reasoning`, ``, r.reasoning, ``);
  }

  if (a) {
    lines.push(
      `## Voice Memo Understanding`,
      ``,
      `**Transcript:** "${a.transcript}"`,
      ``,
      `| Field | Claimed |`,
      `|-------|---------|`,
      `| Purpose | ${a.claimed_purpose ?? "—"} |`,
      `| Amount | ${a.claimed_amount != null ? `$${a.claimed_amount}` : "—"} |`,
      `| Counterparty | ${a.claimed_counterparty ?? "—"} |`,
      `| Date | ${a.claimed_date ?? "—"} |`,
      `| Confidence | ${Math.round((a.confidence ?? 0) * 100)}% |`,
      ``
    );
  }

  if (rc) {
    lines.push(
      `## Receipt Understanding`,
      ``,
      `| Field | Value | Confidence |`,
      `|-------|-------|------------|`,
      `| Vendor | ${rc.vendor} | ${Math.round((rc.field_confidence?.vendor ?? 0) * 100)}% |`,
      `| Total | $${rc.total?.toFixed(2)} | ${Math.round((rc.field_confidence?.total ?? 0) * 100)}% |`,
      `| Date | ${rc.date ?? "—"} | ${Math.round((rc.field_confidence?.date ?? 0) * 100)}% |`,
      `| Category | ${rc.category_guess} | — |`,
      ``
    );
    if (rc.line_items?.length) {
      lines.push(`**Line Items:**`, ``);
      for (const item of rc.line_items) {
        lines.push(`- ${item.description}: $${item.amount?.toFixed(2)}`);
      }
      lines.push(``);
    }
  }

  if (edits.length) {
    lines.push(`## Edit History`, ``);
    for (const e of edits) {
      lines.push(`- **${e.field}**: \`${e.old_value}\` → \`${e.new_value}\` at ${e.edited_at}`);
    }
    lines.push(``);
  }

  const markdown = lines.join("\n");

  res.setHeader("Content-Type", "text/markdown; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="expense-${run.id.slice(0, 8)}.md"`
  );
  res.send(markdown);
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
function parseRun(run: {
  id: string;
  created_at: string;
  status: string;
  audio_filename: string | null;
  image_filename: string | null;
  audio_result: string | null;
  receipt_result: string | null;
  reconciled: string | null;
  overall_confidence: number | null;
  error_message: string | null;
}) {
  return {
    ...run,
    audio_result: run.audio_result ? JSON.parse(run.audio_result) : null,
    receipt_result: run.receipt_result ? JSON.parse(run.receipt_result) : null,
    reconciled: run.reconciled ? JSON.parse(run.reconciled) : null,
  };
}

export default router;
