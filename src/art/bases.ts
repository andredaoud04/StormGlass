/**
 * Original pixel-art fortresses for the four battle environments.
 *
 * Architecture is shared by both sides; only the roof/awning accent is faction-coloured
 * (player blue, enemy red-orange). Hell bases are pixel-identical for both sides
 * (charcoal roofs). No flags or banners. Ground anchor is the bottom row.
 */
import { PixelCanvas, shade } from './pixel';

export type BaseTheme = 'medieval' | 'desert' | 'ice' | 'hell';
export type BaseSide = 'player' | 'enemy';

export const BASE_W = 60;
export const BASE_H = 66;
const GROUND = BASE_H - 2;
const INK = '#1b1424';

const ROOF: Record<BaseSide, [string, string, string]> = {
  player: ['#3d78c9', '#26518f', '#7fb0ee'],
  enemy: ['#cf4b2e', '#8d2a18', '#f08a5c'],
};

const lit = (c: string, a = 0.22) => shade(c, a);
const dim = (c: string, a = -0.28) => shade(c, a);

/** Masonry with offset bricks, mortar lines and light/shade variation. */
function masonry(pc: PixelCanvas, x: number, y: number, w: number, h: number, base: string, mortar: string, bw = 5, bh = 3, seed = 1) {
  pc.rect(x, y, w, h, base);
  for (let row = 0; row * bh < h; row++) {
    const yy = y + row * bh;
    pc.hline(x, x + w - 1, yy, mortar);
    const off = row % 2 ? Math.floor(bw / 2) : 0;
    for (let bx = x - off; bx < x + w; bx += bw) {
      if (bx >= x) pc.vline(bx, yy, Math.min(y + h - 1, yy + bh - 1), mortar);
      const r = (Math.abs(bx * 7 + row * 13 + seed * 31) % 5);
      const tone = r === 0 ? lit(base, 0.12) : r === 1 ? dim(base, -0.1) : null;
      if (tone) for (let i = Math.max(bx + 1, x); i < Math.min(bx + bw, x + w); i++) for (let j = yy + 1; j < Math.min(yy + bh, y + h); j++) pc.set(i, j, tone);
      if (bx + 1 >= x && bx + 1 < x + w) pc.set(bx + 1, yy + 1, lit(base, 0.3));
    }
  }
  pc.vline(x, y, y + h - 1, lit(base, 0.18));
  pc.vline(x + w - 1, y, y + h - 1, dim(base, -0.3));
}

function crenels(pc: PixelCanvas, x: number, y: number, w: number, base: string, mortar: string, step = 4) {
  for (let i = 0; i < w; i += step) {
    pc.rect(x + i, y - 3, Math.min(step - 1, w - i), 3, base);
    pc.hline(x + i, x + i + Math.min(step - 1, w - i) - 1, y - 3, lit(base, 0.3));
    pc.set(x + i + Math.min(step - 1, w - i) - 1, y - 2, dim(base));
  }
  pc.hline(x, x + w - 1, y, mortar);
}

/** Arched plank door with iron bands; optional glow for Hell. */
function door(pc: PixelCanvas, cx: number, bottom: number, w: number, h: number, wood: string, frame: string, glow?: string) {
  const x0 = cx - Math.floor(w / 2);
  pc.rect(x0 - 1, bottom - h, w + 2, h + 1, frame);
  pc.ellipse(cx + (w % 2 ? 0.5 : 0), bottom - h + 1, w / 2 + 1, 3, frame);
  pc.rect(x0, bottom - h + 1, w, h, glow ?? wood);
  pc.ellipse(cx + (w % 2 ? 0.5 : 0), bottom - h + 1.5, w / 2, 2.5, glow ?? wood);
  if (glow) {
    pc.rect(x0 + 1, bottom - h + 3, w - 2, h - 3, lit(glow, 0.35));
    pc.vline(cx, bottom - h + 2, bottom, '#fff1b8');
    return;
  }
  for (let i = x0 + 2; i < x0 + w; i += 3) pc.vline(i, bottom - h + 1, bottom, dim(wood, -0.35));
  pc.hline(x0, x0 + w - 1, bottom - h + 4, '#3a3a44').hline(x0, x0 + w - 1, bottom - 3, '#3a3a44');
  pc.set(x0 + w - 3, bottom - Math.floor(h / 2), '#d8c27a');
}

