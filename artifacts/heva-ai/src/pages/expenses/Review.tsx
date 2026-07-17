import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { toast } from 'sonner';
import { Download, Edit3, Check, X, AlertTriangle, CheckCircle2, History, Plus } from 'lucide-react';

type Flag = { field: string; reason: string; severity: 'low' | 'medium' | 'high' };

type ReconciledExpense = {
  category: string;
  amount: number;
  vendor: string;
  date: string;
  business_justification: string;
  flags: Flag[];
  overall_confidence: number;
  reasoning?: string;
};

type AudioResult = {
  transcript: string;
  claimed_purpose: string | null;
  claimed_amount: number | null;
  claimed_counterparty: string | null;
  claimed_date: string | null;
  confidence: number;
};

type ReceiptResult = {
  vendor: string;
  total: number;
  date: string | null;
  category_guess: string;
  line_items: { description: string; amount: number }[];
  field_confidence: Record<string, number>;
};

type Edit = {
  id: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  edited_at: string;
};

type Run = {
  id: string;
  created_at: string;
  reconciled: ReconciledExpense | null;
  audio_result: AudioResult | null;
  receipt_result: ReceiptResult | null;
  edits: Edit[];
};

const EDITABLE_FIELDS: { key: keyof ReconciledExpense; label: string; type?: string }[] = [
  { key: 'vendor', label: 'Vendor' },
  { key: 'amount', label: 'Amount', type: 'number' },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'category', label: 'Category' },
  { key: 'business_justification', label: 'Business Justification' },
];

const SEV_STYLE = {
  high: 'border-red-500/30 bg-red-500/8 text-red-300',
  medium: 'border-amber-500/30 bg-amber-500/8 text-amber-300',
  low: 'border-yellow-500/30 bg-yellow-500/8 text-yellow-300',
};
const SEV_ICON = { high: '🔴', medium: '🟡', low: '🟢' };

