/** Industrial Age battlefield: smoggy amber dusk, a factory skyline, shell-torn fields and wire. */
import { Img, bayer, hex } from '../img';
import { IRON, KHAKI, STONE, WOOD } from '../palette';
import { cloud, ditherGradient, rand, rock, sineRidge } from './paint';
import { LANE_GY, fillRidge, paintLane, tufts } from './lane';
import type { EnvArt } from './stone';

const W = 256;

function skyline(img: Img, base: number): [number, number] {
  const c = { hl: hex('#9a8a9a'), base: hex('#7c6e82'), shade: hex('#6a5e72'), lit: hex('#ffcf7a') };
  const block = (x: number, w: number, h: number, saw = false) => {
    img.rect(x, base - h, w, h, c.base);
    img.vline(x, base - h, base - 1, c.hl);
    if (saw) for (let k = 0; k + 6 <= w; k += 6) img.poly([[x + k, base - h], [x + k + 5, base - h - 4], [x + k + 6, base - h]], c.shade);
    for (let wx = x + 2; wx < x + w - 2; wx += 4) for (let wy = base - h + 3; wy < base - 3; wy += 5) if ((wx * 7 + wy * 3) % 5 < 2) img.set(wx, wy, c.lit);
  };
  block(0, 26, 21, true);
  block(30, 18, 33);
  block(52, 34, 18, true);
  block(92, 14, 42);
  block(112, 40, 24, true);
  block(158, 22, 30);
  block(186, 30, 20, true);
  block(222, 34, 27);
  // Chimneys; the tallest one smokes in game.
  const chim = (x: number, h: number) => {
    img.rect(x, base - h, 4, h, c.shade);
    img.vline(x, base - h, base - 1, c.base);
    img.hline(x - 1, x + 4, base - h, c.hl);
  };
  chim(14, 49);
  chim(70, 44);
  chim(132, 64);
  chim(140, 55);
  chim(200, 46);
  // Gasometer frame.
  for (let x = 236; x < 252; x += 3) img.vline(x, base - 40, base - 27, c.shade);
  img.hline(234, 252, base - 40, c.shade);
  img.hline(234, 252, base - 33, c.shade);
  return [134, base - 64];
}

