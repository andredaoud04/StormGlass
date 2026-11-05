/**
 * Foreground props for the meadow strip between the road and the HUD (D39): a few large, readable
 * Age props (WAW scatters trees and rocks there) so that band of the screen isn't empty grass.
 * One 256-wide transparent layer per Age; its row 0 sits at the bottom edge of the ground layer.
 */
import { Img, hex, mix, type Color } from '../img';
import { ALLOY, BONE, BRICK, DRAB, GOLD, INK, IRON, KHAKI, LINEN, MOSS, PLASMA, SAND, STONE, WOOD } from '../palette';
import { broadleaf, conifer, palm, rand, rock, type Rand } from './paint';

type R4 = { hl: Color; base: Color; shade: Color; deep: Color };
const r4 = (r: R4): R4 => ({ hl: r.hl, base: r.base, shade: r.shade, deep: r.deep });
export const PROPS_H = 44;

/** Each prop is drawn on its own canvas, outlined in its own deep tone pushed toward ink. */
function piece(w: number, h: number, ramp: R4, paint: (img: Img) => void): { img: Img; ramp: R4 } {
  const img = new Img(w, h);
  paint(img);
  return { img: img.outlined(mix(ramp.deep, INK, 0.5)), ramp };
}

function bush(r: Rand, g: R4, rad: number) {
  return piece(rad * 2 + 4, rad + 4, g, (img) => {
    const cy = rad + 1;
    for (const [dx, rr] of [[0, rad], [-rad * 0.55, rad * 0.7], [rad * 0.55, rad * 0.72]] as [number, number][]) {
      img.ellipse(rad + 2 + dx, cy, rr, rr * 0.8, (_x, _y, nx, ny) => (ny > 0.4 ? g.deep : nx + ny < -0.6 ? g.hl : nx + ny > 0.45 ? g.shade : g.base));
    }
    for (let i = 0; i < rad; i++) img.set(Math.round(4 + r() * rad * 1.6), Math.round(2 + r() * rad * 0.5), g.hl);
  });
}

function boulder(c: R4, w: number, h: number) {
  return piece(w + 2, h + 2, c, (img) => rock(img, (w + 2) / 2, h + 1, w, h, c));
}

function stump(w: R4) {
  return piece(10, 8, w, (img) => {
    img.rect(2, 2, 6, 6, w.base);
    img.vline(6, 2, 7, w.shade);
    img.vline(7, 2, 7, w.deep);
    img.ellipse(5, 2, 3, 1.4, (_x, _y, nx) => (nx < 0 ? w.hl : BONE.base));
    img.set(1, 7, w.shade);
    img.set(8, 7, w.shade);
  });
}

function bones() {
  const b = r4(BONE);
  return piece(14, 6, b, (img) => {
    img.hline(2, 10, 3, b.base);
    img.hline(3, 9, 2, b.hl);
    for (const x of [1, 11]) {
      img.rect(x, 1, 2, 2, b.hl);
      img.rect(x, 3, 2, 2, b.shade);
    }
    img.ellipse(6, 4, 1.5, 1, b.deep);
  });
}

function column() {
  const s = r4(LINEN);
  return piece(10, 15, s, (img) => {
    img.rect(2, 3, 6, 12, s.base);
    img.vline(2, 3, 14, s.hl);
    img.vline(5, 3, 14, s.shade);
    img.vline(7, 3, 14, s.deep);
    img.rect(1, 13, 8, 2, s.shade);
    // Broken top.
    for (let x = 2; x < 8; x++) img.set(x, 2 + ((x * 3) % 3), s.hl);
  });
}

function crate(w: R4, size: number) {
  return piece(size, size, w, (img) => {
    img.rect(0, 0, size, size, w.base);
    img.hline(0, size - 1, 0, w.hl);
    img.vline(size - 1, 0, size - 1, w.deep);
    img.hline(0, size - 1, size - 1, w.deep);
    img.line(1, 1, size - 2, size - 2, w.shade);
    img.line(1, size - 2, size - 2, 1, w.shade);
    img.rect(0, Math.floor(size / 2), size, 1, w.shade);
  });
}

