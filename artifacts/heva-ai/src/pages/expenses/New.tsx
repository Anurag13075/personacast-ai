import { useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import { Upload, Mic, FileAudio, Image, ArrowRight, History, Loader2, Clock, Sparkles } from 'lucide-react';
import { usePipelineStore } from '@/stores/pipelineStore';

export default function ExpenseNew() {
  const [, navigate] = useLocation();
  const [receipt, setReceipt] = useState<File | null>(null);
  const [audio, setAudio] = useState<File | null>(null);
  const [policyNotes, setPolicyNotes] = useState('');
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

    // Reset the store so Processing.tsx starts fresh
    usePipelineStore.getState().reset();

    try {
      const form = new FormData();
      form.append('receipt', receipt);
      form.append('audio', audio);
      if (policyNotes.trim()) form.append('policyNotes', policyNotes.trim());

      const res = await fetch('/api/expenses', { method: 'POST', body: form });

      // The server now returns an SSE stream, not JSON.
      // Check for error status before streaming (only fires for 400/500 before headers).
      if (!res.ok || !res.body) {
        const text = await res.text();
        let msg = 'Upload failed';
        try { msg = (JSON.parse(text) as { error?: string }).error ?? msg; } catch { /* */ }
        throw new Error(msg);
      }

      // Start reading the SSE stream. As soon as we receive the 'created' event
      // (which arrives immediately after the server creates the DB record) we
      // navigate to the Processing page. The stream continues reading in the
      // background and pushes events into the Zustand store, which Processing.tsx
      // subscribes to — so the user sees each step card update in real time.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let navigated = false;

      const readStream = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            // SSE messages are separated by double newlines
            const chunks = buffer.split('\n\n');
            buffer = chunks.pop()!; // keep any incomplete trailing chunk
            for (const chunk of chunks) {
              for (const line of chunk.split('\n')) {
                if (!line.startsWith('data: ')) continue;
                try {
                  const event = JSON.parse(line.slice(6));
                  usePipelineStore.getState().pushEvent(event);
                  if (event.type === 'created' && !navigated) {
                    navigated = true;
                    navigate(`/expenses/${event.id as string}`);
                  }
                } catch { /* ignore malformed event */ }
              }
            }
          }
        } catch { /* stream closed or aborted */ }
      };

      // Fire-and-forget — don't await so the UI remains responsive
      void readStream();

    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#09090b]" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <header className="border-b border-[#e4e4e7] bg-white px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#09090b]">
              <span className="text-xs font-bold text-white">$</span>
            </div>
            <span className="text-sm font-semibold tracking-tight">Expense Reconciler</span>
          </button>
          <button
            onClick={() => navigate('/expenses/history')}
            className="flex items-center gap-2 rounded-lg border border-[#e4e4e7] px-3 py-1.5 text-xs font-medium text-[#52525b] hover:border-[#a1a1aa] hover:text-[#09090b] transition"
          >
            <History className="h-3.5 w-3.5" /> History
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12">
        <div className="mb-10">
          <h1 className="text-2xl font-bold tracking-tight">Reconcile an expense</h1>
          <p className="mt-1.5 text-sm text-[#71717a]">
            Upload a receipt and voice memo. The AI cross-checks both and flags any mismatches.
          </p>
        </div>

        {/* Upload inputs */}
        <div className="grid gap-4 sm:grid-cols-2">
          <DropZone
            label="Receipt Photo"
            hint="JPG, PNG, WEBP, PDF"
            icon={<Image className="h-5 w-5" />}
            file={receipt}
            inputRef={receiptRef}
            inputAccept="image/*,.pdf"
            onChange={setReceipt}
            onDrop={(e) => handleDrop(e, setReceipt, ['image/', '.pdf'])}
          />
          <DropZone
            label="Voice Memo"
            hint="MP3, WAV, M4A, OGG, WEBM"
            icon={<Mic className="h-5 w-5" />}
            file={audio}
            inputRef={audioRef}
            inputAccept="audio/*"
            onChange={setAudio}
            onDrop={(e) => handleDrop(e, setAudio, ['audio/'])}
          />
        </div>

        {/* Policy notes */}
        <div className="mt-5 rounded-2xl border border-[#e4e4e7] bg-[#fafafa] p-5">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#e4e4e7] bg-white">
              <Sparkles className="h-3.5 w-3.5 text-[#71717a]" />
            </div>
            <div>
              <p className="text-sm font-medium">Policy & Context Notes <span className="ml-1 text-[11px] font-normal text-[#a1a1aa]">optional</span></p>
              <p className="text-[11px] text-[#a1a1aa]">Tell the AI your expense rules — it will flag violations and use this as additional context</p>
            </div>
          </div>
          <textarea
            value={policyNotes}
            onChange={(e) => setPolicyNotes(e.target.value)}
            placeholder={`Examples:\n• "Meals over $50 require manager approval"\n• "Client name must appear on all entertainment receipts"\n• "This is for project ACME-Q3-2026"\n• "VAT receipts required — check tax line is present"`}
            rows={4}
            className="w-full resize-none rounded-xl border border-[#e4e4e7] bg-white px-4 py-3 text-sm text-[#09090b] placeholder-[#a1a1aa] outline-none transition focus:border-[#09090b] focus:ring-2 focus:ring-[#09090b]/5"
          />
          {policyNotes.trim() && (
            <p className="mt-2 flex items-center gap-1 text-[11px] text-[#22c55e]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
              AI will apply these rules during reconciliation
            </p>
          )}
        </div>

        {/* Estimated time */}
        <div className="mt-5 flex items-center justify-center gap-2 text-xs text-[#a1a1aa]">
          <Clock className="h-3.5 w-3.5" />
          Results appear step-by-step as the AI completes each stage
        </div>

        {/* Submit */}
        <button
          onClick={submit}
          disabled={!receipt || !audio || loading}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#09090b] py-3.5 text-sm font-semibold text-white shadow-lg shadow-black/10 transition hover:bg-[#27272a] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Connecting to pipeline…</>
          ) : (
            <><ArrowRight className="h-4 w-4" /> Analyze Expense</>
          )}
        </button>

        {/* Pipeline steps preview */}
        <div className="mt-10 grid grid-cols-3 gap-3">
          {[
            { n: '1', label: 'Audio Understanding', desc: 'Whisper + LLM intent' },
            { n: '2', label: 'Receipt Analysis', desc: 'Tesseract OCR + LLM' },
            { n: '3', label: 'Reconciliation', desc: 'Cross-modal + policy' },
          ].map((s) => (
            <div key={s.n} className="rounded-xl border border-[#e4e4e7] bg-[#fafafa] p-4">
              <div className="mb-2 flex h-6 w-6 items-center justify-center rounded-md border border-[#e4e4e7] bg-white text-[11px] font-bold text-[#52525b]">
                {s.n}
              </div>
              <p className="text-[11px] font-semibold text-[#09090b]">{s.label}</p>
              <p className="mt-0.5 text-[10px] text-[#a1a1aa]">{s.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function DropZone({
  label, hint, icon, file, inputRef, inputAccept, onChange, onDrop,
}: {
  label: string;
  hint: string;
  icon: React.ReactNode;
  file: File | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  inputAccept: string;
  onChange: (f: File) => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  const [dragging, setDragging] = useState(false);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { setDragging(false); onDrop(e); }}
      onClick={() => inputRef.current?.click()}
      className={`relative flex min-h-[160px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 transition ${
        dragging ? 'border-[#09090b] bg-[#f4f4f5]' : file ? 'border-[#09090b] bg-[#fafafa]' : 'border-[#d4d4d8] bg-[#fafafa] hover:border-[#a1a1aa] hover:bg-[#f4f4f5]'
      }`}
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#e4e4e7] bg-white text-[#09090b]">
            {label.includes('Voice') ? <FileAudio className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
          </div>
          <div className="text-center">
            <p className="max-w-[180px] truncate text-sm font-medium text-[#09090b]">{file.name}</p>
            <p className="mt-0.5 text-[11px] text-[#a1a1aa]">{(file.size / 1024).toFixed(0)} KB · click to change</p>
          </div>
          <div className="absolute right-3 top-3 rounded-full bg-[#dcfce7] px-2 py-0.5 text-[10px] font-semibold text-[#16a34a]">
            ✓
          </div>
        </>
      ) : (
        <>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#e4e4e7] bg-white text-[#52525b]">
            {icon}
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-[#09090b]">{label}</p>
            <p className="mt-0.5 text-[11px] text-[#a1a1aa]">drag & drop or click</p>
            <p className="mt-1 text-[10px] text-[#d4d4d8]">{hint}</p>
          </div>
        </>
      )}
    </div>
  );
}
