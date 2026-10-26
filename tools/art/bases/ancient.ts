/** Ancient Age fortress: sandstone walls on stepped plinth, marble columns, terracotta pediment. */
import { Img, bayer, hex } from '../img';
import { BRONZE, INK, LINEN, SAND, type Ramp } from '../palette';
import { rand } from '../env/paint';
import { BASE_GROUND, BASE_H, BASE_W } from './stone';

const TILE = { hl: hex('#f2946a'), base: hex('#d0603e'), shade: hex('#a23f2c'), deep: hex('#6e2a22') };
const MARBLE = { hl: hex('#ffffff'), base: LINEN.hl, shade: LINEN.base, deep: LINEN.shade };

function blocks(img: Img, x0: number, y0: number, x1: number, y1: number, holes: number, r: () => number): void {
  for (let y = y0; y <= y1; y++) {
    const row = Math.floor((y - y0) / 5);
    const off = row % 2 ? 4 : 0;
    for (let x = x0; x <= x1; x++) {
      const bx = (x - x0 + off) % 8;
      const by = (y - y0) % 5;
      let c = SAND.base;
      if (by === 4 || bx === 7) c = SAND.shade;
      else if (by === 0 || bx === 0) c = SAND.hl;
      if (x === x1 && by !== 4) c = SAND.shade;
      img.set(x, y, c);
    }
  }
  for (let i = 0; i < holes; i++) {
    const x = x0 + 2 + Math.floor(r() * (x1 - x0 - 4));
    const y = y0 + 3 + Math.floor(r() * (y1 - y0 - 6));
    img.ellipse(x, y, 2.5, 1.8, SAND.dark);
    img.set(x - 1, y - 1, SAND.deep);
    img.line(x + 2, y, x + 5, y + 3, SAND.deep);
  }
}

function column(img: Img, x: number, top: number, bottom: number, broken: boolean): void {
  const h = broken ? Math.round((bottom - top) * 0.45) : bottom - top;
  const t = bottom - h;
  for (let y = t; y <= bottom; y++) {
    img.set(x, y, MARBLE.hl);
    img.set(x + 1, y, MARBLE.base);
    img.set(x + 2, y, MARBLE.base);
    img.set(x + 3, y, MARBLE.shade);
    if ((y & 1) === 0) img.set(x + 2, y, MARBLE.shade);
  }
  if (!broken) {
    img.rect(x - 1, t - 2, 6, 2, MARBLE.base);
    img.hline(x - 1, x + 4, t - 2, MARBLE.hl);
  } else {
    img.set(x + 1, t, 0);
    img.set(x + 3, t, 0);
  }
  img.rect(x - 1, bottom - 1, 6, 2, MARBLE.shade);
}

