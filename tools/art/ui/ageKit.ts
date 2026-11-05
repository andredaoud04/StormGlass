/**
 * Per-Age HUD kit (D39, Locked Rule 10): every battle control is cut from the same material as that
 * Age's wall, so the HUD matches the battlefield instead of one generic kit for all six Ages.
 * Pieces: troop card (dark well, and a lit well when affordable), skill socket, hero niche, Food
 * niche (9-slice), top beam, and the menu backdrop.
 */
import { Img, bayer, hex, mix, type Color } from '../img';
import { ALLOY, BONE, BRICK, BRONZE, FIRE, GOLD, INK, IRON, LINEN, MAIL, MOSS, PLASMA, SAND, STONE, WOOD } from '../palette';
import type { UiPiece } from './ui';

type R4 = { hl: Color; base: Color; shade: Color; deep: Color };
const r4 = (r: R4): R4 => ({ hl: r.hl, base: r.base, shade: r.shade, deep: r.deep });
const DARK = hex('#2a1f2e');
const DARKER = hex('#1f1724');

export interface AgeKit {
  /** Card frame and Food niche rim. */
  frame: R4;
  /** Socket rims. */
  ring: R4;
  /** Corner pins and small trim. */
  trim: R4;
  /** Card well when the troop can't be afforded (dark Age tone) and when it can (Age accent). */
  well: Color;
  lit: R4;
}

export const AGE_KITS: Record<string, AgeKit> = {
  stone: { frame: r4(WOOD), ring: r4(STONE), trim: r4(BONE), well: hex('#2a2a34'), lit: r4(MOSS) },
  ancient: { frame: r4(SAND), ring: r4(SAND), trim: r4(BRONZE), well: hex('#3a2a28'), lit: r4(BRONZE) },
  crusader: { frame: r4(LINEN), ring: r4(STONE), trim: r4(GOLD), well: hex('#2c2a3c'), lit: r4(GOLD) },
  gunpowder: { frame: { hl: hex('#b07a4a'), base: hex('#7f4f30'), shade: hex('#5e3622'), deep: hex('#3e2216') }, ring: r4(IRON), trim: r4(IRON), well: hex('#2e2420'), lit: r4(FIRE) },
  industrial: { frame: r4(MAIL), ring: r4(IRON), trim: r4(BRICK), well: hex('#2a2626'), lit: r4(BRICK) },
  future: { frame: r4(ALLOY), ring: r4(ALLOY), trim: r4(PLASMA), well: hex('#1e2236'), lit: { hl: PLASMA.base, base: PLASMA.shade, shade: PLASMA.deep, deep: hex('#1d528f') } },
};

function pins(img: Img, trim: R4, pts: number[][]): void {
  for (const [x, y] of pts) {
    img.set(x, y, trim.hl);
    img.set(x + 1, y, trim.base);
    img.set(x, y + 1, trim.base);
    img.set(x + 1, y + 1, trim.deep);
  }
}

function roundCorners(img: Img): Img {
  for (const [cx, cy] of [[0, 0], [img.w - 1, 0], [0, img.h - 1], [img.w - 1, img.h - 1]]) {
    img.set(cx, cy, 0);
    img.set(cx + (cx ? -1 : 1), cy, 0);
    img.set(cx, cy + (cy ? -1 : 1), 0);
    img.set(cx + (cx ? -1 : 1), cy + (cy ? -1 : 1), INK);
  }
  return img;
}

/** Troop card, 38x46: Age frame, portrait well (dark, or lit with the Age accent), cost band. */
export function ageCard(kit: AgeKit, lit: boolean): UiPiece {
  const W = 38, H = 46;
  const f = kit.frame;
  const img = new Img(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let c = f.base;
      if (x === 0 || y === 0) c = f.hl;
      else if (x === W - 1 || y === H - 1) c = f.deep;
      else if (y === H - 2) c = f.shade;
      else if (bayer(x, y) < 0.07) c = f.shade;
      img.set(x, y, c);
    }
  }
  const wx = 3, wy = 3, ww = W - 6, wh = 28;
  for (let y = 0; y < wh; y++) {
    for (let x = 0; x < ww; x++) {
      const t = y / wh;
      let c: Color;
      if (lit) {
        c = t < 0.45 ? kit.lit.shade : kit.lit.deep;
        if (t >= 0.3 && t < 0.6 && bayer(x, y) < (t - 0.3) / 0.3) c = kit.lit.deep;
        if (y < 2) c = kit.lit.base;
      } else {
        c = mix(kit.well, DARKER, t * 0.6);
        if (y < 1) c = mix(kit.well, f.deep, 0.5);
      }
      img.set(wx + x, wy + y, c);
    }
  }
  img.hline(wx - 1, wx + ww, wy - 1, f.deep);
  img.vline(wx - 1, wy - 1, wy + wh, f.deep);
  img.hline(wx - 1, wx + ww, wy + wh, f.hl);
  img.vline(wx + ww, wy - 1, wy + wh, f.hl);
  const by = wy + wh + 2;
  img.rect(3, by, W - 6, H - by - 3, DARK);
  img.hline(3, W - 4, by, DARKER);
  pins(img, kit.trim, [[1, 1], [W - 3, 1]]);
  return { img: roundCorners(img.outlined(INK)), desc: lit ? 'Troop card, affordable: the well lights with the Age accent.' : 'Troop card in the Age material. Portrait window at (4,4) size 32x28; cost band below.' };
}

