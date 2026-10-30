/** Future Age battlefield: violet dusk with a ringed planet, a lit spire city, crystals and pylons. */
import { Img, bayer, hex, type Color } from '../img';
import { PLASMA } from '../palette';
import { cloud, ditherGradient, rand, sineRidge } from './paint';
import { LANE_GY, fillRidge, paintLane } from './lane';
import type { EnvArt } from './stone';

const W = 256;

function crystal(img: Img, x: number, g: number, h: number, lean: number, c: { hl: Color; base: Color; shade: Color }): void {
  const w = Math.max(2, Math.round(h / 3));
  for (let j = 0; j < h; j++) {
    const t = j / h;
    const half = Math.max(0, Math.round(w * (1 - t) * 0.9 + (t < 0.15 ? 0 : 0)));
    const cx = x + Math.round(lean * t * h * 0.3);
    for (let i = -half; i <= half; i++) img.set(cx + i, g - j, i < 0 ? c.hl : i === 0 ? c.base : c.shade);
  }
}

function city(img: Img, base: number): void {
  const c = { hl: hex('#8a8cc8'), base: hex('#5e6098'), shade: hex('#4a4c80'), lit: hex('#9cf4ff'), lit2: hex('#ffd0f4') };
  const tower = (x: number, w: number, h: number, spire = false) => {
    for (let y = base - h; y < base; y++) for (let i = 0; i < w; i++) img.set(x + i, y, i === 0 ? c.hl : i === w - 1 ? c.shade : c.base);
    for (let wy = base - h + 3; wy < base - 2; wy += 3) for (let wx = x + 1; wx < x + w - 1; wx += 2) if ((wx * 5 + wy * 7) % 4 === 0) img.set(wx, wy, (wx + wy) % 3 ? c.lit : c.lit2);
    if (spire) {
      img.poly([[x, base - h], [x + w / 2, base - h - w * 2], [x + w, base - h]], (px) => (px < x + w / 2 ? c.hl : c.base));
      img.set(Math.round(x + w / 2), base - h - w * 2 - 1, c.lit);
    }
  };
  tower(6, 8, 30, true);
  tower(18, 12, 20);
  tower(34, 6, 42, true);
  tower(44, 14, 16);
  tower(64, 8, 26, true);
  tower(150, 10, 22);
  tower(164, 7, 48, true);
  tower(176, 12, 28);
  tower(194, 6, 36, true);
  tower(206, 16, 18);
  tower(230, 9, 32, true);
  // Sky bridge.
  img.hline(40, 64, base - 22, c.shade);
  img.hline(170, 194, base - 30, c.shade);
}

