/** Crusader Age fortress: limestone keep with crenels, drum tower with a team roof, portcullis gate. */
import { Img, bayer, hex, type Color } from '../img';
import { INK, IRON, LINEN, MOSS, WOOD, type Ramp } from '../palette';
import { rand } from '../env/paint';
import { BASE_GROUND, BASE_H, BASE_W } from './stone';

export const LIME = { hl: hex('#ece6d6'), base: hex('#c2baa6'), shade: hex('#948c7a'), deep: hex('#655e52'), dark: hex('#3a3338') };

/** Coursed ashlar: offset rows of blocks lit from the top-left. */
export function ashlar(img: Img, x0: number, y0: number, x1: number, y1: number, ramp: typeof LIME, bw = 7, bh = 4): void {
  for (let y = y0; y <= y1; y++) {
    const row = Math.floor((y - y0) / bh);
    const off = row % 2 ? Math.floor(bw / 2) : 0;
    for (let x = x0; x <= x1; x++) {
      const bx = (x - x0 + off) % bw;
      const by = (y - y0) % bh;
      let c = ramp.base;
      if (by === bh - 1 || bx === bw - 1) c = ramp.shade;
      else if (by === 0 || bx === 0) c = ramp.hl;
      else if (((x * 7 + row * 5) >> 2) % 5 === 0) c = ramp.hl;
      if (x === x1 && by !== bh - 1) c = ramp.shade;
      img.set(x, y, c);
    }
  }
}

function merlons(img: Img, x0: number, x1: number, top: number, ramp: typeof LIME, skip: (i: number) => boolean = () => false): void {
  for (let x = x0, i = 0; x + 3 <= x1 + 1; x += 6, i++) {
    if (skip(i)) continue;
    ashlar(img, x, top - 4, x + 3, top - 1, ramp, 4, 4);
  }
}

/** Knock a ragged, broken top off a wall section. */
export function jagged(img: Img, x0: number, x1: number, top: number, depth: number, r: () => number): void {
  let d = Math.floor(r() * depth);
  for (let x = x0; x <= x1; x++) {
    d = Math.max(0, Math.min(depth, d + Math.floor(r() * 5) - 2));
    for (let y = top; y < top + d; y++) img.set(x, y, 0);
  }
}

function hole(img: Img, x: number, y: number, ramp: typeof LIME, r: () => number): void {
  img.ellipse(x, y, 2.5, 1.8, ramp.dark);
  img.set(x - 1, y - 1, ramp.deep);
  img.line(x + 2, y, x + 4 + Math.floor(r() * 2), y + 3, ramp.deep);
}

/** Long hanging banner with a pale cross and a swallowtail. */
function banner(img: Img, x: number, y: number, w: number, h: number, team: Ramp, cross: Color, torn = false): void {
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const tail = j >= h - 3 && i >= Math.floor(w / 2) - (h - 1 - j) && i <= Math.ceil(w / 2) - 1 + (h - 1 - j);
      if (tail) continue;
      if (torn && j > h * 0.55 && (i + j) % 3 === 0) continue;
      let c = i === 0 ? team.hl : i === w - 1 ? team.shade : team.base;
      if (i === Math.floor(w / 2) && j > 1 && j < h - 4) c = cross;
      if (j === 4 && i > 0 && i < w - 1) c = cross;
      img.set(x + i, y + j, c);
    }
  }
  img.hline(x - 1, x + w, y - 1, WOOD.shade);
}

