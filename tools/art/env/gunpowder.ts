/** Gunpowder Age battlefield: hazy powder-smoke afternoon, a walled town afire, redoubts and gabions. */
import { Img, bayer, hex } from '../img';
import { IRON, STONE, WOOD } from '../palette';
import { broadleaf, cloud, ditherGradient, rand, rock, sineRidge, type TreeCols } from './paint';
import { LANE_GY, fillRidge, paintLane, tufts } from './lane';
import type { EnvArt } from './stone';

const W = 256;

function town(img: Img, x: number, base: number): [number, number] {
  const c = { hl: hex('#b4b4cc'), base: hex('#8e90ae'), shade: hex('#7a7c9c'), roof: hex('#9a7e8e') };
  const house = (hx: number, w: number, h: number) => {
    img.rect(hx, base - h, w, h, c.base);
    img.vline(hx, base - h, base - 1, c.hl);
    img.poly([[hx - 1, base - h], [hx + w / 2, base - h - Math.ceil(w / 2)], [hx + w + 1, base - h]], c.roof);
  };
  // Town wall with round towers.
  img.rect(x, base - 6, 64, 6, c.shade);
  for (let tx = x; tx < x + 64; tx += 2) img.set(tx, base - 7, c.shade);
  house(x + 4, 7, 9);
  house(x + 13, 6, 12);
  house(x + 30, 8, 10);
  house(x + 40, 6, 8);
  house(x + 50, 7, 11);
  // Church with a spire.
  img.rect(x + 21, base - 16, 6, 16, c.base);
  img.vline(x + 21, base - 16, base - 1, c.hl);
  img.poly([[x + 20, base - 16], [x + 24, base - 30], [x + 28, base - 16]], (px) => (px < x + 24 ? c.hl : c.roof));
  for (const tx of [x - 2, x + 62]) {
    img.rect(tx, base - 10, 5, 10, c.shade);
    img.poly([[tx - 1, base - 10], [tx + 2.5, base - 15], [tx + 6, base - 10]], c.roof);
  }
  // A burning house: glow and embers (smoke rises from here in game).
  const fx = x + 42, fy = base - 9;
  img.rect(fx - 2, fy - 1, 5, 3, hex('#ff9a4a'));
  img.set(fx, fy - 2, hex('#ffd36a'));
  img.set(fx - 1, fy, hex('#ffe6a0'));
  return [fx, fy - 2];
}

function gabion(img: Img, x: number, g: number): void {
  const c = { hl: hex('#c8a46a'), base: hex('#a07e4a'), shade: hex('#7a5a36'), deep: hex('#4e3826') };
  for (let y = g - 7; y < g; y++) for (let i = 0; i < 5; i++) img.set(x + i, y, (y + i) % 2 ? c.base : i === 0 ? c.hl : i === 4 ? c.deep : c.shade);
  img.hline(x, x + 4, g - 8, hex('#6a5a3e'));
  img.hline(x + 1, x + 3, g - 9, hex('#7e6e4a'));
}

