import { useLocation } from 'wouter';
import { ArrowRight, CheckCircle, Flag, FileJson, GitMerge, Mic, Receipt, ScanLine, Sparkles } from 'lucide-react';

export default function Landing() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-white text-[#09090b]" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── HERO ── */}
      <section className="relative min-h-screen overflow-hidden">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/hero-bg.jpg')" }}
        />
        {/* Gradient overlay — dark at bottom, semi-transparent at top */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/75" />

        {/* ── FLOATING NAV ── */}
        <nav className="relative z-20 flex justify-center px-6 pt-7">
          <div className="flex w-full max-w-5xl items-center justify-between rounded-2xl bg-white/15 px-5 py-3 backdrop-blur-md border border-white/20 shadow-lg shadow-black/10">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 shadow-sm">
                <span className="text-xs font-bold text-[#09090b]">$</span>
              </div>
              <span className="text-sm font-semibold text-white tracking-tight">Expense Reconciler</span>
            </div>
            <div className="hidden items-center gap-8 text-sm text-white/80 md:flex">
              <a href="#how" className="hover:text-white transition-colors">How it works</a>
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a
                href="/expenses/history"
                onClick={e => { e.preventDefault(); navigate('/expenses/history'); }}
                className="hover:text-white transition-colors"
              >
                History
              </a>
            </div>
            <button
              onClick={() => navigate('/expenses/new')}
              className="flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#09090b] shadow-md transition hover:bg-white/90 active:scale-[0.97]"
            >
              Try it free <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </nav>

        {/* ── HERO CONTENT ── */}
        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center pb-28 pt-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-4 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm mb-8">
            <span className="flex h-1.5 w-1.5 rounded-full bg-green-400 shadow-sm shadow-green-400/60" />
            Powered by Groq · Whisper · Llama 3.3 70B
          </div>

          <h1
            className="mx-auto max-w-4xl text-5xl font-bold leading-[1.08] text-white md:text-7xl lg:text-8xl"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Every receipt.
            <br />
            <span className="text-white/60">Every memo.</span>
            <br />
            Perfectly matched.
          </h1>

          <p className="mx-auto mt-8 max-w-xl text-lg leading-relaxed text-white/75">
            Upload a receipt photo and a voice memo. Three AI models cross-check every field
            and surface the exact mismatches — before they reach finance.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => navigate('/expenses/new')}
              className="flex items-center gap-2 rounded-2xl bg-white px-7 py-4 text-sm font-semibold text-[#09090b] shadow-2xl shadow-black/20 transition hover:bg-white/95 active:scale-[0.98]"
            >
              Reconcile your first expense <ArrowRight className="h-4 w-4" />
            </button>
            <a
              href="#how"
              className="flex items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-7 py-4 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              See how it works
            </a>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-white/60">
            {['No account required', 'Runs in ~15 seconds', 'JSON + Markdown export'].map(t => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-green-400" /> {t}
              </span>
            ))}
          </div>
        </div>

        {/* scroll fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* ── PRODUCT PREVIEW ── */}
      <section className="px-6 pb-28 -mt-4 relative z-10">
        <div className="mx-auto max-w-5xl">
          <div className="overflow-hidden rounded-3xl border border-[#e4e4e7] bg-white shadow-2xl shadow-black/8">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 border-b border-[#f0f0f0] bg-[#fafafa] px-5 py-3.5">
              <span className="h-3 w-3 rounded-full bg-[#ef4444]/70" />
              <span className="h-3 w-3 rounded-full bg-[#f59e0b]/70" />
              <span className="h-3 w-3 rounded-full bg-[#22c55e]/70" />
              <div className="mx-auto flex items-center gap-1.5 rounded-lg bg-white border border-[#e4e4e7] px-3 py-1 text-[11px] text-[#71717a]">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                expensereconciler.app/review
              </div>
            </div>
            {/* Mock review screen */}
            <div className="grid grid-cols-1 divide-y divide-[#f0f0f0] bg-white md:grid-cols-3 md:divide-x md:divide-y-0">
              {/* Step 1 — Voice */}
              <div className="p-6">
                <p className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#a1a1aa]">
                  <Mic className="h-3 w-3" /> Voice Memo
                </p>
                <div className="rounded-xl border border-[#f0f0f0] bg-[#fafafa] p-3 text-[11px] italic text-[#52525b] leading-relaxed">
                  "Lunch at Urban Grind, about $39, client from Acme Corp on the 10th…"
                </div>
                <div className="mt-4 space-y-2">
                  {[['Claimed amount', '$39.00'], ['Vendor', 'Urban Grand Cafe'], ['Date', 'Jul 10, 2026']].map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between text-[11px]">
                      <span className="text-[#a1a1aa]">{k}</span>
                      <span className="font-semibold text-[#09090b]">{v}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#a1a1aa]">Audio confidence</span>
                    <div className="flex-1 h-1 rounded-full bg-[#f0f0f0]">
                      <div className="h-full w-4/5 rounded-full bg-amber-400" />
                    </div>
                    <span className="text-[10px] font-semibold text-amber-600">80%</span>
                  </div>
                </div>
              </div>
              {/* Step 2 — Receipt */}
              <div className="p-6">
                <p className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#a1a1aa]">
                  <Receipt className="h-3 w-3" /> Receipt
                </p>
                <div className="space-y-1.5">
                  {[['Flat White', '$6.50'], ['Avocado Toast', '$14.00'], ['OJ', '$5.50'], ['Croissant', '$4.50'], ['Service', '$8.63']].map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between text-[11px]">
                      <span className="text-[#52525b]">{k}</span>
                      <span className="font-medium text-[#09090b]">{v}</span>
                    </div>
                  ))}
                  <div className="mt-2 border-t border-[#f0f0f0] pt-2 flex items-center justify-between text-[12px] font-bold">
                    <span>TOTAL</span>
                    <span>$39.13</span>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-green-50 px-2.5 py-1.5 text-[10px] text-green-700">
                  <CheckCircle className="h-3 w-3 shrink-0" />
                  <span className="font-medium">URBAN GRIND CAFE · 97% confidence</span>
                </div>
              </div>
              {/* Step 3 — Reconciled */}
              <div className="p-6">
                <p className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#a1a1aa]">
                  <GitMerge className="h-3 w-3" /> Reconciled
                </p>
                <div className="mb-4 flex items-end justify-between">
                  <div>
                    <p className="text-[10px] text-[#a1a1aa] mb-0.5">Final amount</p>
                    <span className="text-3xl font-bold tracking-tight">$39.13</span>
                  </div>
                  <span className="rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-bold text-green-700">85% conf</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                    <Flag className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                    <div>
                      <p className="text-[10px] font-semibold text-amber-800">Vendor name mismatch</p>
                      <p className="text-[10px] text-amber-600">Memo: "Urban Grand" · Receipt: "Urban Grind"</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2">
                    <Flag className="mt-0.5 h-3 w-3 shrink-0 text-green-500" />
                    <div>
                      <p className="text-[10px] font-semibold text-green-800">Amount diff $0.13 — low</p>
                      <p className="text-[10px] text-green-600">Within 1% threshold</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="bg-[#fafafa] px-6 py-28 border-t border-[#f0f0f0]">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-[#a1a1aa] mb-3">The pipeline</p>
            <h2
              className="text-4xl font-bold tracking-tight text-[#09090b] md:text-5xl"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Three inputs.
              <br />
              <span className="text-[#a1a1aa]">One truth.</span>
            </h2>
            <p className="mt-5 text-base text-[#71717a] max-w-md mx-auto leading-relaxed">
              Each step produces a structured result the moment it finishes —
              you see the pipeline run in real time.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                n: '01', icon: Mic, accent: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100',
                label: 'Voice Memo',
                model: 'Groq Whisper v3',
                desc: 'Audio transcribed word-for-word. LLM extracts intent: amount, vendor, date, purpose — with a confidence score.',
              },
              {
                n: '02', icon: ScanLine, accent: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100',
                label: 'Receipt Photo',
                model: 'Tesseract OCR + LLM',
                desc: 'OCR reads every line item, total, vendor name and date. LLM structures it with per-field confidence.',
              },
              {
                n: '03', icon: Sparkles, accent: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100',
                label: 'Policy Notes',
                model: 'Optional text',
                desc: 'Describe your expense policy in plain English. The AI applies your rules when raising flags.',
              },
              {
                n: '04', icon: GitMerge, accent: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100',
                label: 'Reconciliation',
                model: 'Llama 3.3 70B',
                desc: 'Cross-modal reasoning across all three inputs. Flags real mismatches with severity levels.',
              },
            ].map((s) => (
              <div key={s.n} className="rounded-2xl border border-[#e8e8e8] bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className={`mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl border ${s.bg} ${s.border}`}>
                  <s.icon className={`h-5 w-5 ${s.accent}`} />
                </div>
                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${s.accent}`}>{s.n}</p>
                <p className="text-base font-semibold text-[#09090b]">{s.label}</p>
                <p className="text-[11px] font-medium text-[#a1a1aa] mb-3">{s.model}</p>
                <p className="text-sm leading-relaxed text-[#71717a]">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURE STRIP ── */}
      <section className="px-6 py-28">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-16 lg:grid-cols-2 lg:gap-24 items-center">
            {/* Left — image */}
            <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-black/10">
              <img
                src="/feature-pipeline.jpg"
                alt="Receipt, voice recorder, and reconciliation report"
                className="w-full h-72 object-cover lg:h-96"
              />
              {/* Floating badge */}
              <div className="absolute bottom-5 left-5 right-5 rounded-2xl bg-white/90 backdrop-blur-md px-5 py-4 border border-white/60 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#09090b]">Reconciliation complete</span>
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">85%</span>
                </div>
                <div className="flex gap-2">
                  <span className="rounded-lg bg-amber-100 px-2.5 py-1 text-[10px] font-semibold text-amber-700">⚑ vendor mismatch</span>
                  <span className="rounded-lg bg-green-100 px-2.5 py-1 text-[10px] font-semibold text-green-700">✓ amount ok</span>
                  <span className="rounded-lg bg-green-100 px-2.5 py-1 text-[10px] font-semibold text-green-700">✓ date ok</span>
                </div>
              </div>
            </div>

            {/* Right — features */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#a1a1aa] mb-4">Why it's different</p>
              <h2
                className="text-4xl font-bold tracking-tight text-[#09090b] mb-8 leading-tight md:text-5xl"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Built around the AI,
                <br />
                <span className="text-[#a1a1aa]">not bolted on.</span>
              </h2>
              <div className="space-y-6">
                {[
                  {
                    accent: 'text-blue-600',
                    title: 'Real mismatches, not cosmetic scores',
                    desc: 'The model reasons step-by-step before outputting any flag. If it flags vendor mismatch, it found one.',
                  },
                  {
                    accent: 'text-violet-600',
                    title: 'Per-field confidence, always visible',
                    desc: 'Low-confidence fields are marked inline — not hidden in a tooltip or buried in metadata.',
                  },
                  {
                    accent: 'text-amber-600',
                    title: 'Policy-aware reconciliation',
                    desc: 'Add your expense policy in plain text. The AI applies your rules: amount limits, required fields, categories.',
                  },
                  {
                    accent: 'text-green-600',
                    title: 'Full edit tracking & export',
                    desc: 'Every correction is recorded old → new. Export as structured JSON or Markdown with a full audit trail.',
                  },
                ].map(f => (
                  <div key={f.title} className="flex gap-4">
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-current opacity-40 self-start" style={{ color: 'currentColor' }} />
                    <div>
                      <h3 className={`text-sm font-bold mb-1 ${f.accent}`}>{f.title}</h3>
                      <p className="text-sm leading-relaxed text-[#71717a]">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURE CARDS ── */}
      <section id="features" className="bg-[#fafafa] px-6 py-28 border-t border-[#f0f0f0]">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-[#a1a1aa] mb-3">Everything you need</p>
            <h2
              className="text-4xl font-bold tracking-tight text-[#09090b] md:text-5xl"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Audit-ready in seconds.
            </h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Flag, accent: 'text-red-500', bg: 'bg-red-50',
                title: 'Flag severity levels',
                desc: 'High, medium, and low flags. Amount mismatches over 10% are always high — no surprises.',
              },
              {
                icon: CheckCircle, accent: 'text-green-600', bg: 'bg-green-50',
                title: 'Confidence on every field',
                desc: 'Whisper and OCR both output per-field confidence. Low values are surfaced right where they matter.',
              },
              {
                icon: ScanLine, accent: 'text-violet-600', bg: 'bg-violet-50',
                title: 'No OCR black boxes',
                desc: 'Receipt parsing uses Tesseract + LLM with a full reasoning trace you can inspect and export.',
              },
              {
                icon: Sparkles, accent: 'text-amber-600', bg: 'bg-amber-50',
                title: 'Your policy, enforced',
                desc: 'Paste in your expense policy. The AI checks each rule and cites the exact violation in its flag.',
              },
              {
                icon: FileJson, accent: 'text-blue-600', bg: 'bg-blue-50',
                title: 'Export JSON or Markdown',
                desc: 'Every run exports as structured JSON or a formatted Markdown report. Pipe it wherever you need.',
              },
              {
                icon: GitMerge, accent: 'text-[#09090b]', bg: 'bg-[#f4f4f5]',
                title: 'Immutable edit trail',
                desc: 'Every manual correction records the old value, new value, and timestamp. Nothing overwritten silently.',
              },
            ].map(f => (
              <div
                key={f.title}
                className="rounded-2xl border border-[#e8e8e8] bg-white p-6 transition-all hover:shadow-lg hover:shadow-black/5 hover:-translate-y-0.5"
              >
                <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl ${f.bg}`}>
                  <f.icon className={`h-4.5 w-4.5 ${f.accent}`} />
                </div>
                <h3 className={`text-sm font-bold mb-2 ${f.accent}`}>{f.title}</h3>
                <p className="text-sm leading-relaxed text-[#71717a]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative overflow-hidden px-6 py-32">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/hero-bg.jpg')" }}
        />
        <div className="absolute inset-0 bg-black/65" />
        <div className="relative z-10 mx-auto max-w-2xl text-center">
          <h2
            className="text-5xl font-bold text-white tracking-tight md:text-6xl"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Reconcile your first expense in 15 seconds.
          </h2>
          <p className="mt-5 text-lg text-white/65">
            Upload a receipt photo and a voice memo. The pipeline handles the rest.
          </p>
          <button
            onClick={() => navigate('/expenses/new')}
            className="mt-10 inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 text-sm font-semibold text-[#09090b] shadow-2xl shadow-black/20 transition hover:bg-white/95 active:scale-[0.98]"
          >
            Try it now — free <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-[#f0f0f0] bg-white px-6 py-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#09090b]">
              <span className="text-[11px] font-bold text-white">$</span>
            </div>
            <span className="text-sm font-semibold text-[#09090b]">Expense Reconciler</span>
          </div>
          <p className="text-xs text-[#a1a1aa]">Built with Groq · Whisper · Tesseract · Llama 3.3 70B</p>
        </div>
      </footer>
    </div>
  );
}
