/** Loads public/assets/manifest.json and every image it lists. */
import type { AssetEntry, FontEntry, Manifest, SheetEntry, StripEntry, ImageEntry } from './manifest';

export type Drawable = HTMLImageElement | HTMLCanvasElement;

export class Assets {
  manifest!: Manifest;
  private images = new Map<string, Drawable>();
  private whites = new Map<string, HTMLCanvasElement>();
  private base = './assets/';

  async load(base = './assets/', onProgress?: (done: number, total: number) => void): Promise<void> {
    this.base = base;
    const res = await fetch(base + 'manifest.json', { cache: 'no-cache' });
    this.manifest = (await res.json()) as Manifest;
    const entries = Object.entries(this.manifest.assets);
    let done = 0;
    await Promise.all(
      entries.map(async ([key, e]) => {
        const img = new Image();
        img.src = this.base + e.file;
        await img.decode().catch(() => new Promise((r) => (img.onload = r)));
        this.images.set(key, img);
        done++;
        onProgress?.(done, entries.length);
      }),
    );
  }

  has(key: string): boolean {
    return this.images.has(key);
  }

  entry<T extends AssetEntry = AssetEntry>(key: string): T {
    const e = this.manifest.assets[key];
    if (!e) throw new Error(`Missing asset ${key}`);
    return e as T;
  }
  image(key: string): ImageEntry {
    return this.entry<ImageEntry>(key);
  }
  sheet(key: string): SheetEntry {
    return this.entry<SheetEntry>(key);
  }
  strip(key: string): StripEntry {
    return this.entry<StripEntry>(key);
  }
  font(key: string): FontEntry {
    return this.entry<FontEntry>(key);
  }

  img(key: string): Drawable {
    const i = this.images.get(key);
    if (!i) throw new Error(`Image not loaded: ${key}`);
    return i;
  }

  /** White silhouette of an image, for hit flashes. */
  white(key: string): HTMLCanvasElement {
    let c = this.whites.get(key);
    if (!c) {
      c = tinted(this.img(key), '#ffffff');
      this.whites.set(key, c);
    }
    return c;
  }

  meta(key: string): Record<string, number | string> {
    return this.manifest.meta[key] ?? {};
  }
}

export function tinted(src: Drawable, color: string): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, c.width, c.height);
  return c;
}
