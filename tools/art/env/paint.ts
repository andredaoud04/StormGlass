/** Shared painting helpers for environment layers. */
import { createRng, nextFloat } from '../../../src/sim/rng';
import { Img, bayer, type Color } from '../img';

export type Rand = () => number;
export function rand(seed: number): Rand {
  const r = createRng(seed);
  return () => nextFloat(r);
}

/** Vertical gradient through color stops with ordered dithering between neighbouring stops. */
export function ditherGradient(img: Img, stops: { at: number; c: Color }[], y0 = 0, y1 = img.h, band = 0.35): void {
  for (let y = y0; y < y1; y++) {
    const t = (y - y0) / Math.max(1, y1 - y0 - 1);
    let i = 0;
    while (i < stops.length - 2 && t > stops[i + 1].at) i++;
    const a = stops[i];
    const b = stops[i + 1];
    const raw = Math.min(1, Math.max(0, (t - a.at) / (b.at - a.at)));
    // Mostly solid bands with a short dithered hand-off, the classic pixel-art sky.
    const f = Math.max(0, (raw - 1 + band) / band);
    for (let x = 0; x < img.w; x++) img.set(x, y, f > bayer(x, y) ? b.c : a.c);
  }
}

/** Mountain ridge heights from triangular peaks plus a little seeded jitter. */
export function peakRidge(w: number, peaks: { x: number; h: number; half: number }[], r: Rand, jitter = 1.5): { h: number[]; peakOf: number[] } {
  const h: number[] = [];
  const peakOf: number[] = [];
  let drift = 0;
  for (let x = 0; x < w; x++) {
    let best = 0;
    let bi = -1;
    peaks.forEach((p, i) => {
      const v = p.h * Math.max(0, 1 - Math.abs(x - p.x) / p.half);
      if (v > best) {
        best = v;
        bi = i;
      }
    });
    drift = Math.max(-jitter, Math.min(jitter, drift + (r() - 0.5) * 1.2));
    h.push(Math.max(0, best + drift));
    peakOf.push(bi);
  }
  return { h, peakOf };
}

/** Smooth rolling ridge as a sum of sines. */
export function sineRidge(w: number, base: number, waves: [number, number, number][]): number[] {
  const out: number[] = [];
  for (let x = 0; x < w; x++) {
    let v = base;
    for (const [amp, period, phase] of waves) v += amp * Math.sin((x / period) * Math.PI * 2 + phase);
    out.push(v);
  }
  return out;
}

/** Puffy cloud: union of circles, lit from the top-left, flat shaded underside. */
export function cloud(w: number, h: number, r: Rand, cols: { hl: Color; base: Color; shade: Color }): Img {
  const img = new Img(w, h);
  const blobs: [number, number, number][] = [];
  const n = 4 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const rad = h * (0.28 + 0.22 * Math.sin(t * Math.PI)) + r() * 2;
    blobs.push([w * (0.12 + 0.76 * t), h - rad - 1 - (r() * h) / 6, rad]);
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let inside = false;
      let lit = false;
      for (const [cx, cy, rr] of blobs) {
        const dx = x + 0.5 - cx;
        const dy = y + 0.5 - cy;
        if (dx * dx + dy * dy <= rr * rr) {
          inside = true;
          const lx = x + 0.5 - (cx - rr * 0.35);
          const ly = y + 0.5 - (cy - rr * 0.4);
          if (lx * lx + ly * ly <= rr * rr * 0.62) lit = true;
        }
      }
      if (!inside) continue;
      const bottom = y >= h - 3;
      img.set(x, y, bottom ? cols.shade : lit ? cols.hl : cols.base);
    }
  }
  return img;
}

export interface TreeCols {
  hl: Color;
  base: Color;
  shade: Color;
  deep: Color;
  trunk: Color;
  trunkShade: Color;
}

