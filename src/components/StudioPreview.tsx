// Static mini-preview of the studio for the landing hero.
import { Check, Plus, Library, Bell, Play, Upload } from "lucide-react";

export function StudioPreview() {
  return (
    <div className="grid grid-cols-[140px_1fr_1fr] gap-2 rounded-xl bg-[#0b0e1c] p-2 text-[10px] text-white/80">
      {/* Sidebar */}
      <div className="rounded-lg bg-[#0f1327] p-2">
        <div className="mb-3 flex items-center gap-1 text-white">
          <div className="h-4 w-4 rounded bg-gradient-to-br from-blue-500 to-purple-500" />
          <span className="text-xs font-semibold">Heva AI</span>
        </div>
        <div className="mb-1 flex items-center gap-1 rounded p-1 text-white/60"><Plus className="h-3 w-3" /> New Project</div>
        <div className="mb-3 flex items-center gap-1 rounded bg-blue-500/20 p-1 text-blue-300"><Library className="h-3 w-3" /> Library & History</div>
        <p className="mt-2 text-[9px] uppercase text-white/40">Recent</p>
        <div className="mt-1 space-y-1">
          <div><div>The Quantum Leap · EP 4</div><div className="text-[8px] text-white/40">4m 32s · Transcript & audio</div></div>
          <div><div>Biochemistry 101 Notes</div><div className="text-[8px] text-white/40">2m 15s · Transcript</div></div>
          <div><div>Deep Learning Basics</div><div className="text-[8px] text-white/40">3m 42s · Audio</div></div>
        </div>
      </div>
      {/* Middle */}
      <div className="rounded-lg bg-[#0f1327] p-2">
        <div className="flex items-center justify-between text-white/70">
          <span>Echo: PDF-to-Podcast Engine</span>
          <Bell className="h-3 w-3" />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <StepDot n="1" done label="Input" />
          <div className="h-px flex-1 bg-white/10" />
          <StepDot n="2" done label="Analysis" />
          <div className="h-px flex-1 bg-white/10" />
          <StepDot n="3" active label="Studio" />
        </div>
        <div className="mt-2 rounded-md border border-white/10 p-2">
          <p className="text-white">The Quantum Leap · EP 4</p>
          <p className="text-[9px] text-white/50">Input Sources</p>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <div className="rounded bg-white/5 p-1">
              <div className="text-[9px]">PDF · research-paper.pdf</div>
              <div className="mt-1 h-16 rounded bg-white/10" />
            </div>
            <div className="rounded bg-white/5 p-1">
              <div className="text-[9px]">Image · graph-38.png</div>
              <div className="mt-1 h-16 rounded bg-gradient-to-br from-blue-500/40 to-orange-400/40" />
            </div>
          </div>
          <div className="mt-2 flex items-center justify-center gap-1 rounded border border-dashed border-white/15 py-1 text-white/40">
            <Upload className="h-3 w-3" /> Add more files
          </div>
        </div>
      </div>
      {/* Right */}
      <div className="rounded-lg bg-[#0f1327] p-2">
        <div className="flex items-center justify-between">
          <span className="text-white/70">Studio</span>
          <span className="rounded border border-white/10 px-1 py-0.5 text-[9px]">Export</span>
        </div>
        <div className="mt-2 rounded-md border border-white/10 p-2">
          <p className="text-white">Structured Output</p>
          <p className="text-[9px] text-white/50">Script</p>
          <div className="mt-1 space-y-1 text-[9px]">
            <p><b className="text-white">Alex:</b> "...the results in Graph 38 <span className="text-blue-400">link to</span> are truly significance."</p>
            <p><b className="text-white">Dr. Ben:</b> Absolutely. <span className="text-blue-400">[cite: 8]</span>, the sharp resistance drop at <span className="text-blue-400">[cite: 285 K]</span>.</p>
            <p><b className="text-white">Alex:</b> What results in Graph 38 <span className="text-blue-400">link to</span>?</p>
          </div>
        </div>
        <div className="mt-2 rounded-md border border-white/10 p-2">
          <p className="text-white">Audio Controls</p>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white"><Play className="h-3 w-3" /></div>
            <div className="flex-1">
              <div className="flex h-4 items-end gap-[1px]">
                {Array.from({ length: 40 }).map((_, i) => (
                  <div key={i} className="w-[2px] bg-blue-400/60" style={{ height: `${20 + Math.abs(Math.sin(i)) * 80}%` }} />
                ))}
              </div>
              <div className="mt-1 text-[9px] text-white/50">01:12 / 04:32</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepDot({ n, done, active, label }: { n: string; done?: boolean; active?: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className={`flex h-4 w-4 items-center justify-center rounded-full text-[8px] ${done ? "bg-blue-500 text-white" : active ? "bg-blue-500 text-white" : "bg-white/10 text-white/60"}`}>
        {done ? <Check className="h-2.5 w-2.5" /> : n}
      </div>
      <span className="text-[9px] text-white/70">{label}</span>
    </div>
  );
}
