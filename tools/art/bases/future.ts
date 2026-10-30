/** Future Age fortress: alloy citadel with a lit spire, energy gate and a beacon pylon. */
import { Img, bayer, hex } from '../img';
import { ALLOY, INK, PLASMA, SUIT, type Ramp } from '../palette';
import { rand } from '../env/paint';
import { BASE_GROUND, BASE_H, BASE_W } from './stone';
import { jagged } from './crusader';

const CIT = { hl: hex('#b8c4d8'), base: hex('#8492ae'), shade: hex('#66729a'), deep: hex('#3e4664') };

function panels(img: Img, x0: number, y0: number, x1: number, y1: number, ph = 9, pw = 13, A = CIT): void {
  for (let y = y0; y <= y1; y++) {
    const row = Math.floor((y - y0) / ph);
    for (let x = x0; x <= x1; x++) {
      const bx = (x - x0 + (row % 2 ? Math.floor(pw / 2) : 0)) % pw;
      const by = (y - y0) % ph;
      let c = A.base;
      if (by === ph - 1 || bx === pw - 1) c = A.deep;
      else if (by === 0 || bx === 0) c = A.hl;
      else if (bx > pw - 4 && by > 0) c = A.shade;
      if (by === 4 && bx === 3) c = PLASMA.shade;
      if (x === x1) c = A.deep;
      img.set(x, y, c);
    }
  }
}

function sparkHole(img: Img, x: number, y: number): void {
  img.ellipse(x, y, 2.5, 2, SUIT.deep);
  img.set(x, y, hex('#ffb04a'));
  img.set(x + 2, y - 2, hex('#ffe68a'));
  img.set(x - 2, y + 1, ALLOY.shade);
}

export function futureFortress(team: Ramp, damage: 0 | 1 | 2 | 3): Img {
  const r = rand(2150 + damage);
  const img = new Img(BASE_W - 2, BASE_H - 2);
  const G = BASE_GROUND - 1;

  // Alloy platform with a glowing seam.
  img.rect(0, G - 5, 62, 5, SUIT.base);
  img.hline(0, 61, G - 5, ALLOY.base);
  img.hline(0, 61, G - 3, damage === 3 ? SUIT.shade : PLASMA.shade);
  img.hline(0, 61, G - 1, SUIT.deep);
  img.poly([[62, G - 5], [66, G], [62, G]], SUIT.shade);

  if (damage === 3) {
    for (let i = 0; i < 14; i++) {
      const x = 1 + Math.floor(r() * 52);
      const y = G - 9 - Math.floor(r() * 7);
      panels(img, x, y, x + 6, y + 3, 4, 7);
    }
    panels(img, 16, G - 24, 26, G - 6);
    jagged(img, 16, 26, G - 24, 8, r);
    img.line(30, G - 6, 44, G - 18, ALLOY.shade);
    img.line(31, G - 6, 45, G - 18, SUIT.deep);
    for (const [x, y] of [[20, G - 14], [40, G - 9]]) img.set(x, y, hex('#ffb04a'));
    return img.outlined(INK);
  }

  // Spire: tapering alloy needle with team light stripes and lit windows.
  const sx = 23;
  const spireTop = damage === 2 ? 34 : 4;
  for (let y = spireTop; y < G - 5; y++) {
    const t = Math.min(1, (y - 4) / 40);
    const half = 1 + Math.round(t * 9);
    for (let x = sx - half; x <= sx + half; x++) {
      const rel = (x - sx) / Math.max(1, half);
      let c = rel < -0.5 ? ALLOY.hl : rel < 0.3 ? ALLOY.base : rel < 0.7 ? ALLOY.shade : ALLOY.deep;
      if (Math.abs(x - (sx - Math.round(half * 0.55))) < 0.5 && y > 10) c = team.hl;
      if (Math.abs(x - (sx + Math.round(half * 0.55))) < 0.5 && y > 10) c = team.base;
      if ((y - 4) % 9 === 8 && Math.abs(rel) < 0.9) c = ALLOY.deep;
      img.set(x, y, c);
    }
  }
  for (const wy of [22, 31, 40]) {
    if (wy < spireTop + 2) continue;
    img.rect(sx - 1, wy, 3, 4, damage >= 1 && wy === 31 ? SUIT.deep : PLASMA.base);
    img.set(sx - 1, wy, PLASMA.hl);
  }
  if (damage === 2) jagged(img, sx - 6, sx + 6, spireTop, 5, r);
  else img.vline(sx, 0, 4, PLASMA.hl);
  // Ring collar around the spire.
  const ringY = 20;
  if (damage < 2) {
    img.ellipse(sx, ringY, 9, 2.2, (_x, _y, _nx, ny) => (ny < -0.2 ? ALLOY.hl : ny > 0.4 ? ALLOY.deep : ALLOY.base));
    img.hline(sx - 7, sx + 7, ringY, team.base);
  }

  // Bulwark wall with an angled top.
  const wallTop = 50;
  panels(img, 0, wallTop, 52, G - 6);
  img.poly([[0, wallTop], [0, wallTop - 4], [46, wallTop - 4], [52, wallTop]], (x) => (x > 46 ? ALLOY.shade : ALLOY.hl));
  img.hline(0, 45, wallTop - 2, damage >= 1 ? SUIT.shade : team.base);
  if (damage >= 1) img.hline(0, 20, wallTop - 2, team.base);
  // Team chevrons on the wall.
  for (const cx of [8, 26]) {
    for (let k = 0; k < 3; k++) {
      img.line(cx - 3, wallTop + 6 + k * 3, cx, wallTop + 9 + k * 3, team.base);
      img.line(cx + 3, wallTop + 6 + k * 3, cx, wallTop + 9 + k * 3, team.shade);
    }
  }

  // Energy gate.
  const gx = 36;
  img.rect(gx - 2, G - 21, 14, 16, SUIT.base);
  img.hline(gx - 2, gx + 11, G - 21, ALLOY.hl);
  img.rect(gx, G - 19, 10, 14, SUIT.deep);
  for (let y = G - 18; y < G - 5; y++) for (let x = gx + 1; x < gx + 9; x++) if ((x + y) % 3 === 0 || bayer(x, y) < 0.25) img.set(x, y, (y + x) % 2 ? team.hl : team.base);

  // Beacon pylon on the salient (light is an FX sprite).
  const px = 54;
  const pTop = damage === 2 ? 44 : 38;
  for (let y = pTop; y < G - 5; y++) {
    const w = 2 + Math.floor((y - pTop) / 10);
    for (let x = px - w; x <= px + w; x++) img.set(x, y, x < px ? ALLOY.hl : x === px ? ALLOY.base : ALLOY.shade);
  }
  img.rect(px - 2, pTop - 1, 5, 2, SUIT.base);

  // Flag mast socket on the ring collar.
  if (damage < 2) img.rect(sx + 5, ringY - 3, 2, 2, ALLOY.deep);

  if (damage >= 1) {
    for (let i = 0; i < (damage === 1 ? 4 : 8); i++) sparkHole(img, 3 + Math.floor(r() * 48), wallTop + 4 + Math.floor(r() * 24));
    for (let i = 0; i < damage * 2; i++) sparkHole(img, sx - 3 + Math.floor(r() * 6), Math.max(spireTop + 4, 26) + Math.floor(r() * 16));
    for (let i = 0; i < 34 * damage; i++) {
      const x = Math.floor(r() * 60);
      const y = spireTop + Math.floor(r() * (G - spireTop));
      if (img.opaque(x, y) && bayer(x, y) < 0.3) img.set(x, y, SUIT.shade);
    }
  }
  return img.outlined(INK);
}