export function ancientFortress(team: Ramp, damage: 0 | 1 | 2 | 3): Img {
  const r = rand(311 + damage);
  const img = new Img(BASE_W - 2, BASE_H - 2);
  const G = BASE_GROUND - 1;

  // Stepped plinth.
  for (let s = 0; s < 3; s++) {
    const y = G - 2 + s * 3 - 3;
    const x0 = 2 - s * 2;
    const x1 = 60 + s * 2;
    for (let yy = y; yy < y + 3; yy++) for (let x = Math.max(0, x0); x <= Math.min(img.w - 1, x1); x++) img.set(x, yy, yy === y ? SAND.hl : yy === y + 2 ? SAND.deep : SAND.base);
  }
  if (damage === 3) {
    for (let i = 0; i < 14; i++) {
      const x = 2 + Math.floor(r() * 54);
      const y = G - 6 - Math.floor(r() * 7);
      img.rect(x, y, 6, 4, SAND.base);
      img.hline(x, x + 5, y, SAND.hl);
      img.hline(x, x + 5, y + 3, SAND.shade);
    }
    column(img, 50, G - 30, G - 3, true);
    img.poly([[10, G - 8], [22, G - 15], [30, G - 8]], TILE.shade);
    return img.outlined(INK);
  }

  // Tower with a terracotta pediment roof.
  const tl = 12, tr = 36;
  const towerTop = damage === 2 ? 34 : 22;
  blocks(img, tl, towerTop, tr, G - 6, damage * 2, r);
  // Windows.
  img.rect(19, towerTop + 8, 3, 5, SAND.dark);
  img.rect(27, towerTop + 8, 3, 5, SAND.dark);
  img.set(19, towerTop + 8, SAND.deep);
  img.set(27, towerTop + 8, SAND.deep);
  if (damage < 2) {
    // Frieze band.
    img.rect(tl - 1, towerTop - 3, tr - tl + 3, 3, MARBLE.base);
    for (let x = tl; x <= tr; x += 3) img.set(x, towerTop - 2, TILE.shade);
    // Pediment.
    const cx = (tl + tr) / 2;
    img.poly([[tl - 3, towerTop - 3], [cx, towerTop - 15], [tr + 3, towerTop - 3]], (x, y) => (y > towerTop - 6 ? TILE.shade : x < cx - 2 ? TILE.hl : (x + y) % 4 === 0 ? TILE.shade : TILE.base));
    img.poly([[tl + 3, towerTop - 5], [cx, towerTop - 11], [tr - 3, towerTop - 5]], MARBLE.base);
    img.ellipse(cx, towerTop - 7, 2, 1.5, team.base);
    if (damage === 1) {
      img.ellipse(cx + 6, towerTop - 8, 2.5, 2, INK);
      img.set(cx + 4, towerTop - 6, TILE.deep);
    }
  }

  // Front wall with crenellations.
  const wallTop = 48;
  blocks(img, 0, wallTop, 52, G - 4, damage * 3, r);
  for (let x = 0; x <= 48; x += 7) {
    if (damage >= 1 && (x / 7) % (damage === 2 ? 2 : 4) === 1) continue;
    blocks(img, x, wallTop - 4, x + 4, wallTop - 1, 0, r);
  }
  // Hanging team banners.
  for (const bx of [6, 24]) {
    if (damage === 2 && bx === 24) continue;
    for (let y = wallTop + 2; y < wallTop + 16; y++) {
      const w = y > wallTop + 13 ? 5 - (y - (wallTop + 13)) * 2 : 5;
      for (let i = 0; i < w; i++) img.set(bx + (5 - w) / 2 + i, y, i === 0 ? team.hl : i === w - 1 ? team.shade : team.base);
    }
    img.hline(bx - 1, bx + 5, wallTop + 1, BRONZE.shade);
  }
  // Gate with bronze doors, flanked by marble columns.
  const gx = 38;
  img.rect(gx, G - 18, 12, 14, hex('#2b1d22'));
  img.rect(gx + 1, G - 17, 4, 13, BRONZE.shade);
  img.vline(gx + 1, G - 17, G - 5, BRONZE.base);
  img.set(gx + 4, G - 11, BRONZE.hl);
  img.rect(gx - 2, G - 21, 16, 3, MARBLE.base);
  img.hline(gx - 2, gx + 13, G - 21, MARBLE.hl);
  column(img, gx - 6, G - 32, G - 4, damage === 2);
  column(img, gx + 14, G - 32, G - 4, damage >= 1);
  // Bronze brazier on the wall (flame is an FX sprite).
  img.rect(4, wallTop - 8, 6, 3, BRONZE.base);
  img.hline(4, 9, wallTop - 8, BRONZE.hl);
  img.vline(6, wallTop - 5, wallTop - 4, BRONZE.deep);

  if (damage >= 1) {
    for (let i = 0; i < 30 * damage; i++) {
      const x = Math.floor(r() * 56);
      const y = wallTop + Math.floor(r() * 30);
      if (img.opaque(x, y) && bayer(x, y) < 0.4) img.set(x, y, SAND.deep);
    }
  }
  return img.outlined(INK);
}
