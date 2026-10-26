/** Ancient Age battlefield: sunlit Aegean coast with islands, cypress, olive groves and a temple. */
import { Img, bayer, hex } from '../img';
import { LINEN, SAND, STONE } from '../palette';
import { broadleaf, cloud, ditherGradient, rand, rock, sineRidge, type TreeCols } from './paint';
import type { EnvArt } from './stone';

const W = 256;

function cypress(img: Img, x: number, groundY: number, h: number): void {
  const c = { hl: hex('#5e9a52'), base: hex('#3e7444'), shade: hex('#2c5636'), deep: hex('#1f3e2a') };
  img.rect(x, groundY - 2, 1, 2, hex('#5a3e2a'));
  for (let i = 0; i < h; i++) {
    const t = i / h;
    const half = Math.max(0.6, Math.sin(Math.min(1, t * 1.25) * Math.PI) * 2.6);
    const y = groundY - 2 - i;
    for (let dx = -Math.round(half); dx <= Math.round(half); dx++) img.set(x + dx, y, dx < 0 ? c.hl : dx === 0 ? c.base : dx === 1 ? c.shade : c.deep);
  }
}

function temple(img: Img, x: number, groundY: number): void {
  const m = { hl: hex('#ffffff'), base: LINEN.hl, shade: LINEN.base, deep: LINEN.shade };
  const w = 30;
  img.rect(x - 2, groundY - 3, w + 4, 3, m.shade);
  img.hline(x - 2, x + w + 1, groundY - 3, m.base);
  for (let c = 0; c < 6; c++) {
    const cx = x + 1 + c * 5;
    img.rect(cx, groundY - 15, 2, 12, m.base);
    img.vline(cx + 1, groundY - 15, groundY - 4, m.shade);
  }
  img.rect(x - 1, groundY - 18, w + 2, 3, m.base);
  img.hline(x - 1, x + w, groundY - 18, m.hl);
  img.poly([[x - 2, groundY - 18], [x + w / 2, groundY - 25], [x + w + 2, groundY - 18]], (px) => (px < x + w / 2 ? m.hl : m.shade));
}

