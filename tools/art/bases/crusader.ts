/** Crusader Age fortress: grey stone castle with a round slate-roofed tower, portcullis and banners. */
import { Img, bayer, hex } from '../img';
import { INK, STEEL, WOOD, type Ramp } from '../palette';
import { rand } from '../env/paint';
import { BASE_GROUND, BASE_H, BASE_W } from './stone';

const CASTLE = { hl: hex('#d2d4dc'), base: hex('#a4a7b4'), shade: hex('#7c7f8e'), deep: hex('#585a68'), dark: hex('#3a3b48') };
const SLATE = { hl: hex('#8aa0c8'), base: hex('#5e74a0'), shade: hex('#44567e'), deep: hex('#2e3a5a') };

function masonry(img: Img, x0: number, y0: number, x1: number, y1: number): void {
  for (let y = y0; y <= y1; y++) {
    const row = Math.floor((y - y0) / 4);
    const off = row % 2 ? 3 : 0;
    for (let x = x0; x <= x1; x++) {
      const bx = (x - x0 + off) % 6;
      const by = (y - y0) % 4;
      let c = CASTLE.base;
      if (by === 3 || bx === 5) c = CASTLE.shade;
      else if (by === 0 || bx === 0) c = CASTLE.hl;
      if (x === x1) c = CASTLE.deep;
      img.set(x, y, c);
    }
  }
}

function merlons(img: Img, x0: number, x1: number, y: number, skip: (i: number) => boolean): void {
  for (let x = x0, i = 0; x <= x1 - 3; x += 6, i++) {
    if (skip(i)) continue;
    masonry(img, x, y - 4, x + 3, y - 1);
  }
}

export function crusaderFortress(team: Ramp, damage: 0 | 1 | 2 | 3): Img {
  const r = rand(523 + damage);
  const img = new Img(BASE_W - 2, BASE_H - 2);
  const G = BASE_GROUND - 1;
  // Grassy rock footing.
  img.ellipse(30, G + 4, 33, 8, (_x, _y, nx, ny) => (ny < -0.4 ? CASTLE.hl : ny > 0.3 ? CASTLE.dark : nx > 0.45 ? CASTLE.deep : CASTLE.shade));
  if (damage === 3) {
    for (let i = 0; i < 16; i++) {
      const x = 2 + Math.floor(r() * 54);
      const y = G - 4 - Math.floor(r() * 8);
      masonry(img, x, y, x + 4, y + 3);
    }
    img.poly([[14, G - 9], [24, G - 18], [32, G - 9]], SLATE.shade);
    return img.outlined(INK);
  }
  // Round tower with conical slate roof.
  const tl = 12, tr = 32;
  const towerTop = damage === 2 ? 32 : 22;
  for (let y = towerTop; y < G - 4; y++) {
    for (let x = tl; x <= tr; x++) {
      const t = (x - tl) / (tr - tl);
      const row = Math.floor((y - towerTop) / 4);
      const off = row % 2 ? 2 : 0;
      let c = t < 0.25 ? CASTLE.hl : t < 0.65 ? CASTLE.base : t < 0.85 ? CASTLE.shade : CASTLE.deep;
      if ((y - towerTop) % 4 === 3 || (x - tl + off) % 5 === 4) c = t < 0.65 ? CASTLE.shade : CASTLE.deep;
      img.set(x, y, c);
    }
  }
  // Arrow slits.
  img.rect(21, towerTop + 7, 2, 6, CASTLE.dark);
  img.rect(21, towerTop + 18, 2, 6, CASTLE.dark);
  if (damage < 2) {
    const cx = (tl + tr) / 2;
    img.poly([[tl - 3, towerTop], [cx, towerTop - 20], [tr + 3, towerTop]], (x, y) => (x < cx - 3 ? SLATE.hl : x < cx + 2 ? SLATE.base : (y + x) % 3 === 0 ? SLATE.deep : SLATE.shade));
    for (let y = towerTop - 16; y < towerTop; y += 3) img.hline(Math.round(cx - (towerTop - y) * 0 - 1), Math.round(cx), y, SLATE.shade);
    img.hline(tl - 3, tr + 3, towerTop, SLATE.deep);
    if (damage === 1) {
      img.ellipse(cx + 5, towerTop - 7, 2.5, 2, INK);
      img.set(cx + 3, towerTop - 5, SLATE.hl);
    }
  } else merlons(img, tl, tr, towerTop, (i) => i % 2 === 1);

  // Curtain wall with battlements.
  const wallTop = 46;
  masonry(img, 0, wallTop, 54, G - 4);
  merlons(img, 0, 54, wallTop, (i) => damage >= 1 && i % (damage === 2 ? 2 : 4) === 1);
  // Team banners on the wall.
  for (const bx of [4, 26]) {
    if (damage === 2 && bx === 26) continue;
    for (let y = wallTop + 3; y < wallTop + 17; y++) {
      const w = y > wallTop + 14 ? 6 - (y - (wallTop + 14)) * 2 : 6;
      for (let i = 0; i < w; i++) img.set(bx + (6 - w) / 2 + i, y, i === 0 ? team.hl : i === w - 1 ? team.shade : y === wallTop + 8 ? 0xfff8ecff : team.base);
    }
    img.hline(bx - 1, bx + 6, wallTop + 2, WOOD.deep);
  }
  // Gate arch with a raised portcullis.
  const gx = 38;
  img.ellipse(gx + 7, G - 16, 7, 6, CASTLE.dark);
  img.rect(gx, G - 16, 15, 12, CASTLE.dark);
  for (let x = gx + 1; x < gx + 14; x += 3) img.vline(x, G - 20, G - 13, STEEL.shade);
  img.hline(gx + 1, gx + 13, G - 14, STEEL.base);
  img.hline(gx + 1, gx + 13, G - 17, STEEL.shade);
  // Brazier on the battlement (flame is an FX sprite).
  img.rect(46, wallTop - 9, 6, 3, STEEL.base);
  img.hline(46, 51, wallTop - 9, STEEL.hl);
  img.vline(48, wallTop - 6, wallTop - 5, STEEL.deep);
  if (damage >= 1) {
    for (let i = 0; i < damage * 5; i++) {
      const x = 2 + Math.floor(r() * 50);
      const y = wallTop + 4 + Math.floor(r() * 26);
      img.ellipse(x, y, 2.5, 1.8, CASTLE.dark);
      img.line(x + 2, y, x + 5, y + 3, CASTLE.deep);
    }
    for (let i = 0; i < 30 * damage; i++) {
      const x = Math.floor(r() * 56);
      const y = wallTop + Math.floor(r() * 30);
      if (img.opaque(x, y) && bayer(x, y) < 0.4) img.set(x, y, CASTLE.deep);
    }
  }
  return img.outlined(INK);
}