/** Steep shingled roof (triangle) with tile rows. */
function gableRoof(pc: PixelCanvas, cx: number, baseY: number, halfW: number, height: number, [c, cd, cl]: [string, string, string]) {
  for (let j = 0; j <= height; j++) {
    const half = Math.round((halfW * j) / height);
    const y = baseY - height + j;
    pc.hline(cx - half, cx + half, y, j % 3 === 0 ? cd : c);
    pc.set(cx - half, y, cl);
    pc.set(cx + half, y, cd);
    if (j % 3 === 1) for (let x = cx - half + ((j / 3) % 2 ? 1 : 2); x < cx + half; x += 3) pc.set(x, y, cl);
  }
  pc.hline(cx - halfW - 1, cx + halfW + 1, baseY + 1, cd);
}

/** Conical tower roof. */
function coneRoof(pc: PixelCanvas, cx: number, baseY: number, halfW: number, height: number, [c, cd, cl]: [string, string, string]) {
  for (let j = 0; j <= height; j++) {
    const half = Math.max(0, Math.round((halfW * j) / height));
    const y = baseY - height + j;
    pc.hline(cx - half, cx + half, y, c);
    pc.set(cx - half, y, cl).set(cx - half + 1, y, j > 2 ? cl : c);
    pc.set(cx + half, y, cd);
    if (j % 3 === 2) pc.hline(cx - half + 1, cx + half - 1, y, cd);
  }
}

function barrel(pc: PixelCanvas, x: number, bottom: number, wood = '#8a5a34') {
  pc.rect(x, bottom - 6, 6, 6, wood);
  pc.vline(x, bottom - 6, bottom - 1, lit(wood)).vline(x + 5, bottom - 6, bottom - 1, dim(wood));
  pc.hline(x, x + 5, bottom - 5, '#3a3a44').hline(x, x + 5, bottom - 2, '#3a3a44');
  pc.hline(x + 1, x + 4, bottom - 7, dim(wood, -0.15));
}

function crate(pc: PixelCanvas, x: number, bottom: number, wood = '#9a6a3c') {
  pc.rect(x, bottom - 5, 6, 5, wood);
  pc.line(x, bottom - 5, x + 5, bottom - 1, dim(wood)).line(x + 5, bottom - 5, x, bottom - 1, dim(wood));
  pc.hline(x, x + 5, bottom - 5, lit(wood));
}

function window(pc: PixelCanvas, x: number, y: number, glow = '#ffd98a', frame = '#3a2a22') {
  pc.rect(x - 1, y - 1, 4, 5, frame);
  pc.rect(x, y, 2, 3, glow).set(x, y, shade(glow, 0.4));
}

function footing(pc: PixelCanvas, x0: number, x1: number, rock: string) {
  for (let x = x0; x <= x1; x++) {
    const h = 1 + ((x * 5) % 3 === 0 ? 1 : 0);
    pc.vline(x, GROUND - h + 1, GROUND + 1, (x * 3) % 4 === 0 ? lit(rock) : rock);
  }
}

function medieval(pc: PixelCanvas, roof: [string, string, string]) {
  const stone = '#8b8478', mortar = '#5d564e';
  footing(pc, 4, 55, '#6b655c');
  // Annex (right) with lean-to roof.
  masonry(pc, 38, 40, 16, GROUND - 40, stone, mortar, 5, 3, 2);
  for (let j = 0; j < 7; j++) pc.hline(37 + j, 55, 33 + j, j % 3 === 0 ? roof[1] : roof[0]);
  pc.hline(37, 55, 33, roof[2]);
  window(pc, 46, 46);
  // Keep: stone lower storey.
  masonry(pc, 8, 34, 32, GROUND - 34, stone, mortar, 6, 3, 1);
  // Timber-frame upper storey (jettied).
  pc.rect(6, 17, 36, 17, '#e6d9b8');
  for (const x of [6, 14, 23, 32, 41]) pc.vline(x, 17, 33, '#5a3a22');
  pc.hline(6, 41, 17, '#5a3a22').hline(6, 41, 25, '#5a3a22').hline(5, 42, 33, '#4a2e1a').hline(5, 42, 34, '#3a2414');
  pc.line(6, 25, 14, 17, '#5a3a22').line(32, 17, 41, 25, '#5a3a22');
  window(pc, 18, 20); window(pc, 27, 20);
  pc.hline(6, 41, 18, '#f3ead2');
  // Steep shingled roof.
  gableRoof(pc, 23, 16, 22, 15, roof);
  pc.rect(30, 3, 4, 7, '#6b655c').hline(29, 34, 2, '#4f4a43'); // chimney
  door(pc, 23, GROUND, 10, 15, '#7a4a28', '#4f4a43');
  window(pc, 13, 40, '#ffd98a'); window(pc, 33, 40, '#ffd98a');
  barrel(pc, 1, GROUND); barrel(pc, 52, GROUND); crate(pc, 6, GROUND);
}

