/** Short-lived visual effects: sprite strips, floating text, flying coins, screen shake. */
import type { Draw, FontKey } from '../engine/draw';

export interface Fx {
  key: string;
  x: number;
  y: number;
  t: number;
  fps: number;
  vx: number;
  vy: number;
  gravity: number;
  flip: boolean;
  alpha: number;
  /** Loop for `life` seconds instead of playing once. */
  life?: number;
  fadeOut?: boolean;
}

export interface FloatText {
  text: string;
  x: number;
  y: number;
  t: number;
  life: number;
  color: string;
  font: FontKey;
  vy: number;
}

export class FxSystem {
  back: Fx[] = [];
  front: Fx[] = [];
  texts: FloatText[] = [];

  constructor(private frameCount: (key: string) => number) {}

  add(key: string, x: number, y: number, o: Partial<Omit<Fx, 'key' | 'x' | 'y' | 't'>> & { behind?: boolean } = {}): Fx {
    const fx: Fx = { key, x, y, t: 0, fps: o.fps ?? 0, vx: o.vx ?? 0, vy: o.vy ?? 0, gravity: o.gravity ?? 0, flip: o.flip ?? false, alpha: o.alpha ?? 1, life: o.life, fadeOut: o.fadeOut };
    (o.behind ? this.back : this.front).push(fx);
    if (this.front.length > 220) this.front.shift();
    if (this.back.length > 120) this.back.shift();
    return fx;
  }

  text(text: string, x: number, y: number, o: Partial<Omit<FloatText, 'text' | 'x' | 'y' | 't'>> = {}): void {
    this.texts.push({ text, x, y, t: 0, life: o.life ?? 0.7, color: o.color ?? '#fff8ec', font: o.font ?? 'small', vy: o.vy ?? -18 });
    if (this.texts.length > 40) this.texts.shift();
  }

  update(dt: number, defaultFps: (key: string) => number): void {
    for (const list of [this.back, this.front]) {
      for (const f of list) {
        f.t += dt;
        f.vy += f.gravity * dt;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        if (!f.fps) f.fps = defaultFps(f.key);
      }
    }
    const alive = (f: Fx) => (f.life !== undefined ? f.t < f.life : Math.floor(f.t * f.fps) < this.frameCount(f.key));
    this.back = this.back.filter(alive);
    this.front = this.front.filter(alive);
    for (const t of this.texts) {
      t.t += dt;
      t.y += t.vy * dt;
      t.vy *= 1 - Math.min(1, dt * 3);
    }
    this.texts = this.texts.filter((t) => t.t < t.life);
  }

  private drawList(d: Draw, list: Fx[], ox: number, oy: number): void {
    for (const f of list) {
      const n = this.frameCount(f.key);
      let i = Math.floor(f.t * f.fps);
      if (f.life !== undefined) i %= n;
      let a = f.alpha;
      if (f.fadeOut && f.life) a *= Math.max(0, 1 - f.t / f.life);
      d.strip(f.key, i, f.x + ox, f.y + oy, { flip: f.flip, alpha: a });
    }
  }

  drawBack(d: Draw, ox = 0, oy = 0): void {
    this.drawList(d, this.back, ox, oy);
  }

  drawFront(d: Draw, ox = 0, oy = 0): void {
    this.drawList(d, this.front, ox, oy);
    for (const t of this.texts) {
      const p = t.t / t.life;
      const pop = t.t < 0.08 ? -1 : 0;
      d.text(t.text, t.x + ox, t.y + oy + pop, { font: t.font, color: t.color, align: 'center', alpha: p > 0.7 ? (1 - p) / 0.3 : 1 });
    }
  }
}

/** Decaying screen shake. Amplitude in art pixels; disabled by reduced motion. */
export class Shake {
  private amp = 0;
  private time = 0;
  private dur = 0;
  enabled = true;

  add(amp: number, dur: number): void {
    if (!this.enabled) return;
    if (amp >= this.amp * (1 - this.time / Math.max(this.dur, 1e-6))) {
      this.amp = amp;
      this.dur = dur;
      this.time = 0;
    }
  }

  update(dt: number): void {
    this.time += dt;
    if (this.time >= this.dur) this.amp = 0;
  }

  offset(t: number): [number, number] {
    if (this.amp <= 0) return [0, 0];
    const k = this.amp * (1 - this.time / this.dur);
    return [Math.round(Math.sin(t * 91) * k), Math.round(Math.cos(t * 77) * k * 0.6)];
  }
}
