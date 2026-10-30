/**
 * Battle HUD walls for the later Ages (Locked Rule 10: built from the battle's environment).
 * Same size, anchor and top-beam position as the Stone and Ancient walls (256 x 220, beam at row 6).
 */
import { Img, bayer, hex, mix, type Color } from '../img';
import { ALLOY, BRICK, BRONZE, GOLD, INK, IRON, PLASMA, WOOD } from '../palette';
import { rand } from '../env/paint';
import type { UiPiece } from './ui';

const W = 256, H = 220, BEAM_Y = 8;
const DARK = hex('#2a1f2e');
type R4 = { hl: Color; base: Color; shade: Color; deep: Color };

/** Running courses of blocks with mortar lines; `face` paints the inside of each block. */
function courses(img: Img, r: () => number, o: { bh: number; bw: [number, number]; ramp: R4; alt: Color; mortar: Color; offset?: number; face?: (img: Img, x: number, y: number, w: number, h: number, base: Color) => void }): void {
  let y = BEAM_Y + 8;
  let row = 0;
  while (y < H) {
    let x = -((row * (o.offset ?? 9)) % 17);
    while (x < W) {
      const bw = o.bw[0] + Math.floor(r() * (o.bw[1] - o.bw[0] + 1));
      const tint = r();
      const base = tint < 0.4 ? o.ramp.base : tint < 0.7 ? mix(o.ramp.base, o.ramp.shade, 0.3) : mix(o.ramp.base, o.alt, 0.45);
      for (let j = 0; j < o.bh; j++) {
        for (let i = 0; i < bw; i++) {
          const px = x + i, py = y + j;
          if (px < 0 || px >= W || py >= H) continue;
          let c = base;
          if (i === bw - 1 || j === o.bh - 1) c = o.mortar;
          else if (j === 0 || i === 0) c = mix(base, o.ramp.hl, 0.55);
          else if (j === o.bh - 2 || i === bw - 2) c = mix(base, o.ramp.deep, 0.4);
          else if (bayer(px, py) < 0.06) c = mix(base, o.ramp.shade, 0.5);
          img.set(px, py, c);
        }
      }
      o.face?.(img, x, y, bw, o.bh, base);
      x += bw;
    }
    y += o.bh;
    row++;
  }
  img.map((c, px, py) => (c && py > 60 && bayer(px, py) < Math.min(0.45, (py - 60) / 300) ? mix(c, DARK, 0.35) : c));
}

function inkLines(img: Img): void {
  img.hline(0, W - 1, BEAM_Y - 2, INK);
  img.hline(0, W - 1, BEAM_Y + 8, INK);
}

function rivet(img: Img, x: number, y: number, ramp: R4): void {
  img.set(x, y, ramp.hl);
  img.set(x + 1, y, ramp.base);
  img.set(x, y + 1, ramp.base);
  img.set(x + 1, y + 1, ramp.deep);
}

