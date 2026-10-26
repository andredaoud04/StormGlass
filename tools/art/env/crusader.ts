/** Crusader Age battlefield: green valley, distant hill castle and windmill, broadleaf woods. */
import { Img, bayer, hex } from '../img';
import { STONE } from '../palette';
import { broadleaf, cloud, conifer, ditherGradient, hillLayer, laneGround, peakRange, rand, rock, sineRidge, type TreeCols } from './paint';
import type { EnvArt } from './stone';

const W = 256;

export function crusaderEnv(): EnvArt {
  const r = rand(1189);
  const sky = new Img(W, 240);
  ditherGradient(sky, [
    { at: 0, c: hex('#3c74c4') },
    { at: 0.3, c: hex('#5c94d8') },
    { at: 0.58, c: hex('#86b6e6') },
    { at: 0.8, c: hex('#b8d8ee') },
    { at: 0.94, c: hex('#e2eef0') },
    { at: 1, c: hex('#f4f0dc') },
  ]);
  sky.ellipse(60, 54, 14, 14, (x, y) => (bayer(x, y) < 0.5 ? hex('#cfe2f2') : hex('#b8d8ee')));
  sky.ellipse(60, 54, 10, 10, hex('#fff8e0'));

  const FH = 150;
  const far = new Img(W, FH);
  peakRange(far, FH, [{ x: 20, h: 96, half: 60 }, { x: 110, h: 120, half: 70 }, { x: 200, h: 104, half: 64 }, { x: 250, h: 80, half: 40 }], { hl: hex('#b4c0dc'), base: hex('#9aa8cc'), shade: hex('#8692bc'), snow: hex('#f4f6ff'), snowShade: hex('#d2daf0') }, 86);
  // Rolling blue-green hills in front of the mountains.
  const backHills = hillLayer(W, 60, sineRidge(W, 30, [[8, 70, 0.5], [4, 29, 2.2]]), { hl: hex('#9cc48c'), base: hex('#80ae78'), shade: hex('#6c9a6c'), deep: hex('#5c8862') });
  far.blit(backHills, 0, FH - 60);
  // Hilltop castle silhouette.
  const cx = 186;
  const cy = FH - 60 + 60 - Math.round(30 + 8 * Math.sin((cx / 70) * Math.PI * 2 + 0.5) + 4 * Math.sin((cx / 29) * Math.PI * 2 + 2.2));
  const cs = hex('#6f7d98');
  const csl = hex('#8794ae');
  far.rect(cx - 10, cy - 10, 20, 10, cs);
  far.rect(cx - 13, cy - 16, 5, 16, csl);
  far.rect(cx + 8, cy - 14, 5, 14, cs);
  far.poly([[cx - 14, cy - 16], [cx - 10.5, cy - 22], [cx - 7, cy - 16]], hex('#4e5f88'));
  far.poly([[cx + 7, cy - 14], [cx + 10.5, cy - 20], [cx + 14, cy - 14]], hex('#4e5f88'));
  for (let x = cx - 10; x < cx + 10; x += 3) far.rect(x, cy - 12, 2, 2, cs);
  // Windmill on the left hills.
  const wx = 52;
  const wy = FH - 60 + 60 - Math.round(30 + 8 * Math.sin((wx / 70) * Math.PI * 2 + 0.5) + 4 * Math.sin((wx / 29) * Math.PI * 2 + 2.2));
  far.poly([[wx - 3, wy], [wx - 2, wy - 10], [wx + 2, wy - 10], [wx + 3, wy]], hex('#e8dcc4'));
  far.poly([[wx - 3, wy - 10], [wx, wy - 13], [wx + 3, wy - 10]], hex('#a8584a'));
  for (const [dx, dy] of [[-6, -6], [6, 6], [-6, 6], [6, -6]]) far.line(wx, wy - 11, wx + dx, wy - 11 + dy, hex('#6a5a4a'));

  // Mid: deciduous woods on green hills.
  const MH = 64;
  const hill = sineRidge(W, 26, [[6, 84, 1.7], [3, 35, 0.3], [1.2, 15, 2.2]]);
  const mid = hillLayer(W, MH, hill, { hl: hex('#a8d870'), base: hex('#7cbc54'), shade: hex('#5e9c46'), deep: hex('#4a823e') });
  const oak: TreeCols = { hl: hex('#8cc85a'), base: hex('#5a9e44'), shade: hex('#43803c'), deep: hex('#326434'), trunk: hex('#6e4a34'), trunkShade: hex('#4f3326') };
  const pine: TreeCols = { hl: hex('#5fa04a'), base: hex('#3f8040'), shade: hex('#2f6538'), deep: hex('#244c31'), trunk: hex('#6e4a34'), trunkShade: hex('#4f3326') };
  const place = (x: number) => MH - Math.round(hill[Math.max(0, Math.min(W - 1, x))]) + 3;
  for (const [x, rr] of [[14, 7], [30, 6], [62, 8], [100, 6], [148, 7], [168, 5], [214, 8], [240, 6]]) broadleaf(mid, x, place(x), rr, oak, r);
  for (const [x, h] of [[44, 20], [120, 18], [196, 22]]) conifer(mid, x, place(x), h, pine, r);

  // Ground: packed earth road, green verges, a fence and stones.
  const lg = laneGround({ dirt: { hl: hex('#d8b080'), base: hex('#bc9064'), shade: hex('#9a7048'), deep: hex('#76523a') }, grass: { hl: hex('#b4e070'), base: hex('#86c452'), shade: hex('#64a244'), deep: hex('#4c843c') } }, r);
  const ground = lg.img;
  // Wooden fence along the back verge.
  for (let x = 0; x < W; x += 12) {
    ground.rect(x, 1, 2, 7, hex('#8a5a36'));
    ground.set(x, 1, hex('#b07a46'));
  }
  for (const y of [3, 6]) for (let x = 0; x < W; x++) ground.set(x, y, (x & 3) === 0 ? hex('#6e4428') : hex('#a06a3e'));
  const st = { hl: STONE.hl, base: STONE.base, shade: STONE.shade, deep: STONE.deep };
  for (const [x, y, w, h] of [[34, 56, 8, 5], [140, 60, 10, 6], [226, 52, 7, 5]]) rock(ground, x, y, w, h, st);
  for (let i = 0; i < 22; i++) ground.set(Math.floor(r() * W), 42 + Math.floor(r() * 26), i % 2 ? hex('#fff1b8') : hex('#c8a8ff'));

  const cc = { hl: hex('#ffffff'), base: hex('#eef4fa'), shade: hex('#c8d8e8') };
  const clouds = [cloud(50, 16, r, cc), cloud(36, 12, r, cc), cloud(62, 18, r, cc), cloud(28, 10, r, cc), cloud(44, 14, r, cc)];
  return {
    layers: {
      sky: { img: sky, groundY: 232 },
      far: { img: far, groundY: FH + 8, parallax: 0.1 },
      mid: { img: mid, groundY: MH - 4, parallax: 0.25 },
      ground: { img: ground, groundY: lg.groundY },
    },
    clouds,
    skyTop: hex('#3c74c4'),
  };
}
