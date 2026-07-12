import { useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2, RotateCcw } from "lucide-react";
import { ScriptPlayer, parseScriptToLines } from "@/lib/tts";

export function AudioPlayer({ script, onDuration }: { script: string; onDuration?: (s: number) => void }) {
  const playerRef = useRef<ScriptPlayer | null>(null);
  // Keep onDuration in a ref so it never triggers the effect
  const onDurationRef = useRef(onDuration);
  useEffect(() => { onDurationRef.current = onDuration; }, [onDuration]);

  const [playing, setPlaying] = useState(false);
  const [idx, setIdx] = useState(0);
  const [total, setTotal] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [approxTotal, setApproxTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initPlayer = async () => {
      try {
        const lines = parseScriptToLines(script);
        const words = script.split(/\s+/).length;
        const est = Math.max(30, Math.round((words / 150) * 60));
        setApproxTotal(est);
        onDurationRef.current?.(est);
        const p = new ScriptPlayer();
        playerRef.current = p;
        await p.load(lines);
        setTotal(lines.length);
        setError(null);
        p.setCallbacks(
          (i, t) => {
            setIdx(i);
            setElapsed(Math.round((i / Math.max(1, t)) * est));
          },
          () => {
            setPlaying(false);
            setIdx(0);
            setElapsed(0);
          },
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        console.error("Audio player initialization error:", message);
      }
    };

    initPlayer();
    return () => { playerRef.current?.stop(); };
  }, [script]); // onDuration intentionally excluded — accessed via ref

  const toggle = () => {
    if (!playerRef.current) return;
    if (playing) {
      playerRef.current.pause();
      setPlaying(false);
    } else {
      playerRef.current.play(idx);
      setPlaying(true);
    }
  };

  const reset = () => {
    playerRef.current?.stop();
    setIdx(0);
    setElapsed(0);
    setPlaying(false);
  };

  const pct = total ? (idx / total) * 100 : 0;

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
        <p className="font-medium">Audio player error:</p>
        <p>{error}</p>
        <p className="mt-2 text-xs text-red-600">
          This may be due to missing or invalid API keys. Check your environment configuration.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-white shadow-md shadow-blue-500/30 hover:bg-blue-500"
        >
          {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 pl-0.5" />}
        </button>
        <div className="flex-1">
          <div className="flex h-8 items-end gap-[2px]">
            {Array.from({ length: 60 }).map((_, i) => {
              const active = (i / 60) * 100 <= pct;
              return (
                <div
                  key={i}
                  className={`w-[3px] rounded ${active ? "bg-blue-500" : "bg-blue-100"}`}
                  style={{ height: `${25 + Math.abs(Math.sin(i * 0.7)) * 75}%` }}
                />
              );
            })}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>{fmt(elapsed)} / {fmt(approxTotal)}</span>
            <div className="flex items-center gap-2">
              <Volume2 className="h-3.5 w-3.5" />
              <button onClick={reset} className="rounded p-1 hover:bg-accent">
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <span className="rounded border border-border px-2 py-0.5">1x</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function fmt(s: number) {
  const m = Math.floor(s / 60),
    r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}
