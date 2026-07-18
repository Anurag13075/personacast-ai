import { Router, type Response } from "express";
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

// ─── SSE helper ─────────────────────────────────────────────────────────────
function sendEvent(res: Response, event: object) {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
  // Flush for nginx / Vercel edge proxies that buffer responses
  if (typeof (res as unknown as { flush?: () => void }).flush === "function") {
    (res as unknown as { flush: () => void }).flush();
  }
}

// ─── POST /api/expenses — create run & stream SSE pipeline ──────────────────
//
// Instead of returning JSON and having the frontend poll, we open an
// SSE stream on the POST response itself. Events arrive as each step
// completes, giving the user real-time progress on both Vercel and Express.
//
// Event sequence:
//   { type: "created",      id }
//   { type: "step1_done",   audio_result }       ─┐ arrive in whichever
//   { type: "step2_done",   receipt_result }      ─┘ order finishes first
//   { type: "step3_running" }
//   { type: "done",         id, reconciled }
//   — or —
//   { type: "error",        message }
// ────────────────────────────────────────────────────────────────────────────
router.post(
  "/",
  upload.fields([
    { name: "receipt", maxCount: 1 },
    { name: "audio", maxCount: 1 },
  ]),
  async (req, res) => {
    const files = req.files as Record<string, Express.Multer.File[]> | undefined;
    const receiptFile = files?.receipt?.[0];
    const audioFile = files?.audio?.[0];

    if (!receiptFile || !audioFile) {
      res.status(400).json({ error: "Both 'receipt' (image) and 'audio' files are required" });
      return;
    }

    // Open the SSE stream immediately — the client starts reading before we
    // touch the AI APIs, so it sees each event the moment it is emitted.
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // disable nginx buffering
    res.flushHeaders();

    const runId = randomUUID();
    const now = new Date().toISOString();
    const policyNotes =
      typeof req.body?.policyNotes === "string"
        ? req.body.policyNotes.trim() || undefined
        : undefined;

    queries.createRun.run(
      runId,
      now,
      audioFile.originalname,
      receiptFile.originalname,
      policyNotes ?? null
    );

    // Let the client know the run ID so it can navigate immediately
    sendEvent(res, { type: "created", id: runId });

    try {
      queries.updateRunStatus.run("step1", runId);
      logger.info({ runId }, "Pipeline: steps 1+2 — transcribing audio & analyzing receipt in parallel");

      // Steps 1 & 2 run in parallel — each pushes its result to the stream
      // as soon as it finishes, so the frontend card lights up immediately.
      const [audioResult, receiptResult] = await Promise.all([
        (async (): Promise<AudioResult> => {
          const transcript = await transcribeAudio(
            audioFile.buffer,
            audioFile.originalname,
            audioFile.mimetype
          );
          const result = await extractAudioIntent(transcript);
          queries.saveAudioOnly.run(JSON.stringify(result), runId);
          sendEvent(res, { type: "step1_done", audio_result: result });
          logger.info({ runId }, "Pipeline: step 1 done");
          return result;
        })(),
        (async (): Promise<ReceiptResult> => {
          const result = await analyzeReceipt(receiptFile.buffer, receiptFile.mimetype);
          queries.saveReceiptOnly.run(JSON.stringify(result), runId);
          sendEvent(res, { type: "step2_done", receipt_result: result });
          logger.info({ runId }, "Pipeline: step 2 done");
          return result;
        })(),
      ]);

      // Step 3 — cross-modal reconciliation
      queries.updateRunStatus.run("step3", runId);
      sendEvent(res, { type: "step3_running" });
      logger.info({ runId }, "Pipeline: step 3 — reconciling");

      const reconciled = await reconcileExpense(audioResult, receiptResult, policyNotes);
      queries.updateReconciled.run(
        JSON.stringify(reconciled),
        reconciled.overall_confidence,
        runId
      );

      sendEvent(res, { type: "done", id: runId, reconciled });
      logger.info({ runId }, "Pipeline: done");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error({ runId, err: msg }, "Pipeline error");
      queries.setError.run(msg, runId);
      sendEvent(res, { type: "error", message: msg });
    }

    res.end();
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

  const severityEmoji: Record<string, string> = { high: "🔴", medium: "🟡", low: "🟢" };

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

  res.setHeader("Content-Type", "text/markdown; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="expense-${run.id.slice(0, 8)}.md"`
  );
  res.send(lines.join("\n"));
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