export function industrialEnv(): EnvArt {
  const r = rand(1916);
  const sky = new Img(W, 240);
  ditherGradient(sky, [
    { at: 0, c: hex('#3c4466') },
    { at: 0.28, c: hex('#5c5c7a') },
    { at: 0.52, c: hex('#8a7a86') },
    { at: 0.74, c: hex('#c4987e') },
    { at: 0.9, c: hex('#e8b07a') },
    { at: 1, c: hex('#f4c88a') },
  ]);
  // Low red sun behind the haze.
  const sunX = 186, sunY = 150;
  sky.ellipse(sunX, sunY, 15, 15, (x, y) => (bayer(x, y) < 0.5 ? hex('#eab08a') : hex('#d8a084')));
  sky.ellipse(sunX, sunY, 10, 10, hex('#ffc890'));
  sky.ellipse(sunX, sunY, 6, 6, hex('#ffe2b0'));

  const FH = 120;
  const far = new Img(W, FH);
  const back = sineRidge(W, 28, [[5, 130, 0.6], [3, 47, 2.0], [1.5, 17, 1.1]]);
  fillRidge(far, back, FH, { hl: hex('#9c8a92'), base: hex('#8a7a86'), shade: hex('#7c6e7c'), deep: hex('#706472') }, 14);
  const smoke = skyline(far, FH - 14);

  // Mid: churned fields, ruined brick walls, dead trees and telegraph poles.
  const MH = 62;
  const mid = new Img(W, MH);
  const hill = sineRidge(W, 22, [[4, 96, 1.7], [3, 31, 0.3], [1.2, 13, 2.4]]);
  fillRidge(mid, hill, MH, { hl: hex('#a29a6e'), base: hex('#857e58'), shade: hex('#6c6648'), deep: hex('#58523c') });
  const place = (x: number) => MH - Math.round(hill[Math.max(0, Math.min(W - 1, x))]) + 3;
  const ruin = (x: number, w: number, h: number) => {
    const g = place(x + w / 2);
    for (let i = 0; i < w; i++) {
      const hh = Math.max(2, h - Math.abs(Math.round(Math.sin(i * 1.7) * 4)) - (i > w * 0.6 ? i - Math.floor(w * 0.6) : 0));
      for (let j = 0; j < hh; j++) mid.set(x + i, g - j, (j % 3 === 2 ? hex('#7a4a3e') : (i + Math.floor(j / 3) * 2) % 5 === 0 ? hex('#7a4a3e') : hex('#a85a46')));
    }
    mid.rect(x + 3, g - h + 6, 3, 3, hex('#3a2a2e'));
  };
  ruin(40, 22, 18);
  ruin(168, 18, 14);
  const deadTree = (x: number, h: number) => {
    const g = place(x);
    mid.vline(x, g - h, g, hex('#4a3a34'));
    mid.vline(x + 1, g - h + 2, g, hex('#3a2c28'));
    mid.line(x, g - h + 4, x - 4, g - h, hex('#4a3a34'));
    mid.line(x + 1, g - h + 7, x + 5, g - h + 2, hex('#4a3a34'));
    mid.line(x - 2, g - h + 2, x - 3, g - h - 1, hex('#4a3a34'));
  };
  for (const [x, h] of [[20, 16], [100, 20], [148, 13], [230, 18]]) deadTree(x, h);
  for (const x of [72, 124, 206]) {
    const g = place(x);
    mid.vline(x, g - 18, g, WOOD.deep);
    mid.hline(x - 3, x + 3, g - 16, WOOD.deep);
  }
  for (let x = 0; x < W; x++) {
    const sag = (p: number) => Math.round(Math.sin(((x - p) / 52) * Math.PI) * 2);
    if (x > 72 && x < 124) mid.set(x, place(72) - 16 + sag(72) + 1, hex('#3a3236'));
    if (x > 124 && x < 206) mid.set(x, place(124) - 16 + Math.round(Math.sin(((x - 124) / 82) * Math.PI) * 3) + 1, hex('#3a3236'));
  }

  // Ground: mud lane with duckboards, shell holes with water, wire and sandbags.
  const ground = new Img(W, 96);
  const road = { hl: hex('#a8906c'), base: hex('#8a7254'), shade: hex('#6e5a44'), deep: hex('#4e4034') };
  const grass = { hl: hex('#aca46e'), base: hex('#8c8658'), shade: hex('#706c48'), deep: hex('#58563c') };
  paintLane(ground, road, grass);
  // Duckboard segments along the lane.
  for (let x = 4; x < W; x += 36 + Math.floor(r() * 10)) {
    const len = 14 + Math.floor(r() * 8);
    for (let i = 0; i < len; i++) {
      const c = i % 3 === 2 ? WOOD.deep : i % 3 === 0 ? WOOD.hl : WOOD.base;
      ground.vline(x + i, LANE_GY - 2, LANE_GY + 1, c);
    }
    ground.hline(x, x + len - 1, LANE_GY + 2, WOOD.deep);
  }
  const puddle = (cx: number, cy: number, rx: number) => {
    ground.ellipse(cx, cy, rx, rx * 0.42, (_x, _y, nx, ny) => (ny < -0.35 ? road.deep : nx < -0.2 ? hex('#8aa0b8') : hex('#5e6e88')));
    ground.set(Math.round(cx - rx / 3), Math.round(cy), hex('#c4d4e4'));
  };
  puddle(60, 16, 4);
  puddle(190, 27, 3.5);
  puddle(128, 60, 7);
  tufts(ground, r, grass);
  // Barbed wire on stakes in the foreground.
  for (let x = 4; x < W; x += 1) {
    const y = 48 + Math.round(Math.sin(x / 4) * 2);
    if (x % 2 === 0) ground.set(x, y, hex('#4a4450'));
    if (x % 6 === 0) ground.set(x, y - 1, hex('#8a8494'));
  }
  for (let x = 10; x < W; x += 30) {
    ground.vline(x, 44, 52, WOOD.deep);
    ground.set(x, 43, WOOD.base);
  }
  // Sandbags and a rusted helmet.
  for (const [x, y] of [[196, 66], [202, 66], [199, 63], [30, 72], [36, 72]]) ground.ellipse(x, y, 3, 1.7, (_x, _y, nx, ny) => (ny < -0.3 ? KHAKI.hl : nx > 0.4 ? KHAKI.shade : KHAKI.base));
  ground.ellipse(98, 70, 4, 2, (_x, _y, _nx, ny) => (ny < 0 ? IRON.base : IRON.shade));
  ground.hline(93, 103, 71, IRON.deep);
  const st = { hl: STONE.hl, base: STONE.base, shade: STONE.shade, deep: STONE.deep };
  for (const [x, y, w, h] of [[150, 56, 8, 5], [236, 74, 7, 4]]) rock(ground, x, y, w, h, st);

  const cloudCols = { hl: hex('#d8c4c0'), base: hex('#b4a2aa'), shade: hex('#8e8090') };
  const clouds = [cloud(64, 18, r, cloudCols), cloud(44, 14, r, cloudCols), cloud(76, 20, r, cloudCols), cloud(34, 12, r, cloudCols), cloud(56, 16, r, cloudCols), cloud(40, 13, r, cloudCols)];
  return {
    layers: {
      sky: { img: sky, groundY: 232 },
      far: { img: far, groundY: FH + 6, parallax: 0.1 },
      mid: { img: mid, groundY: MH - 4, parallax: 0.25 },
      ground: { img: ground, groundY: LANE_GY },
    },
    clouds,
    skyTop: hex('#3c4466'),
    volcano: smoke,
  };
}
