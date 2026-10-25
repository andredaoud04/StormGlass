/** Drawing helpers on the low-res canvas. All coordinates are whole art pixels. */
import { tinted, type Assets, type Drawable } from './assets';

export type Align = 'left' | 'center' | 'right';
export type FontKey = 'small' | 'big';

export interface TextOpts {
  font?: FontKey;
  color?: string;
  /** Outline colour, or null for none. */
  outline?: string | null;
  /** Extra 1px drop shadow under the outline. */
  shadow?: boolean;
  align?: Align;
  alpha?: number;
}

export const INK = '#1e1526';

export class Draw {
  private textCache = new Map<string, HTMLCanvasElement>();
  private tintCache = new Map<string, HTMLCanvasElement>();

  constructor(
    public ctx: CanvasRenderingContext2D,
    public assets: Assets,
  ) {}

  /** Draw an image by its anchor. */
  image(key: string, x: number, y: number, opts: { flip?: boolean; alpha?: number; white?: boolean } = {}): void {
    const e = this.assets.image(key);
    const [ax, ay] = e.anchor ?? [0, 0];
    const src = opts.white ? this.assets.white(key) : this.assets.img(key);
    this.blit(src, 0, 0, e.w, e.h, x, y, ax, ay, opts.flip, opts.alpha);
  }

  /** One frame of an animation sheet. */
  frame(key: string, anim: string, index: number, x: number, y: number, opts: { flip?: boolean; alpha?: number; white?: boolean } = {}): void {
    const e = this.assets.sheet(key);
    const a = e.anims[anim];
    const i = Math.max(0, Math.min(a.frames - 1, index));
    const src = opts.white ? this.assets.white(key) : this.assets.img(key);
    this.blit(src, i * e.frameW, a.row * e.frameH, e.frameW, e.frameH, x, y, e.anchor[0], e.anchor[1], opts.flip, opts.alpha);
  }

  /** One frame of a horizontal strip. */
  strip(key: string, index: number, x: number, y: number, opts: { flip?: boolean; alpha?: number } = {}): void {
    const e = this.assets.strip(key);
    const i = Math.max(0, Math.min(e.frames - 1, index));
    this.blit(this.assets.img(key), i * e.frameW, 0, e.frameW, e.frameH, x, y, e.anchor[0], e.anchor[1], opts.flip, opts.alpha);
  }

