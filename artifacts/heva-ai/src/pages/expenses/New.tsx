import { useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import { Receipt, Mic, ArrowRight, History, Loader2, Square, Sparkles, FileAudio, Image, X } from 'lucide-react';
import { usePipelineStore } from '@/stores/pipelineStore';

export default function ExpenseNew() {
  const [, navigate] = useLocation();

  // ── Audio input ──────────────────────────────────────────────────────────
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [recording, setRecording] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const finalRef = useRef('');
  const audioInputRef = useRef<HTMLInputElement>(null);

  // ── Receipt ──────────────────────────────────────────────────────────────
  const [receiptImage, setReceiptImage] = useState<File | null>(null);
  const [receiptImageUrl, setReceiptImageUrl] = useState<string | null>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  // ── Misc ─────────────────────────────────────────────────────────────────
  const [policyNotes, setPolicyNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // ── Audio handlers ────────────────────────────────────────────────────────
  const handleAudioFile = (file: File) => {
    if (!file.type.startsWith('audio/') && !file.name.match(/\.(wav|mp3|m4a|webm|ogg|flac)$/i)) {
      toast.error('Please upload an audio file (WAV, MP3, M4A, WebM)');
      return;
    }
    setAudioFile(file);
    setTranscript(''); // clear typed transcript when file uploaded
    finalRef.current = '';
  };

  const startRecording = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error('Speech recognition not supported — try Chrome or Edge, or upload an audio file');
      return;
    }
    setAudioFile(null); // clear file when recording live
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

  // ── Receipt image handler ─────────────────────────────────────────────────
  const handleReceiptImage = (file: File) => {
    if (!file.type.startsWith('image/') && !file.name.endsWith('.pdf')) {
      toast.error('Please upload an image or PDF');
      return;
    }
    setReceiptImage(file);
    const url = URL.createObjectURL(file);
    setReceiptImageUrl(url);
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const hasAudio = !!audioFile || transcript.trim().length > 0;
  const canSubmit = hasAudio && !!receiptImage && !loading;

  const submit = async () => {
    if (!hasAudio) { toast.error('Upload an audio file or record/type a voice memo'); return; }
    if (!receiptImage) { toast.error('Please upload a receipt image'); return; }

    setLoading(true);
    usePipelineStore.getState().reset();

    try {
      const form = new FormData();
      if (audioFile) {
        form.append('audio', audioFile);
      } else {
        form.append('transcript', transcript.trim());
      }
      form.append('receiptImage', receiptImage);
      if (policyNotes.trim()) form.append('policyNotes', policyNotes.trim());

      const res = await fetch('/api/expenses', { method: 'POST', body: form });

      if (!res.ok || !res.body) {
        const text = await res.text();
        let msg = 'Submission failed';
        try { msg = (JSON.parse(text) as { error?: string }).error ?? msg; } catch { /* */ }
        throw new Error(msg);
      }

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
      toast.error(err instanceof Error ? err.message : 'Submission failed');
      setLoading(false);
    }
  };

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
            Upload or record a voice memo, then photograph the receipt. The AI reads both and flags every mismatch.
          </p>
        </div>

        {/* ── Step 1: Audio input ── */}
        <div className="rounded-2xl border border-[#e4e4e7] bg-[#fafafa] p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#e4e4e7] bg-white">
              <Mic className="h-3.5 w-3.5 text-[#71717a]" />
            </div>
            <div>
              <p className="text-sm font-medium">
                Voice Memo <span className="text-red-400 text-[11px] font-normal">required</span>
              </p>
              <p className="text-[11px] text-[#a1a1aa]">Upload an audio file (Groq Whisper) or record live via browser mic</p>
            </div>
          </div>

          {/* Audio file upload zone */}
          <div
            onClick={() => !audioFile && audioInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleAudioFile(f); }}
            className={`relative flex items-center gap-3 rounded-xl border border-dashed p-4 transition ${
              audioFile
                ? 'border-[#09090b] bg-white cursor-default'
                : 'border-[#d4d4d8] bg-white hover:border-[#a1a1aa] cursor-pointer'
            }`}
          >
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*,.wav,.mp3,.m4a,.webm,.ogg,.flac"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAudioFile(f); }}
            />
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${audioFile ? 'border-[#e4e4e7] bg-[#fafafa] text-[#09090b]' : 'border-[#e4e4e7] bg-[#fafafa] text-[#a1a1aa]'}`}>
              <FileAudio className="h-4 w-4" />
            </div>
            {audioFile ? (
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-[#09090b]">{audioFile.name}</p>
                <p className="text-[11px] text-[#a1a1aa]">{(audioFile.size / 1024).toFixed(0)} KB · Groq Whisper will transcribe this</p>
              </div>
            ) : (
              <div className="flex-1">
                <p className="text-sm font-medium text-[#52525b]">Drop audio file or click to upload</p>
                <p className="text-[11px] text-[#a1a1aa]">WAV · MP3 · M4A · WebM · OGG — up to 50 MB</p>
              </div>
            )}
            {audioFile && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setAudioFile(null); }}
                className="shrink-0 rounded-full p-1 text-[#a1a1aa] hover:text-[#09090b] transition"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* OR divider */}
          <div className="my-3 flex items-center gap-3">
            <div className="flex-1 h-px bg-[#e4e4e7]" />
            <span className="text-[11px] text-[#a1a1aa]">or use browser mic / type</span>
            <div className="flex-1 h-px bg-[#e4e4e7]" />
          </div>

          {/* Live recording + textarea */}
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={recording ? stopRecording : startRecording}
              disabled={!!audioFile}
              className={`shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                audioFile
                  ? 'bg-[#f4f4f5] text-[#a1a1aa] cursor-not-allowed'
                  : recording
                  ? 'border border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                  : 'bg-[#09090b] text-white hover:bg-[#27272a]'
              }`}
            >
              {recording ? <><Square className="h-3 w-3 fill-red-500 text-red-500" /> Stop</> : <><Mic className="h-3.5 w-3.5" /> Record</>}
            </button>
            <div className="relative flex-1">
              <textarea
                value={recording ? transcript + interimText : transcript}
                onChange={(e) => { if (!recording && !audioFile) setTranscript(e.target.value); }}
                readOnly={recording || !!audioFile}
                placeholder={audioFile ? 'Audio file will be transcribed by Groq Whisper…' : 'e.g. "Team lunch at The Coffee Collective, about $38, July 15th, client entertainment"'}
                rows={3}
                className={`w-full resize-none rounded-xl border border-[#e4e4e7] bg-white px-4 py-3 text-sm text-[#09090b] placeholder-[#a1a1aa] outline-none transition focus:border-[#09090b] focus:ring-2 focus:ring-[#09090b]/5 ${
                  (recording || audioFile) ? 'cursor-default select-none opacity-60' : ''
                }`}
              />
              {recording && (
                <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                  <span className="text-[10px] font-medium text-red-600">listening…</span>
                </div>
              )}
            </div>
          </div>

          {(audioFile || (transcript.trim() && !recording)) && (
            <div className="mt-2 flex items-center gap-1 text-[11px] text-[#22c55e]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
              {audioFile ? 'Audio ready — Whisper will transcribe on submit' : 'Transcript ready'}
              {!audioFile && transcript.trim() && (
                <button
                  type="button"
                  onClick={() => { setTranscript(''); finalRef.current = ''; }}
                  className="ml-auto text-[#a1a1aa] hover:text-[#71717a]"
                >Clear</button>
              )}
            </div>
          )}
        </div>

        {/* ── Step 2: Receipt ── */}
        <div className="mt-4 rounded-2xl border border-[#e4e4e7] bg-[#fafafa] p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#e4e4e7] bg-white">
              <Receipt className="h-3.5 w-3.5 text-[#71717a]" />
            </div>
            <div>
              <p className="text-sm font-medium">Receipt Photo <span className="text-red-400 text-[11px] font-normal">required</span></p>
              <p className="text-[11px] text-[#a1a1aa]">The AI reads vendor, total, date, and line items directly from the image</p>
            </div>
          </div>

          {/* Receipt image upload — this is the real second modality, processed by AI */}
          <div>
            <input
              ref={receiptInputRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleReceiptImage(f); }}
            />
            {receiptImageUrl ? (
              <div className="relative">
                <img
                  src={receiptImageUrl}
                  alt="Receipt"
                  className="w-full max-h-64 object-contain rounded-xl border border-[#e4e4e7] bg-white"
                />
                <button
                  type="button"
                  onClick={() => { setReceiptImage(null); setReceiptImageUrl(null); }}
                  className="absolute right-2 top-2 rounded-full bg-white p-1 shadow border border-[#e4e4e7] text-[#52525b] hover:text-[#09090b]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <p className="mt-1 text-[10px] text-[#a1a1aa] text-center">Receipt uploaded — the AI will extract fields when you submit</p>
              </div>
            ) : (
              <div
                onClick={() => receiptInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleReceiptImage(f); }}
                className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-[#d4d4d8] bg-white p-5 hover:border-[#a1a1aa] hover:bg-[#f4f4f5] transition"
              >
                <Image className="h-5 w-5 text-[#a1a1aa]" />
                <p className="text-xs text-[#71717a]">Upload receipt image</p>
                <p className="text-[10px] text-[#a1a1aa]">JPG · PNG · PDF — vendor, total, and date are extracted by AI, editable after review</p>
              </div>
            )}
          </div>
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
            <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
          ) : (
            <><ArrowRight className="h-4 w-4" /> Analyze Expense</>
          )}
        </button>

        {/* ── Pipeline overview ── */}
        <div className="mt-8 grid grid-cols-3 gap-3">
          {[
            { n: '1', label: 'Audio → Intent', desc: 'Whisper transcribes · Groq extracts structured intent' },
            { n: '2', label: 'Receipt Vision', desc: 'AI reads vendor, total, date from the photo' },
            { n: '3', label: 'Reconciliation', desc: 'Groq reasons across both modalities · flags mismatches' },
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
