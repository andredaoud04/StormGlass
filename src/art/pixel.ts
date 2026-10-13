/**
 * Tiny pixel-art toolkit for original, code-authored Stormglass sprites.
 *
 * Art is built on a PixelCanvas (a grid of CSS colours), then rasterised once to a
 * data URL and drawn with `image-rendering: pixelated`, so sprites stay crisp at any
 * artboard scale. Building is pure (testable in Node); rasterising needs a browser.
 */
export type Colour = string | null;

export class PixelCanvas {
  readonly px: Colour[];

  constructor(readonly w: number, readonly h: number) {
    this.px = new Array(w * h).fill(null);
  }

  inBounds(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  get(x: number, y: number): Colour {
    return this.inBounds(x, y) ? this.px[y * this.w + x] : null;
  }

  set(x: number, y: number, c: Colour) {
    x = Math.round(x);
    y = Math.round(y);
    if (this.inBounds(x, y)) this.px[y * this.w + x] = c;
    return this;
  }

  rect(x: number, y: number, w: number, h: number, c: Colour) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
    return this;
  }

  /** Horizontal run from x0 to x1 inclusive. */
  hline(x0: number, x1: number, y: number, c: Colour) {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.set(x, y, c);
    return this;
  }

  vline(x: number, y0: number, y1: number, c: Colour) {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) this.set(x, y, c);
    return this;
  }

  /** Bresenham line. */
  line(x0: number, y0: number, x1: number, y1: number, c: Colour) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    return this;
  }

  /** Filled ellipse centred on (cx, cy) using pixel-centre sampling. */
  ellipse(cx: number, cy: number, rx: number, ry: number, c: Colour) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
        if (nx * nx + ny * ny <= 1) this.set(x, y, c);
      }
    }
    return this;
  }

  /**
   * Stamps a character grid: each char maps through `palette`; '.' and ' ' are transparent.
   * Unknown characters are ignored, so grids can carry comments-by-convention safely.
   */
  stamp(grid: readonly string[], palette: Record<string, string>, ox = 0, oy = 0, flipX = false) {
    grid.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const ch = row[i];
        if (ch === '.' || ch === ' ') continue;
        const c = palette[ch];
        if (c) this.set(ox + (flipX ? row.length - 1 - i : i), oy + j, c);
      }
    });
    return this;
  }

  /** Draws another canvas on top (transparent pixels skipped). */
  draw(src: PixelCanvas, ox = 0, oy = 0) {
    for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
      const c = src.get(x, y);
      if (c) this.set(ox + x, oy + y, c);
    }
    return this;
  }

  /** Adds a 1px outline on transparent pixels touching opaque ones (4-neighbour; 8 with diagonal). */
  outline(c: string, diagonal = false) {
    const add: number[] = [];
    const dirs = diagonal
      ? [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]
      : [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.get(x, y)) continue;
      if (dirs.some(([dx, dy]) => this.get(x + dx, y + dy) && this.get(x + dx, y + dy) !== c)) add.push(y * this.w + x);
    }
    for (const i of add) this.px[i] = c;
    return this;
  }

  /** Replaces one colour with another (e.g. faction recolours). */
  recolour(map: Record<string, string>) {
    for (let i = 0; i < this.px.length; i++) {
      const c = this.px[i];
      if (c && map[c]) this.px[i] = map[c];
    }
    return this;
  }

  flipX() {
    const out = new PixelCanvas(this.w, this.h);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) out.set(this.w - 1 - x, y, this.get(x, y));
    return out;
  }

  clone() {
    const out = new PixelCanvas(this.w, this.h);
    out.px.splice(0, this.px.length, ...this.px);
    return out;
  }

  /** Number of opaque pixels (handy for tests). */
  opaqueCount() {
    return this.px.reduce((n, c) => (c ? n + 1 : n), 0);
  }
}

/** Lays frames left-to-right into one sprite sheet. */
export function sheet(frames: PixelCanvas[]): PixelCanvas {
  const w = frames[0].w, h = frames[0].h;
  const out = new PixelCanvas(w * frames.length, h);
  frames.forEach((f, i) => out.draw(f, i * w, 0));
  return out;
}

/** Lightens (amt > 0) or darkens (amt < 0) a #rrggbb colour. */
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt))));
  const r = f((n >> 16) & 255), g = f((n >> 8) & 255), b = f(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

const urlCache = new Map<string, string>();

/** Rasterises a canvas to a PNG data URL (browser only), memoised by key. */
export function toDataURL(key: string, build: () => PixelCanvas): string {
  const hit = urlCache.get(key);
  if (hit) return hit;
  if (typeof document === 'undefined') return '';
  const pc = build();
  const el = document.createElement('canvas');
  el.width = pc.w;
  el.height = pc.h;
  const ctx = el.getContext('2d');
  if (!ctx) return '';
  const img = ctx.createImageData(pc.w, pc.h);
  for (let i = 0; i < pc.px.length; i++) {
    const c = pc.px[i];
    if (!c) continue;
    const n = parseInt(c.slice(1, 7), 16);
    img.data[i * 4] = (n >> 16) & 255;
    img.data[i * 4 + 1] = (n >> 8) & 255;
    img.data[i * 4 + 2] = n & 255;
    img.data[i * 4 + 3] = c.length === 9 ? parseInt(c.slice(7, 9), 16) : 255;
  }
  ctx.putImageData(img, 0, 0);
  const url = el.toDataURL('image/png');
  urlCache.set(key, url);
  return url;
}