/** Crusader: pale ashlar under a stone coping, with heraldic pennants hanging from it. */
export function crusaderWall(): UiPiece {
  const img = new Img(W, H);
  const r = rand(1189);
  const S = { hl: hex('#ece6d6'), base: hex('#c2baa6'), shade: hex('#948c7a'), deep: hex('#655e52') };
  courses(img, r, { bh: 11, bw: [18, 28], ramp: S, alt: hex('#d4c8ae'), mortar: hex('#4a4038') });
  // Coping: a moulded stone band.
  for (let x = 0; x < W; x++) {
    for (let j = -1; j < 9; j++) {
      let c = j < 1 ? S.hl : j < 3 ? S.base : j < 5 ? (x % 12 < 1 ? S.deep : S.base) : j < 7 ? S.shade : S.deep;
      if (j === 3 || j === 4) c = x % 12 === 0 ? S.deep : x % 12 < 6 ? mix(S.base, S.hl, 0.3) : S.base;
      img.set(x, BEAM_Y + j - 1, c);
    }
  }
  inkLines(img);
  // Hanging pennants in alternating heraldic colours.
  const heraldry: [R4, Color][] = [
    [{ hl: hex('#e86a6a'), base: hex('#b83a46'), shade: hex('#8a2638'), deep: hex('#5a1a2a') }, GOLD.base],
    [{ hl: hex('#f4e6a0'), base: hex('#e0b84a'), shade: hex('#b08430'), deep: hex('#6e4e22') }, hex('#8a2638')],
  ];
  [22, 74, 128, 182, 234].forEach((bx, k) => {
    const [c, dev] = heraldry[k % 2];
    const bw = 11, bh = 24, cx = (bw - 1) / 2;
    const p = new Img(bw, bh);
    for (let j = 0; j < bh; j++) {
      for (let i = 0; i < bw; i++) {
        const notch = bh - 1 - j < 4 && Math.abs(i - cx) < 4 - (bh - 1 - j);
        if (notch) continue;
        let col = i === 0 ? c.hl : i === bw - 1 ? c.shade : c.base;
        if (j === 0) col = c.deep;
        if ((i === cx && j > 4 && j < 15) || (j === 8 && Math.abs(i - cx) < 3)) col = dev;
        p.set(i, j, col);
      }
    }
    img.blit(p.outlined(INK), bx - 6, BEAM_Y + 7);
    // Gold rod across the top.
    img.hline(bx - 6, bx + 6, BEAM_Y + 8, GOLD.shade);
    img.set(bx - 7, BEAM_Y + 8, GOLD.hl);
    img.set(bx + 7, BEAM_Y + 8, GOLD.hl);
  });
  return { img, anchor: [W / 2, BEAM_Y - 2], desc: 'Crusader Age battle HUD wall: pale ashlar under a stone coping hung with heraldic pennants.' };
}

/** Gunpowder: tarred timber planking strapped with riveted iron bands. */
export function gunpowderWall(): UiPiece {
  const img = new Img(W, H);
  const r = rand(1648);
  const T = { hl: hex('#b88458'), base: hex('#8e5e3a'), shade: hex('#6e4428'), deep: hex('#4a2c1c') };
  courses(img, r, {
    bh: 9, bw: [40, 70], ramp: T, alt: hex('#a07048'), mortar: hex('#2e1c16'), offset: 23,
    face: (im, x, y, w, h) => {
      // Wood grain streaks and a knot now and then.
      for (let k = 0; k < 3; k++) {
        const gy = y + 2 + k * 2;
        for (let i = 2; i < w - 3; i++) if (((i + k * 7 + x) >> 2) % 3 === 0) im.set(x + i, gy, T.shade);
      }
      if (w > 50) {
        im.set(x + 18, y + 4, T.deep);
        im.set(x + 19, y + 4, T.shade);
      }
      void h;
    },
  });
  // Iron straps down the planks.
  for (const sx of [10, 70, 128, 186, 244]) {
    for (let y = BEAM_Y + 8; y < H; y++) {
      for (let i = 0; i < 6; i++) img.set(sx + i - 3, y, i === 0 ? IRON.hl : i === 5 ? IRON.deep : i === 4 ? IRON.shade : IRON.base);
    }
    for (let y = BEAM_Y + 12; y < H; y += 9) {
      rivet(img, sx - 2, y, IRON);
      rivet(img, sx + 1, y, IRON);
    }
  }
  // Beam: heavy timber with an iron band top and bottom.
  for (let x = 0; x < W; x++) {
    for (let j = -1; j < 9; j++) {
      let c = j < 1 ? IRON.hl : j < 2 ? IRON.base : j < 6 ? (bayer(x, j) < 0.18 ? T.shade : j === 2 ? T.hl : T.base) : j < 7 ? IRON.base : IRON.deep;
      if (j >= 2 && j < 6 && x % 31 === 0) c = T.deep;
      img.set(x, BEAM_Y + j - 1, c);
    }
    if (x % 16 === 4) {
      img.set(x, BEAM_Y, IRON.hl);
      img.set(x, BEAM_Y + 5, IRON.hl);
    }
  }
  inkLines(img);
  return { img, anchor: [W / 2, BEAM_Y - 2], desc: 'Gunpowder Age battle HUD wall: timber planking strapped with riveted iron under an iron-banded beam.' };
}

