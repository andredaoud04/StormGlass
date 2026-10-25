/** Stone Age fortress: log palisade on a rock mound, thatched watchtower, skull totem. */
import { Img, bayer, hex } from '../img';
import { BONE, FIRE, INK, STONE, WOOD, type Ramp } from '../palette';
import { rand } from '../env/paint';

export const BASE_W = 72;
export const BASE_H = 96;
/** Row that sits on the battlefield ground line. */
export const BASE_GROUND = 86;
/** Column of the lane-facing front edge (units spawn here). */
export const BASE_FRONT = 60;

const STRAW = { hl: hex('#ffe9a0'), base: hex('#e8c062'), shade: hex('#c0913e'), deep: hex('#8a6230') };

function log(img: Img, x: number, top: number, bottom: number, w: number, broken: boolean): void {
  for (let y = top; y <= bottom; y++) {
    for (let i = 0; i < w; i++) {
      // Pointed top (or a jagged break).
      const fromTop = y - top;
      if (!broken && fromTop < 2 && (i === 0 || i === w - 1) && !(fromTop === 1 && w <= 3)) continue;
      if (broken && fromTop === 0 && i % 2 === 1) continue;
      let c = i === 0 ? WOOD.hl : i === w - 1 ? WOOD.shade : WOOD.base;
      if (fromTop === 0 && !broken) c = WOOD.hl;
      if ((y + x * 3) % 9 === 0 && i > 0 && i < w - 1) c = WOOD.shade; // knots
      img.set(x + i, y, c);
    }
  }
}

