import { X, Plus } from "lucide-react";
import type { Host } from "@/lib/store";

export function HostsEditor({ hosts, onChange }: { hosts: Host[]; onChange: (h: Host[]) => void }) {
  const update = (i: number, patch: Partial<Host>) => {
    const next = [...hosts];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  return (
    <div className="space-y-2">
      {hosts.map((h, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            className="w-32 rounded-md border border-border bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Name"
            value={h.name}
            onChange={(e) => update(i, { name: e.target.value })}
          />
          <input
            className="flex-1 rounded-md border border-border bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Role (e.g. Host, Expert)"
            value={h.role}
            onChange={(e) => update(i, { role: e.target.value })}
          />
          {hosts.length > 1 && (
            <button
              onClick={() => onChange(hosts.filter((_, idx) => idx !== i))}
              className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
      {hosts.length < 5 && (
        <button
          onClick={() => onChange([...hosts, { name: "", role: "Guest" }])}
          className="inline-flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground hover:bg-accent"
        >
          <Plus className="h-3.5 w-3.5" /> Add host
        </button>
      )}
    </div>
  );
}
