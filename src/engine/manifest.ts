/** Asset manifest types shared by the art build (writer) and the game (reader). */
export interface ImageEntry {
  kind: 'image';
  file: string;
  w: number;
  h: number;
  /** Drawing origin in image pixels (e.g. feet, ground line). Defaults to top-left. */
  anchor?: [number, number];
  /** 9-slice insets [left, top, right, bottom]. */
  slice?: [number, number, number, number];
}

export interface AnimEntry {
  row: number;
  frames: number;
  fps: number;
  loop: boolean;
  hitFrame?: number;
}

export interface SheetEntry {
  kind: 'sheet';
  file: string;
  frameW: number;
  frameH: number;
  anchor: [number, number];
  anims: Record<string, AnimEntry>;
  /** Projectile release point relative to the anchor, facing right. */
  muzzle?: [number, number];
}

export interface StripEntry {
  kind: 'strip';
  file: string;
  frameW: number;
  frameH: number;
  frames: number;
  fps: number;
  anchor: [number, number];
}

export interface FontEntry {
  kind: 'font';
  file: string;
  cellW: number;
  cellH: number;
  /** Characters in atlas order, one cell each, left to right. */
  glyphs: string;
  widths: number[];
  /** Pixels between letters (before outline). */
  spacing: number;
}

export type AssetEntry = ImageEntry | SheetEntry | StripEntry | FontEntry;

export interface Manifest {
  version: number;
  assets: Record<string, AssetEntry>;
  sounds: Record<string, string>;
  /** Free-form per-asset data (e.g. sky fill colors, layer ground rows). */
  meta: Record<string, Record<string, number | string>>;
}
