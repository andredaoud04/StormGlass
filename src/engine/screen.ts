/**
 * Pixel-perfect screen. The game draws into a low-resolution canvas (1 unit = 1 art pixel),
 * which is copied to the visible canvas at a whole-number scale with smoothing off.
 * The art scale is chosen so the virtual screen is about 180-256 px wide and at least 330 tall.
 */
export const MIN_W = 180;
export const MAX_W = 256;
export const MIN_H = 330;
export const MAX_H = 560;

export interface ScreenSize {
  /** Virtual (art pixel) size. */
  w: number;
  h: number;
  /** Device pixels per art pixel. */
  scale: number;
  dpr: number;
}

/** Pure sizing rule, shared with tests. */
export function computeSize(cssW: number, cssH: number, dpr: number): ScreenSize {
  const devW = Math.round(cssW * dpr);
  const devH = Math.round(cssH * dpr);
  const scale = Math.max(1, Math.min(Math.floor(devW / MIN_W), Math.floor(devH / MIN_H)));
  const w = Math.min(MAX_W, Math.floor(devW / scale));
  const h = Math.min(MAX_H, Math.floor(devH / scale));
  return { w, h, scale, dpr };
}

export class Screen {
  readonly low: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  private readonly view: HTMLCanvasElement;
  private readonly viewCtx: CanvasRenderingContext2D;
  size: ScreenSize = { w: 195, h: 422, scale: 2, dpr: 1 };
  /** CSS-pixel offset and scale of the visible canvas, for input mapping. */
  cssLeft = 0;
  cssTop = 0;
  cssScale = 1;
  onResize: (() => void) | null = null;

  constructor(host: HTMLElement) {
    this.view = document.createElement('canvas');
    this.view.style.position = 'absolute';
    this.view.style.imageRendering = 'pixelated';
    this.view.style.touchAction = 'none';
    host.appendChild(this.view);
    this.viewCtx = this.view.getContext('2d', { alpha: false })!;
    this.low = document.createElement('canvas');
    this.ctx = this.low.getContext('2d')!;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.visualViewport?.addEventListener('resize', () => this.resize());
  }

  get canvas(): HTMLCanvasElement {
    return this.view;
  }

  resize(): void {
    const vv = window.visualViewport;
    const cssW = vv?.width ?? window.innerWidth;
    const cssH = vv?.height ?? window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    const s = computeSize(cssW, cssH, dpr);
    const changed = s.w !== this.size.w || s.h !== this.size.h || s.scale !== this.size.scale || s.dpr !== this.size.dpr;
    this.size = s;
    this.low.width = s.w;
    this.low.height = s.h;
    this.ctx.imageSmoothingEnabled = false;
    this.view.width = s.w * s.scale;
    this.view.height = s.h * s.scale;
    const cssViewW = (s.w * s.scale) / dpr;
    const cssViewH = (s.h * s.scale) / dpr;
    this.cssLeft = Math.round(((cssW - cssViewW) / 2) * dpr) / dpr;
    this.cssTop = Math.round(((cssH - cssViewH) / 2) * dpr) / dpr;
    this.cssScale = s.scale / dpr;
    this.view.style.width = `${cssViewW}px`;
    this.view.style.height = `${cssViewH}px`;
    this.view.style.left = `${this.cssLeft}px`;
    this.view.style.top = `${this.cssTop}px`;
    this.viewCtx.imageSmoothingEnabled = false;
    if (changed) this.onResize?.();
  }

  /** Copy the low-res frame to the visible canvas. */
  present(): void {
    this.viewCtx.imageSmoothingEnabled = false;
    this.viewCtx.drawImage(this.low, 0, 0, this.view.width, this.view.height);
  }

  /** Convert a pointer position (CSS px, client coords) to virtual pixels. */
  toVirtual(clientX: number, clientY: number): [number, number] {
    return [(clientX - this.cssLeft) / this.cssScale, (clientY - this.cssTop) / this.cssScale];
  }
}
