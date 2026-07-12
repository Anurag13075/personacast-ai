import { Link } from "@tanstack/react-router";
import { Plus, Library, Settings, MessageSquare } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useStore } from "@/lib/store";

export function Sidebar({ onNew }: { onNew: () => void }) {
  const { projects, currentId, setCurrent } = useStore();
  return (
    <aside className="flex w-[260px] shrink-0 flex-col border-r border-border bg-white">
      <div className="border-b border-border px-5 py-5">
        <Link to="/"><Logo /></Link>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <button
          onClick={onNew}
          className="mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink hover:bg-accent"
        >
          <Plus className="h-4 w-4" /> New Project
        </button>
        <div className="mb-4 flex w-full items-center gap-3 rounded-lg bg-blue-50 px-3 py-2.5 text-sm font-medium text-blue-700">
          <Library className="h-4 w-4" /> Library & History
        </div>
        <Link to="/chat" className="mb-4 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink hover:bg-accent">
          <MessageSquare className="h-4 w-4" /> Chat with Heva
        </Link>

        <p className="mt-2 px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Recent Items</p>
        <div className="mt-2 space-y-1">
          {projects.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">No projects yet. Click "New Project".</p>
          )}
          {projects.map((p) => {
            const kinds = new Set(p.sources.map((s) => s.kind));
            const meta = [
              p.durationSec ? `${Math.floor(p.durationSec / 60)}m ${p.durationSec % 60}s` : null,
              [p.script && "Transcript", kinds.size && "audio"].filter(Boolean).join(" & "),
            ].filter(Boolean).join(" · ");
            return (
              <button
                key={p.id}
                onClick={() => setCurrent(p.id)}
                className={`block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-accent ${
                  currentId === p.id ? "bg-accent" : ""
                }`}
              >
                <div className="truncate font-medium text-ink">{p.title}</div>
                <div className="truncate text-[11px] text-muted-foreground">{meta || "Draft"}</div>
              </button>
            );
          })}
        </div>
      </div>
      <div className="border-t border-border p-4">
        <div className="mb-3 rounded-xl border border-border bg-white p-4">
          <p className="text-xs font-medium">Credits</p>
          <p className="mt-1 text-xs text-muted-foreground">120 / 200 mins used</p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div className="h-full w-3/5 rounded-full bg-blue-500" />
          </div>
          <button className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg bg-blue-50 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100">
            ✦ Upgrade Plan
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500" />
          </div>
          <Settings className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </aside>
  );
}
