import { useLocation } from 'wouter';
import { ArrowRight, CheckCircle, Flag, FileJson, GitMerge, Mic, Receipt, ScanLine, Sparkles, ChevronRight } from 'lucide-react';

export default function Landing() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-white text-[#09090b]" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 border-b border-[#e4e4e7] bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#09090b]">
              <span className="text-xs font-bold text-white">$</span>
            </div>
            <span className="text-sm font-semibold tracking-tight">Expense Reconciler</span>
          </div>
          <div className="hidden items-center gap-8 text-sm text-[#71717a] md:flex">
            <a href="#how" className="hover:text-[#09090b] transition-colors">How it works</a>
            <a href="#features" className="hover:text-[#09090b] transition-colors">Features</a>
            <a href="/expenses/history" onClick={e => { e.preventDefault(); navigate('/expenses/history'); }} className="hover:text-[#09090b] transition-colors">History</a>
          </div>
          <button
            onClick={() => navigate('/expenses/new')}
            className="flex items-center gap-1.5 rounded-lg bg-[#09090b] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#27272a]"
          >
            Try it free <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="mx-auto max-w-6xl px-6 pb-24 pt-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#e4e4e7] bg-[#f4f4f5] px-3.5 py-1.5 text-xs font-medium text-[#52525b]">
          <span className="flex h-1.5 w-1.5 rounded-full bg-green-500" />
          Live · Whisper + Vision + LLM reconciliation
        </div>

        <h1 className="mx-auto mt-6 max-w-3xl text-5xl font-bold leading-[1.08] tracking-[-0.03em] text-[#09090b] md:text-6xl">
          Your receipt says{' '}
          <span className="relative inline-block">
            <span className="relative z-10">$39.13.</span>
            <span className="absolute inset-x-0 bottom-1 -z-0 h-3 bg-[#dbeafe] opacity-60" />
          </span>
          {' '}Your memo says $39.
          <br />
          <span className="text-[#71717a]">AI catches the difference.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-[#52525b]">
          Upload a receipt photo, a voice memo, and optional policy notes.
          Three AI models cross-check every field — and flag exactly what doesn't match.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => navigate('/expenses/new')}
            className="flex items-center gap-2 rounded-xl bg-[#09090b] px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-black/10 transition hover:bg-[#27272a] active:scale-[0.98]"
          >
            Reconcile your first expense <ArrowRight className="h-4 w-4" />
          </button>
          <a
            href="#how"
            className="flex items-center gap-2 rounded-xl border border-[#e4e4e7] px-6 py-3.5 text-sm font-medium text-[#52525b] transition hover:border-[#a1a1aa] hover:text-[#09090b]"
          >
            See how it works
          </a>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-[#71717a]">
          {['No account required', 'Runs in ~15 seconds', 'JSON + Markdown export'].map(t => (
            <span key={t} className="flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5 text-green-500" /> {t}
            </span>
          ))}
        </div>

        {/* Product preview card */}
        <div className="mt-16 overflow-hidden rounded-2xl border border-[#e4e4e7] bg-[#fafafa] text-left shadow-xl shadow-black/5">
          {/* Mock browser bar */}
          <div className="flex items-center gap-2 border-b border-[#e4e4e7] bg-white px-4 py-3">
            <span className="h-3 w-3 rounded-full bg-[#ef4444]" />
            <span className="h-3 w-3 rounded-full bg-[#f59e0b]" />
            <span className="h-3 w-3 rounded-full bg-[#22c55e]" />
            <div className="mx-auto flex w-48 items-center justify-center rounded-md bg-[#f4f4f5] px-3 py-1 text-[11px] text-[#71717a]">
              expensereconciler.app
            </div>
          </div>
          {/* Mock review screen */}
          <div className="grid grid-cols-3 gap-0 divide-x divide-[#e4e4e7] bg-white">
            {/* Step 1 result */}
            <div className="p-5">
              <p className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#71717a]">
                <Mic className="h-3 w-3" /> Voice memo
              </p>
              <div className="rounded-lg border border-[#e4e4e7] bg-[#f9fafb] p-3 text-[11px] italic text-[#52525b]">
                "Lunch at Urban Grind, about $39, client from Acme Corp…"
              </div>
              <div className="mt-3 space-y-1.5">
                {[['Amount', '$39.00'], ['Vendor', 'Urban Grand Cafe'], ['Date', 'Jul 10, 2026']].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-[11px]">
                    <span className="text-[#a1a1aa]">{k}</span>
                    <span className="font-medium text-[#09090b]">{v}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Step 2 result */}
            <div className="p-5">
              <p className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#71717a]">
                <Receipt className="h-3 w-3" /> Receipt
              </p>
              <div className="space-y-1">
                {[['Flat White', '$6.50'], ['Avocado Toast', '$14.00'], ['OJ', '$5.50'], ['Croissant', '$4.50']].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-[11px]">
                    <span className="text-[#52525b]">{k}</span>
                    <span className="font-medium">{v}</span>
                  </div>
                ))}
                <div className="mt-2 border-t border-[#e4e4e7] pt-2 flex justify-between text-[11px] font-semibold">
                  <span>TOTAL</span><span>$39.13</span>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1 text-[10px] text-[#22c55e]">
                <span>Vendor: URBAN GRIND CAFE</span>
                <span className="text-[#d4d4d8]">· 97% conf</span>
              </div>
            </div>
            {/* Step 3 result */}
            <div className="p-5">
              <p className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#71717a]">
                <GitMerge className="h-3 w-3" /> Reconciled
              </p>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-2xl font-bold">$39.13</span>
                <span className="rounded-full bg-[#dcfce7] px-2.5 py-0.5 text-[11px] font-semibold text-[#16a34a]">85% conf</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-start gap-1.5 rounded-md border border-[#fde68a] bg-[#fffbeb] px-2.5 py-1.5">
                  <Flag className="mt-0.5 h-3 w-3 shrink-0 text-[#f59e0b]" />
                  <span className="text-[10px] text-[#92400e]">Vendor name mismatch — medium</span>
                </div>
                <div className="flex items-start gap-1.5 rounded-md border border-[#d1fae5] bg-[#f0fdf4] px-2.5 py-1.5">
                  <Flag className="mt-0.5 h-3 w-3 shrink-0 text-[#22c55e]" />
                  <span className="text-[10px] text-[#166534]">Amount diff $0.13 — low</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="border-t border-[#e4e4e7] bg-[#fafafa] px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#71717a]">The pipeline</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">Three inputs. One truth.</h2>
            <p className="mt-3 text-[#52525b]">Each step produces a structured result before the next one starts.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-4">
            {[
              {
                n: '01', icon: Mic, color: 'bg-blue-50 text-blue-600 border-blue-100',
                label: 'Voice Memo', model: 'Groq Whisper',
                desc: 'Audio transcribed word-for-word. LLM extracts structured intent: amount, vendor, date, purpose — with confidence score.',
              },
              {
                n: '02', icon: ScanLine, color: 'bg-violet-50 text-violet-600 border-violet-100',
                label: 'Receipt Photo', model: 'Llama 4 Scout Vision',
                desc: 'Vision model reads every line item, total, vendor name and date from the image. Per-field confidence on every value.',
              },
              {
                n: '03', icon: Sparkles, color: 'bg-amber-50 text-amber-600 border-amber-100',
                label: 'Policy Notes', model: 'Text input',
                desc: 'Optional: describe your expense policy, project code, or extra context. The AI applies your rules when raising flags.',
              },
              {
                n: '04', icon: GitMerge, color: 'bg-green-50 text-green-600 border-green-100',
                label: 'Reconciliation', model: 'Llama 3.3 70B',
                desc: 'Cross-modal reasoning across all three inputs. Flags real mismatches with severity levels. Never cosmetic confidence.',
              },
            ].map((s, i) => (
              <div key={s.n} className="relative">
                {i < 3 && (
                  <div className="absolute right-0 top-8 hidden -translate-y-1/2 translate-x-1/2 md:block">
                    <ChevronRight className="h-5 w-5 text-[#d4d4d8]" />
                  </div>
                )}
                <div className="h-full rounded-2xl border border-[#e4e4e7] bg-white p-6 shadow-sm">
                  <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border ${s.color}`}>
                    <s.icon className="h-5 w-5" />
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[#a1a1aa]">{s.n}</p>
                  <p className="mt-1 text-base font-semibold">{s.label}</p>
                  <p className="mt-0.5 text-[11px] font-medium text-[#71717a]">{s.model}</p>
                  <p className="mt-3 text-sm leading-relaxed text-[#52525b]">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#71717a]">Why it's different</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">Built around the AI, not bolted on</h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Flag,
                title: 'Real mismatches, not cosmetic scores',
                desc: 'The model reasons step-by-step before outputting any flag. If it flags vendor mismatch, it found one.',
              },
              {
                icon: CheckCircle,
                title: 'Per-field confidence, always visible',
                desc: 'Low-confidence fields are marked inline — not hidden in a tooltip or buried in metadata.',
              },
              {
                icon: ScanLine,
                title: 'No OCR black boxes',
                desc: 'Receipt analysis uses a vision LLM directly. Every value comes with a reasoning trace you can inspect.',
              },
              {
                icon: Sparkles,
                title: 'Policy-aware reconciliation',
                desc: 'Add your expense policy in plain text. The AI applies your rules: amount limits, required fields, categories.',
              },
              {
                icon: FileJson,
                title: 'Export JSON or Markdown',
                desc: 'Every reconciled expense exports as structured JSON or a formatted Markdown report with full audit trail.',
              },
              {
                icon: GitMerge,
                title: 'Full edit tracking',
                desc: 'Every manual correction is recorded with old value → new value. Nothing is silently overwritten.',
              },
            ].map(f => (
              <div key={f.title} className="rounded-2xl border border-[#e4e4e7] p-6 transition hover:border-[#a1a1aa] hover:shadow-md hover:shadow-black/5">
                <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#f4f4f5]">
                  <f.icon className="h-4 w-4 text-[#09090b]" />
                </div>
                <h3 className="text-sm font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#71717a]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="border-t border-[#e4e4e7] bg-[#09090b] px-6 py-24 text-white">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#71717a]">Get started</p>
          <h2 className="mt-3 text-4xl font-bold tracking-tight">
            Reconcile your first expense in 15 seconds.
          </h2>
          <p className="mt-4 text-[#a1a1aa]">
            Upload a receipt photo and a voice memo. The pipeline handles the rest.
          </p>
          <button
            onClick={() => navigate('/expenses/new')}
            className="mt-8 flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-sm font-semibold text-[#09090b] shadow-xl transition hover:bg-[#f4f4f5] active:scale-[0.98] mx-auto"
          >
            Try it now — free <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-[#e4e4e7] px-6 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#09090b]">
              <span className="text-[10px] font-bold text-white">$</span>
            </div>
            <span className="text-sm font-medium text-[#09090b]">Expense Reconciler</span>
          </div>
          <p className="text-xs text-[#a1a1aa]">Built with Groq · Whisper · Llama 4 Scout · Llama 3.3 70B</p>
        </div>
      </footer>
    </div>
  );
}