/** Conifer made of stacked jagged tiers, lit on the left. */
export function conifer(img: Img, x: number, groundY: number, height: number, c: TreeCols, r: Rand): void {
  const trunkH = Math.max(2, Math.round(height * 0.18));
  img.rect(x - 1, groundY - trunkH, 2, trunkH, c.trunk);
  img.set(x, groundY - trunkH, c.trunkShade);
  const tiers = Math.max(2, Math.round(height / 6));
  const top = groundY - height;
  for (let t = 0; t < tiers; t++) {
    const ty = top + Math.round((t * (height - trunkH)) / tiers);
    const tierH = Math.round((height - trunkH) / tiers) + 3;
    const halfW = 2 + Math.round(((t + 1) / tiers) * height * 0.28);
    for (let j = 0; j < tierH; j++) {
      const hw = Math.round((halfW * (j + 1)) / tierH);
      for (let i = -hw; i <= hw; i++) {
        const edge = j === tierH - 1 && (i + t) % 2 === 0;
        if (edge && Math.abs(i) > hw - 2) continue;
        let col = i < -hw / 3 ? c.hl : i < hw / 3 ? c.base : c.shade;
        if (j === tierH - 1 || (j === tierH - 2 && Math.abs(i) >= hw - 1)) col = i < 0 ? c.shade : c.deep;
        if (i === -hw && j < tierH - 1 && r() < 0.5) col = c.base;
        img.set(x + i, ty + j, col);
      }
    }
  }
  img.set(x, top - 1, c.base);
}

/** Round broadleaf tree from overlapping blobs. */
export function broadleaf(img: Img, x: number, groundY: number, rad: number, c: TreeCols, r: Rand): void {
  const trunkH = Math.round(rad * 0.9);
  img.rect(x - 1, groundY - trunkH, 3, trunkH, c.trunk);
  img.vline(x + 1, groundY - trunkH, groundY - 1, c.trunkShade);
  const cy = groundY - trunkH - rad * 0.6;
  const blobs: [number, number, number][] = [
    [x, cy, rad],
    [x - rad * 0.7, cy + rad * 0.3, rad * 0.7],
    [x + rad * 0.7, cy + rad * 0.35, rad * 0.7],
    [x - rad * 0.2 + (r() - 0.5) * 2, cy - rad * 0.5, rad * 0.65],
  ];
  for (const [bx, by, br] of blobs) {
    img.ellipse(bx, by, br, br * 0.9, (_px, _py, nx, ny) => {
      if (ny > 0.55) return c.deep;
      if (nx + ny < -0.75) return c.hl;
      if (nx + ny > 0.55) return c.shade;
      return c.base;
    });
  }
  // A few leaf-cluster highlights.
  for (let i = 0; i < rad; i++) img.set(x - rad * 0.5 + r() * rad, cy - rad * 0.4 + r() * rad * 0.5, c.hl);
}

/** Prehistoric palm / tree fern: curved trunk with drooping fronds. */
export function palm(img: Img, x: number, groundY: number, height: number, lean: number, c: TreeCols): void {
  let px = x;
  let py = groundY;
  for (let i = 0; i < height; i++) {
    const t = i / height;
    px = x + lean * t * t * height * 0.35;
    py = groundY - i;
    img.set(Math.round(px), py, i % 3 === 0 ? c.trunkShade : c.trunk);
    img.set(Math.round(px) + 1, py, c.trunkShade);
  }
  const tx = Math.round(px);
  const ty = py;
  const fronds: [number, number][] = [
    [-1, -0.35], [-1, 0.25], [-0.6, 0.65], [1, -0.3], [1, 0.3], [0.5, 0.7], [0, -0.9],
  ];
  for (const [dx, dy] of fronds) {
    const len = height * 0.42;
    for (let s = 0; s <= len; s++) {
      const t = s / len;
      const fx = tx + dx * s;
      const fy = ty + dy * s + t * t * len * 0.55;
      const col = dy < 0 ? c.hl : t > 0.7 ? c.shade : c.base;
      img.set(Math.round(fx), Math.round(fy), col);
      if (t < 0.75) img.set(Math.round(fx), Math.round(fy) + 1, t > 0.4 ? c.deep : c.shade);
    }
  }
  img.rect(tx - 1, ty - 1, 3, 2, c.deep);
}

/** Small irregular rock. */
export function rock(img: Img, x: number, y: number, w: number, h: number, c: { hl: Color; base: Color; shade: Color; deep: Color }): void {
  img.ellipse(x, y - h / 2, w / 2, h / 2, (_x, _y, nx, ny) => (ny > 0.45 ? c.deep : nx + ny < -0.5 ? c.hl : nx > 0.35 ? c.shade : c.base));
}

export interface GroundCols {
  dirt: { hl: Color; base: Color; shade: Color; deep: Color };
  grass: { hl: Color; base: Color; shade: Color; deep: Color };
}