export function crusaderFortress(team: Ramp, damage: 0 | 1 | 2 | 3): Img {
  const r = rand(523 + damage);
  const img = new Img(BASE_W - 2, BASE_H - 2);
  const G = BASE_GROUND - 1;
  const S = LIME;

  // Earth mound with a stone footing.
  img.ellipse(31, G + 4, 34, 8, (_x, _y, nx, ny) => (ny < -0.45 ? MOSS.base : ny < -0.1 ? MOSS.shade : nx > 0.4 ? hex('#6e5a44') : hex('#8a7052')));
  ashlar(img, 0, G - 4, 60, G - 1, S, 9, 4);

  if (damage === 3) {
    for (let i = 0; i < 16; i++) {
      const x = 1 + Math.floor(r() * 54);
      const y = G - 7 - Math.floor(r() * 8);
      ashlar(img, x, y, x + 5, y + 3, S, 6, 4);
    }
    ashlar(img, 12, G - 22, 22, G - 5, S);
    for (let y = G - 22; y < G - 17; y++) for (let x = 12; x <= 22; x++) if ((x * 3 + y) % 4 < 2 && y < G - 19) img.set(x, y, 0);
    img.line(30, G - 6, 44, G - 13, WOOD.base);
    img.line(30, G - 5, 44, G - 12, WOOD.deep);
    banner(img, 46, G - 10, 5, 6, team, LINEN.hl, true);
    return img.outlined(INK);
  }

  // Keep.
  const kl = 10, kr = 34;
  const keepTop = damage === 2 ? 30 : 18;
  ashlar(img, kl, keepTop, kr, G - 5, S);
  if (damage < 2) merlons(img, kl, kr, keepTop, S, (i) => damage === 1 && i === 2);
  else jagged(img, kl, kr, keepTop, 6, r);
  // Arrow slits and a window.
  for (const [x, y] of [[15, keepTop + 7], [29, keepTop + 7], [22, keepTop + 16]]) {
    img.rect(x, y, 1, 5, S.dark);
    img.hline(x - 1, x + 1, y + 2, S.dark);
  }
  // Long team banner on the keep face.
  banner(img, 18, keepTop + 13, 7, 15, team, LINEN.hl, damage === 2);

  // Curtain wall.
  const wallTop = 50;
  ashlar(img, 0, wallTop, 50, G - 5, S);
  merlons(img, 0, 46, wallTop, S, (i) => (damage === 1 && i === 3) || (damage === 2 && i % 2 === 1));
  // Wall-walk shadow.
  img.hline(0, 50, wallTop, S.deep);

  // Drum tower at the front with a conical team roof.
  const tl = 46, tr = 59;
  const towerTop = damage === 2 ? 42 : 34;
  for (let y = towerTop; y <= G - 5; y++) {
    for (let x = tl; x <= tr; x++) {
      const rel = (x - tl) / (tr - tl);
      const band = (y - towerTop) % 4 === 3;
      let c = rel < 0.2 ? S.hl : rel < 0.65 ? S.base : rel < 0.85 ? S.shade : S.deep;
      if (band) c = rel < 0.5 ? S.shade : S.deep;
      if (rel > 0.25 && rel < 0.65 && ((x + Math.floor((y - towerTop) / 4) * 3) % 6 === 0)) c = S.shade;
      img.set(x, y, c);
    }
  }
  img.rect(52, towerTop + 8, 1, 5, S.dark);
  if (damage < 2) {
    const cx = (tl + tr) / 2;
    img.hline(tl - 1, tr + 1, towerTop - 1, S.deep);
    for (let y = towerTop - 18; y < towerTop - 1; y++) {
      const t = (y - (towerTop - 18)) / 16;
      const half = 1 + t * 8;
      for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
        const rel = (x - cx) / half;
        let c = rel < -0.35 ? team.hl : rel < 0.3 ? team.base : team.shade;
        if (y === towerTop - 2) c = team.deep;
        if ((x + y) % 5 === 0 && rel > -0.35) c = team.shade;
        img.set(x, y, c);
      }
    }
    if (damage === 1) {
      img.ellipse(cx + 3, towerTop - 7, 2, 2, INK);
      img.set(cx + 1, towerTop - 5, team.deep);
    }
  } else {
    jagged(img, tl, tr, towerTop, 5, r);
  }

  // Gate: pointed arch, raised portcullis, timber doors.
  const gx = 36;
  img.rect(gx, G - 16, 9, 12, hex('#2b1d22'));
  img.poly([[gx, G - 16], [gx + 4.5, G - 21], [gx + 9, G - 16]], hex('#2b1d22'));
  for (let x = gx + 1; x < gx + 9; x += 2) img.vline(x, G - 18, G - 12, IRON.base);
  img.hline(gx, gx + 8, G - 15, IRON.shade);
  img.hline(gx, gx + 8, G - 12, IRON.deep);
  img.rect(gx - 2, G - 22, 13, 1, S.deep);
  for (let x = gx - 2; x <= gx + 10; x++) img.set(x, G - 23, S.hl);

  // Torch bracket (flame is an FX sprite).
  img.rect(7, wallTop + 5, 2, 5, IRON.deep);
  img.rect(6, wallTop + 4, 4, 2, IRON.shade);

  if (damage >= 1) {
    for (let i = 0; i < (damage === 1 ? 4 : 8); i++) hole(img, 3 + Math.floor(r() * 50), wallTop + 6 + Math.floor(r() * 22), S, r);
    for (let i = 0; i < 2 * damage; i++) hole(img, kl + 3 + Math.floor(r() * 18), keepTop + 4 + Math.floor(r() * 20), S, r);
    for (let i = 0; i < 40 * damage; i++) {
      const x = Math.floor(r() * 60);
      const y = keepTop + Math.floor(r() * (G - keepTop));
      if (img.opaque(x, y) && bayer(x, y) < 0.35) img.set(x, y, S.deep);
    }
  }
  return img.outlined(INK);
}
