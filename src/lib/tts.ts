// Browser Web Speech TTS. Different voice per host name (stable hash).
export type SpokenLine = { speaker: string; text: string };

export function parseScriptToLines(script: string): SpokenLine[] {
  const lines: SpokenLine[] = [];
  const re = /^\s*\*?\*?([A-Za-z][A-Za-z0-9 ._'-]{0,40}?)(?:\s*\([^)]*\))?\*?\*?\s*:\s*(.+)$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(script)) !== null) {
    const speaker = m[1].trim();
    let text = m[2].trim();
    text = text.replace(/\[[^\]]*\]/g, "").replace(/\*\*/g, "").replace(/["""]/g, '"');
    if (text) lines.push({ speaker, text });
  }
  return lines;
}

let voicesCache: SpeechSynthesisVoice[] = [];
function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const v = speechSynthesis.getVoices();
    if (v.length) { voicesCache = v; resolve(v); return; }
    speechSynthesis.onvoiceschanged = () => {
      voicesCache = speechSynthesis.getVoices();
      resolve(voicesCache);
    };
  });
}

function pickVoice(speaker: string, voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const en = voices.filter((v) => v.lang.startsWith("en"));
  const pool = en.length ? en : voices;
  if (!pool.length) return undefined;
  let hash = 0;
  for (let i = 0; i < speaker.length; i++) hash = (hash * 31 + speaker.charCodeAt(i)) >>> 0;
  return pool[hash % pool.length];
}

export class ScriptPlayer {
  private lines: SpokenLine[] = [];
  private idx = 0;
  private paused = false;
  private onProgress?: (idx: number, total: number) => void;
  private onEnd?: () => void;
  private voices: SpeechSynthesisVoice[] = [];

  async load(lines: SpokenLine[]) {
    this.lines = lines;
    this.voices = await loadVoices();
  }

  setCallbacks(onProgress: (i: number, t: number) => void, onEnd: () => void) {
    this.onProgress = onProgress;
    this.onEnd = onEnd;
  }

  play(fromIndex = 0) {
    this.stop();
    this.idx = fromIndex;
    this.paused = false;
    this.next();
  }

  private next() {
    if (this.paused) return;
    if (this.idx >= this.lines.length) { this.onEnd?.(); return; }
    const line = this.lines[this.idx];
    const u = new SpeechSynthesisUtterance(line.text);
    const v = pickVoice(line.speaker, this.voices);
    if (v) u.voice = v;
    u.rate = 1;
    u.pitch = 1;
    u.onend = () => { this.idx++; this.onProgress?.(this.idx, this.lines.length); this.next(); };
    u.onerror = () => { this.idx++; this.next(); };
    speechSynthesis.speak(u);
  }

  pause() { this.paused = true; speechSynthesis.cancel(); }
  stop() { this.paused = true; speechSynthesis.cancel(); this.idx = 0; }
  totalLines() { return this.lines.length; }
}
