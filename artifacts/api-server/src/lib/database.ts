import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { mkdirSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, "../../../data");
mkdirSync(dataDir, { recursive: true });

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

// Migration: add policy_notes column to databases created before this column existed
try { db.exec(`ALTER TABLE expense_runs ADD COLUMN policy_notes TEXT`); } catch { /* already exists */ }

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

export const queries = {
  createRun: db.prepare(`
    INSERT INTO expense_runs (id, created_at, status, audio_filename, image_filename, policy_notes)
    VALUES (?, ?, 'pending', ?, ?, ?)
  `),

  updateRunStatus: db.prepare(`
    UPDATE expense_runs SET status = ? WHERE id = ?
  `),

  updateAudioResult: db.prepare(`
    UPDATE expense_runs SET status = 'step2', audio_result = ? WHERE id = ?
  `),

  updateReceiptResult: db.prepare(`
    UPDATE expense_runs SET status = 'step3', receipt_result = ? WHERE id = ?
  `),

  updateReconciled: db.prepare(`
    UPDATE expense_runs SET status = 'done', reconciled = ?, overall_confidence = ? WHERE id = ?
  `),

  setError: db.prepare(`
    UPDATE expense_runs SET status = 'error', error_message = ? WHERE id = ?
  `),

  getById: db.prepare<[string], ExpenseRun>(`
    SELECT * FROM expense_runs WHERE id = ?
  `),

  listAll: db.prepare<[], ExpenseRun>(`
    SELECT * FROM expense_runs ORDER BY created_at DESC
  `),

  createEdit: db.prepare(`
    INSERT INTO expense_edits (id, run_id, field, old_value, new_value, edited_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `),

  getEditsForRun: db.prepare<[string], ExpenseEdit>(`
    SELECT * FROM expense_edits WHERE run_id = ? ORDER BY edited_at ASC
  `),

  updateReconciled2: db.prepare(`
    UPDATE expense_runs SET reconciled = ? WHERE id = ?
  `),
};

export default db;