export function futureEnv(): EnvArt {
  const r = rand(2150);
  const sky = new Img(W, 240);
  ditherGradient(sky, [
    { at: 0, c: hex('#1c1840') },
    { at: 0.3, c: hex('#2e2a62') },
    { at: 0.56, c: hex('#4c3e86') },
    { at: 0.76, c: hex('#7a5a9e') },
    { at: 0.9, c: hex('#c47aa8') },
    { at: 1, c: hex('#f0a0a0') },
  ]);
  // Stars in the upper sky.
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(r() * W), y = Math.floor(r() * 130);
    sky.set(x, y, i % 7 === 0 ? hex('#ffffff') : i % 3 ? hex('#a8b0e8') : hex('#d8dcff'));
  }
  // Ringed planet.
  const px = 64, py = 92;
  sky.ellipse(px, py, 20, 20, (_x, _y, nx, ny) => (nx + ny < -0.6 ? hex('#f0c8e8') : nx + ny > 0.5 ? hex('#7a5aa0') : bayer(_x, _y) < 0.3 ? hex('#c49ad0') : hex('#b088c8')));
  for (let a = 0; a < Math.PI * 2; a += 0.01) {
    const x = px + Math.cos(a) * 32, y = py + Math.sin(a) * 6 - Math.cos(a) * 4;
    const behind = Math.sin(a) < 0;
    const inside = Math.hypot((x - px) / 20, (y - py) / 20) < 1;
    if (behind && inside) continue;
    sky.set(x, y, hex('#e8d8f4'));
    sky.set(x, y + 1, hex('#a890c8'));
  }
  // A second, small moon.
  sky.ellipse(206, 46, 5, 5, (_x, _y, nx, ny) => (nx + ny < -0.3 ? hex('#e0e4ff') : hex('#9aa0d8')));

  // Far: crystal ridges and a lit spire city.
  const FH = 140;
  const far = new Img(W, FH);
  const back = sineRidge(W, 38, [[10, 120, 0.9], [6, 43, 2.2], [2, 17, 0.2]]);
  fillRidge(far, back, FH, { hl: hex('#5a5294'), base: hex('#4a4484'), shade: hex('#403a76'), deep: hex('#363068') }, 14);
  for (const [x, h, l] of [[96, 34, 1], [104, 22, -1], [118, 40, 0], [128, 26, 1], [136, 18, -1]]) crystal(far, x, FH - Math.round(back[x]) + 6, h, l, { hl: hex('#b4e8ff'), base: hex('#7ab8f0'), shade: hex('#5a7ad0') });
  city(far, FH - 10);
  for (let x = 0; x < W; x++) for (let y = FH - 10; y < FH; y++) far.set(x, y, y === FH - 10 ? hex('#7a80c0') : hex('#3c3a70'));

  // Mid: crystal outcrops, alloy pylons with lights, a landing pad.
  const MH = 64;
  const mid = new Img(W, MH);
  const hill = sineRidge(W, 22, [[5, 88, 0.5], [3, 35, 1.9], [1.2, 14, 2.8]]);
  fillRidge(mid, hill, MH, { hl: hex('#6e7ab8'), base: hex('#56609e'), shade: hex('#485088'), deep: hex('#3a4070') });
  const place = (x: number) => MH - Math.round(hill[Math.max(0, Math.min(W - 1, x))]) + 3;
  const cr = { hl: hex('#e0f4ff'), base: hex('#8ad8ff'), shade: hex('#4a90e0') };
  const cr2 = { hl: hex('#ffd8f4'), base: hex('#e08ad8'), shade: hex('#a04ab8') };
  for (const [x, h, l, k] of [[20, 18, 1, 0], [26, 11, -1, 0], [84, 14, 1, 1], [90, 9, 1, 1], [172, 20, -1, 0], [180, 12, 1, 0], [238, 15, 0, 1]]) crystal(mid, x, place(x), h, l, k ? cr2 : cr);
  for (const x of [56, 128, 208]) {
    const g = place(x);
    mid.rect(x - 1, g - 20, 3, 20, hex('#9aa6c8'));
    mid.vline(x - 1, g - 20, g - 1, hex('#d0d8ec'));
    mid.vline(x + 1, g - 20, g - 1, hex('#6a76a0'));
    mid.rect(x - 2, g - 22, 5, 2, hex('#6a76a0'));
    mid.set(x, g - 23, PLASMA.hl);
    mid.set(x - 1, g - 23, PLASMA.shade);
    mid.set(x + 1, g - 23, PLASMA.shade);
  }
  // Landing pad with a parked skiff.
  const lp = place(140);
  mid.rect(132, lp - 3, 22, 3, hex('#8a94b8'));
  mid.hline(132, 153, lp - 3, hex('#c8d0e8'));
  mid.poly([[136, lp - 4], [140, lp - 9], [150, lp - 9], [154, lp - 4]], (x) => (x < 144 ? hex('#d0d8ec') : hex('#9aa6c8')));
  mid.hline(141, 148, lp - 8, PLASMA.base);

  // Ground: plated road with lane lights, crystal shards and panels in the verge.
  const ground = new Img(W, 96);
  const road = { hl: hex('#a8b0cc'), base: hex('#7c84a4'), shade: hex('#626a8a'), deep: hex('#484e6c') };
  const verge = { hl: hex('#7e8ac4'), base: hex('#5e68a4'), shade: hex('#4c5490'), deep: hex('#3c4278') };
  paintLane(ground, road, verge, {
    roadTex: (x, _y, d) => {
      if (d >= 2 && (x % 24 === 0 || (d % 8 === 0 && d < 22))) return road.shade;
      return null;
    },
  });
  // Glowing lane-edge lights.
  for (let x = 6; x < W; x += 12) {
    const be = 10 + Math.round(Math.sin(x / 9) * 1.2 + Math.sin(x / 3.7) * 0.6);
    ground.set(x, be, PLASMA.base);
    ground.set(x + 1, be, PLASMA.shade);
    const fe = 34 + Math.round(Math.sin(x / 11 + 1) * 1.4 + Math.sin(x / 4.3) * 0.7);
    ground.set(x + 6, fe - 2, PLASMA.hl);
    ground.set(x + 7, fe - 2, PLASMA.shade);
  }
  // Foreground: hex panels, crystal shards, a fallen drone.
  for (let i = 0; i < 18; i++) {
    const x = Math.floor(r() * W), y = 44 + Math.floor(r() * 30);
    ground.hline(x, x + 5, y, verge.hl);
    ground.hline(x + 1, x + 4, y + 1, verge.deep);
  }
  for (const [x, y, h] of [[30, 60, 7], [36, 62, 4], [160, 70, 8], [226, 56, 6]]) crystal(ground, x, y, h, 0, cr);
  ground.ellipse(110, 64, 6, 2.5, (_x, _y, nx, ny) => (ny < -0.2 ? hex('#c8d0e8') : nx > 0.3 ? hex('#6a76a0') : hex('#9aa6c8')));
  ground.set(112, 63, hex('#ff6a6a'));

  const cloudCols = { hl: hex('#d0b4e0'), base: hex('#a088c4'), shade: hex('#7a68a8') };
  const clouds = [cloud(60, 12, r, cloudCols), cloud(40, 9, r, cloudCols), cloud(72, 14, r, cloudCols), cloud(32, 8, r, cloudCols)];
  return {
    layers: {
      sky: { img: sky, groundY: 232 },
      far: { img: far, groundY: FH + 6, parallax: 0.1 },
      mid: { img: mid, groundY: MH - 4, parallax: 0.25 },
      ground: { img: ground, groundY: LANE_GY },
    },
    clouds,
    skyTop: hex('#1c1840'),
  };
}
