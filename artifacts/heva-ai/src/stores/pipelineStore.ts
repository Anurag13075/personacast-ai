import { create } from 'zustand';

// ── Shared types (mirror groq-pipeline.ts) ──────────────────────────────────
export type AudioResult = {
  transcript: string;
  claimed_purpose: string | null;
  claimed_amount: number | null;
  claimed_counterparty: string | null;
  claimed_date: string | null;
  confidence: number;
};

export type ReceiptResult = {
  vendor: string;
  line_items: { description: string; amount: number }[];
  total: number;
  date: string | null;
  category_guess: string;
  field_confidence: Record<string, number>;
};

export type ReconciledExpense = {
  category: string;
  amount: number;
  vendor: string;
  date: string;
  business_justification: string;
  flags: { field: string; reason: string; severity: string }[];
  overall_confidence: number;
  reasoning?: string;
};

// ── SSE event union ──────────────────────────────────────────────────────────
export type SSEEvent =
  | { type: 'created'; id: string }
  | { type: 'time_estimate'; seconds: number }
  | { type: 'step1_done'; audio_result: AudioResult }
  | { type: 'step2_done'; receipt_result: ReceiptResult }
  | { type: 'step3_running' }
  | { type: 'done'; id: string; reconciled: ReconciledExpense }
  | { type: 'error'; message: string };

// ── Store ────────────────────────────────────────────────────────────────────
type PipelineStore = {
  runId: string | null;
  status: string;
  audioResult: AudioResult | null;
  receiptResult: ReceiptResult | null;
  reconciled: ReconciledExpense | null;
  errorMessage: string | null;
  timeEstimate: number | null;
  startedAt: number | null;
  pushEvent: (event: SSEEvent) => void;
  reset: () => void;
};

const initial = {
  runId: null,
  status: 'idle',
  audioResult: null,
  receiptResult: null,
  reconciled: null,
  errorMessage: null,
  timeEstimate: null,
  startedAt: null,
};

export const usePipelineStore = create<PipelineStore>((set) => ({
  ...initial,

  pushEvent(event) {
    switch (event.type) {
      case 'created':
        set({ runId: event.id, status: 'step1', startedAt: Date.now() });
        break;
      case 'time_estimate':
        set({ timeEstimate: event.seconds });
        break;
      case 'step1_done':
        set({ audioResult: event.audio_result });
        break;
      case 'step2_done':
        set({ receiptResult: event.receipt_result });
        break;
      case 'step3_running':
        set({ status: 'step3' });
        break;
      case 'done':
        set({ reconciled: event.reconciled, status: 'done' });
        break;
      case 'error':
        set({ errorMessage: event.message, status: 'error' });
        break;
    }
  },

  reset() {
    set(initial);
  },
}));
