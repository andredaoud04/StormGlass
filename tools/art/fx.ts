/** Effect sprites, each a horizontal strip of frames. */
import { Img, bayer, hex, withAlpha } from './img';
import { FIRE, GOLD, INK, STONE, WHITE } from './palette';
import { rand } from './env/paint';

export interface Strip {
  frames: Img[];
  fps: number;
  anchor: [number, number];
  desc: string;
}

/** Star-burst impact spark. */
export function spark(): Strip {
  const frames: Img[] = [];
  const S = 15;
  const c = 7;
  for (let f = 0; f < 4; f++) {
    const img = new Img(S, S);
    const len = [3, 6, 7, 5][f];
    const inner = [2, 2, 1, 0][f];
    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2 + (f % 2 ? Math.PI / 8 : 0);
      const L = a % 2 ? len * 0.6 : len;
      for (let t = inner; t <= L; t++) {
        const x = c + Math.cos(ang) * t;
        const y = c + Math.sin(ang) * t;
        img.set(x, y, t < L * 0.5 ? WHITE : FIRE.hl);
      }
    }
    if (f < 2) img.ellipse(c + 0.5, c + 0.5, 2.5 - f, 2.5 - f, WHITE);
    frames.push(img);
  }
  return { frames, fps: 20, anchor: [c, c], desc: 'Melee hit spark, 4 frames.' };
}

/** Heavy-hit shock ring (tanks). */
export function ring(): Strip {
  const frames: Img[] = [];
  const S = 25;
  const c = 12;
  for (let f = 0; f < 4; f++) {
    const img = new Img(S, S);
    const rad = 3 + f * 3;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const d = Math.hypot(x + 0.5 - c - 0.5, (y + 0.5 - c - 0.5) * 1.6);
      if (Math.abs(d - rad) < (f < 2 ? 1.2 : 0.7)) img.set(x, y, f < 2 ? WHITE : withAlpha(WHITE, 170));
    }
    frames.push(img);
  }
  return { frames, fps: 18, anchor: [c, c], desc: 'Shock ring for heavy hits, flattened ellipse, 4 frames.' };
}

/** Footstep / landing dust puff. */
export function dust(): Strip {
  const frames: Img[] = [];
  const cols = [hex('#f1d8a8'), hex('#d8b47e'), hex('#b8915e')];
  for (let f = 0; f < 5; f++) {
    const img = new Img(16, 10);
    const spread = 2 + f * 1.4;
    const rad = [2, 2.6, 2.6, 2, 1.2][f];
    for (const dx of [-1, 1]) {
      const x = 8 + dx * spread;
      const y = 7 - f * 0.6;
      img.ellipse(x, y, rad, rad * 0.85, (_x, _y, nx, ny) => (ny > 0.3 ? cols[2] : nx * dx < -0.2 ? cols[0] : cols[1]));
    }
    frames.push(img);
  }
  return { frames, fps: 14, anchor: [8, 9], desc: 'Dust puff at the feet, 5 frames.' };
}

/** Death poof: a burst of smoke with little stars. */
export function poof(): Strip {
  const frames: Img[] = [];
  const r = rand(9);
  const S = 24;
  const c = 12;
  const puffs = Array.from({ length: 7 }, (_, i) => ({ a: (i / 7) * Math.PI * 2 + r() * 0.4, d: 3 + r() * 3, s: 2.5 + r() * 1.5 }));
  for (let f = 0; f < 6; f++) {
    const img = new Img(S, S);
    const t = f / 5;
    for (const p of puffs) {
      const x = c + Math.cos(p.a) * (p.d + t * 7);
      const y = c + Math.sin(p.a) * (p.d + t * 5) - t * 4;
      const rad = p.s * (f < 3 ? 1 + f * 0.25 : 1.6 - (f - 3) * 0.45);
      if (rad <= 0.4) continue;
      img.ellipse(x, y, rad, rad, (px, py, nx, ny) => {
        if (f >= 4 && bayer(px, py) < 0.5) return 0;
        return ny > 0.35 ? hex('#b6aec2') : nx + ny < -0.4 ? WHITE : hex('#e4def0');
      });
    }
    if (f < 3) img.ellipse(c, c, 4 - f, 4 - f, WHITE);
    frames.push(img);
  }
  return { frames, fps: 16, anchor: [c, c + 4], desc: 'Death poof, 6 frames, anchored near the feet.' };
}

export function coin(): Strip {
  const frames: Img[] = [];
  const widths = [4, 3, 1, 3];
  for (let f = 0; f < 4; f++) {
    const img = new Img(9, 9);
    const w = widths[f];
    img.ellipse(4.5, 4.5, w, 4, (_x, _y, nx, ny) => (nx + ny < -0.5 ? GOLD.hl : nx > 0.4 || ny > 0.5 ? GOLD.shade : GOLD.base));
    if (w >= 3) img.vline(4, 3, 5, GOLD.deep);
    frames.push(img.outlined(INK).crop(1, 1, 9, 9));
  }
  return { frames, fps: 12, anchor: [4, 4], desc: 'Spinning gold coin, 4 frames.' };
}