  private blit(src: Drawable, sx: number, sy: number, sw: number, sh: number, x: number, y: number, ax: number, ay: number, flip = false, alpha = 1): void {
    const ctx = this.ctx;
    x = Math.round(x);
    y = Math.round(y);
    if (alpha <= 0) return;
    if (alpha < 1) ctx.globalAlpha = alpha;
    if (flip) {
      // Mirror about the anchor column so the anchor pixel stays at x.
      ctx.save();
      ctx.translate(x, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(src, sx, sy, sw, sh, -1 - ax, y - ay, sw, sh);
      ctx.restore();
    } else ctx.drawImage(src, sx, sy, sw, sh, x - ax, y - ay, sw, sh);
    if (alpha < 1) ctx.globalAlpha = 1;
  }

  /** 9-slice with tiled edges and centre (no stretching, so pixels stay square). */
  nine(key: string, x: number, y: number, w: number, h: number, alpha = 1): void {
    const e = this.assets.image(key);
    const [l, t, r, b] = e.slice ?? [0, 0, 0, 0];
    const src = this.assets.img(key);
    const ctx = this.ctx;
    x = Math.round(x);
    y = Math.round(y);
    w = Math.round(w);
    h = Math.round(h);
    if (alpha < 1) ctx.globalAlpha = alpha;
    const cw = e.w - l - r;
    const ch = e.h - t - b;
    const tile = (sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number) => {
      if (sw <= 0 || sh <= 0 || dw <= 0 || dh <= 0) return;
      for (let yy = 0; yy < dh; yy += sh) {
        for (let xx = 0; xx < dw; xx += sw) {
          const ww = Math.min(sw, dw - xx);
          const hh = Math.min(sh, dh - yy);
          ctx.drawImage(src, sx, sy, ww, hh, dx + xx, dy + yy, ww, hh);
        }
      }
    };
    const iw = w - l - r;
    const ih = h - t - b;
    tile(0, 0, l, t, x, y, l, t);
    tile(e.w - r, 0, r, t, x + w - r, y, r, t);
    tile(0, e.h - b, l, b, x, y + h - b, l, b);
    tile(e.w - r, e.h - b, r, b, x + w - r, y + h - b, r, b);
    tile(l, 0, cw, t, x + l, y, iw, t);
    tile(l, e.h - b, cw, b, x + l, y + h - b, iw, b);
    tile(0, t, l, ch, x, y + t, l, ih);
    tile(e.w - r, t, r, ch, x + w - r, y + t, r, ih);
    tile(l, t, cw, ch, x + l, y + t, iw, ih);
    if (alpha < 1) ctx.globalAlpha = 1;
  }

  rect(x: number, y: number, w: number, h: number, color: string, alpha = 1): void {
    if (alpha < 1) this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    if (alpha < 1) this.ctx.globalAlpha = 1;
  }

  /** Width of a string in pixels (without outline). */
  measure(text: string, font: FontKey = 'small'): number {
    const f = this.assets.font('font.' + font);
    let w = 0;
    for (const ch of normalize(text, font)) {
      const i = f.glyphs.indexOf(ch);
      w += (i >= 0 ? f.widths[i] : 3) + f.spacing;
    }
    return Math.max(0, w - f.spacing);
  }

  fontHeight(font: FontKey = 'small'): number {
    return font === 'small' ? 5 : 7;
  }

  private tintedFont(font: FontKey, color: string): HTMLCanvasElement {
    const k = font + color;
    let c = this.tintCache.get(k);
    if (!c) {
      c = tinted(this.assets.img('font.' + font), color);
      this.tintCache.set(k, c);
    }
    return c;
  }

  /** Render text to a cached canvas (with outline and shadow) and return it. */
  textCanvas(text: string, o: TextOpts = {}): HTMLCanvasElement {
    const font = o.font ?? 'small';
    const color = o.color ?? '#fff8ec';
    const outline = o.outline === undefined ? INK : o.outline;
    const shadow = o.shadow ?? false;
    const key = `${font}|${color}|${outline}|${shadow}|${text}`;
    const hit = this.textCache.get(key);
    if (hit) return hit;
    const f = this.assets.font('font.' + font);
    const pad = outline ? 1 : 0;
    const w = this.measure(text, font) + pad * 2;
    const h = f.cellH + pad * 2 + (shadow ? 1 : 0);
    const c = document.createElement('canvas');
    c.width = Math.max(1, w);
    c.height = h;
    const ctx = c.getContext('2d')!;
    const drawGlyphs = (src: HTMLCanvasElement, ox: number, oy: number) => {
      let x = pad + ox;
      for (const ch of normalize(text, font)) {
        const i = f.glyphs.indexOf(ch);
        if (i >= 0) ctx.drawImage(src, i * f.cellW, 0, f.widths[i], f.cellH, x, pad + oy, f.widths[i], f.cellH);
        x += (i >= 0 ? f.widths[i] : 3) + f.spacing;
      }
    };
    if (outline) {
      const oc = this.tintedFont(font, outline);
      if (shadow) for (const [dx, dy] of [[-1, 2], [0, 2], [1, 2]]) drawGlyphs(oc, dx, dy);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) drawGlyphs(oc, dx, dy);
    }
    drawGlyphs(this.tintedFont(font, color), 0, 0);
    if (this.textCache.size > 600) this.textCache.clear();
    this.textCache.set(key, c);
    return c;
  }

  /** Draw text with its top at y (the outline extends 1px above). */
  text(text: string, x: number, y: number, o: TextOpts = {}): number {
    const c = this.textCanvas(text, o);
    const pad = (o.outline === undefined ? INK : o.outline) ? 1 : 0;
    const w = c.width - pad * 2;
    let dx = Math.round(x);
    if (o.align === 'center') dx = Math.round(x - w / 2);
    else if (o.align === 'right') dx = Math.round(x - w);
    if (o.alpha !== undefined && o.alpha < 1) this.ctx.globalAlpha = Math.max(0, o.alpha);
    this.ctx.drawImage(c, dx - pad, Math.round(y) - pad);
    this.ctx.globalAlpha = 1;
    return w;
  }
}

/** Fonts are caps-only; the big font keeps a lowercase 'x' as its multiply sign. */
function normalize(text: string, font: FontKey): string {
  return font === 'big' ? text.replace(/[^x]/g, (c) => c.toUpperCase()) : text.toUpperCase();
}
