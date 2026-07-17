import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Plus, CheckCircle2, Clock, AlertCircle, Loader2 } from 'lucide-react';

type Run = {
  id: string;
  created_at: string;
  status: string;
  audio_filename: string | null;
  image_filename: string | null;
  overall_confidence: number | null;
  reconciled: {
    vendor: string;
    amount: number;
    category: string;
    flags: { severity: string }[];
  } | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Queued',
  step1: 'Transcribing audio',
  step2: 'Analyzing receipt',
  step3: 'Reconciling',
  done: 'Complete',
  error: 'Failed',
};

export default function ExpenseHistory() {
  const [, navigate] = useLocation();
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/expenses')
      .then((r) => r.json())
      .then((data: Run[]) => { setRuns(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const goTo = (run: Run) => {
    if (run.status === 'done') navigate(`/expenses/${run.id}/review`);
    else navigate(`/expenses/${run.id}`);
  };

  return (
    <div className="min-h-screen bg-[#05060f] text-white">
      <header className="border-b border-white/10 px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/30">
              <span className="text-sm font-bold">$</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold">Expense Reconciler</h1>
              <p className="text-[11px] text-white/40">Past runs</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/expenses/new')}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500"
          >
            <Plus className="h-3.5 w-3.5" /> New Expense
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <h2 className="mb-6 text-lg font-semibold">Expense History</h2>

        {loading && (
          <div className="flex items-center justify-center py-20 text-white/30">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}

        {!loading && runs.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-20 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-white/20">
              <Clock className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-white/50">No expense runs yet</p>
            <p className="mt-1 text-xs text-white/30">Upload a receipt and voice memo to get started</p>
            <button
              onClick={() => navigate('/expenses/new')}
              className="mt-6 flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
            >
              <Plus className="h-4 w-4" /> Analyze First Expense
            </button>
          </div>
        )}

        {!loading && runs.length > 0 && (
          <div className="space-y-3">
            {runs.map((run) => {
              const pct = run.overall_confidence != null ? Math.round(run.overall_confidence * 100) : null;
              const confColor =
                pct == null ? 'text-white/30'
                : pct >= 80 ? 'text-green-400'
                : pct >= 60 ? 'text-amber-400'
                : 'text-red-400';
              const flagCount = run.reconciled?.flags?.length ?? 0;
              const highFlags = run.reconciled?.flags?.filter((f) => f.severity === 'high').length ?? 0;

              return (
                <button
                  key={run.id}
                  onClick={() => goTo(run)}
                  className="flex w-full items-center gap-4 rounded-2xl border border-white/8 bg-white/3 px-5 py-4 text-left transition hover:border-white/15 hover:bg-white/5"
                >
                  {/* Status icon */}
                  <div className="shrink-0">
                    {run.status === 'done' ? (
                      <CheckCircle2 className="h-5 w-5 text-green-400" />
                    ) : run.status === 'error' ? (
                      <AlertCircle className="h-5 w-5 text-red-400" />
                    ) : (
                      <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
                    )}
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {run.reconciled?.vendor ?? run.image_filename ?? 'Expense Run'}
                      </p>
                      {highFlags > 0 && (
                        <span className="shrink-0 rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-medium text-red-400">
                          {highFlags} high flag{highFlags > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-3">
                      <p className="text-[11px] text-white/40">
                        {new Date(run.created_at).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                      <span className="text-[11px] text-white/25">·</span>
                      <p className="text-[11px] text-white/40">
                        {STATUS_LABEL[run.status] ?? run.status}
                      </p>
                      {run.reconciled?.category && (
                        <>
                          <span className="text-[11px] text-white/25">·</span>
                          <p className="text-[11px] text-white/40">{run.reconciled.category}</p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right side: amount + confidence */}
                  <div className="shrink-0 text-right">
                    {run.reconciled?.amount != null && (
                      <p className="text-base font-semibold text-white">
                        ${run.reconciled.amount.toFixed(2)}
                      </p>
                    )}
                    {pct != null && (
                      <p className={`text-[11px] font-medium ${confColor}`}>{pct}% confidence</p>
                    )}
                    {flagCount > 0 && (
                      <p className="text-[10px] text-white/30 mt-0.5">
                        {flagCount} flag{flagCount > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
