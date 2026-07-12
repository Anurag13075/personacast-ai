import { Check } from "lucide-react";

export function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: "Input", sub: "Input" },
    { n: 2, label: "Analysis & Generation", sub: "Analysis & Generation" },
    { n: 3, label: "Studio & Output", sub: "Studio & Output" },
  ];
  return (
    <div className="flex items-center gap-4">
      {steps.map((s, i) => {
        const done = step > s.n;
        const active = step === s.n;
        return (
          <div key={s.n} className="flex flex-1 items-center gap-3">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
                done || active ? "bg-blue-600 text-white" : "bg-secondary text-muted-foreground"
              }`}
            >
              {done ? <Check className="h-4 w-4" /> : s.n}
            </div>
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">Step {s.n}</div>
              <div className="truncate text-sm font-medium text-ink">{s.label}</div>
            </div>
            {i < steps.length - 1 && <div className={`h-px flex-1 ${step > s.n ? "bg-blue-400" : "bg-border"}`} />}
          </div>
        );
      })}
    </div>
  );
}
