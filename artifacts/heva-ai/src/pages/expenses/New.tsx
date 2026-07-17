import { useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import { Upload, Mic, FileAudio, Image, ArrowRight, History, Loader2, Clock } from 'lucide-react';

export default function ExpenseNew() {
  const [, navigate] = useLocation();
  const [receipt, setReceipt] = useState<File | null>(null);
  const [audio, setAudio] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const receiptRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);

  const handleDrop = (
    e: React.DragEvent,
    setter: (f: File) => void,
    accept: string[]
  ) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (!accept.some((a) => file.type.startsWith(a) || file.name.endsWith(a))) {
      toast.error('Unsupported file type');
      return;
    }
    setter(file);
  };

  const submit = async () => {
    if (!receipt || !audio) {
      toast.error('Please upload both a receipt and a voice memo');
      return;
    }
    setLoading(true);
    try {
      const form = new FormData();
      form.append('receipt', receipt);
      form.append('audio', audio);
      const res = await fetch('/api/expenses', { method: 'POST', body: form });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? 'Upload failed');
      }
      const data = await res.json() as { id: string };
      navigate(`/expenses/${data.id}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
      setLoading(false);
    }
  };

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
              <h1 className="text-sm font-semibold">Expense Reconciler</h1>
              <p className="text-[11px] text-white/40">AI-powered receipt + voice memo analysis</p>
            </div>
          </div>
          <a
            href="/expenses/history"
            onClick={(e) => { e.preventDefault(); navigate('/expenses/history'); }}
            className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 hover:border-white/20 hover:text-white"
          >
            <History className="h-3.5 w-3.5" /> History
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-10 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs text-blue-400">
            3-step AI pipeline · Whisper + Vision + Reconciliation
          </span>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight">
            Reconcile an Expense
          </h2>
          <p className="mt-2 text-sm text-white/50">
            Upload a receipt photo and a voice memo explaining the expense.
            The AI will extract, cross-check, and flag any mismatches.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {/* Receipt upload */}
          <DropZone
            label="Receipt Photo"
            hint="JPG, PNG, WEBP, PDF"
            icon={<Image className="h-6 w-6" />}
            file={receipt}
            accept={['image/', '.pdf']}
            inputRef={receiptRef}
            inputAccept="image/*,.pdf"
            onChange={setReceipt}
            onDrop={(e) => handleDrop(e, setReceipt, ['image/', '.pdf'])}
            color="blue"
          />

          {/* Audio upload */}
          <DropZone
            label="Voice Memo"
            hint="MP3, WAV, M4A, OGG, WEBM"
            icon={<Mic className="h-6 w-6" />}
            file={audio}
            accept={['audio/']}
            inputRef={audioRef}
            inputAccept="audio/*"
            onChange={setAudio}
            onDrop={(e) => handleDrop(e, setAudio, ['audio/'])}
            color="purple"
          />
        </div>

        {/* Processing estimate */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-white/30">
          <Clock className="h-3.5 w-3.5" />
          Estimated processing time: ~15–25 seconds
        </div>

        {/* Submit */}
        <button
          onClick={submit}
          disabled={!receipt || !audio || loading}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Starting analysis…</>
          ) : (
            <><ArrowRight className="h-4 w-4" /> Analyze Expense</>
          )}
        </button>

        {/* Pipeline info */}
        <div className="mt-10 grid grid-cols-3 gap-3">
          {[
            { n: '1', label: 'Audio Understanding', desc: 'Whisper transcription + intent extraction' },
            { n: '2', label: 'Receipt Analysis', desc: 'Vision model reads every line item' },
            { n: '3', label: 'Reconciliation', desc: 'AI reasons across both modalities' },
          ].map((s) => (
            <div key={s.n} className="rounded-xl border border-white/8 bg-white/3 p-4">
              <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-white/8 text-xs font-bold text-white/60">
                {s.n}
              </div>
              <p className="text-xs font-medium text-white/80">{s.label}</p>
              <p className="mt-0.5 text-[11px] text-white/40">{s.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function DropZone({
  label, hint, icon, file, accept, inputRef, inputAccept, onChange, onDrop, color,
}: {
  label: string;
  hint: string;
  icon: React.ReactNode;
  file: File | null;
  accept: string[];
  inputRef: React.RefObject<HTMLInputElement>;
  inputAccept: string;
  onChange: (f: File) => void;
  onDrop: (e: React.DragEvent) => void;
  color: 'blue' | 'purple';
}) {
  const [dragging, setDragging] = useState(false);
  const ring = color === 'blue' ? 'border-blue-500/60 bg-blue-500/5' : 'border-purple-500/60 bg-purple-500/5';
  const iconBg = color === 'blue' ? 'bg-blue-500/15 text-blue-400' : 'bg-purple-500/15 text-purple-400';

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { setDragging(false); onDrop(e); }}
      onClick={() => inputRef.current?.click()}
      className={`relative flex min-h-[180px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 transition ${dragging ? ring : 'border-white/15 bg-white/3 hover:border-white/25'}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={inputAccept}
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onChange(f); }}
      />
      {file ? (
        <>
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
            {label.includes('Voice') ? <FileAudio className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
          </div>
          <div className="text-center">
            <p className="max-w-[160px] truncate text-sm font-medium text-white">{file.name}</p>
            <p className="mt-0.5 text-[11px] text-white/40">
              {(file.size / 1024).toFixed(0)} KB · click to change
            </p>
          </div>
          <div className="absolute right-3 top-3 rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-medium text-green-400">
            ✓ ready
          </div>
        </>
      ) : (
        <>
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
            {icon}
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-white/80">{label}</p>
            <p className="mt-0.5 text-[11px] text-white/40">drag & drop or click to browse</p>
            <p className="mt-1 text-[10px] text-white/25">{hint}</p>
          </div>
        </>
      )}
    </div>
  );
}