export function ancientEnv(): EnvArt {
  const r = rand(2024);
  const sky = new Img(W, 240);
  ditherGradient(sky, [
    { at: 0, c: hex('#3a86d0') },
    { at: 0.3, c: hex('#5ea8e2') },
    { at: 0.6, c: hex('#8ccbec') },
    { at: 0.82, c: hex('#c6e6ee') },
    { at: 0.94, c: hex('#f4ecd0') },
    { at: 1, c: hex('#ffe2b4') },
  ]);
  const sunX = 206, sunY = 70;
  sky.ellipse(sunX, sunY, 18, 18, (x, y) => (bayer(x, y) < 0.5 ? hex('#d7eef0') : hex('#c6e6ee')));
  sky.ellipse(sunX, sunY, 13, 13, hex('#fff4d8'));
  sky.ellipse(sunX, sunY, 9, 9, hex('#fffbea'));

  // Far: islands and a cliff headland over a bright sea.
  const FH = 150;
  const far = new Img(W, FH);
  const seaTop = FH - 30;
  // Distant snow-capped range beyond the sea (pale, hazy).
  const range = { hl: hex('#d6dcf0'), base: hex('#bcc4e4'), shade: hex('#a6b0d6'), snow: hex('#f6f8ff') };
  const peaks = [
    { x: 30, h: 70, half: 50 },
    { x: 96, h: 96, half: 58 },
    { x: 150, h: 62, half: 40 },
    { x: 214, h: 84, half: 54 },
  ];
  for (let x = 0; x < W; x++) {
    let best = 0;
    let px = x;
    for (const p of peaks) {
      const v = p.h * Math.max(0, 1 - Math.abs(x - p.x) / p.half) + Math.sin(x * 0.9) * 0.8;
      if (v > best) {
        best = v;
        px = p.x;
      }
    }
    const top = seaTop - Math.round(best);
    for (let y = top; y < seaTop; y++) {
      const depth = y - top;
      let c = x < px ? range.hl : range.base;
      if (x >= px && depth > 3 && bayer(x, y) < 0.3) c = range.shade;
      if (best > 60 && depth < (best - 58) * 0.5 + (bayer(x, y) < 0.5 ? 1 : 0)) c = range.snow;
      if (depth > best - 12 && bayer(x, y) < (depth - (best - 12)) / 14) c = hex('#e6e8ee');
      far.set(x, y, c);
    }
  }
  const island = (cx: number, half: number, h: number, col: { hl: number; base: number; shade: number }) => {
    for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
      const t = (x - cx) / half;
      const top = seaTop - Math.round(h * Math.max(0, 1 - t * t) * (0.85 + 0.15 * Math.sin(x * 0.7)));
      for (let y = top; y < seaTop; y++) far.set(x, y, t < -0.2 ? col.hl : t < 0.3 ? col.base : col.shade);
    }
  };
  island(40, 34, 18, { hl: hex('#c7b8d8'), base: hex('#ad9fc6'), shade: hex('#978ab4') });
  island(120, 22, 11, { hl: hex('#d2c6e0'), base: hex('#bbb0d2'), shade: hex('#a79cc2') });
  // Headland cliff on the right with strata.
  for (let x = 160; x < W; x++) {
    const t = (x - 160) / 96;
    const top = seaTop - Math.round(14 + t * 52 + Math.sin(x * 0.3) * 1.5);
    for (let y = top; y < seaTop; y++) {
      const band = (y - top) % 7;
      let c = band === 0 ? SAND.hl : band < 4 ? hex('#e3c48e') : hex('#cfa874');
      if (x < 166 + (y - top) * 0.2) c = hex('#b98e5e');
      far.set(x, y, c);
    }
  }
  // Sea with dithered horizon and sparkles.
  for (let y = seaTop; y < FH; y++) {
    for (let x = 0; x < W; x++) {
      const d = y - seaTop;
      let c = d < 2 ? hex('#7fc4e0') : d < 8 ? hex('#4e9fd0') : hex('#3a84c0');
      if (d >= 2 && d < 4 && bayer(x, y) < 0.5) c = hex('#7fc4e0');
      if (d >= 7 && d < 10 && bayer(x, y) < 0.5) c = hex('#4e9fd0');
      if ((x * 7 + y * 13) % 37 === 0 && d > 1) c = hex('#e8f8ff');
      far.set(x, y, c);
    }
  }

  // Mid: dry hills, cypress, olive trees and a temple.
  const MH = 64;
  const mid = new Img(W, MH);
  const hill = sineRidge(W, 26, [[6, 80, 1.2], [3, 37, 2.6], [1.2, 15, 0.4]]);
  const gcol = { hl: hex('#d8d07a'), base: hex('#b8b05a'), shade: hex('#98944a'), deep: hex('#7a7a40') };
  for (let x = 0; x < W; x++) {
    const top = MH - Math.round(hill[x]);
    for (let y = top; y < MH; y++) {
      const d = y - top;
      let c = d < 2 ? gcol.hl : gcol.base;
      if (d >= 2 && d < 4 && bayer(x, y) < 0.5) c = gcol.hl;
      if (d > 10 && bayer(x, y) < (d - 10) / 22) c = gcol.shade;
      if (d > 20 && bayer(x, y) < (d - 20) / 16) c = gcol.deep;
      mid.set(x, y, c);
    }
  }
  const place = (x: number) => MH - Math.round(hill[Math.max(0, Math.min(W - 1, x))]) + 3;
  temple(mid, 112, place(127));
  const olive: TreeCols = { hl: hex('#c4d4a0'), base: hex('#98ae78'), shade: hex('#78905e'), deep: hex('#5c7048'), trunk: hex('#7a6248'), trunkShade: hex('#5a4634') };
  for (const [x, h] of [[16, 26], [22, 20], [86, 24], [92, 18], [170, 28], [176, 21], [236, 25], [243, 19]]) cypress(mid, x, place(x), h);
  for (const [x, rr] of [[52, 5], [64, 4], [200, 6], [214, 4]]) broadleaf(mid, x, place(x), rr, olive, r);

  // Ground: sandy road with dry grass, shards and a fallen column.
  const ground = new Img(W, 96);
  const GY = 22;
  const dirt = { hl: hex('#fbe2ae'), base: hex('#ecca8c'), shade: hex('#d2a868'), deep: hex('#a87c48') };
  const grass = { hl: hex('#e2d886'), base: hex('#c4b860'), shade: hex('#a49a4c'), deep: hex('#827a40') };
  for (let x = 0; x < W; x++) {
    const backEdge = 10 + Math.round(Math.sin(x / 9) * 1.2 + Math.sin(x / 3.7) * 0.6);
    const frontEdge = 34 + Math.round(Math.sin(x / 11 + 1) * 1.4 + Math.sin(x / 4.3) * 0.7);
    for (let y = 0; y < 96; y++) {
      let c: number;
      if (y < backEdge - 2) c = y < 3 ? grass.hl : bayer(x, y) < 0.25 ? grass.hl : grass.base;
      else if (y < backEdge) c = grass.deep;
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
  // Paving stones peeking through the road.
  for (let x = 4; x < W; x += 9 + Math.floor(r() * 6)) {
    const y = 15 + Math.floor(r() * 14);
    ground.rect(x, y, 5, 2, dirt.shade);
    ground.hline(x, x + 4, y, dirt.hl);
  }
  const tuft = (x: number, y: number, c1: number, c2: number) => {
    ground.set(x, y, c1);
    ground.set(x - 1, y - 1, c1);
    ground.set(x + 1, y - 1, c2);
    ground.set(x, y - 2, c2);
  };
  for (let x = 3; x < W; x += 5 + Math.floor(r() * 6)) tuft(x, 9 + Math.round(Math.sin(x / 9) * 1.2), grass.shade, grass.base);
  for (let x = 1; x < W; x += 4 + Math.floor(r() * 7)) tuft(x, 37 + Math.round(Math.sin(x / 11 + 1) * 1.4), grass.base, grass.hl);
  const st = { hl: STONE.hl, base: STONE.base, shade: STONE.shade, deep: STONE.deep };
  for (const [x, y, w, h] of [[30, 54, 8, 5], [126, 62, 9, 6], [222, 52, 7, 5]]) rock(ground, x, y, w, h, st);
  // Fallen marble column.
  ground.rect(70, 50, 18, 5, LINEN.base);
  ground.hline(70, 87, 50, hex('#ffffff'));
  ground.hline(70, 87, 54, LINEN.shade);
  for (let x = 72; x < 88; x += 3) ground.vline(x, 51, 53, LINEN.shade);
  ground.ellipse(88, 52.5, 1.5, 2.5, LINEN.shade);
  // Amphora shards.
  for (const [x, y] of [[160, 56], [190, 66], [40, 68]]) {
    ground.rect(x, y, 3, 2, hex('#c4683e'));
    ground.set(x, y, hex('#e88a5a'));
    ground.set(x + 4, y + 1, hex('#a24e30'));
  }
  for (let i = 0; i < 30; i++) tuft(Math.floor(r() * W), 44 + Math.floor(r() * 30), grass.shade, grass.hl);

  const cloudCols = { hl: hex('#ffffff'), base: hex('#f2f8fc'), shade: hex('#cfe2f0') };
  const clouds = [cloud(52, 14, r, cloudCols), cloud(30, 10, r, cloudCols), cloud(64, 16, r, cloudCols), cloud(24, 9, r, cloudCols)];
  return {
    layers: {
      sky: { img: sky, groundY: 232 },
      far: { img: far, groundY: FH + 10, parallax: 0.1 },
      mid: { img: mid, groundY: MH - 4, parallax: 0.25 },
      ground: { img: ground, groundY: GY },
    },
    clouds,
    skyTop: hex('#3a86d0'),
  };
}
