/** Gunpowder Age battlefield: tropical coast, a galleon at sea, palms and a sandy road. */
import { Img, bayer, hex } from '../img';
import { STONE, WOOD } from '../palette';
import { cloud, ditherGradient, hillLayer, laneGround, palm, peakRange, rand, rock, sineRidge, type TreeCols } from './paint';
import type { EnvArt } from './stone';

const W = 256;

function galleon(img: Img, x: number, y: number): void {
  const sail = { hl: hex('#ffffff'), base: hex('#f0ead8'), shade: hex('#cfc4a8') };
  // Hull.
  img.poly([[x, y], [x + 30, y], [x + 26, y + 6], [x + 4, y + 6]], (px, py) => (py < y + 2 ? WOOD.hl : (px + py) % 5 === 0 ? WOOD.deep : WOOD.shade));
  img.rect(x + 22, y - 4, 9, 4, WOOD.shade);
  img.hline(x + 2, x + 28, y + 2, hex('#c8a040'));
  // Masts and sails.
  for (const [mx, h] of [[x + 8, 18], [x + 16, 22], [x + 24, 16]]) {
    img.vline(mx, y - h, y, WOOD.deep);
    for (let k = 0; k < 2; k++) {
      const sy = y - h + 2 + k * 8;
      img.poly([[mx - 5, sy], [mx + 5, sy], [mx + 6, sy + 6], [mx - 4, sy + 6]], (px) => (px < mx - 1 ? sail.hl : px < mx + 3 ? sail.base : sail.shade));
    }
  }
  img.rect(x + 16, y - 25, 4, 2, hex('#e64d4d'));
}

export function gunpowderEnv(): EnvArt {
  const r = rand(1715);
  const sky = new Img(W, 240);
  ditherGradient(sky, [
    { at: 0, c: hex('#2a8ad0') },
    { at: 0.3, c: hex('#48a6e0') },
    { at: 0.6, c: hex('#7cc6ea') },
    { at: 0.84, c: hex('#bfe6ee') },
    { at: 1, c: hex('#f4f0d8') },
  ]);
  sky.ellipse(200, 48, 15, 15, (x, y) => (bayer(x, y) < 0.5 ? hex('#cfeef2') : hex('#bfe6ee')));
  sky.ellipse(200, 48, 11, 11, hex('#fffbe8'));

  const FH = 150;
  const far = new Img(W, FH);
  const seaTop = FH - 34;
  // Green volcanic islands on the horizon.
  peakRange(far, seaTop, [{ x: 30, h: 52, half: 44 }, { x: 90, h: 34, half: 30 }, { x: 222, h: 64, half: 48 }], { hl: hex('#9ec8a8'), base: hex('#84b496'), shade: hex('#70a088') }, 999, 1.2);
  for (let y = seaTop; y < FH; y++) {
    for (let x = 0; x < W; x++) {
      const d = y - seaTop;
      let c = d < 2 ? hex('#8ad4e4') : d < 9 ? hex('#3ab0d0') : hex('#2a94c0');
      if (d >= 2 && d < 4 && bayer(x, y) < 0.5) c = hex('#8ad4e4');
      if (d >= 8 && d < 11 && bayer(x, y) < 0.5) c = hex('#3ab0d0');
      if ((x * 11 + y * 7) % 41 === 0 && d > 1) c = hex('#e8fbff');
      far.set(x, y, c);
    }
  }
  galleon(far, 120, seaTop + 8);

  const MH = 64;
  const hill = sineRidge(W, 22, [[6, 80, 0.9], [3, 31, 2.4], [1, 13, 1.1]]);
  const mid = hillLayer(W, MH, hill, { hl: hex('#b4e07a'), base: hex('#8cc85a'), shade: hex('#6aa848'), deep: hex('#548c40') });
  const palmCols: TreeCols = { hl: hex('#a8dc6a'), base: hex('#5ab048'), shade: hex('#3e8c3e'), deep: hex('#2c6a34'), trunk: hex('#a8784a'), trunkShade: hex('#7a5434') };
  const place = (x: number) => MH - Math.round(hill[Math.max(0, Math.min(W - 1, x))]) + 3;
  for (const [x, h, lean] of [[20, 26, 1], [34, 20, -1], [96, 24, 1], [150, 22, -1], [186, 28, 1], [230, 21, -1], [244, 25, 1]]) palm(mid, x, place(x), h, lean, palmCols);

  const lg = laneGround({ dirt: { hl: hex('#fff0c8'), base: hex('#f2dca4'), shade: hex('#d8bc80'), deep: hex('#b09060') }, grass: { hl: hex('#c4e47a'), base: hex('#98cc58'), shade: hex('#74ac46'), deep: hex('#5a8e3e') } }, r);
  const ground = lg.img;
  const st = { hl: STONE.hl, base: STONE.base, shade: STONE.shade, deep: STONE.deep };
  for (const [x, y, w, h] of [[40, 56, 8, 5], [150, 62, 10, 6], [214, 52, 7, 5]]) rock(ground, x, y, w, h, st);
  // Barrels and a stack of cannonballs by the road.
  for (const [bx, by] of [[90, 50], [176, 60]]) {
    ground.rect(bx, by, 6, 7, WOOD.base);
    ground.hline(bx, bx + 5, by + 1, hex('#5a5a66'));
    ground.hline(bx, bx + 5, by + 5, hex('#5a5a66'));
    ground.vline(bx, by, by + 6, WOOD.hl);
  }
  for (const [cx, cy] of [[120, 66], [123, 66], [121, 64]]) ground.ellipse(cx, cy, 1.6, 1.6, (_x, _y, nx, ny) => (nx + ny < -0.3 ? hex('#8a8a96') : hex('#3a3a46')));
  for (let i = 0; i < 18; i++) ground.set(Math.floor(r() * W), 42 + Math.floor(r() * 26), i % 2 ? hex('#ffe08a') : hex('#ff8aa8'));

  const cc = { hl: hex('#ffffff'), base: hex('#f2f8fc'), shade: hex('#cce4f0') };
  const clouds = [cloud(56, 16, r, cc), cloud(34, 11, r, cc), cloud(66, 18, r, cc), cloud(26, 9, r, cc)];
  return {
    layers: {
      sky: { img: sky, groundY: 232 },
      far: { img: far, groundY: FH + 10, parallax: 0.1 },
      mid: { img: mid, groundY: MH - 4, parallax: 0.25 },
      ground: { img: ground, groundY: lg.groundY },
    },
    clouds,
    skyTop: hex('#2a8ad0'),
  };
}