export function gunpowderEnv(): EnvArt {
  const r = rand(1648);
  const sky = new Img(W, 240);
  ditherGradient(sky, [
    { at: 0, c: hex('#40639a') },
    { at: 0.3, c: hex('#6486b4') },
    { at: 0.58, c: hex('#94aac4') },
    { at: 0.78, c: hex('#c4c6c4') },
    { at: 0.92, c: hex('#e8d4b0') },
    { at: 1, c: hex('#f2c08a') },
  ]);
  const sunX = 58, sunY = 112;
  sky.ellipse(sunX, sunY, 16, 16, (x, y) => (bayer(x, y) < 0.5 ? hex('#e6dccc') : hex('#d4d0c8')));
  sky.ellipse(sunX, sunY, 11, 11, hex('#fff0d0'));
  sky.ellipse(sunX, sunY, 7, 7, hex('#fffbe9'));

  // Far: hazy hills, a walled town with a church spire, one house burning.
  const FH = 130;
  const far = new Img(W, FH);
  const back = sineRidge(W, 62, [[12, 140, 1.1], [6, 53, 2.6], [2, 21, 0.4]]);
  fillRidge(far, back, FH, { hl: hex('#b8bed6'), base: hex('#a2a8c6'), shade: hex('#9298b8'), deep: hex('#8288aa') }, 16);
  const front = sineRidge(W, 30, [[6, 110, 0.2], [3, 37, 1.4], [1.5, 15, 2.2]]);
  fillRidge(far, front, FH, { hl: hex('#a8b49a'), base: hex('#94a088'), shade: hex('#848f7a'), deep: hex('#76806e') }, 12);
  const smoke = town(far, 150, FH - Math.round(front[182]) + 4);

  // Mid: ochre fields with hay, poplars, an earthwork redoubt lined with gabions.
  const MH = 64;
  const mid = new Img(W, MH);
  const hill = sineRidge(W, 24, [[5, 90, 2.9], [3, 33, 0.9], [1.2, 14, 1.6]]);
  fillRidge(mid, hill, MH, { hl: hex('#d4cc7a'), base: hex('#b4ae5c'), shade: hex('#96924c'), deep: hex('#7a7a42') });
  const place = (x: number) => MH - Math.round(hill[Math.max(0, Math.min(W - 1, x))]) + 3;
  const poplar: TreeCols = { hl: hex('#9ac46a'), base: hex('#6e9e4c'), shade: hex('#527e40'), deep: hex('#3c6034'), trunk: hex('#6e4a34'), trunkShade: hex('#4f3326') };
  for (const [x, rr] of [[14, 6], [30, 5], [220, 7], [240, 5]]) broadleaf(mid, x, place(x), rr, poplar, r);
  // Redoubt: an earth bank with gabions and a timber gun platform.
  const rx = 92;
  mid.poly([[rx - 6, place(rx) + 2], [rx, place(rx) - 9], [rx + 52, place(rx) - 9], [rx + 58, place(rx) + 2]], (x, y) => (y < place(rx) - 7 ? hex('#a08a58') : x < rx + 4 ? hex('#8a7448') : hex('#7a6640')));
  for (let gx = rx + 2; gx < rx + 50; gx += 6) gabion(mid, gx, place(rx) - 8);
  mid.rect(rx + 22, place(rx) - 13, 9, 2, IRON.base);
  mid.hline(rx + 22, rx + 30, place(rx) - 13, IRON.hl);
  // Haystacks.
  for (const hx of [56, 176, 196]) {
    const g = place(hx);
    mid.ellipse(hx, g - 3, 4, 4, (_x, _y, nx, ny) => (ny > 0.4 ? hex('#a8823a') : nx < -0.2 ? hex('#f0d47a') : hex('#d4b058')));
  }

  // Ground: churned road with cannonball craters, shot and a lost drum.
  const ground = new Img(W, 96);
  const road = { hl: hex('#d0b080'), base: hex('#b08e62'), shade: hex('#8e6e4c'), deep: hex('#6a503a') };
  const grass = { hl: hex('#bcd078'), base: hex('#94b25a'), shade: hex('#76944a'), deep: hex('#5a763e') };
  paintLane(ground, road, grass);
  for (let x = 0; x < W; x++) {
    if ((x * 7) % 11 < 6) ground.set(x, LANE_GY - 4, road.shade);
    if ((x * 5) % 13 < 7) ground.set(x, LANE_GY + 5, road.shade);
  }
  const crater = (cx: number, cy: number, rx: number) => {
    ground.ellipse(cx, cy, rx, rx * 0.4, (_x, _y, nx, ny) => (ny < -0.2 ? road.deep : nx > 0.3 ? road.shade : hex('#5a4232')));
    ground.hline(Math.round(cx - rx), Math.round(cx + rx), Math.round(cy + rx * 0.4), road.hl);
  };
  crater(40, 18, 4);
  crater(176, 26, 3);
  crater(120, 58, 6);
  tufts(ground, r, grass);
  // Spent cannonballs.
  for (const [x, y] of [[66, 24], [200, 15], [24, 60], [150, 66]]) {
    ground.ellipse(x, y, 1.6, 1.6, IRON.shade);
    ground.set(x - 1, y - 1, IRON.hl);
  }
  const st = { hl: STONE.hl, base: STONE.base, shade: STONE.shade, deep: STONE.deep };
  for (const [x, y, w, h] of [[226, 56, 8, 5], [92, 66, 7, 4]]) rock(ground, x, y, w, h, st);
  // A dropped drum and a musket in the grass.
  ground.rect(190, 58, 6, 5, hex('#c0504a'));
  ground.hline(190, 195, 58, hex('#f0e0c0'));
  ground.hline(190, 195, 62, hex('#f0e0c0'));
  ground.line(191, 59, 194, 61, hex('#f0e0c0'));
  ground.line(30, 76, 50, 72, WOOD.base);
  ground.line(42, 73, 52, 71, IRON.base);

  const cloudCols = { hl: hex('#ffffff'), base: hex('#e8e6ea'), shade: hex('#c4c0cc') };
  const clouds = [cloud(60, 18, r, cloudCols), cloud(40, 14, r, cloudCols), cloud(70, 20, r, cloudCols), cloud(30, 11, r, cloudCols), cloud(50, 15, r, cloudCols)];
  return {
    layers: {
      sky: { img: sky, groundY: 232 },
      far: { img: far, groundY: FH + 8, parallax: 0.1 },
      mid: { img: mid, groundY: MH - 4, parallax: 0.25 },
      ground: { img: ground, groundY: LANE_GY },
    },
    clouds,
    skyTop: hex('#40639a'),
    volcano: smoke,
  };
}
