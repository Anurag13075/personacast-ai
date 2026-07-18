import { useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import { Upload, Mic, Image, ArrowRight, History, Loader2, Square, Sparkles } from 'lucide-react';
import { usePipelineStore } from '@/stores/pipelineStore';

export default function ExpenseNew() {
  const [, navigate] = useLocation();
  const [receipt, setReceipt] = useState<File | null>(null);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [recording, setRecording] = useState(false);
  const [policyNotes, setPolicyNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const receiptRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const finalRef = useRef('');

  const startRecording = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error('Speech recognition not supported — try Chrome or Edge, or type your memo below');
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec = new SR() as any;
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    finalRef.current = transcript;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          finalRef.current += e.results[i][0].transcript + ' ';
          setTranscript(finalRef.current);
        } else {
          interim += e.results[i][0].transcript;
        }
      }
      setInterimText(interim);
    };
    rec.onend = () => { setRecording(false); setInterimText(''); };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onerror = (e: any) => {
      if (e.error !== 'aborted') toast.error(`Mic error: ${e.error}`);
      setRecording(false); setInterimText('');
    };

    recognitionRef.current = rec;
    rec.start();
    setRecording(true);
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setRecording(false);
    setInterimText('');
  };

  const handleReceiptDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/') && !file.name.endsWith('.pdf')) {
      toast.error('Please upload an image or PDF');
      return;
    }
    setReceipt(file);
  };

  const submit = async () => {
    if (!receipt) { toast.error('Please upload a receipt photo'); return; }
    if (!transcript.trim()) { toast.error('Please record a voice memo or type a description'); return; }

    setLoading(true);
    usePipelineStore.getState().reset();

    try {
      const form = new FormData();
      form.append('receipt', receipt);
      form.append('transcript', transcript.trim());
      if (policyNotes.trim()) form.append('policyNotes', policyNotes.trim());

      const res = await fetch('/api/expenses', { method: 'POST', body: form });

      if (!res.ok || !res.body) {
        const text = await res.text();
        let msg = 'Upload failed';
        try { msg = (JSON.parse(text) as { error?: string }).error ?? msg; } catch { /* */ }
        throw new Error(msg);
      }

      // Stream SSE events — navigate as soon as run ID arrives, keep reading in background
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
            const chunks = buffer.split('\n\n');
            buffer = chunks.pop()!;
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
                } catch { /* ignore */ }
              }
            }
          }
        } catch { /* stream closed */ }
      };

      void readStream();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
      setLoading(false);
    }
  };

  const canSubmit = !!receipt && transcript.trim().length > 0 && !loading;

  return (
    <div className="min-h-screen bg-white text-[#09090b]" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <header className="border-b border-[#e4e4e7] bg-white px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2.5">
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
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Reconcile an expense</h1>
          <p className="mt-1.5 text-sm text-[#71717a]">
            Upload a receipt and describe the expense by voice or text. The AI flags every mismatch.
          </p>
        </div>

        {/* ── Receipt photo ── */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleReceiptDrop}
          onClick={() => receiptRef.current?.click()}
          className={`relative flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 transition ${
            receipt
              ? 'border-[#09090b] bg-[#fafafa]'
              : 'border-[#d4d4d8] bg-[#fafafa] hover:border-[#a1a1aa] hover:bg-[#f4f4f5]'
          }`}
        >
          <input
            ref={receiptRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) setReceipt(f); }}
          />
          {receipt ? (
            <>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#e4e4e7] bg-white text-[#09090b]">
                <Upload className="h-5 w-5" />
              </div>
              <div className="text-center">
                <p className="max-w-xs truncate text-sm font-medium">{receipt.name}</p>
                <p className="mt-0.5 text-[11px] text-[#a1a1aa]">{(receipt.size / 1024).toFixed(0)} KB · click to change</p>
              </div>
              <div className="absolute right-3 top-3 rounded-full bg-[#dcfce7] px-2 py-0.5 text-[10px] font-semibold text-[#16a34a]">✓</div>
            </>
          ) : (
            <>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#e4e4e7] bg-white text-[#52525b]">
                <Image className="h-5 w-5" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Receipt Photo</p>
                <p className="mt-0.5 text-[11px] text-[#a1a1aa]">drag & drop or click · JPG, PNG, PDF</p>
              </div>
            </>
          )}
        </div>

        {/* ── Voice memo ── */}
        <div className="mt-4 rounded-2xl border border-[#e4e4e7] bg-[#fafafa] p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#e4e4e7] bg-white">
                <Mic className="h-3.5 w-3.5 text-[#71717a]" />
              </div>
              <div>
                <p className="text-sm font-medium">Voice Memo</p>
                <p className="text-[11px] text-[#a1a1aa]">Describe the expense — amount, vendor, purpose, date</p>
              </div>
            </div>
            <button
              type="button"
              onClick={recording ? stopRecording : startRecording}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                recording
                  ? 'border border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                  : 'bg-[#09090b] text-white hover:bg-[#27272a]'
              }`}
            >
              {recording ? (
                <><Square className="h-3 w-3 fill-red-500 text-red-500" /> Stop</>
              ) : (
                <><Mic className="h-3.5 w-3.5" /> Record</>
              )}
            </button>
          </div>

          <div className="relative">
            <textarea
              value={recording ? transcript + interimText : transcript}
              onChange={(e) => { if (!recording) setTranscript(e.target.value); }}
              readOnly={recording}
              placeholder={'e.g. "Team lunch at The Coffee Collective, total was around $38, July 15th. Four of us, Q3 sprint planning."'}
              rows={3}
              className={`w-full resize-none rounded-xl border border-[#e4e4e7] bg-white px-4 py-3 text-sm text-[#09090b] placeholder-[#a1a1aa] outline-none transition focus:border-[#09090b] focus:ring-2 focus:ring-[#09090b]/5 ${
                recording ? 'cursor-default select-none' : ''
              }`}
            />
            {recording && (
              <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                <span className="text-[10px] font-medium text-red-600">listening…</span>
              </div>
            )}
          </div>

          {transcript.trim() && !recording && (
            <div className="mt-2 flex items-center justify-between">
              <p className="flex items-center gap-1 text-[11px] text-[#22c55e]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" /> Ready
              </p>
              <button
                type="button"
                onClick={() => { setTranscript(''); finalRef.current = ''; }}
                className="text-[11px] text-[#a1a1aa] hover:text-[#71717a]"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* ── Policy notes ── */}
        <div className="mt-4 rounded-2xl border border-[#e4e4e7] bg-[#fafafa] p-5">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#e4e4e7] bg-white">
              <Sparkles className="h-3.5 w-3.5 text-[#71717a]" />
            </div>
            <div>
              <p className="text-sm font-medium">Policy & Context Notes <span className="ml-1 text-[11px] font-normal text-[#a1a1aa]">optional</span></p>
              <p className="text-[11px] text-[#a1a1aa]">The AI will flag any violations against these rules</p>
            </div>
          </div>
          <textarea
            value={policyNotes}
            onChange={(e) => setPolicyNotes(e.target.value)}
            placeholder={'• "Meals over $50 require manager approval"\n• "Client name must appear on entertainment receipts"\n• "This is for project ACME-Q3-2026"'}
            rows={3}
            className="w-full resize-none rounded-xl border border-[#e4e4e7] bg-white px-4 py-3 text-sm text-[#09090b] placeholder-[#a1a1aa] outline-none transition focus:border-[#09090b] focus:ring-2 focus:ring-[#09090b]/5"
          />
        </div>

        {/* ── Submit ── */}
        <button
          onClick={submit}
          disabled={!canSubmit}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#09090b] py-3.5 text-sm font-semibold text-white shadow-lg shadow-black/10 transition hover:bg-[#27272a] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Connecting to pipeline…</>
          ) : (
            <><ArrowRight className="h-4 w-4" /> Analyze Expense</>
          )}
        </button>

        {/* ── Pipeline steps ── */}
        <div className="mt-8 grid grid-cols-3 gap-3">
          {[
            { n: '1', label: 'Intent Extraction', desc: 'Parse spoken memo via browser' },
            { n: '2', label: 'Receipt Reading', desc: 'Gemini vision reads every field' },
            { n: '3', label: 'Reconciliation', desc: 'Cross-modal + policy check' },
          ].map((s) => (
            <div key={s.n} className="rounded-xl border border-[#e4e4e7] bg-[#fafafa] p-4">
              <div className="mb-2 flex h-6 w-6 items-center justify-center rounded-md border border-[#e4e4e7] bg-white text-[11px] font-bold text-[#52525b]">{s.n}</div>
              <p className="text-[11px] font-semibold text-[#09090b]">{s.label}</p>
              <p className="mt-0.5 text-[10px] text-[#a1a1aa]">{s.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
