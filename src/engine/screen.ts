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
  /** The battle world is drawn on its own layer at a smaller whole-number scale than the UI. */
  worldScale: number;
  ww: number;
  wh: number;
}

/**
 * The battle world uses the same pixel size as the UI: one consistent pixel grid, troops big
 * enough to read, with the tall road (not a smaller scale) giving crowds their room.
 */
export function worldScaleFor(scale: number): number {
  return scale;
}

/** Pure sizing rule, shared with tests. */
export function computeSize(cssW: number, cssH: number, dpr: number): ScreenSize {
  const devW = Math.round(cssW * dpr);
  const devH = Math.round(cssH * dpr);
  const scale = Math.max(1, Math.min(Math.floor(devW / MIN_W), Math.floor(devH / MIN_H)));
  const w = Math.min(MAX_W, Math.floor(devW / scale));
  const h = Math.min(MAX_H, Math.floor(devH / scale));
  const worldScale = worldScaleFor(scale);
  return { w, h, scale, dpr, worldScale, ww: Math.ceil((w * scale) / worldScale), wh: Math.ceil((h * scale) / worldScale) };
}

export class Screen {
  readonly low: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  /** World layer (battle), presented under the UI layer when used this frame. */
  readonly worldLow: HTMLCanvasElement;
  readonly worldCtx: CanvasRenderingContext2D;
  useWorld = false;
  private readonly view: HTMLCanvasElement;
  private readonly viewCtx: CanvasRenderingContext2D;
  size: ScreenSize = { w: 195, h: 422, scale: 2, dpr: 1, worldScale: 3, ww: 130, wh: 282 };
  /** CSS-pixel offset and scale of the visible canvas, for input mapping. */
  cssLeft = 0;
  cssTop = 0;
  cssScale = 1;
  onResize: (() => void) | null = null;
  /**
   * iPhone safe areas (status bar / Dynamic Island, home indicator) in art pixels, measured over the
   * visible canvas. Scenes keep text and taps out of them and let wall art fill them (D39).
   * `?safe=47,34` fakes them (CSS px) for screenshots on desktop.
   */
  insetTop = 0;
  insetBottom = 0;
  private probe: HTMLDivElement;

  constructor(host: HTMLElement) {
    this.probe = document.createElement('div');
    this.probe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)';
    document.body.appendChild(this.probe);
    this.view = document.createElement('canvas');
    this.view.style.position = 'absolute';
    this.view.style.imageRendering = 'pixelated';
    this.view.style.touchAction = 'none';
    host.appendChild(this.view);
    this.viewCtx = this.view.getContext('2d', { alpha: false })!;
    this.low = document.createElement('canvas');
    this.ctx = this.low.getContext('2d')!;
    this.worldLow = document.createElement('canvas');
    this.worldCtx = this.worldLow.getContext('2d')!;
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
    this.worldLow.width = s.ww;
    this.worldLow.height = s.wh;
    this.worldCtx.imageSmoothingEnabled = false;
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
    const [safeTop, safeBottom] = this.safeCss();
    const insetTop = Math.ceil(Math.max(0, safeTop - this.cssTop) / this.cssScale);
    const insetBottom = Math.ceil(Math.max(0, safeBottom - (cssH - this.cssTop - cssViewH)) / this.cssScale);
    const insetChanged = insetTop !== this.insetTop || insetBottom !== this.insetBottom;
    this.insetTop = insetTop;
    this.insetBottom = insetBottom;
    if (changed || insetChanged) this.onResize?.();
  }

  /** Safe-area insets in CSS px (env() values, or the ?safe= override). */
  private safeCss(): [number, number] {
    const q = /[?&]safe=(\d+),(\d+)/.exec(window.location.search);
    if (q) return [Number(q[1]), Number(q[2])];
    const cs = getComputedStyle(this.probe);
    return [parseFloat(cs.paddingTop) || 0, parseFloat(cs.paddingBottom) || 0];
  }

  /** Copy the low-res frame to the visible canvas. */
  present(): void {
    this.viewCtx.imageSmoothingEnabled = false;
    if (this.useWorld) {
      const k = this.size.worldScale;
      this.viewCtx.drawImage(this.worldLow, 0, 0, this.size.ww * k, this.size.wh * k);
    } else {
      this.viewCtx.fillStyle = '#1e1526';
      this.viewCtx.fillRect(0, 0, this.view.width, this.view.height);
    }
    this.viewCtx.drawImage(this.low, 0, 0, this.view.width, this.view.height);
  }

  /** Convert a pointer position (CSS px, client coords) to virtual pixels. */
  toVirtual(clientX: number, clientY: number): [number, number] {
    return [(clientX - this.cssLeft) / this.cssScale, (clientY - this.cssTop) / this.cssScale];
  }
}
