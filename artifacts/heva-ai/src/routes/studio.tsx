import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, ChevronDown, ChevronUp, Download, Edit3, FileText, Image as ImageIcon, Loader2, Pencil, Plus, RefreshCw, Share2, Sparkles, Upload, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Sidebar } from "@/components/Sidebar";
import { Stepper } from "@/components/Stepper";
import { HostsEditor } from "@/components/HostsEditor";
import { AudioPlayer } from "@/components/AudioPlayer";
import { useStore, type Project } from "@/lib/store";
import { extractPdfText, fileToDataUrl } from "@/lib/pdf";

export const Route = createFileRoute("/studio")({
  component: Studio,
  head: () => ({ meta: [{ title: "Studio · Heva AI" }] }),
});

function Studio() {
  const { projects, currentId, createProject, setCurrent, updateProject } = useStore();
  const current = useMemo(() => projects.find((p) => p.id === currentId) ?? null, [projects, currentId]);

  useEffect(() => {
    if (!currentId && projects.length === 0) createProject("The Quantum Leap · EP 4");
    else if (!currentId && projects.length) setCurrent(projects[0].id);
  }, [currentId, projects.length]);

  const step: 1 | 2 | 3 = !current || current.sources.length === 0 ? 1 : !current.script ? 2 : 3;

  return (
    <div className="flex h-screen bg-[#fafbfc]">
      <Sidebar onNew={() => createProject(`New Project ${projects.length + 1}`)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <div className="flex items-center justify-between border-b border-border bg-white px-8 py-4">
          <h1 className="text-lg font-semibold">Echo: PDF-to-Podcast Engine</h1>
          <div className="flex items-center gap-4">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-400 to-purple-500" />
          </div>
        </div>
        <div className="border-b border-border bg-white px-8 py-5">
          <Stepper step={step} />
        </div>

        {current && <StudioBody project={current} onPatch={(p) => updateProject(current.id, p)} />}
      </div>
    </div>
  );
}

function StudioBody({ project, onPatch }: { project: Project; onPatch: (p: Partial<Project>) => void }) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [expandSources, setExpandSources] = useState(true);
  const [genLoading, setGenLoading] = useState(false);
  const [thumbLoading, setThumbLoading] = useState(false);
  const [userPrompt, setUserPrompt] = useState("");
  const [showPrompt, setShowPrompt] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList) => {
    const arr = Array.from(files);
    const newSources = [...project.sources];
    for (const f of arr) {
      const id = crypto.randomUUID();
      if (f.type === "application/pdf") {
        try {
          toast.loading(`Extracting ${f.name}...`, { id });
          const { text, pages } = await extractPdfText(f);
          newSources.push({ id, name: f.name, kind: "pdf", pages, text });
          toast.success(`${f.name} · ${pages} pages`, { id });
        } catch (e: any) {
          toast.error(`Failed: ${f.name}`, { id });
        }
      } else if (f.type.startsWith("image/")) {
        try {
          const dataUrl = await fileToDataUrl(f);
          newSources.push({ id, name: f.name, kind: "image", dataUrl });
        } catch {}
      }
    }
    onPatch({ sources: newSources });
  };

  const generate = async () => {
    if (!project.sources.length) { toast.error("Add at least one source"); return; }
    setGenLoading(true);
    try {
      const content = project.sources
        .map((s) => (s.kind === "pdf" ? `--- ${s.name} ---\n${s.text ?? ""}` : `--- image: ${s.name} ---`))
        .join("\n\n");
      const res = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hosts: project.hosts.filter((h) => h.name.trim()),
          style: project.style,
          content,
          userPrompt,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { script } = await res.json();
      onPatch({ script });
      toast.success("Script generated");
      // fire off thumbnails
      generateThumbs(script);
    } catch (e: any) {
      toast.error(`Generation failed: ${e.message}`);
    } finally {
      setGenLoading(false);
    }
  };

  const generateThumbs = async (scriptOverride?: string) => {
    setThumbLoading(true);
    try {
      const topic = project.title + " — " + (scriptOverride ?? project.script).slice(0, 300);
      const styles = ["Cosmic cinematic", "Abstract quantum", "Minimal science", "Futuristic tech"];
      const res = await fetch("/api/generate-thumbnails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, styles }),
      });
      const data = await res.json();
      const urls = (data.results as any[]).map((r) => r.url).filter(Boolean) as string[];
      if (urls.length) onPatch({ thumbnails: urls, selectedThumbnail: 0 });
      else toast.error("No images returned");
    } catch (e: any) {
      toast.error(`Thumbnails failed: ${e.message}`);
    } finally {
      setThumbLoading(false);
    }
  };

  const exportAll = () => {
    const blob = new Blob([`# ${project.title}\n\n${project.script}`], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${project.title}.md`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 overflow-y-auto px-8 py-6">
      {/* Title */}
      <div className="mb-6 flex items-center gap-2">
        {editingTitle ? (
          <input
            autoFocus
            className="rounded-md border border-border bg-white px-3 py-1.5 text-2xl font-semibold focus:border-blue-500 focus:outline-none"
            value={project.title}
            onChange={(e) => onPatch({ title: e.target.value })}
            onBlur={() => setEditingTitle(false)}
            onKeyDown={(e) => e.key === "Enter" && setEditingTitle(false)}
          />
        ) : (
          <>
            <h2 className="text-2xl font-semibold">{project.title}</h2>
            <button onClick={() => setEditingTitle(true)} className="rounded p-1 text-muted-foreground hover:bg-accent">
              <Pencil className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* LEFT: Sources + hosts + prompt + thumbnails */}
        <div className="space-y-6">
          {/* Sources card */}
          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <button className="mb-4 flex w-full items-center justify-between" onClick={() => setExpandSources(!expandSources)}>
              <h3 className="text-base font-semibold">Input Sources</h3>
              {expandSources ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {expandSources && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  {project.sources.map((s) => (
                    <div key={s.id} className="rounded-xl border border-border bg-white p-3">
                      <div className="mb-2 flex items-center gap-2 text-xs font-medium">
                        {s.kind === "pdf" ? <FileText className="h-4 w-4 text-red-500" /> : <ImageIcon className="h-4 w-4 text-blue-500" />}
                        <span className="uppercase text-muted-foreground">{s.kind}</span>
                      </div>
                      <p className="truncate text-sm font-medium">{s.name}</p>
                      <div className="mt-3 flex h-32 items-center justify-center overflow-hidden rounded-lg bg-secondary">
                        {s.kind === "image" && s.dataUrl ? (
                          <img src={s.dataUrl} alt={s.name} className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <FileText className="h-12 w-12 text-muted-foreground/40" />
                        )}
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">{s.pages ? `${s.pages} pages` : s.kind === "image" ? "Image" : ""}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="mt-4 flex w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border py-6 text-muted-foreground hover:border-blue-400 hover:bg-blue-50/50"
                >
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Plus className="h-4 w-4" /> Add more files
                  </div>
                  <p className="text-xs">PDF, images, or drag and drop</p>
                </button>
                <input
                  ref={fileRef} type="file" multiple hidden
                  accept="application/pdf,image/*"
                  onChange={(e) => e.target.files && handleFiles(e.target.files)}
                />
              </>
            )}
          </div>

          {/* Hosts + Prompt */}
          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <h3 className="mb-3 text-base font-semibold">Podcast Hosts</h3>
            <p className="mb-3 text-xs text-muted-foreground">Customize your speakers. Names appear exactly in the script.</p>
            <HostsEditor hosts={project.hosts} onChange={(hosts) => onPatch({ hosts })} />

            <button
              onClick={() => setShowPrompt(!showPrompt)}
              className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              <MessageSquare className="h-4 w-4" /> {showPrompt ? "Hide" : "Add"} custom direction
            </button>
            {showPrompt && (
              <textarea
                className="mt-3 w-full rounded-lg border border-border bg-white p-3 text-sm focus:border-blue-500 focus:outline-none"
                rows={3}
                placeholder="Tell Heva how the podcast should feel. e.g. 'Make it a 3-minute debate with lots of humor'"
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
              />
            )}

            <button
              onClick={generate}
              disabled={genLoading}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-500 disabled:opacity-60"
            >
              {genLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {project.script ? "Regenerate Podcast" : "Generate Podcast"}
            </button>
          </div>

          {/* Thumbnails */}
          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold">AI Generated Images <span className="text-xs font-normal text-muted-foreground">(Choose your thumbnail)</span></h3>
              <div className="flex gap-2">
                <button
                  disabled={thumbLoading || !project.script}
                  onClick={() => generateThumbs()}
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-50"
                >
                  {thumbLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Regenerate
                </button>
              </div>
            </div>
            {project.thumbnails.length === 0 ? (
              <div className="flex h-40 items-center justify-center rounded-xl bg-secondary text-sm text-muted-foreground">
                {thumbLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {thumbLoading ? "Generating thumbnails..." : "Generate a script first to create thumbnails"}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {project.thumbnails.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => onPatch({ selectedThumbnail: i })}
                    className={`group relative aspect-square overflow-hidden rounded-xl border-2 transition ${
                      project.selectedThumbnail === i ? "border-blue-500 ring-2 ring-blue-200" : "border-transparent"
                    }`}
                  >
                    <img src={url} alt={`Thumb ${i}`} className="h-full w-full object-cover" loading="lazy" />
                    {project.selectedThumbnail === i && (
                      <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white">✓</div>
                    )}
                  </button>
                ))}
              </div>
            )}
            <p className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
              💡 Tip: These images are AI-generated from your content. Click regenerate for new styles.
            </p>
          </div>
        </div>

        {/* RIGHT: Studio output */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Studio</h3>
              <div className="flex gap-2">
                <button onClick={exportAll} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-accent">
                  <Download className="h-4 w-4" /> Export <ChevronDown className="h-3 w-3" />
                </button>
              </div>
            </div>
            <div className="rounded-xl border border-border p-5">
              <h4 className="text-sm font-semibold">Structured Output</h4>
              <p className="mb-3 text-xs text-muted-foreground">Script</p>
              {project.script ? (
                <ScriptView script={project.script} onChange={(s) => onPatch({ script: s })} />
              ) : (
                <div className="flex h-64 items-center justify-center rounded-lg bg-secondary/50 text-sm text-muted-foreground">
                  Upload sources and click "Generate Podcast" to see the script here
                </div>
              )}
              <div className="mt-3 flex justify-end">
                <button className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-accent">
                  <Edit3 className="h-3 w-3" /> Edits Tracked
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold">Audio Controls</h3>
            {project.script ? (
              <AudioPlayer script={project.script} onDuration={(d) => onPatch({ durationSec: d })} />
            ) : (
              <p className="text-sm text-muted-foreground">Generate a script to enable audio playback.</p>
            )}
          </div>

          {project.script && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StudioTile icon="📝" title="Show Notes" sub="Auto generated" />
              <StudioTile icon="≡" title="Chapters" sub="8 chapters" />
              <StudioTile icon="❝" title="Quotes" sub="12 highlights" />
              <StudioTile icon="⤴" title="Social Kit" sub="Ready to share" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StudioTile({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <button className="rounded-xl border border-border bg-white p-4 text-left transition hover:border-blue-400 hover:shadow-sm">
      <div className="text-lg">{icon}</div>
      <div className="mt-2 text-sm font-medium">{title}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </button>
  );
}

function ScriptView({ script, onChange }: { script: string; onChange: (s: string) => void }) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <div>
        <textarea
          className="h-96 w-full rounded-lg border border-border p-3 text-sm font-mono focus:border-blue-500 focus:outline-none"
          value={script}
          onChange={(e) => onChange(e.target.value)}
        />
        <button onClick={() => setEditing(false)} className="mt-2 rounded-md bg-blue-600 px-3 py-1.5 text-xs text-white">Done</button>
      </div>
    );
  }
  const lines = script.split(/\n+/).filter(Boolean);
  return (
    <div className="max-h-96 space-y-3 overflow-y-auto pr-2 text-sm leading-relaxed">
      {lines.map((line, i) => {
        const m = line.match(/^\s*\*?\*?([A-Za-z][A-Za-z0-9 ._'-]{0,40}?)(?:\s*\([^)]*\))?\*?\*?\s*:\s*(.+)$/);
        if (m) {
          const rest = m[2].split(/(\[[^\]]+\])/g).map((chunk, j) =>
            chunk.startsWith("[") ? <span key={j} className="text-blue-600">{chunk}</span> : <span key={j}>{chunk}</span>
          );
          return (
            <p key={i}><b className="text-ink">{m[1]}:</b> {rest}</p>
          );
        }
        return <p key={i}>{line}</p>;
      })}
      <button onClick={() => setEditing(true)} className="mt-2 text-xs text-blue-600 hover:underline">Edit script</button>
    </div>
  );
}
