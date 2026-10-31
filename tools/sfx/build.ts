/**
 * Synthesizes every sound effect into public/assets/sfx/*.wav (16-bit mono, 22050 Hz) and
 * registers them in the manifest. Original chiptune-style sounds; deterministic output.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRng, nextFloat } from '../../src/sim/rng';

const RATE = 22050;
const ROOT = join(import.meta.dirname, '../..');
const OUT = join(ROOT, 'public/assets/sfx');

type Wave = 'sine' | 'square' | 'tri' | 'saw';
const rng = createRng(99);
const noise = () => nextFloat(rng) * 2 - 1;

function buf(sec: number): Float32Array {
  return new Float32Array(Math.ceil(sec * RATE));
}

function osc(wave: Wave, phase: number): number {
  const p = phase - Math.floor(phase);
  if (wave === 'sine') return Math.sin(p * Math.PI * 2);
  if (wave === 'square') return p < 0.5 ? 1 : -1;
  if (wave === 'tri') return 1 - 4 * Math.abs(p - 0.5);
  return 2 * p - 1;
}

/** Tone with an exponential pitch sweep and attack/decay envelope, mixed into `out`. */
function tone(out: Float32Array, start: number, dur: number, f0: number, f1: number, wave: Wave, vol: number, attack = 0.005): void {
  const n = Math.floor(dur * RATE);
  const s0 = Math.floor(start * RATE);
  let phase = 0;
  for (let i = 0; i < n && s0 + i < out.length; i++) {
    const t = i / n;
    const f = f0 * Math.pow(f1 / f0, t);
    phase += f / RATE;
    const env = Math.min(1, i / (attack * RATE + 1)) * Math.pow(1 - t, 1.6);
    out[s0 + i] += osc(wave, phase) * env * vol;
  }
}

/** Filtered noise burst; `cutoff` in Hz falls to `cutoffEnd`. */
function hiss(out: Float32Array, start: number, dur: number, vol: number, cutoff: number, cutoffEnd = cutoff, curve = 1.5): void {
  const n = Math.floor(dur * RATE);
  const s0 = Math.floor(start * RATE);
  let y = 0;
  for (let i = 0; i < n && s0 + i < out.length; i++) {
    const t = i / n;
    const c = cutoff * Math.pow(cutoffEnd / cutoff, t);
    const a = Math.min(1, (2 * Math.PI * c) / RATE);
    y += a * (noise() - y);
    out[s0 + i] += y * vol * Math.pow(1 - t, curve) * Math.min(1, i / 40);
  }
}

