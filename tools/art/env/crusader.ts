/** Crusader Age battlefield: golden afternoon over farmland, a hilltop castle, oaks and a chapel. */
import { Img, bayer, hex } from '../img';
import { IRON, LINEN, STONE, WOOD } from '../palette';
import { broadleaf, cloud, conifer, ditherGradient, rand, rock, sineRidge, type TreeCols } from './paint';
import { LANE_GY, fillRidge, paintLane, tufts } from './lane';
import type { EnvArt } from './stone';

const W = 256;

function castleSilhouette(img: Img, x: number, base: number, c: { hl: number; base: number; shade: number }): void {
  const block = (x0: number, w: number, h: number, crenel = true) => {
    for (let yy = base - h; yy < base; yy++) for (let xx = x0; xx < x0 + w; xx++) img.set(xx, yy, xx === x0 ? c.hl : xx === x0 + w - 1 ? c.shade : c.base);
    if (crenel) for (let xx = x0; xx < x0 + w; xx += 2) img.set(xx, base - h - 1, c.base);
  };
  block(x, 34, 11);
  block(x + 3, 8, 22);
  block(x + 23, 9, 27);
  block(x + 13, 5, 16);
  for (const [wx, wy] of [[6, 16], [26, 20], [26, 13], [15, 9]]) img.vline(x + wx, base - wy, base - wy + 2, c.shade);
  // Pennant.
  img.vline(x + 27, base - 34, base - 28, c.shade);
  img.hline(x + 28, x + 31, base - 34, hex('#c0504a'));
  img.hline(x + 28, x + 29, base - 33, hex('#c0504a'));
}

function chapel(img: Img, x: number, g: number): void {
  const s = { hl: hex('#f0eadc'), base: hex('#d0c8b4'), shade: hex('#a8a090'), roof: hex('#8a5a4a'), roofS: hex('#6a4038') };
  img.rect(x, g - 9, 14, 9, s.base);
  img.vline(x, g - 9, g - 1, s.hl);
  img.vline(x + 13, g - 9, g - 1, s.shade);
  img.poly([[x - 1, g - 9], [x + 7, g - 14], [x + 15, g - 9]], (px) => (px < x + 7 ? s.roof : s.roofS));
  // Bell tower.
  img.rect(x + 14, g - 16, 5, 16, s.base);
  img.vline(x + 18, g - 16, g - 1, s.shade);
  img.poly([[x + 13, g - 16], [x + 16.5, g - 22], [x + 20, g - 16]], (px) => (px < x + 16 ? s.roof : s.roofS));
  img.rect(x + 15, g - 14, 2, 3, hex('#3a2d2e'));
  img.vline(x + 16, g - 25, g - 22, s.shade);
  img.hline(x + 15, x + 17, g - 24, s.shade);
  img.rect(x + 5, g - 5, 3, 5, hex('#3a2d2e'));
}

function windmill(img: Img, x: number, g: number): void {
  const b = { hl: hex('#e8dcc4'), base: hex('#c8b898'), shade: hex('#a08e70') };
  for (let y = g - 16; y < g; y++) {
    const half = 2 + ((y - (g - 16)) / 16) * 2;
    for (let xx = Math.floor(x - half); xx <= Math.ceil(x + half); xx++) img.set(xx, y, xx < x - 1 ? b.hl : xx > x + 1 ? b.shade : b.base);
  }
  img.poly([[x - 3, g - 16], [x, g - 20], [x + 3, g - 16]], hex('#7a5040'));
  const hub = [x, g - 15];
  for (const [dx, dy] of [[1, -1], [1, 1], [-1, 1], [-1, -1]]) {
    img.line(hub[0], hub[1], hub[0] + dx * 9, hub[1] + dy * 9, WOOD.deep);
    img.line(hub[0] + dx * 3, hub[1] + dy * 3 + (dx === dy ? 1 : -1), hub[0] + dx * 8, hub[1] + dy * 8 + (dx === dy ? 1 : -1), LINEN.base);
  }
}

