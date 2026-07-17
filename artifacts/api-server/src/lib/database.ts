import { createRequire } from "node:module";
import path from "path";
import { fileURLToPath } from "url";
import { mkdirSync } from "fs";

const _require = createRequire(import.meta.url);

export type ExpenseRun = {
  id: string;
  created_at: string;
  status: string;
  audio_filename: string | null;
  image_filename: string | null;
  policy_notes: string | null;
  audio_result: string | null;
  receipt_result: string | null;
  reconciled: string | null;
  overall_confidence: number | null;
  error_message: string | null;
};

export type ExpenseEdit = {
  id: string;
  run_id: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  edited_at: string;
};

// ─── No-op fallback (used when better-sqlite3 is unavailable) ────────────────
// On Vercel, the POST endpoint returns the full result inline, so the DB is
// never queried for the primary user flow. The no-op keeps the rest of the
// route handlers from crashing if they are hit (they'll return 404 / empty).
function noop() {}
function noopGet(): undefined { return undefined; }
function noopAll(): never[] { return []; }

const noOpQueries = {
  createRun: { run: noop },
  updateRunStatus: { run: noop },
  updateAudioResult: { run: noop },
  updateReceiptResult: { run: noop },
  updateReconciled: { run: noop },
  setError: { run: noop },
  getById: { get: noopGet as (id: string) => ExpenseRun | undefined },
  listAll: { all: noopAll as () => ExpenseRun[] },
  createEdit: { run: noop },
  getEditsForRun: { all: noopAll as (id: string) => ExpenseEdit[] },
  updateReconciled2: { run: noop },
};

// ─── Real SQLite implementation ───────────────────────────────────────────────
function setupSqlite() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const dataDir = process.env["VERCEL"]
    ? "/tmp"
    : path.resolve(__dirname, "../../../data");
  mkdirSync(dataDir, { recursive: true });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Database = _require("better-sqlite3") as any;
  const db = new Database(path.join(dataDir, "expenses.db"));

  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS expense_runs (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      audio_filename TEXT,
      image_filename TEXT,
      policy_notes TEXT,
      audio_result TEXT,
      receipt_result TEXT,
      reconciled TEXT,
      overall_confidence REAL,
      error_message TEXT
    );

    CREATE TABLE IF NOT EXISTS expense_edits (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      field TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      edited_at TEXT NOT NULL,
      FOREIGN KEY (run_id) REFERENCES expense_runs(id)
    );
  `);

  // Migration: add policy_notes column if missing
  try { db.exec(`ALTER TABLE expense_runs ADD COLUMN policy_notes TEXT`); } catch { /* already exists */ }

  return {
    createRun: db.prepare(`
      INSERT INTO expense_runs (id, created_at, status, audio_filename, image_filename, policy_notes)
      VALUES (?, ?, 'pending', ?, ?, ?)
    `),
    updateRunStatus: db.prepare(`UPDATE expense_runs SET status = ? WHERE id = ?`),
    updateAudioResult: db.prepare(`UPDATE expense_runs SET status = 'step2', audio_result = ? WHERE id = ?`),
    updateReceiptResult: db.prepare(`UPDATE expense_runs SET status = 'step3', receipt_result = ? WHERE id = ?`),
    updateReconciled: db.prepare(`UPDATE expense_runs SET status = 'done', reconciled = ?, overall_confidence = ? WHERE id = ?`),
    setError: db.prepare(`UPDATE expense_runs SET status = 'error', error_message = ? WHERE id = ?`),
    getById: db.prepare<[string], ExpenseRun>(`SELECT * FROM expense_runs WHERE id = ?`),
    listAll: db.prepare<[], ExpenseRun>(`SELECT * FROM expense_runs ORDER BY created_at DESC`),
    createEdit: db.prepare(`
      INSERT INTO expense_edits (id, run_id, field, old_value, new_value, edited_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `),
    getEditsForRun: db.prepare<[string], ExpenseEdit>(`SELECT * FROM expense_edits WHERE run_id = ? ORDER BY edited_at ASC`),
    updateReconciled2: db.prepare(`UPDATE expense_runs SET reconciled = ? WHERE id = ?`),
  };
}

// ─── Export: try real DB, fall back to no-op ────────────────────────────────
let queries: typeof noOpQueries;
try {
  queries = setupSqlite();
} catch (err) {
  console.warn("[db] better-sqlite3 unavailable, using no-op store:", String(err));
  queries = noOpQueries;
}

export { queries };
export default queries;
