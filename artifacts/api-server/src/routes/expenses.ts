import { Router, type Response } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { queries } from "../lib/database.js";
import {
  extractAudioIntent,
  analyzeReceipt,
  reconcileExpense,
  type AudioResult,
  type ReceiptResult,
  type ReconciledExpense,
} from "../lib/groq-pipeline.js";
import { logger } from "../lib/logger.js";

const router = Router();

// Receipt image only — voice transcript comes as plain text from the browser
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

// ─── SSE helper ─────────────────────────────────────────────────────────────
function sendEvent(res: Response, event: object) {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
  if (typeof (res as unknown as { flush?: () => void }).flush === "function") {
    (res as unknown as { flush: () => void }).flush();
  }
}

// ─── POST /api/expenses ──────────────────────────────────────────────────────
// Accepts:
//   receipt   — image file (multipart)
//   transcript — spoken/typed expense description (form text field)
//   policyNotes — optional policy rules (form text field)
//
// Returns an SSE stream. Events:
//   { type: "created",      id }
//   { type: "step1_done",   audio_result }   ─┐ parallel — arrive in any order
//   { type: "step2_done",   receipt_result } ─┘
//   { type: "step3_running" }
//   { type: "done",         id, reconciled }
//   { type: "error",        message }
// ────────────────────────────────────────────────────────────────────────────
router.post(
  "/",
  upload.single("receipt"),
  async (req, res) => {
    const receiptFile = req.file;
    const transcript = typeof req.body?.transcript === "string" ? req.body.transcript.trim() : "";
    const policyNotes = typeof req.body?.policyNotes === "string" ? req.body.policyNotes.trim() || undefined : undefined;

    if (!receiptFile) {
      res.status(400).json({ error: "'receipt' image is required" });
      return;
    }
    if (!transcript) {
      res.status(400).json({ error: "'transcript' text is required" });
      return;
    }

    // Open the SSE stream before touching any AI API
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const runId = randomUUID();
    const now = new Date().toISOString();

    // Store transcript in audio_filename column (re-used as a text label)
    queries.createRun.run(runId, now, transcript.slice(0, 200), receiptFile.originalname, policyNotes ?? null);
    sendEvent(res, { type: "created", id: runId });

    try {
      queries.updateRunStatus.run("step1", runId);
      logger.info({ runId }, "Pipeline: steps 1+2 — extracting intent & reading receipt in parallel");

      // Steps 1 & 2 run concurrently — each flushes its result the moment it's ready
      const [audioResult, receiptResult] = await Promise.all([

        // Step 1: parse the spoken/typed transcript into structured intent
        (async (): Promise<AudioResult> => {
          const result = await extractAudioIntent(transcript);
          queries.saveAudioOnly.run(JSON.stringify(result), runId);
          sendEvent(res, { type: "step1_done", audio_result: result });
          logger.info({ runId }, "Pipeline: step 1 done");
          return result;
        })(),

        // Step 2: vision model reads the receipt image
        (async (): Promise<ReceiptResult> => {
          const result = await analyzeReceipt(receiptFile.buffer, receiptFile.mimetype);
          queries.saveReceiptOnly.run(JSON.stringify(result), runId);
          sendEvent(res, { type: "step2_done", receipt_result: result });
          logger.info({ runId }, "Pipeline: step 2 done");
          return result;
        })(),
      ]);

      // Step 3: cross-modal reconciliation
      queries.updateRunStatus.run("step3", runId);
      sendEvent(res, { type: "step3_running" });
      logger.info({ runId }, "Pipeline: step 3 — reconciling");

      const reconciled = await reconcileExpense(audioResult, receiptResult, policyNotes);
      queries.updateReconciled.run(JSON.stringify(reconciled), reconciled.overall_confidence, runId);
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

// ─── GET /api/expenses ────────────────────────────────────────────────────────
router.get("/", (_req, res) => {
  res.json(queries.listAll.all().map(parseRun));
});

// ─── GET /api/expenses/:id ────────────────────────────────────────────────────
router.get("/:id", (req, res) => {
  const run = queries.getById.get(req.params.id);
  if (!run) { res.status(404).json({ error: "Run not found" }); return; }
  const edits = queries.getEditsForRun.all(req.params.id);
  res.json({ ...parseRun(run), edits });
});

// ─── POST /api/expenses/:id/edits ────────────────────────────────────────────
router.post("/:id/edits", (req, res) => {
  const { field, old_value, new_value } = req.body as { field: string; old_value?: string | null; new_value?: string | null };
  if (!field) { res.status(400).json({ error: "'field' is required" }); return; }

  const run = queries.getById.get(req.params.id);
  if (!run) { res.status(404).json({ error: "Run not found" }); return; }

  if (run.reconciled) {
    const reconciled = JSON.parse(run.reconciled) as ReconciledExpense;
    const parts = field.split(".");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let obj: any = reconciled;
    for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
    obj[parts[parts.length - 1]] = new_value;
    queries.updateReconciled2.run(JSON.stringify(reconciled), req.params.id);
  }

  const editId = randomUUID();
  queries.createEdit.run(editId, req.params.id, field, old_value ?? null, new_value ?? null, new Date().toISOString());
  res.status(201).json({ id: editId });
});

// ─── GET /api/expenses/:id/export/json ───────────────────────────────────────
router.get("/:id/export/json", (req, res) => {
  const run = queries.getById.get(req.params.id);
  if (!run?.reconciled) { res.status(404).json({ error: "Run not found or not complete" }); return; }
  const edits = queries.getEditsForRun.all(req.params.id);
  const parsed = parseRun(run);
  res.setHeader("Content-Disposition", `attachment; filename="expense-${run.id.slice(0, 8)}.json"`);
  res.json({ id: run.id, created_at: run.created_at, expense: parsed.reconciled, audio_understanding: parsed.audio_result, receipt_understanding: parsed.receipt_result, edits });
});

// ─── GET /api/expenses/:id/export/markdown ────────────────────────────────────
router.get("/:id/export/markdown", (req, res) => {
  const run = queries.getById.get(req.params.id);
  if (!run?.reconciled) { res.status(404).json({ error: "Run not found or not complete" }); return; }
  const parsed = parseRun(run);
  const r = parsed.reconciled as ReconciledExpense;
  const a = parsed.audio_result as AudioResult | null;
  const rc = parsed.receipt_result as ReceiptResult | null;
  const edits = queries.getEditsForRun.all(req.params.id);
  const sev: Record<string, string> = { high: "🔴", medium: "🟡", low: "🟢" };
  const lines = [
    `# Expense Report`, ``, `**Created:** ${run.created_at}`, `**Confidence:** ${Math.round((r.overall_confidence ?? 0) * 100)}%`, ``,
    `## Reconciled Expense`, ``, `| Field | Value |`, `|-------|-------|`,
    `| Vendor | ${r.vendor} |`, `| Amount | $${r.amount?.toFixed(2)} |`, `| Date | ${r.date} |`,
    `| Category | ${r.category} |`, `| Justification | ${r.business_justification} |`, ``,
  ];
  if (r.flags?.length) {
    lines.push(`## Flags`, ``);
    for (const f of r.flags) lines.push(`- ${sev[f.severity] ?? "⚪"} **${f.severity.toUpperCase()} — ${f.field}**: ${f.reason}`);
    lines.push(``);
  }
  if (r.reasoning) lines.push(`## Reasoning`, ``, r.reasoning, ``);
  if (a) lines.push(`## Voice Memo`, ``, `"${a.transcript}"`, ``, `| Field | Value |`, `|-------|-------|`,
    `| Purpose | ${a.claimed_purpose ?? "—"} |`, `| Amount | ${a.claimed_amount != null ? `$${a.claimed_amount}` : "—"} |`,
    `| Vendor | ${a.claimed_counterparty ?? "—"} |`, `| Date | ${a.claimed_date ?? "—"} |`, ``);
  if (rc) lines.push(`## Receipt`, ``, `| Field | Value |`, `|-------|-------|`,
    `| Vendor | ${rc.vendor} |`, `| Total | $${rc.total?.toFixed(2)} |`, `| Date | ${rc.date ?? "—"} |`, ``);
  if (edits.length) { lines.push(`## Edits`, ``); for (const e of edits) lines.push(`- **${e.field}**: \`${e.old_value}\` → \`${e.new_value}\``); }
  res.setHeader("Content-Type", "text/markdown; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="expense-${run.id.slice(0, 8)}.md"`);
  res.send(lines.join("\n"));
});

// ─── Helper ───────────────────────────────────────────────────────────────────
function parseRun(run: {
  id: string; created_at: string; status: string; audio_filename: string | null;
  image_filename: string | null; audio_result: string | null; receipt_result: string | null;
  reconciled: string | null; overall_confidence: number | null; error_message: string | null;
}) {
  return {
    ...run,
    audio_result:   run.audio_result   ? JSON.parse(run.audio_result)   : null,
    receipt_result: run.receipt_result ? JSON.parse(run.receipt_result) : null,
    reconciled:     run.reconciled     ? JSON.parse(run.reconciled)     : null,
  };
}

export default router;
