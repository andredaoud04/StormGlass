/** Minimal RGBA pixel canvas for authoring pixel art in code. Colors are 0xRRGGBBAA numbers. */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { encodePng } from './png';

export type Color = number;
export const CLEAR: Color = 0;

export function hex(s: string, alpha = 255): Color {
  const h = s.replace('#', '');
  return ((parseInt(h.slice(0, 6), 16) << 8) | alpha) >>> 0;
}
export const rgba = (r: number, g: number, b: number, a = 255): Color =>
  (((r & 255) << 24) | ((g & 255) << 16) | ((b & 255) << 8) | (a & 255)) >>> 0;
export const R = (c: Color) => (c >>> 24) & 255;
export const G = (c: Color) => (c >>> 16) & 255;
export const B = (c: Color) => (c >>> 8) & 255;
export const A = (c: Color) => c & 255;

export function mix(a: Color, b: Color, t: number): Color {
  return rgba(
    Math.round(R(a) + (R(b) - R(a)) * t),
    Math.round(G(a) + (G(b) - G(a)) * t),
    Math.round(B(a) + (B(b) - B(a)) * t),
    Math.round(A(a) + (A(b) - A(a)) * t),
  );
}
export function withAlpha(c: Color, a: number): Color {
  return ((c & 0xffffff00) | (a & 255)) >>> 0;
}

/** 4x4 ordered-dither threshold in [0,1). */
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export function bayer(x: number, y: number): number {
  return (BAYER4[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
}

export type Palette = Record<string, Color>;

export class Img {
  readonly data: Uint32Array;
  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.data = new Uint32Array(w * h);
  }

  static fromGrid(rows: string[], pal: Palette): Img {
    const w = Math.max(...rows.map((r) => r.length));
    const img = new Img(w, rows.length);
    img.grid(rows, pal, 0, 0);
    return img;
  }

  clone(): Img {
    const c = new Img(this.w, this.h);
    c.data.set(this.data);
    return c;
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }
  get(x: number, y: number): Color {
    return this.inside(x, y) ? this.data[y * this.w + x] : CLEAR;
  }
  set(x: number, y: number, c: Color): void {
    x = Math.round(x);
    y = Math.round(y);
    if (this.inside(x, y)) this.data[y * this.w + x] = c;
  }
  /** Draw with alpha blending (opaque colors simply replace). */
  plot(x: number, y: number, c: Color): void {
    const a = A(c);
    if (a === 0) return;
    x = Math.round(x);
    y = Math.round(y);
    if (!this.inside(x, y)) return;
    if (a === 255) {
      this.data[y * this.w + x] = c;
      return;
    }
    const d = this.data[y * this.w + x];
    const da = A(d) / 255;
    const sa = a / 255;
    const oa = sa + da * (1 - sa);
    if (oa <= 0) return;
    const ch = (s: number, t: number) => Math.round((s * sa + t * da * (1 - sa)) / oa);
    this.data[y * this.w + x] = rgba(ch(R(c), R(d)), ch(G(c), G(d)), ch(B(c), B(d)), Math.round(oa * 255));
  }
  opaque(x: number, y: number): boolean {
    return A(this.get(x, y)) > 0;
  }

  fill(c: Color): this {
    this.data.fill(c);
    return this;
  }
  rect(x: number, y: number, w: number, h: number, c: Color): this {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.plot(x + i, y + j, c);
    return this;
  }
  hline(x0: number, x1: number, y: number, c: Color): void {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.plot(x, y, c);
  }
  vline(x: number, y0: number, y1: number, c: Color): void {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) this.plot(x, y, c);
  }
  line(x0: number, y0: number, x1: number, y1: number, c: Color): void {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.plot(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, c: Color | ((x: number, y: number, nx: number, ny: number) => Color)): void {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x + 0.5 - cx) / rx;
        const ny = (y + 0.5 - cy) / ry;
        if (nx * nx + ny * ny <= 1) this.plot(x, y, typeof c === 'function' ? c(x, y, nx, ny) : c);
      }
    }
  }
  /** Fill a polygon (even-odd) with a color or a shader. */
  poly(pts: [number, number][], c: Color | ((x: number, y: number) => Color)): void {
    const ys = pts.map((p) => p[1]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
      const yc = y + 0.5;
      const xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const [x0, y0] = pts[i];
        const [x1, y1] = pts[(i + 1) % pts.length];
        if (y0 <= yc !== y1 <= yc) xs.push(x0 + ((yc - y0) / (y1 - y0)) * (x1 - x0));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.plot(x, y, typeof c === 'function' ? c(x, y) : c);
      }
    }
  }

  /** Paint a character grid. '.' and ' ' are transparent; unknown characters throw. */
  grid(rows: string[], pal: Palette, x: number, y: number, flipX = false): this {
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const ch = row[i];
        if (ch === '.' || ch === ' ') continue;
        const c = pal[ch];
        if (c === undefined) throw new Error(`Palette has no '${ch}'`);
        this.plot(flipX ? x + row.length - 1 - i : x + i, y + j, c);
      }
    });
    return this;
  }

  blit(src: Img, x: number, y: number, opts: { flipX?: boolean; flipY?: boolean; tint?: (c: Color) => Color } = {}): this {
    for (let j = 0; j < src.h; j++) {
      for (let i = 0; i < src.w; i++) {
        let c = src.data[j * src.w + i];
        if (!A(c)) continue;
        if (opts.tint) c = opts.tint(c);
        this.plot(x + (opts.flipX ? src.w - 1 - i : i), y + (opts.flipY ? src.h - 1 - j : j), c);
      }
    }
    return this;
  }

  map(fn: (c: Color, x: number, y: number) => Color): this {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) this.data[y * this.w + x] = fn(this.data[y * this.w + x], x, y);
    return this;
  }

  recolor(from: Color, to: Color): this {
    return this.map((c) => (c === from ? to : c));
  }

  /** Copy with a 1px outline around every opaque region (4-neighbour by default). */
  outlined(color: Color, opts: { pad?: number; diagonal?: boolean } = {}): Img {
    const pad = opts.pad ?? 1;
    const out = new Img(this.w + pad * 2, this.h + pad * 2);
    out.blit(this, pad, pad);
    const src = out.clone();
    for (let y = 0; y < out.h; y++) {
      for (let x = 0; x < out.w; x++) {
        if (src.opaque(x, y)) continue;
        const n4 = src.opaque(x - 1, y) || src.opaque(x + 1, y) || src.opaque(x, y - 1) || src.opaque(x, y + 1);
        const n8 = opts.diagonal && (src.opaque(x - 1, y - 1) || src.opaque(x + 1, y - 1) || src.opaque(x - 1, y + 1) || src.opaque(x + 1, y + 1));
        if (n4 || n8) out.set(x, y, color);
      }
    }
    return out;
  }

  flipped(): Img {
    const out = new Img(this.w, this.h);
    out.blit(this, 0, 0, { flipX: true });
    return out;
  }

  crop(x: number, y: number, w: number, h: number): Img {
    const out = new Img(w, h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) out.data[j * w + i] = this.get(x + i, y + j);
    return out;
  }

  scaled(k: number): Img {
    const out = new Img(this.w * k, this.h * k);
    for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++) out.data[y * out.w + x] = this.data[Math.floor(y / k) * this.w + Math.floor(x / k)];
    return out;
  }

  /** Bounding box of opaque pixels. */
  bounds(): { x: number; y: number; w: number; h: number } {
    let x0 = this.w, y0 = this.h, x1 = -1, y1 = -1;
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (this.opaque(x, y)) {
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
    return x1 < 0 ? { x: 0, y: 0, w: 0, h: 0 } : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  }

  toRGBA(): Uint8Array {
    const out = new Uint8Array(this.w * this.h * 4);
    for (let i = 0; i < this.data.length; i++) {
      const c = this.data[i];
      out[i * 4] = R(c);
      out[i * 4 + 1] = G(c);
      out[i * 4 + 2] = B(c);
      out[i * 4 + 3] = A(c);
    }
    return out;
  }

  save(path: string): void {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, encodePng(this.w, this.h, this.toRGBA()));
  }
}