export function stoneFortress(team: Ramp, damage: 0 | 1 | 2 | 3): Img {
  const r = rand(77 + damage);
  const img = new Img(BASE_W - 2, BASE_H - 2);
  const G = BASE_GROUND - 1;

  // Rock mound
  const mound = { hl: STONE.hl, base: STONE.base, shade: STONE.shade, deep: STONE.deep };
  img.ellipse(31, G + 4, 33, 9, (_x, _y, nx, ny) => (ny < -0.4 ? mound.hl : ny > 0.3 ? mound.deep : nx > 0.45 ? mound.shade : mound.base));
  for (let i = 0; i < 9; i++) {
    const x = 4 + Math.floor(r() * 54);
    const y = G - 1 + Math.floor(r() * 6);
    img.ellipse(x, y, 3 + r() * 2, 2.2, (_x, _y, nx, ny) => (ny < -0.2 && nx < 0.3 ? mound.hl : ny > 0.4 ? mound.shade : mound.base));
  }

  if (damage === 3) {
    // Rubble: scattered logs and stones, a broken totem stump.
    for (let i = 0; i < 9; i++) {
      const x = 2 + Math.floor(r() * 46);
      const len = 8 + Math.floor(r() * 10);
      const y = G - 2 - Math.floor(r() * 6);
      img.hline(x, x + len, y, WOOD.base);
      img.hline(x, x + len, y + 1, WOOD.shade);
      img.set(x + len, y, WOOD.hl);
    }
    for (let i = 0; i < 6; i++) img.ellipse(6 + r() * 50, G - 3 - r() * 4, 3, 2, STONE.shade);
    log(img, 52, G - 12, G, 4, true);
    img.ellipse(20, G - 8, 6, 2, STRAW.shade);
    return img.outlined(INK);
  }

  // Watchtower: posts, bracing, platform, thatched roof
  const towerL = 14;
  const towerR = 38;
  const lean = damage === 2 ? 3 : 0;
  const postTop = 26;
  for (const px of [towerL, towerL + 7, towerR - 9, towerR - 3]) {
    for (let y = postTop; y < G; y++) {
      const x = px + Math.round((lean * (G - y)) / (G - postTop));
      img.set(x, y, WOOD.shade);
      img.set(x + 1, y, WOOD.base);
      img.set(x + 2, y, WOOD.deep);
    }
  }
  // Cross bracing
  img.line(towerL + 2, postTop + 6, towerR - 3, postTop + 26, WOOD.shade);
  img.line(towerR - 3, postTop + 6, towerL + 2, postTop + 26, WOOD.base);
  // Platform
  const platY = postTop - 2;
  img.rect(towerL - 3 + lean, platY, towerR - towerL + 7, 3, WOOD.base);
  img.hline(towerL - 3 + lean, towerR + 3 + lean, platY, WOOD.hl);
  img.hline(towerL - 3 + lean, towerR + 3 + lean, platY + 3, WOOD.deep);
  for (let x = towerL - 2 + lean; x < towerR + 4 + lean; x += 4) img.vline(x, platY + 1, platY + 2, WOOD.shade);
  // Railing
  for (let x = towerL - 2 + lean; x <= towerR + 2 + lean; x += 5) img.vline(x, platY - 5, platY - 1, WOOD.shade);
  img.hline(towerL - 3 + lean, towerR + 3 + lean, platY - 5, WOOD.base);

  if (damage < 2) {
    // Thatched cone roof.
    const roofTop = 4;
    const roofBottom = platY - 6;
    const cx = (towerL + towerR) / 2 + lean;
    for (let y = roofTop; y <= roofBottom; y++) {
      const t = (y - roofTop) / (roofBottom - roofTop);
      const half = 2 + t * 18;
      for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
        const rel = (x - cx) / half;
        let c = rel < -0.3 ? STRAW.hl : rel < 0.35 ? STRAW.base : STRAW.shade;
        if ((x * 7 + y * 3) % 11 === 0) c = STRAW.shade;
        if (y === roofBottom || (y === roofBottom - 1 && (x & 1))) c = STRAW.deep;
        img.set(x, y, c);
      }
    }
    // Binding band near the top and a little pole.
    img.hline(Math.round(cx - 5), Math.round(cx + 5), roofTop + 6, WOOD.shade);
    img.vline(Math.round(cx), roofTop - 4, roofTop, WOOD.shade);
    if (damage === 1) {
      img.ellipse(cx + 6, roofTop + 12, 4, 3, STRAW.deep);
      img.ellipse(cx + 6, roofTop + 12, 2.5, 1.5, INK);
      img.ellipse(cx - 7, roofTop + 15, 2, 1.5, INK);
    }
  } else {
    // Collapsed roof: a sagging heap on the platform.
    img.poly([[towerL - 2 + lean, platY], [towerL + 8 + lean, platY - 9], [towerR + 6 + lean, platY - 3], [towerR + 3 + lean, platY]], (x, y) => ((x + y) % 5 === 0 ? STRAW.deep : y < platY - 5 ? STRAW.base : STRAW.shade));
  }

  // Palisade
  const palTop = 48;
  for (let x = 1, i = 0; x < 52; x += 5, i++) {
    const h = palTop + ((i * 5) % 3) * 2 - (i % 2);
    const broken = (damage === 1 && i % 3 === 1) || (damage === 2 && i % 3 !== 0);
    const top = broken ? h + 8 + Math.floor(r() * 8) : h;
    log(img, x, top, G, 5, broken);
    img.vline(x - 1 + 5, top + 1, G, WOOD.deep);
  }
  // Rope bindings
  for (const y of [palTop + 10, G - 9]) {
    for (let x = 1; x < 52; x++) img.set(x, y, (x & 1) ? hex('#8a5a32') : hex('#b07a46'));
  }
  // Gate opening with a half-open door.
  const gx = 38;
  img.rect(gx, G - 18, 12, 18, hex('#2b1d22'));
  img.rect(gx + 1, G - 17, 10, 2, hex('#3d2a2c'));
  for (let x = gx - 3; x < gx; x++) for (let y = G - 18; y < G; y++) img.set(x, y, x === gx - 3 ? WOOD.hl : WOOD.base);
  img.hline(gx - 1, gx + 12, G - 19, WOOD.deep);
  img.hline(gx - 1, gx + 12, G - 20, WOOD.base);

  // Team banner on the gate lintel
  for (let y = G - 34; y < G - 21; y++) {
    const w = y > G - 24 ? 8 - (y - (G - 24)) * 2 : 8;
    for (let x = 0; x < w; x++) img.set(gx + 2 + (8 - w) / 2 + x, y, x === 0 ? team.hl : x === w - 1 ? team.shade : team.base);
  }
  img.hline(gx + 1, gx + 11, G - 35, WOOD.shade);

  // Skull totem
  const tx = 56;
  log(img, tx, palTop - 6, G, 4, damage === 2);
  if (damage < 2) {
    const sy = palTop - 14;
    img.ellipse(tx + 2, sy + 3, 5, 4, (_x, _y, nx, ny) => (ny < -0.3 && nx < 0.2 ? BONE.hl : nx > 0.4 ? BONE.shade : BONE.base));
    img.rect(tx, sy + 6, 5, 2, BONE.base);
    img.set(tx + 1, sy + 3, INK);
    img.set(tx + 4, sy + 3, INK);
    img.set(tx + 1, sy + 4, INK);
    img.set(tx + 4, sy + 4, INK);
    img.set(tx + 2, sy + 7, INK);
    // Horns
    img.line(tx - 3, sy + 1, tx - 5, sy - 4, BONE.base);
    img.line(tx + 7, sy + 1, tx + 9, sy - 4, BONE.base);
    img.set(tx - 5, sy - 5, BONE.hl);
    img.set(tx + 9, sy - 5, BONE.hl);
    // Team cloth strips
    img.vline(tx, sy + 8, sy + 14, team.base);
    img.vline(tx + 4, sy + 8, sy + 12, team.shade);
  }

  // Wall torch bracket (flame is an animated FX sprite).
  img.rect(9, palTop + 3, 2, 6, WOOD.deep);
  img.rect(8, palTop + 2, 4, 2, WOOD.shade);

  // Battle damage: dark holes and soot.
  if (damage >= 1) {
    const holes = damage === 1 ? 5 : 8;
    for (let i = 0; i < holes; i++) {
      const x = 3 + Math.floor(r() * 46);
      const y = palTop + 8 + Math.floor(r() * 20);
      img.ellipse(x, y, 2, 1.5, hex('#3a2622'));
      img.set(x, y, INK);
    }
    for (let i = 0; i < 40 * damage; i++) {
      const x = Math.floor(r() * 54);
      const y = palTop + Math.floor(r() * 30);
      if (img.opaque(x, y) && bayer(x, y) < 0.5) img.set(x, y, WOOD.deep);
    }
  }
  void FIRE;
  return img.outlined(INK);
}

/** Team flag, 4 waving frames (12x10 each), raised on a pole by the renderer. */
export function flagFrames(team: Ramp): Img[] {
  const frames: Img[] = [];
  for (let f = 0; f < 4; f++) {
    const img = new Img(14, 12);
    for (let x = 0; x < 11; x++) {
      const wave = Math.round(Math.sin((x / 11) * Math.PI * 2 - f * (Math.PI / 2)) * 1.2);
      const h = 7 - Math.floor(x / 5);
      for (let y = 0; y < h; y++) {
        const c = y === 0 ? team.hl : y === h - 1 ? team.shade : x % 4 === 3 ? team.shade : team.base;
        img.set(x + 1, y + 2 + wave + Math.floor((7 - h) / 2), c);
      }
    }
    frames.push(img.outlined(INK).crop(0, 0, 14, 12));
  }
  return frames;
}