/** Standard battlefield ground: back verge, lane band (feet on row 22), front verge, meadow. */
export function laneGround(c: GroundCols, r: Rand, W = 256): { img: Img; groundY: number; tuft: (x: number, y: number, c1: Color, c2: Color) => void } {
  const ground = new Img(W, 96);
  const { dirt, grass } = c;
  for (let x = 0; x < W; x++) {
    const backEdge = 10 + Math.round(Math.sin(x / 9) * 1.2 + Math.sin(x / 3.7) * 0.6);
    const frontEdge = 34 + Math.round(Math.sin(x / 11 + 1) * 1.4 + Math.sin(x / 4.3) * 0.7);
    for (let y = 0; y < 96; y++) {
      let col: Color;
      if (y < backEdge - 2) {
        col = y < 3 ? grass.hl : bayer(x, y) < 0.25 ? grass.hl : grass.base;
        if (y >= backEdge - 4) col = grass.shade;
      } else if (y < backEdge) col = grass.deep;
      else if (y < frontEdge) {
        const d = y - backEdge;
        col = d < 2 ? dirt.shade : d < 4 && bayer(x, y) < 0.5 ? dirt.shade : dirt.base;
        if (d >= 6 && d <= 14 && bayer(x + 1, y) < 0.12) col = dirt.hl;
        if (y >= frontEdge - 2) col = dirt.hl;
      } else if (y < frontEdge + 3) col = y === frontEdge ? grass.hl : grass.base;
      else {
        const d = y - frontEdge - 3;
        col = d < 14 ? grass.base : grass.shade;
        if (d >= 12 && d < 14 && bayer(x, y) < 0.5) col = grass.shade;
        if (d >= 34) col = d < 36 && bayer(x, y) < 0.5 ? grass.shade : grass.deep;
      }
      ground.set(x, y, col);
    }
  }
  const tuft = (x: number, y: number, c1: Color, c2: Color) => {
    ground.set(x, y, c1);
    ground.set(x - 1, y - 1, c1);
    ground.set(x + 1, y - 1, c2);
    ground.set(x, y - 2, c2);
  };
  for (let x = 3; x < W; x += 5 + Math.floor(r() * 6)) tuft(x, 9 + Math.round(Math.sin(x / 9) * 1.2), grass.shade, grass.base);
  for (let x = 1; x < W; x += 4 + Math.floor(r() * 7)) tuft(x, 37 + Math.round(Math.sin(x / 11 + 1) * 1.4), grass.base, grass.hl);
  for (let i = 0; i < 34; i++) tuft(Math.floor(r() * W), 44 + Math.floor(r() * 30), grass.shade, grass.hl);
  return { img: ground, groundY: 22, tuft };
}

/** Filled ridge layer: rows below `ridge[x]` get a lit top edge and darker depth dithering. */
export function hillLayer(W: number, H: number, ridge: number[], c: { hl: Color; base: Color; shade: Color; deep: Color }): Img {
  const img = new Img(W, H);
  for (let x = 0; x < W; x++) {
    const top = H - Math.round(ridge[x]);
    for (let y = top; y < H; y++) {
      const d = y - top;
      let col = d < 2 ? c.hl : c.base;
      if (d >= 2 && d < 4 && bayer(x, y) < 0.5) col = c.hl;
      if (d > 10 && bayer(x, y) < (d - 10) / 22) col = c.shade;
      if (d > 20 && bayer(x, y) < (d - 20) / 16) col = c.deep;
      img.set(x, y, col);
    }
  }
  return img;
}

/** Snow-capped peak range lit from the left; returns nothing, paints into img above `baseY`. */
export function peakRange(img: Img, baseY: number, peaks: { x: number; h: number; half: number }[], c: { hl: Color; base: Color; shade: Color; snow?: Color; snowShade?: Color }, snowAbove = 9999, wobble = 0.8): void {
  for (let x = 0; x < img.w; x++) {
    let best = 0;
    let px = x;
    for (const p of peaks) {
      const v = p.h * Math.max(0, 1 - Math.abs(x - p.x) / p.half) + Math.sin(x * 0.9) * wobble;
      if (v > best) {
        best = v;
        px = p.x;
      }
    }
    const top = baseY - Math.round(best);
    for (let y = top; y < baseY; y++) {
      const depth = y - top;
      let col = x < px ? c.hl : c.base;
      if (x >= px && depth > 3 && bayer(x, y) < 0.3) col = c.shade;
      if (c.snow && best > snowAbove && depth < (best - snowAbove) * 0.6 + (bayer(x, y) < 0.5 ? 1 : 0)) col = x < px ? c.snow : (c.snowShade ?? c.snow);
      img.set(x, y, col);
    }
  }
}