function desert(pc: PixelCanvas, roof: [string, string, string]) {
  const sand = '#d9a866', mortar = '#a8763e';
  footing(pc, 3, 56, '#b5874c');
  // Tall square tower (left) — no domes.
  masonry(pc, 8, 10, 18, GROUND - 10, sand, mortar, 6, 3, 3);
  crenels(pc, 8, 10, 18, sand, mortar, 4);
  window(pc, 15, 17, '#2a1a12', '#8a5a2c'); window(pc, 15, 28, '#2a1a12', '#8a5a2c');
  // Wide battlemented hall.
  masonry(pc, 22, 28, 32, GROUND - 28, lit(sand, 0.06), mortar, 6, 3, 4);
  crenels(pc, 22, 28, 32, lit(sand, 0.06), mortar, 4);
  pc.hline(22, 53, 31, dim(sand, -0.12));
  // Striped cloth awning over the gate.
  for (let j = 0; j < 6; j++) for (let x = 27 + j; x <= 52 - j; x++) pc.set(x, 37 + j, Math.floor((x - 29) / 3) % 2 ? roof[0] : '#f4ead3');
  pc.hline(28, 51, 37, roof[1]);
  for (let x = 30; x <= 49; x += 3) pc.set(x, 42, roof[1]);
  pc.vline(29, 37, GROUND - 1, '#6b4426').vline(50, 37, GROUND - 1, '#6b4426');
  door(pc, 39, GROUND, 9, 13, '#7a4a28', '#8a5a2c');
  // Clay pots and a crate.
  for (const x of [2, 54]) { pc.ellipse(x + 2, GROUND - 3, 3, 3.5, '#b8653a'); pc.hline(x, x + 4, GROUND - 6, '#8d4a28'); pc.set(x + 1, GROUND - 4, '#e08a58'); }
  crate(pc, 21, GROUND, '#a8763e');
  // Second, shorter watchtower on the far side.
  masonry(pc, 46, 18, 11, GROUND - 18 - 22, sand, mortar, 5, 3, 8);
  crenels(pc, 46, 18, 11, sand, mortar, 4);
  window(pc, 50, 22, '#2a1a12', '#8a5a2c');
  // Cloth canopy on the tower top.
  for (let j = 0; j < 4; j++) pc.hline(7 + j, 26 - j, 3 + j, j % 2 ? roof[1] : roof[0]);
  pc.vline(9, 6, 9, '#6b4426').vline(24, 6, 9, '#6b4426');
}

function ice(pc: PixelCanvas, roof: [string, string, string]) {
  const stone = '#9aa7b8', mortar = '#6b7788';
  const snow = '#f4faff', snowD = '#c9dcef';
  footing(pc, 3, 56, '#7d8899');
  // Two towers with conical roofs and a curtain wall.
  masonry(pc, 6, 20, 14, GROUND - 20, stone, mortar, 5, 3, 5);
  masonry(pc, 40, 20, 14, GROUND - 20, stone, mortar, 5, 3, 6);
  masonry(pc, 18, 32, 24, GROUND - 32, lit(stone, 0.05), mortar, 6, 3, 7);
  crenels(pc, 18, 32, 24, lit(stone, 0.05), mortar, 4);
  coneRoof(pc, 13, 19, 9, 14, roof);
  coneRoof(pc, 47, 19, 9, 14, roof);
  // Snow caps, ledges and icicles.
  for (const cx of [13, 47]) {
    for (let j = 0; j < 6; j++) pc.hline(cx - Math.round(j * 0.6), cx + Math.round(j * 0.6), 5 + j, j > 3 ? snowD : snow);
    pc.hline(cx - 9, cx + 9, 19, snow).hline(cx - 8, cx + 8, 20, snowD);
    for (let k = -7; k <= 7; k += 3) pc.vline(cx + k, 21, 22 + (Math.abs(k) % 2), '#cfeaff');
  }
  for (let x = 18; x <= 41; x += 4) pc.rect(x, 26, 3, 2, snow);
  pc.hline(18, 41, 32, snow);
  window(pc, 12, 26, '#9fe3ff', '#4c5768'); window(pc, 46, 26, '#9fe3ff', '#4c5768');
  door(pc, 30, GROUND, 10, 14, '#6e5038', '#4c5768');
  barrel(pc, 1, GROUND, '#7a5a40'); pc.hline(1, 6, GROUND - 7, snow);
  barrel(pc, 53, GROUND, '#7a5a40'); pc.hline(53, 58, GROUND - 7, snow);
  for (let x = 3; x <= 56; x++) if ((x * 7) % 5 < 3) pc.set(x, GROUND, snow);
}

