import { useEffect, useRef, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { CheckCircle2, Circle, Loader2, AlertCircle, ArrowRight, Volume2, Image, GitMerge } from 'lucide-react';
import { usePipelineStore } from '@/stores/pipelineStore';
import type { AudioResult, ReceiptResult, ReconciledExpense } from '@/stores/pipelineStore';

// ── Types ────────────────────────────────────────────────────────────────────
type Run = {
  id: string;
  status: string;
  audio_filename: string | null;
  image_filename: string | null;
  audio_result: AudioResult | null;
  receipt_result: ReceiptResult | null;
  reconciled: ReconciledExpense | null;
  overall_confidence: number | null;
  error_message: string | null;
};

// ── Steps config ─────────────────────────────────────────────────────────────
const STEPS = [
  { key: 'step1', label: 'Audio Understanding', desc: 'Extracting intent from voice memo or typed description', icon: Volume2 },
  { key: 'step2', label: 'Receipt Data', desc: 'Structuring manually entered receipt details', icon: Image },
  { key: 'step3', label: 'Reconciliation', desc: 'Cross-checking voice memo against receipt for mismatches', icon: GitMerge },
];

// ── Step status ───────────────────────────────────────────────────────────────
// Steps 1 & 2 run in parallel. We determine completion by checking whether the
// result data has arrived, not by the status string alone — so each card lights
// up the moment its data lands, even if the other parallel step hasn't finished.
function stepStatus(run: Run | null, stepIndex: number): 'done' | 'running' | 'pending' | 'error' {
  if (!run) return 'pending';
  const s = run.status;
  if (s === 'error') {
    if (stepIndex === 2 && run.audio_result && run.receipt_result) return 'error';
    if (stepIndex === 1 && run.audio_result && !run.receipt_result) return 'error';
    if (stepIndex === 0) return 'error';
    return 'pending';
  }
  if (stepIndex === 0) {
    if (run.audio_result) return 'done';
    if (s !== 'pending' && s !== 'idle') return 'running';
    return 'pending';
  }
  if (stepIndex === 1) {
    if (run.receipt_result) return 'done';
    if (s === 'step1' || s === 'step3' || s === 'done') return 'running';
    return 'pending';
  }
  // stepIndex === 2
  if (s === 'done') return 'done';
  if (s === 'step3') return 'running';
  return 'pending';
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ExpenseProcessing() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  // ── Live store (SSE path) ─────────────────────────────────────────────────
  const store = usePipelineStore();
  const hasStoreData = store.runId === params.id && store.status !== 'idle';

  // ── Polling fallback (direct nav / page refresh) ──────────────────────────
  const [polledRun, setPolledRun] = useState<Run | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // If the Zustand store already has data for this run (SSE path), skip polling.
    if (hasStoreData) return;

    // Fallback: poll /api/expenses/:id every second.
    // This also handles the case where the user navigated directly to this URL.
    const poll = async () => {
      try {
        const res = await fetch(`/api/expenses/${params.id}`);
        if (!res.ok) { setPollError('Run not found'); return; }
        const data = await res.json() as Run;
        setPolledRun(data);
        if (data.status === 'done') {
          clearInterval(pollRef.current!);
          setTimeout(() => navigate(`/expenses/${params.id}/review`), 800);
        }
        if (data.status === 'error') {
          clearInterval(pollRef.current!);
        }
      } catch {
        setPollError('Failed to reach server');
      }
    };

    poll();
    pollRef.current = setInterval(poll, 1000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [params.id, hasStoreData, navigate]);

  // ── Navigate to review when SSE stream completes ──────────────────────────
  useEffect(() => {
    if (hasStoreData && store.status === 'done') {
      setTimeout(() => navigate(`/expenses/${params.id}/review`), 800);
    }
  }, [store.status, hasStoreData, params.id, navigate]);

  // ── Build the unified 'run' object consumed by the render ─────────────────
  const run: Run | null = hasStoreData
    ? {
        id: params.id,
        status: store.status,
        audio_filename: null,
        image_filename: null,
        audio_result: store.audioResult,
        receipt_result: store.receiptResult,
        reconciled: store.reconciled,
        overall_confidence: store.reconciled?.overall_confidence ?? null,
        error_message: store.errorMessage,
      }
    : polledRun;

  const error = pollError;
  const currentStatus = run?.status ?? 'pending';

  // ── Render ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#05060f] text-white">
        <div className="text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-red-400" />
          <p className="mt-3 text-sm text-white/60">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05060f] text-white">
      <header className="border-b border-white/10 px-6 py-4">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/30">
              <span className="text-sm font-bold">$</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold">Expense Reconciler</h1>
              <p className="text-[11px] text-white/40">
                {currentStatus === 'done'
                  ? 'Complete — redirecting…'
                  : currentStatus === 'error'
                  ? 'Pipeline error'
                  : 'Results appear as each step finishes…'}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12">
        <div className="mb-8 text-center">
          {currentStatus === 'done' ? (
            <div className="flex items-center justify-center gap-2 text-green-400">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Analysis complete — redirecting…</span>
            </div>
          ) : currentStatus === 'error' ? (
            <div className="flex items-center justify-center gap-2 text-red-400">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Pipeline error</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-white/60">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Running AI pipeline…</span>
            </div>
          )}
        </div>

        {/* Step cards */}
        <div className="space-y-4">
          {STEPS.map((step, i) => {
            const status = stepStatus(run, i);
            const Icon = step.icon;
            return (
              <div
                key={step.key}
                className={`rounded-2xl border p-5 transition-all duration-500 ${
                  status === 'running'
                    ? 'border-blue-500/40 bg-blue-500/5'
                    : status === 'done'
                    ? 'border-green-500/30 bg-green-500/5'
                    : status === 'error'
                    ? 'border-red-500/30 bg-red-500/5'
                    : 'border-white/8 bg-white/2 opacity-50'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                      status === 'done'
                        ? 'bg-green-500/20 text-green-400'
                        : status === 'running'
                        ? 'bg-blue-500/20 text-blue-400'
                        : status === 'error'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-white/8 text-white/30'
                    }`}
                  >
                    {status === 'done' ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : status === 'running' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : status === 'error' ? (
                      <AlertCircle className="h-4 w-4" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 text-white/40" />
                      <span className="text-sm font-medium">
                        Step {i + 1} — {step.label}
                      </span>
                      {status === 'running' && (
                        <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-medium text-blue-400">
                          running
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-white/40">{step.desc}</p>

                    {/* Step 1 result — appears the moment audio analysis finishes */}
                    {i === 0 && run?.audio_result && (
                      <div className="mt-3 rounded-xl border border-white/8 bg-white/3 p-4 space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                          What I heard
                        </p>
                        <blockquote className="text-xs text-white/70 italic border-l-2 border-blue-500/40 pl-3">
                          "{run.audio_result.transcript.slice(0, 200)}{run.audio_result.transcript.length > 200 ? '…' : ''}"
                        </blockquote>
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <Field label="Claimed amount" value={run.audio_result.claimed_amount != null ? `$${run.audio_result.claimed_amount}` : '—'} />
                          <Field label="Claimed vendor" value={run.audio_result.claimed_counterparty ?? '—'} />
                          <Field label="Purpose" value={run.audio_result.claimed_purpose ?? '—'} />
                          <Field label="Claimed date" value={run.audio_result.claimed_date ?? '—'} />
                        </div>
                        <Confidence value={run.audio_result.confidence} label="Audio confidence" />
                      </div>
                    )}

                    {/* Step 2 result — appears the moment receipt OCR finishes */}
                    {i === 1 && run?.receipt_result && (
                      <div className="mt-3 rounded-xl border border-white/8 bg-white/3 p-4 space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                          What I read from the receipt
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <Field label="Vendor" value={run.receipt_result.vendor} conf={run.receipt_result.field_confidence?.vendor} />
                          <Field label="Total" value={`$${run.receipt_result.total?.toFixed(2)}`} conf={run.receipt_result.field_confidence?.total} />
                          <Field label="Date" value={run.receipt_result.date ?? '—'} conf={run.receipt_result.field_confidence?.date} />
                          <Field label="Category" value={run.receipt_result.category_guess} />
                        </div>
                        {run.receipt_result.line_items?.length > 0 && (
                          <div className="pt-1">
                            <p className="text-[10px] text-white/30 mb-1">Line items</p>
                            {run.receipt_result.line_items.slice(0, 4).map((item, j) => (
                              <div key={j} className="flex justify-between text-[11px] text-white/60">
                                <span className="truncate">{item.description}</span>
                                <span className="ml-2 shrink-0">${item.amount?.toFixed(2)}</span>
                              </div>
                            ))}
                            {run.receipt_result.line_items.length > 4 && (
                              <p className="text-[10px] text-white/30 mt-1">+{run.receipt_result.line_items.length - 4} more</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Step 3 result — appears when reconciliation finishes */}
                    {i === 2 && run?.reconciled && (
                      <div className="mt-3 rounded-xl border border-white/8 bg-white/3 p-4 space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                          Reconciliation preview
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <Field label="Final amount" value={`$${run.reconciled.amount?.toFixed(2)}`} />
                          <Field label="Vendor" value={run.reconciled.vendor} />
                        </div>
                        {run.reconciled.flags?.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {run.reconciled.flags.map((f, j) => (
                              <span
                                key={j}
                                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                  f.severity === 'high'
                                    ? 'bg-red-500/20 text-red-400'
                                    : f.severity === 'medium'
                                    ? 'bg-amber-500/20 text-amber-400'
                                    : 'bg-yellow-500/20 text-yellow-400'
                                }`}
                              >
                                ⚑ {f.field}
                              </span>
                            ))}
                          </div>
                        )}
                        <Confidence value={run.reconciled.overall_confidence} label="Overall confidence" />
                      </div>
                    )}

                    {/* Error message */}
                    {i === 0 && status === 'error' && run?.error_message && (
                      <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/5 p-3">
                        <p className="text-xs text-red-400">{run.error_message}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {currentStatus === 'done' && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => navigate(`/expenses/${params.id}/review`)}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500"
            >
              View Reconciled Expense <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {currentStatus === 'error' && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => navigate('/expenses/new')}
              className="flex items-center gap-2 rounded-xl border border-white/15 px-6 py-3 text-sm text-white/60 hover:text-white"
            >
              Try again
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

function Field({ label, value, conf }: { label: string; value: string; conf?: number }) {
  return (
    <div>
      <p className="text-[10px] text-white/30">{label}</p>
      <div className="flex items-center gap-1">
        <p className="text-xs text-white/80 font-medium truncate">{value}</p>
        {conf !== undefined && conf < 0.7 && (
          <span className="text-[9px] text-amber-400 shrink-0">⚠</span>
        )}
      </div>
    </div>
  );
}

function Confidence({ value, label }: { value: number; label: string }) {
  const pct = Math.round((value ?? 0) * 100);
  const color = pct >= 80 ? 'text-green-400' : pct >= 60 ? 'text-amber-400' : 'text-red-400';
  return (
    <div className="flex items-center gap-2 pt-1">
      <span className="text-[10px] text-white/30">{label}:</span>
      <span className={`text-xs font-semibold ${color}`}>{pct}%</span>
      <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