/** Scale2x (EPX) upscale; keeps pixel-art edges sharp. */
export function scale2x(src: Img): Img {
  const out = new Img(src.w * 2, src.h * 2);
  for (let y = 0; y < src.h; y++) {
    for (let x = 0; x < src.w; x++) {
      const P = src.get(x, y);
      const Aa = src.get(x, y - 1), Bb = src.get(x + 1, y), Cc = src.get(x - 1, y), Dd = src.get(x, y + 1);
      let e0 = P, e1 = P, e2 = P, e3 = P;
      if (Cc === Aa && Cc !== Dd && Aa !== Bb) e0 = Aa;
      if (Aa === Bb && Aa !== Cc && Bb !== Dd) e1 = Bb;
      if (Dd === Cc && Dd !== Bb && Cc !== Aa) e2 = Cc;
      if (Bb === Dd && Bb !== Aa && Dd !== Cc) e3 = Dd;
      out.set(x * 2, y * 2, e0);
      out.set(x * 2 + 1, y * 2, e1);
      out.set(x * 2, y * 2 + 1, e2);
      out.set(x * 2 + 1, y * 2 + 1, e3);
    }
  }
  return out;
}

/**
 * RotSprite-style rotation: upscale 8x with Scale2x, rotate with nearest sampling, downsample.
 * Rotates around pivot (px, py) in source pixels; the result is placed so the pivot lands at
 * (outPx, outPy) of a canvas of size outW x outH.
 */
export function rotSprite(src: Img, angle: number, px: number, py: number, outW: number, outH: number, outPx: number, outPy: number): Img {
  const big = scale2x(scale2x(scale2x(src)));
  const k = 8;
  const out = new Img(outW, outH);
  const cos = Math.cos(-angle);
  const sin = Math.sin(-angle);
  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      // Sample the centre of the output pixel in big-space.
      const dx = (x + 0.5 - outPx) * k;
      const dy = (y + 0.5 - outPy) * k;
      const sx = dx * cos - dy * sin + px * k;
      const sy = dx * sin + dy * cos + py * k;
      out.data[y * outW + x] = big.get(Math.floor(sx), Math.floor(sy));
    }
  }
  return out;
}