function hell(pc: PixelCanvas) {
  const rock = '#4d414b', mortar = '#2a2228';
  const charcoal: [string, string, string] = ['#3c3c46', '#24242b', '#62626e'];
  const lava = '#ff7a2a', lavaHot = '#ffd27a';
  const horn = (x: number, top: number, dir: 1 | -1) => {
    for (let j = 0; j < 12; j++) {
      const off = dir * Math.round((j * j) / 18);
      const c = j > 8 ? '#fff4dc' : j > 4 ? '#ead6b0' : '#c9b08a';
      pc.rect(x + off, top - j, j < 6 ? 3 : 2, 1, c);
    }
  };
  const seam = (pts: [number, number][]) => {
    for (let i = 0; i < pts.length - 1; i++) {
      pc.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], lava);
      pc.line(pts[i][0] + 1, pts[i][1], pts[i + 1][0] + 1, pts[i + 1][1], '#c4401a');
    }
    for (const [x, y] of pts) pc.set(x, y, lavaHot);
  };
  // Rocky mound the fortress grows out of.
  for (const [x, y, r] of [[5, GROUND - 2, 5], [14, GROUND - 1, 4], [46, GROUND - 1, 4], [55, GROUND - 2, 5], [30, GROUND, 6]] as const) {
    pc.ellipse(x, y, r, r - 1, '#3a3036');
    pc.ellipse(x - 1, y - 1, r - 2, r - 3, '#55474f');
  }
  // Flanking towers with horned battlements.
  masonry(pc, 3, 18, 14, GROUND - 18, rock, mortar, 5, 3, 11);
  masonry(pc, 43, 18, 14, GROUND - 18, rock, mortar, 5, 3, 12);
  crenels(pc, 3, 18, 14, rock, mortar, 5);
  crenels(pc, 43, 18, 14, rock, mortar, 5);
  horn(3, 14, -1); horn(14, 14, 1); horn(43, 14, -1); horn(54, 14, 1);
  // Gatehouse with a steep charcoal roof and iron spikes.
  masonry(pc, 15, 28, 30, GROUND - 28, dim(rock, -0.06), mortar, 6, 3, 13);
  gableRoof(pc, 30, 27, 17, 16, charcoal);
  for (const x of [30, 22, 38]) pc.vline(x, x === 30 ? 7 : 16, x === 30 ? 10 : 18, '#8a8a96');
  pc.set(30, 6, lavaHot);
  // Glowing windows and lava seams through the masonry.
  window(pc, 9, 25, lava, mortar); window(pc, 49, 25, lava, mortar);
  window(pc, 24, 20, lavaHot, mortar); window(pc, 35, 20, lavaHot, mortar);
  seam([[6, 34], [9, 41], [7, 48], [10, 56]]);
  seam([[53, 31], [50, 40], [54, 47], [51, 57]]);
  seam([[18, 46], [20, 52]]);
  // Chains slung to the gate.
  for (let i = 0; i < 8; i++) {
    pc.set(16 + i, 30 + i + (i > 4 ? 1 : 0), i % 2 ? '#9a9aa6' : '#5c5c68');
    pc.set(44 - i, 30 + i + (i > 4 ? 1 : 0), i % 2 ? '#9a9aa6' : '#5c5c68');
  }
  door(pc, 30, GROUND, 11, 17, '#5a2a1a', '#2a2228', '#ff8a2e');
  pc.ellipse(30, GROUND - 4, 4, 3, '#ffd27a');
}

/** Builds one fortress. Hell ignores side (identical architecture and roofs). */
export function buildBase(theme: BaseTheme, side: BaseSide): PixelCanvas {
  const pc = new PixelCanvas(BASE_W, BASE_H);
  const roof = ROOF[side];
  if (theme === 'medieval') medieval(pc, roof);
  else if (theme === 'desert') desert(pc, roof);
  else if (theme === 'ice') ice(pc, roof);
  else hell(pc);
  pc.outline(INK);
  // Enemy fortresses are mirrored so both gates face the lane.
  return side === 'enemy' ? pc.flipX() : pc;
}