/** Industrial: soot-stained red brick under a riveted steel I-girder. */
export function industrialWall(): UiPiece {
  const img = new Img(W, H);
  const r = rand(1916);
  courses(img, r, { bh: 6, bw: [12, 15], ramp: BRICK, alt: hex('#a04a3a'), mortar: hex('#6a5e58'), offset: 7 });
  // Soot streaks.
  img.map((c, px, py) => (c && py > 20 && ((px * 13) % 61 < 6) && bayer(px, py) < 0.35 ? mix(c, hex('#2a2226'), 0.35) : c));
  // Girder.
  const S = { hl: hex('#a8b0bc'), base: hex('#7a8494'), shade: hex('#5a6272'), deep: hex('#3a404c') };
  for (let x = 0; x < W; x++) {
    for (let j = -1; j < 9; j++) {
      const c = j < 0 ? S.hl : j < 2 ? S.base : j === 2 ? S.deep : j < 6 ? (j === 3 ? S.shade : S.base) : j === 6 ? S.hl : j === 7 ? S.base : S.deep;
      img.set(x, BEAM_Y + j - 1, c);
    }
  }
  for (let x = 3; x < W; x += 8) {
    rivet(img, x, BEAM_Y - 1, S);
    rivet(img, x, BEAM_Y + 5, S);
  }
  // Web stiffeners.
  for (let x = 0; x < W; x += 32) img.vline(x, BEAM_Y + 2, BEAM_Y + 4, S.deep);
  // Hazard-stripe plates bolted on here and there.
  for (const hx of [40, 210]) {
    for (let j = 0; j < 5; j++) for (let i = 0; i < 14; i++) img.set(hx + i, BEAM_Y + 9 + j, (i + j) % 6 < 3 ? GOLD.base : INK);
  }
  inkLines(img);
  return { img, anchor: [W / 2, BEAM_Y - 2], desc: 'Industrial Age battle HUD wall: red brick courses under a riveted steel girder.' };
}

/** Future: alloy panels with seams, vents and status lights under a glowing trim. */
export function futureWall(): UiPiece {
  const img = new Img(W, H);
  const r = rand(2150);
  const A = { hl: hex('#d8e0ea'), base: hex('#a8b4c4'), shade: hex('#7e8aa0'), deep: hex('#525c74') };
  courses(img, r, {
    bh: 22, bw: [36, 58], ramp: A, alt: hex('#b4b8d4'), mortar: hex('#2a2e44'), offset: 29,
    face: (im, x, y, w, h) => {
      // Corner screws, a vent or a status light.
      for (const [dx, dy] of [[2, 2], [w - 4, 2], [2, h - 4], [w - 4, h - 4]]) im.set(x + dx, y + dy, A.deep);
      const kind = Math.abs((x * 7 + y * 3) % 5);
      if (kind === 0) for (let k = 0; k < 4; k++) im.hline(x + 8, x + 8 + Math.min(14, w - 16), y + 6 + k * 3, A.deep);
      else if (kind === 2) {
        im.rect(x + w - 10, y + 5, 4, 2, PLASMA.shade);
        im.set(x + w - 10, y + 5, PLASMA.hl);
      } else if (kind === 3) im.rect(x + 6, y + 8, w - 12, 6, mix(A.base, A.shade, 0.5));
    },
  });
  // Beam: dark alloy with a glowing channel.
  for (let x = 0; x < W; x++) {
    for (let j = -1; j < 9; j++) {
      const c = j < 0 ? ALLOY.hl : j < 2 ? ALLOY.base : j === 2 ? ALLOY.deep : j === 3 || j === 5 ? PLASMA.shade : j === 4 ? (x % 24 < 12 ? PLASMA.hl : PLASMA.base) : j === 6 ? ALLOY.deep : j === 7 ? ALLOY.shade : ALLOY.deep;
      img.set(x, BEAM_Y + j - 1, c);
    }
  }
  for (let x = 0; x < W; x += 24) {
    img.rect(x, BEAM_Y + 2, 3, 3, ALLOY.shade);
    img.set(x, BEAM_Y + 2, ALLOY.hl);
  }
  inkLines(img);
  void BRONZE;
  void WOOD;
  return { img, anchor: [W / 2, BEAM_Y - 2], desc: 'Future Age battle HUD wall: alloy panels with vents and lights under a glowing trim.' };
}