/** Round skill socket in the Age material (solid, never see-through). */
export function ageSocket(kit: AgeKit, size: number, niche: boolean): UiPiece {
  const img = new Img(size, size + 3);
  const c = (size - 1) / 2;
  const rim = kit.ring;
  img.ellipse(c + 0.5, c + 3.5, size / 2, size / 2, DARKER);
  img.ellipse(c + 0.5, c + 0.5, size / 2, size / 2, (_x, _y, nx, ny) => (nx + ny < -0.6 ? rim.hl : nx + ny > 0.7 ? rim.deep : nx + ny > 0.2 ? rim.shade : rim.base));
  const inner = size / 2 - (niche ? 5 : 3);
  img.ellipse(c + 0.5, c + 0.5, inner, inner, (_x, _y, _nx, ny) => (ny < -0.55 ? DARKER : mix(hex('#3a2c40'), DARK, (ny + 1) / 2)));
  if (niche) {
    // An empty carved niche: a deeper inner ring and four trim studs, so it reads as masonry waiting
    // for its piece rather than a broken button.
    img.ellipse(c + 0.5, c + 0.5, inner - 3, inner - 3, (_x, _y, _nx, ny) => (ny < 0 ? DARKER : DARK));
    for (let a = 0; a < 4; a++) {
      const ang = (a / 4) * Math.PI * 2 + Math.PI / 4;
      const px = Math.round(c + Math.cos(ang) * (size / 2 - 2.5));
      const py = Math.round(c + Math.sin(ang) * (size / 2 - 2.5));
      img.set(px, py, kit.trim.base);
      img.set(px, py + 1, kit.trim.deep);
    }
  }
  return { img: img.outlined(INK), anchor: [Math.round(c) + 1, Math.round(c) + 1], desc: niche ? 'Empty carved niche (Hero or an unused Skill) in the Age material.' : 'Skill socket in the Age material.' };
}

/** Food niche: a dark recess with an Age-material lip. 9-slice. */
export function ageNiche(kit: AgeKit): UiPiece {
  const S = 16;
  const f = kit.frame;
  const img = new Img(S, S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      let c = f.base;
      if (x === 0 || y === 0) c = f.hl;
      else if (x === S - 1 || y === S - 1) c = f.deep;
      else if (x === 1 || y === 1) c = f.base;
      else if (x === S - 2 || y === S - 2) c = f.shade;
      else if (x === 2 || y === 2) c = DARKER;
      else c = DARK;
      img.set(x, y, c);
    }
  }
  return { img: roundCorners(img.outlined(INK)), slice: [5, 5, 5, 5], desc: 'Food niche: dark recess in the Age material. 9-slice.' };
}

/**
 * Top beam: the Age wall's courses, darkened so the fight stays the brightest thing on screen, with
 * the wall's coping as the bottom trim. Anchor = bottom-centre; extra body rows fill a status bar inset.
 */
export function ageBeam(wall: Img): UiPiece {
  const W = wall.w, BODY = 72, COPING = 11;
  const img = new Img(W, BODY + COPING);
  for (let y = 0; y < BODY; y++) {
    const sy = 18 + ((y + 200) % 60);
    for (let x = 0; x < W; x++) {
      const c = wall.get(x, sy);
      img.set(x, y, c ? mix(c, DARK, 0.55) : DARK);
    }
  }
  for (let y = 0; y < COPING; y++) for (let x = 0; x < W; x++) img.set(x, BODY + y, wall.get(x, 6 + y) || INK);
  img.hline(0, W - 1, BODY + COPING - 1, INK);
  return { img, anchor: [W / 2, BODY + COPING], desc: 'Battle top band in the Age wall material (darkened courses over the coping). Anchor = bottom-centre.' };
}

/** Menu backdrop from the Age wall: darkened courses, mirrored so it tiles vertically without a seam. */
export function ageBackdrop(wall: Img): UiPiece {
  const band = 184;
  const W = wall.w;
  const img = new Img(W, band * 2);
  for (let y = 0; y < band; y++) {
    for (let x = 0; x < W; x++) {
      const c = wall.get(x, 16 + y);
      const d = c ? mix(c, DARK, 0.5) : DARK;
      img.set(x, y, d);
      img.set(x, band * 2 - 1 - y, d);
    }
  }
  return { img, slice: [0, 0, 0, 0], desc: 'Menu backdrop in the current Age wall material, darkened so panels stand out. Tiles vertically.' };
}