function barrel() {
  const w = r4(WOOD);
  return piece(9, 11, w, (img) => {
    img.ellipse(4.5, 5.5, 4, 5.4, (_x, _y, nx) => (nx < -0.4 ? w.hl : nx > 0.45 ? w.shade : w.base));
    for (const y of [2, 8]) img.hline(1, 7, y, IRON.shade);
  });
}

function cannonballs() {
  const c = r4(IRON);
  return piece(12, 8, c, (img) => {
    for (const [x, y] of [[3, 5], [8, 5], [5.5, 2]]) img.ellipse(x, y, 2.6, 2.6, (_x, _y, nx, ny) => (nx + ny < -0.6 ? c.hl : nx + ny > 0.5 ? c.deep : c.base));
  });
}

function shieldInGround(face: R4) {
  return piece(9, 13, face, (img) => {
    img.vline(4, 9, 12, WOOD.shade);
    img.poly([[0, 0], [8, 0], [8, 5], [4, 10], [0, 5]], (x) => (x < 3 ? face.hl : x > 5 ? face.shade : face.base));
    img.vline(4, 1, 7, GOLD.shade);
    img.hline(2, 6, 3, GOLD.shade);
  });
}

function cartWheel() {
  const w = r4(WOOD);
  return piece(13, 13, w, (img) => {
    img.ellipse(6.5, 6.5, 6, 6, (_x, _y, nx, ny) => (Math.hypot(nx, ny) > 0.72 ? (nx + ny < 0 ? w.hl : w.shade) : 0));
    for (let a = 0; a < 6; a++) img.line(6, 6, Math.round(6 + Math.cos(a) * 5), Math.round(6 + Math.sin(a) * 5), w.base);
    img.rect(5, 5, 3, 3, w.deep);
  });
}

function sandbags() {
  const k = r4(KHAKI);
  return piece(18, 8, k, (img) => {
    for (const [x, y] of [[4, 5.5], [9, 5.5], [14, 5.5], [6.5, 2.5], [11.5, 2.5]]) img.ellipse(x, y, 3, 2.2, (_x, _y, nx, ny) => (ny < -0.3 ? k.hl : ny > 0.5 ? k.deep : nx > 0.5 ? k.shade : k.base));
  });
}

function wirePost() {
  const w = r4(WOOD);
  return piece(22, 12, w, (img) => {
    for (const x of [2, 19]) img.rect(x, 1, 2, 11, x < 10 ? w.base : w.shade);
    for (const y of [3, 7]) for (let x = 3; x < 19; x++) img.set(x, y + ((x % 4) < 2 ? 0 : 1), IRON.hl);
  });
}

function pylon() {
  const a = r4(ALLOY);
  return piece(8, 18, a, (img) => {
    img.rect(2, 3, 4, 15, a.base);
    img.vline(2, 3, 17, a.hl);
    img.vline(5, 3, 17, a.shade);
    img.rect(1, 15, 6, 3, a.shade);
    img.rect(2, 0, 4, 3, PLASMA.shade);
    img.rect(3, 1, 2, 1, PLASMA.hl);
  });
}

function wreck() {
  const a = r4(ALLOY);
  return piece(16, 8, a, (img) => {
    img.poly([[0, 7], [3, 2], [10, 1], [15, 4], [14, 7]], (x, y) => (y < 3 ? a.hl : x > 10 ? a.shade : a.base));
    img.set(6, 3, PLASMA.base);
    img.hline(2, 12, 6, a.deep);
  });
}

type TreeCols = { hl: Color; base: Color; shade: Color; deep: Color; trunk: Color; trunkShade: Color };
const leafy = (g: R4): TreeCols => ({ ...g, trunk: WOOD.shade, trunkShade: WOOD.deep });

