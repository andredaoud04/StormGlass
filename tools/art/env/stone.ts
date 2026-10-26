/** Stone Age battlefield: warm prehistoric valley with a smoking volcano. */
import { Img, bayer, hex } from '../img';
import { STONE, BONE, MOSS } from '../palette';
import { broadleaf, cloud, conifer, ditherGradient, palm, peakRidge, rand, rock, sineRidge, type TreeCols } from './paint';

export const ENV_W = 256;

export interface EnvLayer {
  img: Img;
  /** Row of this image that lines up with the battlefield ground line (unit feet). */
  groundY: number;
  /** Parallax factor for ambient drift (0 = fixed). */
  parallax?: number;
}

export interface EnvArt {
  layers: Record<string, EnvLayer>;
  clouds: Img[];
  /** Colour to fill above the sky image on tall screens. */
  skyTop: number;
  /** Crater position in the far layer (for the smoke plume). */
  volcano?: [number, number];
}

export function stoneEnv(): EnvArt {
  const W = ENV_W;
  const r = rand(1207);

  // Sky
  const sky = new Img(W, 240);
  ditherGradient(sky, [
    { at: 0, c: hex('#2f6cc4') },
    { at: 0.28, c: hex('#4b90dc') },
    { at: 0.55, c: hex('#77b6ea') },
    { at: 0.78, c: hex('#a9d8f0') },
    { at: 0.92, c: hex('#d9eedd') },
    { at: 1, c: hex('#f7e9bc') },
  ]);
  // Sun with soft rings, upper left.
  const sunX = 44, sunY = 62;
  sky.ellipse(sunX, sunY, 17, 17, (x, y) => (bayer(x, y) < 0.5 ? hex('#cfe9ef') : hex('#a9d8f0')));
  sky.ellipse(sunX, sunY, 13, 13, hex('#e9f5e6'));
  sky.ellipse(sunX, sunY, 9, 9, hex('#fff6cf'));
  sky.ellipse(sunX, sunY, 7, 7, hex('#fffbe9'));

  // Far mountains + volcano
  const FH = 168;
  const far = new Img(W, FH);
  const mtnBack = { hl: hex('#b6c4e2'), base: hex('#93a3cf'), shade: hex('#7a87b8'), snow: hex('#f2f6ff'), snowShade: hex('#c9d4ef') };
  const back = peakRidge(W, [
    { x: 4, h: 104, half: 56 },
    { x: 62, h: 138, half: 66 },
    { x: 116, h: 92, half: 46 },
    { x: 206, h: 126, half: 62 },
    { x: 254, h: 96, half: 44 },
  ], r);
  for (let x = 0; x < W; x++) {
    const top = FH - 4 - Math.round(back.h[x]);
    const peaks = [4, 62, 116, 206, 254];
    const px = peaks[back.peakOf[x]] ?? x;
    for (let y = top; y < FH; y++) {
      const depth = y - top;
      let c = x < px ? mtnBack.hl : mtnBack.base;
      if (x >= px && depth > 3 && bayer(x, y) < 0.35) c = mtnBack.shade;
      if (back.h[x] > 84 && depth < (back.h[x] - 80) * 0.7 + (bayer(x, y) < 0.5 ? 1 : 0)) c = x < px ? mtnBack.snow : mtnBack.snowShade;
      far.set(x, y, c);
    }
  }
  // Volcano (front of the back range).
  const vol = { hl: hex('#8e7fa8'), base: hex('#6e6290'), shade: hex('#574c78'), lava: hex('#ff8f3a'), glow: hex('#ffd36a') };
  const vx = 156, vTop = FH - 104, vHalfTop = 8;
  for (let y = vTop; y < FH; y++) {
    const half = vHalfTop + (y - vTop) * 0.92;
    for (let x = Math.floor(vx - half); x <= Math.ceil(vx + half); x++) {
      const rel = (x - vx) / half;
      let c = rel < -0.25 ? vol.hl : rel < 0.35 ? vol.base : vol.shade;
      if (rel > 0.35 && bayer(x, y) < 0.3) c = vol.base;
      far.set(x, y, c);
    }
  }
  // Crater rim and lava streaks.
  far.hline(vx - vHalfTop, vx + vHalfTop, vTop, vol.shade);
  far.hline(vx - vHalfTop + 2, vx + vHalfTop - 2, vTop + 1, vol.lava);
  far.hline(vx - 3, vx + 3, vTop, vol.glow);
  for (const [sx, len] of [[-3, 14], [2, 22], [4, 9]] as const) {
    let x = vx + sx;
    for (let i = 0; i < len; i++) {
      const y = vTop + 2 + i;
      if (i % 4 === 3) x += sx < 0 ? -1 : 1;
      far.set(x, y, i < 3 ? vol.glow : vol.lava);
    }
  }
  // Front ridge, cooler and darker.
  const front = sineRidge(W, 34, [[6, 70, 0.4], [4, 33, 1.7], [2, 13, 0.2]]);
  const ridgeCols = { hl: hex('#7f98b7'), base: hex('#6b82a6'), shade: hex('#5b6f93') };
  for (let x = 0; x < W; x++) {
    const top = FH - Math.round(front[x]);
    const slope = front[Math.min(W - 1, x + 1)] - front[Math.max(0, x - 1)];
    for (let y = top; y < FH; y++) {
      const d = y - top;
      let c = slope > 0.3 ? ridgeCols.hl : slope < -0.3 ? ridgeCols.shade : ridgeCols.base;
      if (d > 6 && bayer(x, y) < (d - 6) / 18) c = ridgeCols.shade;
      far.set(x, y, c);
    }
  }

  // Mid: green hills with trees
  const mid = new Img(W, 68);
  const hill = sineRidge(W, 27, [[6, 90, 2.1], [3, 41, 0.6], [1.2, 17, 1.1]]);
  const g = { hl: hex('#a6d96a'), base: hex('#79bd52'), shade: hex('#5c9d45'), deep: hex('#477f3d') };
  for (let x = 0; x < W; x++) {
    const top = 68 - Math.round(hill[x]);
    for (let y = top; y < 68; y++) {
      const d = y - top;
      let c = d < 2 ? g.hl : g.base;
      if (d >= 2 && d < 4 && bayer(x, y) < 0.5) c = g.hl;
      if (d > 10 && bayer(x, y) < (d - 10) / 22) c = g.shade;
      if (d > 22 && bayer(x, y) < (d - 22) / 16) c = g.deep;
      mid.set(x, y, c);
    }
  }
  const darkTree: TreeCols = { hl: hex('#5fa04a'), base: hex('#3f8040'), shade: hex('#2f6538'), deep: hex('#244c31'), trunk: hex('#6e4a34'), trunkShade: hex('#4f3326') };
  const lightTree: TreeCols = { hl: hex('#b4e070'), base: hex('#7fc153'), shade: hex('#5a9f45'), deep: hex('#3f7a3c'), trunk: hex('#7f553a'), trunkShade: hex('#5c3a28') };
  const palmCols: TreeCols = { hl: hex('#a8dc6a'), base: hex('#6db04a'), shade: hex('#4c8c3e'), deep: hex('#366a34'), trunk: hex('#9a6b45'), trunkShade: hex('#6e4a30') };
  const place = (x: number) => 68 - Math.round(hill[Math.max(0, Math.min(W - 1, x))]) + 3;
  for (const [x, h] of [[18, 24], [27, 18], [96, 22], [104, 16], [176, 26], [186, 19], [232, 23], [241, 17]]) conifer(mid, x, place(x), h, darkTree, r);
  for (const [x, rr] of [[50, 6], [140, 7], [214, 5]]) broadleaf(mid, x, place(x), rr, lightTree, r);
  for (const [x, h, lean] of [[72, 20, 1], [124, 17, -1], [158, 22, 1], [200, 15, -1]]) palm(mid, x, place(x), h, lean, palmCols);

  // Ground lane
  const ground = new Img(W, 96);
  const GY = 22;
  const dirt = { hl: hex('#e2b47a'), base: hex('#c99460'), shade: hex('#a8744a'), deep: hex('#82553a') };
  const grass = { hl: MOSS.hl, base: MOSS.base, shade: MOSS.shade, deep: MOSS.deep };
  for (let x = 0; x < W; x++) {
    const backEdge = 10 + Math.round(Math.sin(x / 9) * 1.2 + Math.sin(x / 3.7) * 0.6);
    const frontEdge = 34 + Math.round(Math.sin(x / 11 + 1) * 1.4 + Math.sin(x / 4.3) * 0.7);
    for (let y = 0; y < 96; y++) {
      let c: number;
      if (y < backEdge - 2) {
        // Back meadow: grass with lighter dithered rows.
        c = y < 3 ? grass.hl : bayer(x, y) < 0.25 ? grass.hl : grass.base;
        if (y >= backEdge - 4) c = grass.shade;
      } else if (y < backEdge) c = grass.deep;
      else if (y < frontEdge) {
        const d = y - backEdge;
        c = d < 2 ? dirt.shade : d < 4 && bayer(x, y) < 0.5 ? dirt.shade : dirt.base;
        if (d >= 6 && d <= 14 && bayer(x + 1, y) < 0.12) c = dirt.hl;
        if (y >= frontEdge - 2) c = dirt.hl;
      } else if (y < frontEdge + 3) c = y === frontEdge ? grass.hl : grass.base;
      else {
        const d = y - frontEdge - 3;
        c = d < 14 ? grass.base : grass.shade;
        if (d >= 12 && d < 14 && bayer(x, y) < 0.5) c = grass.shade;
        if (d >= 34) c = d < 36 && bayer(x, y) < 0.5 ? grass.shade : grass.deep;
      }
      ground.set(x, y, c);
    }
  }
  // Wheel ruts / footprints along the lane.
  for (let x = 2; x < W; x += 7) {
    ground.set(x, GY + 3, dirt.shade);
    ground.set(x + 1, GY + 3, dirt.shade);
    ground.set(x + 3, GY - 3, dirt.shade);
  }
  // Pebbles on the lane.
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(r() * W);
    const y = 13 + Math.floor(r() * 19);
    ground.set(x, y, STONE.shade);
    ground.set(x, y - 1, STONE.hl);
  }
  // Grass tufts along both lane edges.
  const tuft = (x: number, y: number, c1: number, c2: number) => {
    ground.set(x, y, c1);
    ground.set(x - 1, y - 1, c1);
    ground.set(x + 1, y - 1, c2);
    ground.set(x, y - 2, c2);
  };
  for (let x = 3; x < W; x += 5 + Math.floor(r() * 6)) tuft(x, 9 + Math.round(Math.sin(x / 9) * 1.2), grass.shade, grass.base);
  for (let x = 1; x < W; x += 4 + Math.floor(r() * 7)) tuft(x, 37 + Math.round(Math.sin(x / 11 + 1) * 1.4), grass.base, grass.hl);
  // Rocks and bones in the foreground meadow.
  const st = { hl: STONE.hl, base: STONE.base, shade: STONE.shade, deep: STONE.deep };
  for (const [x, y, w, h] of [[22, 52, 9, 6], [30, 54, 5, 4], [118, 60, 11, 7], [190, 50, 7, 5], [236, 58, 10, 6], [80, 66, 6, 4]]) rock(ground, x, y, w, h, st);
  for (const [x, y] of [[60, 50], [160, 56], [212, 66]]) {
    ground.hline(x, x + 5, y, BONE.base);
    ground.hline(x + 1, x + 4, y + 1, BONE.shade);
    ground.set(x - 1, y - 1, BONE.hl);
    ground.set(x - 1, y + 1, BONE.hl);
    ground.set(x + 6, y - 1, BONE.hl);
    ground.set(x + 6, y + 1, BONE.hl);
  }
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(r() * W);
    const y = 44 + Math.floor(r() * 30);
    tuft(x, y, grass.shade, grass.hl);
  }
  // Tiny flowers.
  for (let i = 0; i < 18; i++) {
    const x = Math.floor(r() * W);
    const y = 42 + Math.floor(r() * 26);
    ground.set(x, y, i % 3 ? hex('#fff1b8') : hex('#ff9a9a'));
  }

  const cloudCols = { hl: hex('#ffffff'), base: hex('#eaf4fb'), shade: hex('#c3dcef') };
  const clouds = [cloud(46, 16, r, cloudCols), cloud(34, 12, r, cloudCols), cloud(58, 18, r, cloudCols), cloud(26, 10, r, cloudCols), cloud(72, 20, r, cloudCols), cloud(40, 13, r, cloudCols)];

  return {
    layers: {
      sky: { img: sky, groundY: 232 },
      far: { img: far, groundY: FH - 6, parallax: 0.1 },
      mid: { img: mid, groundY: 64, parallax: 0.25 },
      ground: { img: ground, groundY: GY },
    },
    clouds,
    skyTop: hex('#2f6cc4'),
    volcano: [vx, vTop],
  };
}