export default function ExpenseReview() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [run, setRun] = useState<Run | null>(null);
  const [form, setForm] = useState<Partial<ReconciledExpense>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchRun = async () => {
    // Prefer the cached result written by New.tsx (present on Vercel where the
    // pipeline result is returned inline and polling a separate Lambda would 404).
    const cached = sessionStorage.getItem(`expense_run_${params.id}`);
    if (cached) {
      try {
        const data = JSON.parse(cached) as Run;
        // Keep the cache so edits can refresh from the API; remove on first API
        // success below. Using the cache here avoids a 404 on Vercel cold starts.
        setRun(data);
        if (data.reconciled) setForm(data.reconciled);
        setLoading(false);
        // Still hit the API in the background so edits list stays up-to-date.
        fetch(`/api/expenses/${params.id}`)
          .then((r) => r.ok ? r.json() : null)
          .then((fresh: Run | null) => {
            if (fresh) {
              sessionStorage.removeItem(`expense_run_${params.id}`);
              setRun(fresh);
              if (fresh.reconciled) setForm(fresh.reconciled);
            }
          })
          .catch(() => { /* API not available — cached data is sufficient */ });
        return;
      } catch { /* ignore bad cache, fall through to API */ }
    }

    const res = await fetch(`/api/expenses/${params.id}`);
    if (!res.ok) { toast.error('Run not found'); return; }
    const data = await res.json() as Run;
    setRun(data);
    if (data.reconciled) setForm(data.reconciled);
    setLoading(false);
  };

  useEffect(() => { void fetchRun(); }, [params.id]);

  const startEdit = (field: string, currentVal: unknown) => {
    setEditing(field);
    setEditVal(String(currentVal ?? ''));
  };

  const saveEdit = async (field: keyof ReconciledExpense) => {
    if (!run?.reconciled) return;
    const oldVal = String((form as Record<string, unknown>)[field] ?? '');
    const newVal = editVal;
    if (oldVal === newVal) { setEditing(null); return; }

    try {
      const res = await fetch(`/api/expenses/${params.id}/edits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, old_value: oldVal, new_value: newVal }),
      });
      if (!res.ok) throw new Error('Failed to save edit');

      const newForm = { ...form, [field]: field === 'amount' ? parseFloat(newVal) : newVal };
      setForm(newForm);
      setEditing(null);
      toast.success('Edit saved');
      await fetchRun(); // refresh edits list
    } catch {
      toast.error('Failed to save edit');
    }
  };

  const exportJson = () => {
    window.open(`/api/expenses/${params.id}/export/json`, '_blank');
  };

  const exportMarkdown = () => {
    window.open(`/api/expenses/${params.id}/export/markdown`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#05060f] text-white/40">
        Loading…
      </div>
    );
  }

  if (!run?.reconciled) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#05060f] text-white">
        <div className="text-center">
          <p className="text-white/50">Expense not ready yet.</p>
          <button
            onClick={() => navigate(`/expenses/${params.id}`)}
            className="mt-4 text-sm text-blue-400 hover:text-blue-300"
          >
            Back to processing view
          </button>
        </div>
      </div>
    );
  }

  const r = form as ReconciledExpense;
  const pct = Math.round((r.overall_confidence ?? 0) * 100);
  const confColor = pct >= 80 ? 'text-green-400 bg-green-500/15' : pct >= 60 ? 'text-amber-400 bg-amber-500/15' : 'text-red-400 bg-red-500/15';

  return (
    <div className="min-h-screen bg-[#05060f] text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/30">
              <span className="text-sm font-bold">$</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold">Expense Review</h1>
              <p className="text-[11px] text-white/40">
                {new Date(run.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/expenses/history')}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/50 hover:text-white"
            >
              <History className="h-3.5 w-3.5" /> History
            </button>
            <button
              onClick={() => navigate('/expenses/new')}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/50 hover:text-white"
            >
              <Plus className="h-3.5 w-3.5" /> New
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10 space-y-6">
        {/* Confidence + flags summary */}
        <div className="flex flex-wrap items-start gap-4">
          <div className={`flex items-center gap-2 rounded-xl px-4 py-2.5 ${confColor}`}>
            <CheckCircle2 className="h-4 w-4" />
            <div>
              <p className="text-xs font-semibold">Overall Confidence</p>
              <p className="text-xl font-bold">{pct}%</p>
            </div>
          </div>
          {(r.flags?.length ?? 0) > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2.5 border border-white/10">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <div>
                <p className="text-xs font-semibold text-white/70">Flags raised</p>
                <p className="text-xl font-bold">{r.flags.length}</p>
              </div>
            </div>
          )}
          {run.edits.length > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2.5 border border-white/10">
              <Edit3 className="h-4 w-4 text-blue-400" />
              <div>
                <p className="text-xs font-semibold text-white/70">Manual edits</p>
                <p className="text-xl font-bold">{run.edits.length}</p>
              </div>
            </div>
          )}
        </div>

        {/* Flags */}
        {r.flags?.length > 0 && (
          <section className="rounded-2xl border border-white/10 bg-white/3 p-5">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
              Detected Mismatches
            </h2>
            <div className="space-y-2">
              {r.flags.map((flag, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 rounded-xl border p-3 ${SEV_STYLE[flag.severity]}`}
                >
                  <span className="text-sm shrink-0">{SEV_ICON[flag.severity]}</span>
                  <div>
                    <p className="text-xs font-semibold capitalize">{flag.field}</p>
                    <p className="text-xs opacity-80">{flag.reason}</p>
                  </div>
                  <span className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${SEV_STYLE[flag.severity]}`}>
                    {flag.severity}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Editable fields */}
        <section className="rounded-2xl border border-white/10 bg-white/3 p-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/40">
            Reconciled Expense — click any field to edit
          </h2>
          <div className="space-y-1">
            {EDITABLE_FIELDS.map(({ key, label, type }) => {
              const val = (r as Record<string, unknown>)[key];
              const isEditing = editing === key;
              const flagged = r.flags?.some((f) => f.field === key);
              return (
                <div
                  key={key}
                  className={`flex items-start gap-3 rounded-xl p-3 transition ${flagged ? 'bg-amber-500/5 border border-amber-500/20' : 'hover:bg-white/4'}`}
                >
                  <div className="w-36 shrink-0">
                    <p className="text-[11px] text-white/40 pt-0.5">{label}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          type={type ?? 'text'}
                          step={type === 'number' ? '0.01' : undefined}
                          value={editVal}
                          onChange={(e) => setEditVal(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') void saveEdit(key);
                            if (e.key === 'Escape') setEditing(null);
                          }}
                          className="flex-1 rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-1.5 text-sm text-white outline-none"
                        />
                        <button onClick={() => void saveEdit(key)} className="text-green-400 hover:text-green-300">
                          <Check className="h-4 w-4" />
                        </button>
                        <button onClick={() => setEditing(null)} className="text-white/30 hover:text-white/60">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(key, val)}
                        className="group flex w-full items-center justify-between rounded-lg px-2 py-1 text-left text-sm text-white/80 hover:bg-white/5"
                      >
                        <span className="truncate">
                          {key === 'amount' ? `$${Number(val).toFixed(2)}` : String(val ?? '—')}
                        </span>
                        <Edit3 className="h-3.5 w-3.5 shrink-0 text-white/20 opacity-0 group-hover:opacity-100" />
                      </button>
                    )}
                  </div>
                  {flagged && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400 mt-1" />}
                </div>
              );
            })}
          </div>
        </section>

        {/* AI Reasoning */}
        {r.reasoning && (
          <section className="rounded-2xl border border-white/10 bg-white/3 p-5">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">
              AI Reconciliation Reasoning
            </h2>
            <p className="text-sm text-white/60 leading-relaxed">{r.reasoning}</p>
          </section>
        )}

        {/* Source comparison */}
        {(run.audio_result || run.receipt_result) && (
          <section className="rounded-2xl border border-white/10 bg-white/3 p-5">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/40">
              Source Comparison
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {run.audio_result && (
                <div className="rounded-xl border border-white/8 p-4">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-blue-400">
                    🎙 Voice Memo
                  </p>
                  <p className="text-[11px] text-white/50 italic mb-3">
                    "{run.audio_result.transcript.slice(0, 150)}{run.audio_result.transcript.length > 150 ? '…' : ''}"
                  </p>
                  <div className="space-y-1">
                    <MiniRow label="Amount" val={run.audio_result.claimed_amount != null ? `$${run.audio_result.claimed_amount}` : '—'} />
                    <MiniRow label="Vendor" val={run.audio_result.claimed_counterparty ?? '—'} />
                    <MiniRow label="Date" val={run.audio_result.claimed_date ?? '—'} />
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[10px] text-white/30">Confidence</span>
                      <ConfBar value={run.audio_result.confidence} />
                    </div>
                  </div>
                </div>
              )}
              {run.receipt_result && (
                <div className="rounded-xl border border-white/8 p-4">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-purple-400">
                    🧾 Receipt
                  </p>
                  <div className="space-y-1">
                    <MiniRow label="Vendor" val={run.receipt_result.vendor} conf={run.receipt_result.field_confidence?.vendor} />
                    <MiniRow label="Total" val={`$${run.receipt_result.total?.toFixed(2)}`} conf={run.receipt_result.field_confidence?.total} />
                    <MiniRow label="Date" val={run.receipt_result.date ?? '—'} conf={run.receipt_result.field_confidence?.date} />
                    <MiniRow label="Category" val={run.receipt_result.category_guess} />
                  </div>
                  {run.receipt_result.line_items?.length > 0 && (
                    <div className="mt-3 border-t border-white/8 pt-3">
                      {run.receipt_result.line_items.map((item, i) => (
                        <div key={i} className="flex justify-between text-[11px] text-white/50">
                          <span className="truncate">{item.description}</span>
                          <span className="ml-2 shrink-0">${item.amount?.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Edit history */}
        {run.edits.length > 0 && (
          <section className="rounded-2xl border border-white/10 bg-white/3 p-5">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
              Edit History
            </h2>
            <div className="space-y-2">
              {run.edits.map((edit) => (
                <div key={edit.id} className="flex items-center gap-3 text-xs text-white/60">
                  <span className="rounded bg-white/8 px-1.5 py-0.5 font-mono text-[10px] text-white/50">
                    {edit.field}
                  </span>
                  <span className="line-through text-white/30">{edit.old_value}</span>
                  <span className="text-white/20">→</span>
                  <span className="text-white/80">{edit.new_value}</span>
                  <span className="ml-auto text-[10px] text-white/25">
                    {new Date(edit.edited_at).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Export */}
        <section className="flex gap-3">
          <button
            onClick={exportJson}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 py-3 text-sm text-white/70 hover:border-white/30 hover:text-white transition"
          >
            <Download className="h-4 w-4" /> Export JSON
          </button>
          <button
            onClick={exportMarkdown}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 py-3 text-sm text-white/70 hover:border-white/30 hover:text-white transition"
          >
            <Download className="h-4 w-4" /> Export Markdown
          </button>
        </section>
      </main>
    </div>
  );
}

function MiniRow({ label, val, conf }: { label: string; val: string; conf?: number }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] text-white/30 shrink-0">{label}</span>
      <div className="flex items-center gap-1">
        {conf !== undefined && conf < 0.7 && <span className="text-[9px] text-amber-400">⚠</span>}
        <span className="text-[11px] text-white/70 truncate">{val}</span>
      </div>
    </div>
  );
}

function ConfBar({ value }: { value: number }) {
  const pct = Math.round((value ?? 0) * 100);
  const color = pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-1.5 flex-1">
      <div className="flex-1 h-1 rounded-full bg-white/10">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-white/40">{pct}%</span>
    </div>
  );
}