function tree(kind: 'broad' | 'conifer' | 'palm' | 'cypress' | 'dead', g: R4) {
  return (r: Rand) =>
    piece(26, 34, g, (img) => {
      if (kind === 'broad') broadleaf(img, 13, 33, 8, leafy(g), r);
      else if (kind === 'conifer') conifer(img, 13, 33, 30, leafy(g), r);
      else if (kind === 'cypress') conifer(img, 13, 33, 30, leafy(g), r);
      else if (kind === 'palm') palm(img, 10, 33, 24, 0.6, leafy(g));
      else {
        // Shell-blasted dead tree: a bare trunk with two snapped limbs.
        img.rect(12, 10, 3, 24, WOOD.shade);
        img.vline(14, 10, 33, WOOD.deep);
        img.line(12, 16, 6, 9, WOOD.shade);
        img.line(14, 13, 20, 6, WOOD.shade);
        img.line(13, 22, 18, 18, WOOD.deep);
      }
    });
}

type Maker = (r: Rand) => { img: Img; ramp: R4 };

const GREEN = r4(MOSS);
const OLIVE: R4 = { hl: hex('#c8c27a'), base: hex('#9a9a52'), shade: hex('#6e7040'), deep: hex('#4a4c30') };
const DRY = r4(DRAB);

const SETS: Record<string, Maker[]> = {
  stone: [tree('palm', GREEN), (r) => bush(r, GREEN, 7), (r) => boulder(r4(STONE), 14 + Math.floor(r() * 6), 8), () => bones(), () => stump(r4(WOOD)), (r) => bush(r, GREEN, 5), () => boulder(r4(STONE), 8, 5)],
  ancient: [tree('cypress', OLIVE), (r) => bush(r, OLIVE, 6), (r) => boulder(r4(SAND), 14 + Math.floor(r() * 4), 7), () => column(), (r) => bush(r, OLIVE, 4), () => boulder(r4(SAND), 8, 5)],
  crusader: [tree('broad', GREEN), (r) => bush(r, GREEN, 7), () => cartWheel(), () => shieldInGround(r4(STONE)), () => boulder(r4(STONE), 12, 7), (r) => bush(r, GREEN, 5)],
  gunpowder: [tree('broad', GREEN), (r) => bush(r, GREEN, 8), () => barrel(), () => cannonballs(), (r) => bush(r, GREEN, 6), () => boulder(r4(STONE), 10, 6)],
  industrial: [tree('dead', DRY), () => sandbags(), () => crate(r4(WOOD), 10), () => wirePost(), (r) => bush(r, DRY, 5), () => crate(r4(WOOD), 8)],
  future: [() => pylon(), () => wreck(), () => crate({ hl: ALLOY.hl, base: ALLOY.shade, shade: ALLOY.deep, deep: hex('#3a4460') }, 10), () => pylon(), () => boulder({ hl: hex('#a8b4cc'), base: hex('#7e8aa6'), shade: hex('#5a6680'), deep: hex('#3a4460') }, 10, 6)],
};

/**
 * Props for one Age. Placed in two loose rows, larger ones lower (nearer), with an opaque contact
 * shadow in the meadow's own dark tone. Positions are seeded, so the layer is stable.
 */
export function propLayer(age: string, shadow: Color): Img {
  const img = new Img(256, PROPS_H);
  const r = rand(age.length * 977 + 13);
  const makers = SETS[age] ?? SETS.stone;
  // Inside the 195 columns a phone shows (the layer is 256 wide, centred); the tree goes first.
  const slots = [72, 40, 110, 146, 184, 214];
  const placed = slots.map((x, i) => {
    const m = makers[i % makers.length](r);
    const y = 14 + Math.floor(r() * 22) + (i % 2) * 4;
    return { x: x + Math.floor((r() - 0.5) * 16), y, m };
  });
  placed.sort((a, b) => a.y - b.y);
  for (const { x, y, m } of placed) {
    const w = m.img.w;
    for (let dx = -Math.floor(w / 2); dx < Math.ceil(w / 2); dx++) {
      const edge = Math.abs(dx) > w / 2 - 2;
      img.set(x + dx, y, shadow);
      if (!edge) img.set(x + dx, y + 1, shadow);
    }
    img.blit(m.img, x - Math.floor(w / 2), y - m.img.h + 1);
  }
  void BRICK;
  return img;
}
