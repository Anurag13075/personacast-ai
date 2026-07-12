import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { ArrowRight, Play, ShieldCheck, Sparkles, FileText, Mic, MessageCircle, Share2, Check, Upload, BrainCircuit, Podcast } from "lucide-react";
import { StudioPreview } from "@/components/StudioPreview";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Heva AI — Turn Any PDF Into Insightful Conversations" },
      { name: "description", content: "Upload PDFs, generate podcast-style conversations with AI hosts, listen, and share. No credit card required." },
    ],
  }),
});

function Landing() {
  return (
    <div className="min-h-screen bg-white text-ink">
      {/* Top hero band (dark) */}
      <section className="bg-hero-dark text-white">
        <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Logo dark />
          <nav className="hidden items-center gap-8 text-sm text-white/70 md:flex">
            <a className="hover:text-white" href="#features">Product</a>
            <a className="hover:text-white" href="#usecases">Use Cases</a>
            <a className="hover:text-white" href="#how">How It Works</a>
            <a className="hover:text-white" href="#pricing">Pricing</a>
            <Link to="/chat" className="hover:text-white">Chat</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/studio" className="hidden text-sm text-white/80 hover:text-white md:block">Log in</Link>
            <Link
              to="/studio"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/30 hover:bg-blue-500"
            >
              Get Started Free <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </header>

        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 pb-24 pt-8 lg:grid-cols-2 lg:pb-32 lg:pt-16">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-blue-300">
              <Sparkles className="h-3.5 w-3.5" /> AI-POWERED CONVERSATIONAL INTELLIGENCE
            </span>
            <h1 className="mt-6 text-5xl font-semibold leading-[1.05] tracking-tight text-white md:text-6xl">
              Turn Any PDF <br />Into <span className="text-gradient">Insightful</span> <br /><span className="text-gradient">Conversations</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-white/70">
              Heva AI reads, analyzes, and transforms your documents into clear insights and podcast-style conversations you can listen to, share, and learn from.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/studio" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-blue-500/30 hover:bg-blue-500">
                Start for Free <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/studio" className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-5 py-3 text-sm text-white hover:bg-white/10">
                <Play className="h-4 w-4" /> View Demo
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-6 text-sm text-white/60">
              <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-blue-400" /> No credit card required</span>
              <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-blue-400" /> 50+ languages</span>
              <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-blue-400" /> Secure & private</span>
            </div>
          </div>
          <div className="relative">
            <div className="rounded-2xl border border-white/10 bg-[#0b0e1c] p-2 shadow-2xl shadow-blue-500/10">
              <StudioPreview />
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 py-10">
          <p className="text-center text-sm text-white/50">Trusted by researchers, students, and teams worldwide</p>
          <div className="mx-auto mt-6 flex max-w-5xl flex-wrap items-center justify-center gap-x-12 gap-y-4 px-6 text-white/60">
            {["Stanford University", "Berkeley", "MIT", "Harvard University", "McKinsey & Company", "Google", "and thousands more"].map((n) => (
              <span key={n} className="text-lg font-serif">{n}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-24">
        <div className="text-center">
          <span className="inline-block rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">POWERFUL FEATURES</span>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
            Everything you need<br />to go from <span className="text-gradient">document to discussion</span>
          </h2>
        </div>
        <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: FileText, tone: "bg-blue-50 text-blue-600", title: "Smart Document Understanding", desc: "Advanced AI reads and comprehends PDFs, scans, and images with unmatched accuracy." },
            { icon: Mic, tone: "bg-purple-50 text-purple-600", title: "Podcast-Style Output", desc: "Generate engaging, natural conversations with AI hosts and experts." },
            { icon: MessageCircle, tone: "bg-emerald-50 text-emerald-600", title: "Citations & References", desc: "Every response is backed by citations so you can trust the insights and dive deeper." },
            { icon: Share2, tone: "bg-amber-50 text-amber-600", title: "Export & Share", desc: "Export as audio, transcript, or structured data. Share anywhere with one click." },
          ].map((f, i) => (
            <div key={i} className="group rounded-2xl border border-border bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${f.tone}`}>
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-base font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              <ArrowRight className="mt-6 h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
            </div>
          ))}
        </div>

        {/* Built for impact */}
        <div id="how" className="mt-16 overflow-hidden rounded-3xl border border-purple-100 bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8 md:p-12">
          <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2">
            <div>
              <span className="inline-block rounded-full border border-purple-200 bg-white/70 px-3 py-1 text-xs font-medium text-purple-700">BUILT FOR IMPACT</span>
              <h3 className="mt-4 text-3xl font-semibold tracking-tight">Save hours. Learn deeper.<br />Communicate better.</h3>
              <p className="mt-3 max-w-md text-sm text-muted-foreground">
                Heva AI helps you absorb complex information faster, turn it into conversations, and share knowledge that creates impact.
              </p>
              <ul className="mt-5 space-y-2 text-sm">
                {["Upload any PDF or image", "AI analyzes and extracts insights", "Generate podcast or conversation", "Listen, edit, and export"].map((t) => (
                  <li key={t} className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" /> {t}</li>
                ))}
              </ul>
            </div>
            <div className="relative flex items-center justify-center">
              <div className="grid grid-cols-3 items-center gap-6">
                <div className="rounded-xl bg-white p-4 shadow-md">
                  <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-red-100 text-red-600"><FileText /></div>
                  <p className="text-center text-xs font-medium">PDF</p>
                </div>
                <div className="relative flex flex-col items-center gap-2">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 text-white shadow-xl shadow-blue-500/30"><BrainCircuit /></div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Heva AI</p>
                </div>
                <div className="space-y-2">
                  <div className="rounded-lg bg-white p-2 text-xs shadow"><Podcast className="mr-1 inline h-3 w-3" /> Podcast</div>
                  <div className="rounded-lg bg-white p-2 text-xs shadow"><Mic className="mr-1 inline h-3 w-3" /> Audio</div>
                  <div className="rounded-lg bg-white p-2 text-xs shadow"><Upload className="mr-1 inline h-3 w-3" /> Export</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div id="pricing" className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              {[0,1,2].map(i => <div key={i} className="h-8 w-8 rounded-full border-2 border-white bg-gradient-to-br from-blue-400 to-purple-500" />)}
            </div>
            <p className="text-sm">Join <b>10,000+</b> learners, researchers, and teams transforming the way they work with documents.</p>
          </div>
          <Link to="/studio" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-500">
            Start Your Free Project <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 md:flex-row">
          <Logo />
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Heva AI. All rights reserved.</p>
          <div className="flex gap-6 text-xs text-muted-foreground">
            <a href="#" className="hover:text-ink">Privacy</a>
            <a href="#" className="hover:text-ink">Terms</a>
            <Link to="/studio" className="hover:text-ink">Open Studio</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