function wav(samples: Float32Array): Buffer {
  let peak = 0;
  for (const v of samples) peak = Math.max(peak, Math.abs(v));
  const g = peak > 0.95 ? 0.95 / peak : 1;
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((v, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v * g)) * 32767), i * 2));
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVEfmt ', 8);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(RATE, 24);
  h.writeUInt32LE(RATE * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

const NOTE = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

const SOUNDS: Record<string, () => Float32Array> = {
  click: () => { const b = buf(0.05); tone(b, 0, 0.04, 1100, 900, 'square', 0.25); return b; },
  tab: () => { const b = buf(0.07); tone(b, 0, 0.06, 620, 880, 'tri', 0.4); return b; },
  deploy: () => { const b = buf(0.16); tone(b, 0, 0.12, 260, 620, 'square', 0.22); hiss(b, 0, 0.08, 0.5, 900, 200); tone(b, 0, 0.1, 110, 60, 'sine', 0.6); return b; },
  swing: () => { const b = buf(0.12); hiss(b, 0, 0.11, 0.6, 1200, 4000, 1); return b; },
  swing_heavy: () => { const b = buf(0.2); hiss(b, 0, 0.19, 0.8, 500, 2200, 1); return b; },
  sling: () => { const b = buf(0.12); tone(b, 0, 0.1, 1400, 700, 'tri', 0.25); hiss(b, 0, 0.06, 0.3, 2500, 1500); return b; },
  hit: () => { const b = buf(0.12); tone(b, 0, 0.09, 190, 60, 'sine', 0.9); hiss(b, 0, 0.05, 0.7, 2400, 600); return b; },
  hit_heavy: () => { const b = buf(0.22); tone(b, 0, 0.2, 130, 38, 'sine', 1); hiss(b, 0, 0.12, 0.9, 1600, 250); tone(b, 0, 0.05, 90, 70, 'square', 0.3); return b; },
  hit_ranged: () => { const b = buf(0.08); tone(b, 0, 0.04, 900, 500, 'square', 0.25); hiss(b, 0, 0.04, 0.5, 3000, 800); return b; },
  death: () => { const b = buf(0.24); tone(b, 0, 0.22, 560, 140, 'square', 0.25); hiss(b, 0.02, 0.1, 0.3, 1800, 400); return b; },
  death_ally: () => { const b = buf(0.24); tone(b, 0, 0.22, 340, 95, 'tri', 0.45); return b; },
  base_hit: () => { const b = buf(0.2); hiss(b, 0, 0.16, 0.9, 900, 180); tone(b, 0, 0.14, 95, 50, 'sine', 0.8); return b; },
  boom: () => { const b = buf(0.9); hiss(b, 0, 0.85, 1, 1400, 90, 1.2); tone(b, 0, 0.6, 70, 28, 'sine', 0.9); return b; },
  coin: () => { const b = buf(0.18); tone(b, 0, 0.06, 1320, 1320, 'square', 0.18); tone(b, 0.05, 0.12, 1980, 1980, 'square', 0.18); return b; },
  ready: () => { const b = buf(0.1); tone(b, 0, 0.09, 880, 1320, 'tri', 0.35); return b; },
  nope: () => { const b = buf(0.14); tone(b, 0, 0.12, 150, 120, 'square', 0.25); return b; },
  fight: () => {
    const b = buf(0.7);
    tone(b, 0, 0.12, 120, 50, 'sine', 1); hiss(b, 0, 0.08, 0.6, 800, 200);
    tone(b, 0.16, 0.12, 120, 50, 'sine', 1); hiss(b, 0.16, 0.08, 0.6, 800, 200);
    for (const n of [55, 59, 62]) tone(b, 0.3, 0.38, NOTE(n), NOTE(n), 'saw', 0.12, 0.02);
    return b;
  },
  victory: () => {
    const b = buf(1.3);
    [60, 64, 67, 72].forEach((n, i) => tone(b, i * 0.11, 0.2, NOTE(n), NOTE(n), 'square', 0.18));
    for (const n of [72, 76, 79]) tone(b, 0.46, 0.8, NOTE(n), NOTE(n), 'tri', 0.25, 0.01);
    tone(b, 0.46, 0.5, 110, 40, 'sine', 0.6);
    return b;
  },
  defeat: () => {
    const b = buf(1.2);
    [67, 63, 60].forEach((n, i) => tone(b, i * 0.22, 0.32, NOTE(n), NOTE(n) * 0.98, 'tri', 0.35));
    tone(b, 0.66, 0.5, NOTE(55), NOTE(53), 'square', 0.12);
    return b;
  },
  unlock: () => { const b = buf(0.6); [72, 76, 79, 84].forEach((n, i) => tone(b, i * 0.07, 0.25, NOTE(n), NOTE(n), 'tri', 0.3)); hiss(b, 0, 0.4, 0.12, 6000, 3000); return b; },
  upgrade: () => { const b = buf(0.35); [67, 71, 74].forEach((n, i) => tone(b, i * 0.06, 0.18, NOTE(n), NOTE(n), 'square', 0.16)); return b; },
  evolve: () => {
    const b = buf(1.4);
    tone(b, 0, 0.7, 120, 900, 'saw', 0.12, 0.3);
    hiss(b, 0, 0.7, 0.25, 600, 6000, 0.6);
    for (const n of [60, 64, 67, 72]) tone(b, 0.65, 0.7, NOTE(n), NOTE(n), 'tri', 0.22, 0.01);
    return b;
  },
  // Era weapons (added after the originals so their noise stays identical).
  bow: () => { const b = buf(0.16); tone(b, 0, 0.14, 330, 290, 'tri', 0.45); tone(b, 0, 0.05, 900, 500, 'square', 0.12); hiss(b, 0, 0.05, 0.25, 3500, 2000); return b; },
  crossbow: () => { const b = buf(0.14); tone(b, 0, 0.03, 1600, 1200, 'square', 0.25); tone(b, 0.01, 0.1, 220, 120, 'square', 0.3); hiss(b, 0, 0.06, 0.4, 2600, 900); return b; },
  musket: () => { const b = buf(0.45); hiss(b, 0, 0.42, 1, 5000, 300, 2.2); tone(b, 0, 0.12, 160, 50, 'sine', 0.9); tone(b, 0, 0.02, 2200, 1500, 'square', 0.2); return b; },
  cannon: () => { const b = buf(1.0); hiss(b, 0, 0.95, 1, 2200, 60, 1.6); tone(b, 0, 0.5, 90, 26, 'sine', 1); tone(b, 0.02, 0.2, 60, 40, 'square', 0.25); return b; },
  rifle: () => { const b = buf(0.3); hiss(b, 0, 0.28, 0.9, 7000, 900, 2.6); tone(b, 0, 0.06, 420, 90, 'square', 0.35); tone(b, 0, 0.08, 120, 60, 'sine', 0.6); return b; },
  steam: () => { const b = buf(0.5); hiss(b, 0, 0.48, 0.7, 6000, 3000, 0.8); tone(b, 0, 0.25, 70, 40, 'square', 0.35); return b; },
  zap: () => { const b = buf(0.22); tone(b, 0, 0.2, 2400, 300, 'saw', 0.3); tone(b, 0, 0.18, 1200, 160, 'square', 0.15); hiss(b, 0, 0.06, 0.25, 8000, 4000); return b; },
  zap_heavy: () => { const b = buf(0.5); tone(b, 0, 0.45, 1400, 80, 'saw', 0.35); tone(b, 0, 0.3, 300, 40, 'square', 0.3); hiss(b, 0, 0.3, 0.5, 6000, 500); return b; },
  // Bosses and the ward.
  roar: () => { const b = buf(1.1); tone(b, 0, 1.0, 90, 55, 'saw', 0.5, 0.15); tone(b, 0, 1.0, 93, 57, 'square', 0.2, 0.15); hiss(b, 0, 0.9, 0.35, 900, 300, 0.9); return b; },
  ward_hit: () => { const b = buf(0.2); tone(b, 0, 0.18, 1760, 1700, 'sine', 0.35); tone(b, 0, 0.12, 2640, 2600, 'tri', 0.15); return b; },
  ward_break: () => { const b = buf(0.9); for (let i = 0; i < 7; i++) tone(b, i * 0.05, 0.3, 2600 - i * 220, 1800 - i * 150, 'tri', 0.22); hiss(b, 0, 0.6, 0.5, 9000, 2500, 1.2); tone(b, 0, 0.4, 110, 40, 'sine', 0.6); return b; },
  thunder: () => { const b = buf(1.4); tone(b, 0, 0.04, 3000, 1500, 'square', 0.3); hiss(b, 0, 0.25, 1, 9000, 2500, 1.4); hiss(b, 0.08, 1.25, 0.9, 900, 70, 1.1); tone(b, 0.05, 0.9, 60, 30, 'sine', 0.8); return b; },
};

mkdirSync(OUT, { recursive: true });
const manifestPath = join(ROOT, 'public/assets/manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
manifest.sounds = {};
for (const [name, fn] of Object.entries(SOUNDS)) {
  writeFileSync(join(OUT, `${name}.wav`), wav(fn()));
  manifest.sounds[name] = `sfx/${name}.wav`;
}
writeFileSync(manifestPath, JSON.stringify(manifest, null, 1) + '\n');
console.log(`Built ${Object.keys(SOUNDS).length} sounds`);
