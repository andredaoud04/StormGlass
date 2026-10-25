/** Sound effects through Web Audio. Files come from the manifest's `sounds` map. */
export class Audio {
  private ctx: AudioContext | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private files: Record<string, string> = {};
  private base = './assets/';
  private lastPlay = new Map<string, number>();
  muted = false;
  volume = 0.7;

  configure(files: Record<string, string>, base = './assets/'): void {
    this.files = files;
    this.base = base;
  }

  /** Must run inside a user gesture on iOS. Safe to call repeatedly. */
  unlock(): void {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      void this.loadAll();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private async loadAll(): Promise<void> {
    const ctx = this.ctx;
    if (!ctx) return;
    await Promise.all(
      Object.entries(this.files).map(async ([name, file]) => {
        try {
          const res = await fetch(this.base + file);
          const buf = await ctx.decodeAudioData(await res.arrayBuffer());
          this.buffers.set(name, buf);
        } catch {
          // A missing sound is never fatal.
        }
      }),
    );
  }

  /** Play a sound; `minGapMs` stops a flood of identical sounds in one frame. */
  play(name: string, opts: { vol?: number; rate?: number; jitter?: number; minGapMs?: number } = {}): void {
    if (this.muted || !this.ctx) return;
    const buf = this.buffers.get(name);
    if (!buf) return;
    const now = performance.now();
    const gap = opts.minGapMs ?? 30;
    if (now - (this.lastPlay.get(name) ?? -1e9) < gap) return;
    this.lastPlay.set(name, now);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const jitter = opts.jitter ?? 0.06;
    src.playbackRate.value = (opts.rate ?? 1) * (1 + (Math.random() * 2 - 1) * jitter);
    const g = this.ctx.createGain();
    g.gain.value = this.volume * (opts.vol ?? 1);
    src.connect(g).connect(this.ctx.destination);
    src.start();
  }
}