export function crusaderEnv(): EnvArt {
  const r = rand(1190);
  const sky = new Img(W, 240);
  ditherGradient(sky, [
    { at: 0, c: hex('#3468b8') },
    { at: 0.3, c: hex('#5a8ed0') },
    { at: 0.58, c: hex('#8cb8e0') },
    { at: 0.8, c: hex('#d0dcd8') },
    { at: 0.92, c: hex('#f6dcb0') },
    { at: 1, c: hex('#ffc890') },
  ]);
  const sunX = 196, sunY = 126;
  sky.ellipse(sunX, sunY, 17, 17, (x, y) => (bayer(x, y) < 0.5 ? hex('#f0e2c4') : hex('#e0d8cc')));
  sky.ellipse(sunX, sunY, 12, 12, hex('#fff0cc'));
  sky.ellipse(sunX, sunY, 8, 8, hex('#fffbe9'));

  // Far: hazy mountains, blue hills with a hilltop castle, then patchwork fields.
  const FH = 150;
  const far = new Img(W, FH);
  const range = { hl: hex('#c4d0ea'), base: hex('#aebce0'), shade: hex('#9aa8d2'), snow: hex('#f4f6ff') };
  const peaks = [{ x: 20, h: 92, half: 52 }, { x: 110, h: 76, half: 46 }, { x: 176, h: 104, half: 60 }, { x: 250, h: 80, half: 44 }];
  for (let x = 0; x < W; x++) {
    let best = 0, px = x;
    for (const p of peaks) {
      const v = p.h * Math.max(0, 1 - Math.abs(x - p.x) / p.half) + Math.sin(x * 0.8) * 0.8;
      if (v > best) { best = v; px = p.x; }
    }
    const top = FH - 20 - Math.round(best);
    for (let y = top; y < FH; y++) {
      const depth = y - top;
      let c = x < px ? range.hl : range.base;
      if (x >= px && depth > 3 && bayer(x, y) < 0.3) c = range.shade;
      if (best > 78 && depth < (best - 76) * 0.6 + (bayer(x, y) < 0.5 ? 1 : 0)) c = range.snow;
      far.set(x, y, c);
    }
  }
  const backHills = sineRidge(W, 58, [[10, 120, 0.3], [5, 47, 1.9], [2, 19, 0.7]]);
  const bh = { hl: hex('#a2b8d4'), base: hex('#8aa2c4'), shade: hex('#788eb4'), deep: hex('#6a80a8') };
  fillRidge(far, backHills, FH, bh, 14);
  castleSilhouette(far, 40, FH - Math.round(backHills[54]) + 3, { hl: hex('#c2cce2'), base: hex('#7486ac'), shade: hex('#64759c') });
  const frontHills = sineRidge(W, 36, [[7, 96, 2.4], [3, 41, 0.2], [1.5, 13, 1.3]]);
  const fh = { hl: hex('#9cc488'), base: hex('#80ae74'), shade: hex('#6a9866'), deep: hex('#5a845c') };
  for (let x = 0; x < W; x++) {
    const top = FH - Math.round(frontHills[x]);
    for (let y = top; y < FH; y++) {
      const d = y - top;
      // Patchwork fields: stripes that change by plot.
      const plot = Math.floor((x + Math.floor(d / 6) * 17) / 29) % 4;
      let c = d < 2 ? fh.hl : plot === 0 ? hex('#c8c070') : plot === 1 ? fh.base : plot === 2 ? hex('#a8b866') : fh.shade;
      if (d > 2 && (d % 6 === 0 || (x + Math.floor(d / 6) * 17) % 29 === 0)) c = fh.deep;
      if (plot === 0 && d > 2 && (x + d) % 3 === 0) c = hex('#b0a85e');
      far.set(x, y, c);
    }
  }
  windmill(far, 148, FH - Math.round(frontHills[148]) + 2);

  // Mid: green hills with oaks, poplars, a hedge line and a chapel.
  const MH = 66;
  const mid = new Img(W, MH);
  const hill = sineRidge(W, 26, [[6, 86, 0.8], [3, 39, 2.2], [1.2, 15, 0.9]]);
  fillRidge(mid, hill, MH, { hl: hex('#a2d06a'), base: hex('#78b450'), shade: hex('#5c9644'), deep: hex('#477a3c') });
  const place = (x: number) => MH - Math.round(hill[Math.max(0, Math.min(W - 1, x))]) + 3;
  chapel(mid, 104, place(112));
  const oak: TreeCols = { hl: hex('#8ec85a'), base: hex('#5e9e44'), shade: hex('#467e3a'), deep: hex('#335e30'), trunk: hex('#6e4a34'), trunkShade: hex('#4f3326') };
  const pine: TreeCols = { hl: hex('#5fa04a'), base: hex('#3f8040'), shade: hex('#2f6538'), deep: hex('#244c31'), trunk: hex('#6e4a34'), trunkShade: hex('#4f3326') };
  for (const [x, rr] of [[20, 8], [40, 6], [150, 7], [176, 9], [232, 7]]) broadleaf(mid, x, place(x), rr, oak, r);
  for (const [x, h] of [[64, 22], [72, 17], [206, 24], [214, 18]]) conifer(mid, x, place(x), h, pine, r);
  // Dry-stone wall along the hill foot.
  for (let x = 0; x < W; x++) {
    const y = MH - 6 + Math.round(Math.sin(x / 23) * 1.2);
    mid.set(x, y, (x >> 2) % 2 ? hex('#b8b0a0') : hex('#9a9282'));
    mid.set(x, y + 1, hex('#7e7668'));
  }

  // Ground: rutted mud road with cobbles, fallen arms in the meadow.
  const ground = new Img(W, 96);
  const road = { hl: hex('#c8a47a'), base: hex('#a8825c'), shade: hex('#8a6648'), deep: hex('#6a4a36') };
  const grass = { hl: hex('#b0dc72'), base: hex('#84c056'), shade: hex('#62a046'), deep: hex('#4a823e') };
  paintLane(ground, road, grass);
  // Worn flagstones peeking through the mud.
  for (let x = 3; x < W; x += 8 + Math.floor(r() * 7)) {
    const y = 14 + Math.floor(r() * 14);
    ground.rect(x, y, 4, 2, hex('#9a9284'));
    ground.hline(x, x + 3, y, hex('#bab0a0'));
    ground.hline(x, x + 3, y + 2, road.deep);
  }
  // Cart ruts.
  for (let x = 0; x < W; x++) {
    if ((x * 7) % 11 < 6) ground.set(x, LANE_GY - 4, road.shade);
    if ((x * 5) % 13 < 7) ground.set(x, LANE_GY + 5, road.shade);
  }
  tufts(ground, r, grass);
  const st = { hl: STONE.hl, base: STONE.base, shade: STONE.shade, deep: STONE.deep };
  for (const [x, y, w, h] of [[16, 56, 8, 5], [140, 62, 9, 6], [228, 52, 7, 5]]) rock(ground, x, y, w, h, st);
  // A fallen kite shield and a broken lance.
  ground.poly([[60, 50], [67, 50], [67, 54], [63.5, 58], [60, 54]], (x) => (x < 62 ? hex('#e8e0d0') : hex('#c8bca8')));
  ground.vline(63, 51, 56, hex('#c0504a'));
  ground.hline(61, 66, 52, hex('#c0504a'));
  ground.line(176, 66, 196, 60, WOOD.base);
  ground.line(176, 67, 196, 61, WOOD.deep);
  ground.line(197, 60, 200, 59, IRON.hl);
  // Bolts stuck in the turf.
  for (const [x, y] of [[100, 48], [104, 50], [214, 70], [32, 72]]) {
    ground.line(x, y, x - 2, y - 4, WOOD.base);
    ground.set(x - 2, y - 5, LINEN.hl);
  }
  // Wildflowers.
  for (let i = 0; i < 22; i++) ground.set(Math.floor(r() * W), 42 + Math.floor(r() * 28), i % 3 ? hex('#fff1b8') : hex('#c8a0f0'));

  const cloudCols = { hl: hex('#ffffff'), base: hex('#f4f0ec'), shade: hex('#d8d0dc') };
  const clouds = [cloud(54, 16, r, cloudCols), cloud(36, 12, r, cloudCols), cloud(62, 18, r, cloudCols), cloud(28, 10, r, cloudCols), cloud(46, 14, r, cloudCols)];
  return {
    layers: {
      sky: { img: sky, groundY: 232 },
      far: { img: far, groundY: FH + 10, parallax: 0.1 },
      mid: { img: mid, groundY: MH - 4, parallax: 0.25 },
      ground: { img: ground, groundY: LANE_GY },
    },
    clouds,
    skyTop: hex('#3468b8'),
  };
}