export function smoke(): Strip {
  const frames: Img[] = [];
  for (let f = 0; f < 6; f++) {
    const img = new Img(14, 18);
    const t = f / 5;
    const rad = 2 + t * 3.5;
    const y = 14 - t * 10;
    img.ellipse(7, y, rad, rad, (px, py, nx, ny) => {
      if (f >= 4 && bayer(px, py) < (f - 3) * 0.35) return 0;
      return ny > 0.3 ? hex('#5a5260') : nx + ny < -0.5 ? hex('#a8a0b0') : hex('#7c7486');
    });
    frames.push(img);
  }
  return { frames, fps: 8, anchor: [7, 16], desc: 'Rising smoke puff, 6 frames.' };
}

export function flame(): Strip {
  const frames: Img[] = [];
  const shapes = [
    ['..h..', '.hfh.', '.hfh.', 'hfFfh', 'hfFfh', '.hfh.'],
    ['...h.', '..hh.', '.hfh.', 'hfFfh', 'hFFfh', '.hfh.'],
    ['.h...', '.hh..', '.hfh.', 'hfFfh', 'hfFfh', '.hfh.'],
    ['..h..', '..h..', '.hfh.', '.hFh.', 'hfFfh', '.hfh.'],
  ];
  for (const s of shapes) frames.push(Img.fromGrid(s, { h: FIRE.deep, f: FIRE.base, F: FIRE.hl }));
  return { frames, fps: 10, anchor: [2, 5], desc: 'Torch flame, 4 frames.' };
}

/** Big explosion for a destroyed fortress. */
export function boom(): Strip {
  const frames: Img[] = [];
  const S = 48;
  const c = 24;
  const r = rand(31);
  const lobes = Array.from({ length: 9 }, (_, i) => ({ a: (i / 9) * Math.PI * 2 + r() * 0.5, d: 4 + r() * 6, s: 6 + r() * 4 }));
  for (let f = 0; f < 8; f++) {
    const img = new Img(S, S);
    const t = f / 7;
    for (const l of lobes) {
      const x = c + Math.cos(l.a) * (l.d + t * 10);
      const y = c + Math.sin(l.a) * (l.d + t * 8) - t * 8;
      const rad = l.s * (f < 3 ? 0.6 + f * 0.25 : 1.3 - (f - 3) * 0.24);
      if (rad <= 0.5) continue;
      img.ellipse(x, y, rad, rad, (px, py, nx, ny) => {
        if (f >= 5 && bayer(px, py) < (f - 4) * 0.28) return 0;
        if (f < 2) return nx + ny < 0 ? WHITE : FIRE.hl;
        if (f < 4) return ny > 0.3 ? FIRE.deep : nx + ny < -0.3 ? FIRE.hl : FIRE.base;
        return ny > 0.2 ? hex('#4a4250') : nx + ny < -0.4 ? hex('#8a8296') : hex('#6a6276');
      });
    }
    frames.push(img);
  }
  return { frames, fps: 14, anchor: [c, c + 10], desc: 'Fortress explosion, 8 frames.' };
}

/** Curved swing smear for melee strikes (drawn over the attacker on the strike frame). */
export function smear(): Strip {
  const frames: Img[] = [];
  for (let f = 0; f < 3; f++) {
    const img = new Img(20, 20);
    const a0 = -Math.PI * 0.55 + f * 0.25;
    const a1 = Math.PI * 0.35;
    for (let a = a0; a <= a1; a += 0.04) {
      for (let rr = 9 - f; rr <= 10; rr++) {
        const x = 4 + Math.cos(a) * rr;
        const y = 12 + Math.sin(a) * rr;
        img.set(x, y, withAlpha(WHITE, f === 0 ? 255 : f === 1 ? 200 : 120));
      }
    }
    frames.push(img);
  }
  return { frames, fps: 20, anchor: [4, 12], desc: 'Melee swing smear arc, 3 frames.' };
}

export function stoneProjectile(): Strip {
  const a = Img.fromGrid(['.qg.', 'qggp', 'gppP', '.PP.'], { q: STONE.hl, g: STONE.base, p: STONE.shade, P: STONE.deep }).outlined(INK);
  const b = Img.fromGrid(['.gq.', 'pggq', 'Pppg', '.PP.'], { q: STONE.hl, g: STONE.base, p: STONE.shade, P: STONE.deep }).outlined(INK);
  return { frames: [a, b], fps: 12, anchor: [3, 3], desc: 'Sling stone in flight, 2 frames.' };
}

/** Tiny chips knocked off the fortress. */
export function debris(): Strip {
  const frames: Img[] = [];
  const shapes = [['ab', 'bc'], ['.a', 'bc'], ['a.', 'bc'], ['ab', 'c.']];
  for (const s of shapes) frames.push(Img.fromGrid(s, { a: hex('#d99a5c'), b: hex('#ad6a3c'), c: hex('#7f4428') }).outlined(INK));
  return { frames, fps: 12, anchor: [2, 2], desc: 'Wood chip debris, 4 frames (rotating).' };
}

void STONE;
