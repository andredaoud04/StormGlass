/**
 * Shared troop-authoring kit for the later Ages (Crusader to Future). Same grammar as the Stone
 * and Ancient grids: one letter per pixel, ramps lit from the top-left, back limbs one step darker.
 */
import { Img, type Color, type Palette } from '../img';
import { BRONZE, HAIR, INK, LEATHER, LINEN, MAIL, MOUTH, ROSE, SKIN, WHITE, WOOD, type Ramp } from '../palette';

type R4 = { hl: Color; base: Color; shade: Color; deep: Color };

/** Letter groups: [highlight, base, shade, deep]. A '-' means the group has no such letter. */
export interface Group {
  letters: [string, string, string, string];
  ramp: R4;
}

export function groups(team: Ramp, over: Partial<Record<string, R4>> = {}): Group[] {
  const g = (letters: string, key: string, ramp: R4): Group => ({ letters: letters.split('') as Group['letters'], ramp: over[key] ?? ramp });
  return [
    g('Sskd', 'skin', SKIN), // d = skin deep (rarely used)
    g('Hhj-', 'hair', HAIR),
    g('UTtY', 'team', team),
    g('Wwv-', 'cloth', LINEN),
    g('MLl-', 'leather', LEATHER),
    g('CBbD', 'wood', WOOD),
    g('qgpP', 'metal', MAIL),
    g('ZzxX', 'gold', BRONZE),
    g('FGfE', 'extra', { hl: 0, base: 0, shade: 0, deep: 0 }), // per-Age extra ramp (felt, khaki, suit)
    g('IiuJ', 'extra2', { hl: 0, base: 0, shade: 0, deep: 0 }), // second extra ramp (helmet, alloy)
  ];
}

const FIXED = (): Palette => ({ e: INK, o: WHITE, r: ROSE, m: MOUTH, n: INK });

export function palOf(gs: Group[]): Palette {
  const p: Palette = FIXED();
  for (const g of gs) {
    const cols = [g.ramp.hl, g.ramp.base, g.ramp.shade, g.ramp.deep];
    g.letters.forEach((l, i) => {
      if (l !== '-') p[l] = cols[i];
    });
  }
  return p;
}

/** Same letters, one ramp step darker (for the far arm and leg). */
export function darkOf(gs: Group[]): Palette {
  const p: Palette = FIXED();
  for (const g of gs) {
    const cols = [g.ramp.base, g.ramp.shade, g.ramp.deep, g.ramp.deep];
    g.letters.forEach((l, i) => {
      if (l !== '-') p[l] = cols[i];
    });
  }
  return p;
}

export const grid = (rows: string[], p: Palette): Img => Img.fromGrid(rows, p);

/** Swap the face rows of a head grid for a hurt look (eyes squeezed, mouth open). */
export function hurtHead(rows: string[], swaps: Record<number, string>): string[] {
  const out = rows.slice();
  for (const [k, v] of Object.entries(swaps)) out[Number(k)] = v;
  return out;
}

/** Kite shield: flat top, tapering point, metal rim, a cross device. */
export function kiteShield(team: Ramp, w: number, h: number, rim: R4 = BRONZE, device: Color = LINEN.hl): Img {
  const img = new Img(w, h);
  const cx = (w - 1) / 2;
  const shoulder = Math.round(h * 0.42);
  for (let y = 0; y < h; y++) {
    const half = y < shoulder ? w / 2 : (w / 2) * (1 - (y - shoulder) / (h - shoulder + 0.6));
    for (let x = 0; x < w; x++) {
      const dx = x + 0.5 - w / 2;
      if (Math.abs(dx) > half) continue;
      const edge = Math.abs(dx) > half - 1 || y === 0;
      let c = edge ? (dx < 0 || y === 0 ? rim.hl : rim.shade) : dx < -w / 5 ? team.hl : dx > w / 5 ? team.shade : team.base;
      const crossV = Math.abs(x - cx) < 0.6 && y > 0 && y < h - 3;
      const crossH = y === Math.max(2, Math.round(h * 0.28)) && !edge;
      if (!edge && (crossV || crossH)) c = device;
      img.set(x, y, c);
    }
  }
  // Round the top corners.
  img.set(0, 0, 0);
  img.set(w - 1, 0, 0);
  return img;
}

/** Thick shaded segment (machine limbs, pistons). */
export function seg(img: Img, x0: number, y0: number, x1: number, y1: number, width: number, ramp: R4): void {
  const len = Math.hypot(x1 - x0, y1 - y0) || 1;
  const nx = -(y1 - y0) / len;
  const ny = (x1 - x0) / len;
  const steps = Math.ceil(len * 2) + 1;
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const cx = x0 + (x1 - x0) * t;
    const cy = y0 + (y1 - y0) * t;
    for (let k = -width / 2 + 0.5; k <= width / 2 - 0.5; k += 0.5) {
      const rel = k / (width / 2);
      const c = rel < -0.4 ? ramp.hl : rel > 0.4 ? ramp.shade : ramp.base;
      img.set(Math.round(cx + nx * k), Math.round(cy + ny * k), c);
    }
  }
}

export { WOOD, LEATHER };
