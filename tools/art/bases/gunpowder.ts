/** Gunpowder Age fortress: sloped coastal bastion with cannon embrasures and a domed sentry box. */
import { Img, bayer, hex } from '../img';
import { BRONZE, INK, SAND, STEEL, WOOD, type Ramp } from '../palette';
import { rand } from '../env/paint';
import { BASE_GROUND, BASE_H, BASE_W } from './stone';

const BRICK = { hl: hex('#f2c8a0'), base: hex('#d89a70'), shade: hex('#b0734e'), deep: hex('#7e4e36') };

function bricks(img: Img, x0: number, y0: number, x1: number, y1: number, slope: number): void {
  for (let y = y0; y <= y1; y++) {
    const inset = Math.round((y1 - y) * slope);
    const row = Math.floor((y - y0) / 3);
    for (let x = x0 + inset; x <= x1; x++) {
      const bx = (x + (row % 2 ? 3 : 0)) % 6;
      let c = (y - y0) % 3 === 2 || bx === 5 ? BRICK.shade : BRICK.base;
      if (x === x0 + inset) c = BRICK.hl;
      if (x === x1) c = BRICK.deep;
      img.set(x, y, c);
    }
  }
}

export function gunpowderFortress(team: Ramp, damage: 0 | 1 | 2 | 3): Img {
  const r = rand(1648 + damage);
  const img = new Img(BASE_W - 2, BASE_H - 2);
  const G = BASE_GROUND - 1;
  img.ellipse(30, G + 4, 33, 8, (_x, _y, nx, ny) => (ny < -0.4 ? SAND.hl : ny > 0.3 ? SAND.deep : nx > 0.45 ? SAND.shade : SAND.base));
  if (damage === 3) {
    for (let i = 0; i < 18; i++) {
      const x = 2 + Math.floor(r() * 54);
      const y = G - 3 - Math.floor(r() * 8);
      img.rect(x, y, 5, 3, BRICK.base);
      img.hline(x, x + 4, y, BRICK.hl);
    }
    img.rect(30, G - 8, 12, 3, STEEL.deep);
    return img.outlined(INK);
  }
  // Sentry box (garita) with a domed roof on the rear corner.
  const sx = 8;
  const boxTop = damage === 2 ? 40 : 28;
  bricks(img, sx, boxTop, sx + 14, 52, 0);
  img.rect(sx + 5, boxTop + 6, 4, 6, hex('#2b1d22'));
  if (damage < 2) {
    img.ellipse(sx + 7.5, boxTop, 9, 7, (_x, _y, nx, ny) => (ny > 0.3 ? BRICK.deep : nx + ny < -0.4 ? SAND.hl : nx > 0.3 ? SAND.shade : SAND.base));
    img.rect(sx - 1, boxTop - 1, 17, 2, SAND.deep);
    img.vline(sx + 7, boxTop - 10, boxTop - 7, BRONZE.base);
    img.set(sx + 7, boxTop - 11, BRONZE.hl);
  }
  // Main sloped rampart.
  const wallTop = 44;
  bricks(img, 0, wallTop, 56, G - 3, 0.12);
  // Parapet cap.
  img.rect(0, wallTop - 3, 57, 3, SAND.base);
  img.hline(0, 56, wallTop - 3, SAND.hl);
  img.hline(0, 56, wallTop - 1, SAND.shade);
  // Cannon embrasures with barrels.
  for (const [ex, gone] of [[16, damage === 2], [36, damage >= 1]] as const) {
    img.rect(ex, wallTop - 3, 7, 4, hex('#2b1d22'));
    if (!gone) {
      img.rect(ex + 3, wallTop - 2, 9, 3, STEEL.deep);
      img.hline(ex + 3, ex + 11, wallTop - 2, STEEL.shade);
      img.set(ex + 11, wallTop - 1, hex('#120c18'));
    }
  }
  // Team flags hanging under the parapet.
  for (const bx of [4, 28]) {
    if (damage === 2 && bx === 28) continue;
    for (let y = wallTop + 2; y < wallTop + 15; y++) {
      const w = y > wallTop + 12 ? 6 - (y - (wallTop + 12)) * 2 : 6;
      for (let i = 0; i < w; i++) img.set(bx + (6 - w) / 2 + i, y, i === 0 ? team.hl : i === w - 1 ? team.shade : team.base);
    }
  }
  // Gate: stone arch with timber doors.
  const gx = 40;
  img.ellipse(gx + 6, G - 14, 6, 5, SAND.base);
  img.rect(gx, G - 14, 13, 11, SAND.base);
  img.ellipse(gx + 6, G - 14, 4.5, 4, hex('#2b1d22'));
  img.rect(gx + 2, G - 14, 9, 11, WOOD.base);
  for (let x = gx + 3; x < gx + 11; x += 2) img.vline(x, G - 13, G - 4, WOOD.shade);
  img.hline(gx + 2, gx + 10, G - 9, STEEL.shade);
  // Lantern post on the parapet (flame is an FX sprite).
  img.vline(52, wallTop - 9, wallTop - 4, WOOD.deep);
  img.rect(50, wallTop - 10, 5, 2, STEEL.base);
  if (damage >= 1) {
    for (let i = 0; i < damage * 5; i++) {
      const x = 3 + Math.floor(r() * 50);
      const y = wallTop + 4 + Math.floor(r() * 24);
      img.ellipse(x, y, 2.5, 2, hex('#3a2622'));
    }
    for (let i = 0; i < 30 * damage; i++) {
      const x = Math.floor(r() * 56);
      const y = wallTop + Math.floor(r() * 30);
      if (img.opaque(x, y) && bayer(x, y) < 0.4) img.set(x, y, BRICK.deep);
    }
  }
  return img.outlined(INK);
}
