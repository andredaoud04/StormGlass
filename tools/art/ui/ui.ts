/** UI kit: carved stone, timber and gold. Most pieces are 9-slice; the game tiles their edges. */
import { Img, bayer, hex, mix, withAlpha, type Color } from '../img';
import { BONE, GOLD, INK, MOSS, STONE, TEAM_BLUE, TEAM_RED, WOOD, type Ramp } from '../palette';
import { rand } from '../env/paint';

export interface UiPiece {
  img: Img;
  slice?: [number, number, number, number];
  anchor?: [number, number];
  desc: string;
}

const DARK = hex('#2a1f2e');
const DARKER = hex('#1f1724');

/** Bevelled box: light top-left, dark bottom-right, ink outline. */
function bevelBox(w: number, h: number, ramp: { hl: Color; base: Color; shade: Color; deep: Color }, lip = 0): Img {
  const img = new Img(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let c = ramp.base;
      if (y >= h - 1 - lip) c = ramp.deep;
      else if (x === 0 || y === 0) c = ramp.hl;
      else if (x === w - 1 || y === h - 2 - lip) c = ramp.shade;
      img.set(x, y, c);
    }
  }
  return img;
}

function frameWithOutline(img: Img): Img {
  return img.outlined(INK);
}

/** Round off the outline corners of an outlined box. */
function roundCorners(img: Img, r = 1): Img {
  for (const [cx, cy] of [[0, 0], [img.w - 1, 0], [0, img.h - 1], [img.w - 1, img.h - 1]]) {
    img.set(cx, cy, 0);
    if (r > 1) {
      img.set(cx + (cx ? -1 : 1), cy, 0);
      img.set(cx, cy + (cy ? -1 : 1), 0);
      img.set(cx + (cx ? -1 : 1), cy + (cy ? -1 : 1), INK);
    }
  }
  return img;
}

export function stonePanel(): UiPiece {
  const s = { hl: STONE.hl, base: STONE.base, shade: STONE.shade, deep: STONE.deep };
  const inner = bevelBox(22, 22, s, 1);
  // Inner carved groove.
  for (let i = 3; i < 19; i++) {
    inner.set(i, 3, s.shade);
    inner.set(3, i, s.shade);
    inner.set(i, 18, s.hl);
    inner.set(18, i, s.hl);
  }
  const img = roundCorners(frameWithOutline(inner), 2);
  // Gold studs in the corners.
  for (const [x, y] of [[3, 3], [19, 3], [3, 19], [19, 19]]) {
    img.set(x, y, GOLD.hl);
    img.set(x + 1, y, GOLD.base);
    img.set(x, y + 1, GOLD.base);
    img.set(x + 1, y + 1, GOLD.deep);
  }
  return { img, slice: [7, 7, 7, 7], desc: 'Carved stone panel for popups. 9-slice, edges tile.' };
}

export function woodPanel(): UiPiece {
  const w = { hl: WOOD.hl, base: WOOD.base, shade: WOOD.shade, deep: WOOD.deep };
  const inner = bevelBox(22, 22, w, 1);
  for (let y = 4; y < 20; y += 5) for (let x = 1; x < 21; x++) inner.set(x, y, w.shade);
  for (let y = 5; y < 20; y += 5) for (let x = 1; x < 21; x++) if ((x + y) % 7 === 0) inner.set(x, y, w.hl);
  const img = roundCorners(frameWithOutline(inner), 2);
  return { img, slice: [6, 6, 6, 6], desc: 'Timber plank panel. 9-slice, edges tile.' };
}

export function insetPanel(): UiPiece {
  const img = new Img(12, 12).fill(DARK);
  img.hline(0, 11, 0, DARKER);
  img.vline(0, 0, 11, DARKER);
  img.hline(1, 11, 11, hex('#4a3a4e'));
  img.vline(11, 1, 11, hex('#4a3a4e'));
  return { img, slice: [3, 3, 3, 3], desc: 'Dark carved well for lists and values. 9-slice.' };
}

/** Ornate header plaque: stone tablet with a gold rim and horn-curl ends. */
export function plaque(): UiPiece {
  const W = 44, H = 26;
  const img = new Img(W, H);
  const top = 3, bot = H - 4;
  for (let y = top; y <= bot; y++) {
    for (let x = 8; x < W - 8; x++) {
      let c = STONE.base;
      if (y === top || y === bot) c = GOLD.base;
      else if (y === top + 1) c = GOLD.hl;
      else if (y === bot - 1) c = GOLD.shade;
      else if (y === top + 2) c = STONE.hl;
      else if (y === bot - 2) c = STONE.shade;
      img.set(x, y, c);
    }
  }
  // End caps: gold scroll curls pointing outward.
  const cap = (flip: boolean) => {
    const pts: [number, number][] = [];
    for (let y = top - 2; y <= bot + 2; y++) {
      const t = (y - (top - 2)) / (bot - top + 4);
      const reach = Math.round(2 + Math.sin(t * Math.PI) * 6);
      for (let i = 0; i < reach; i++) pts.push([8 - 1 - i, y]);
    }
    for (const [x, y] of pts) {
      const rx = flip ? W - 1 - x : x;
      const edge = !pts.some(([px, py]) => px === x - 1 && py === y);
      img.set(rx, y, edge ? GOLD.shade : y < (top + bot) / 2 ? GOLD.hl : GOLD.base);
    }
    // Gem in the curl.
    const gx = flip ? W - 5 : 4;
    const gy = Math.round((top + bot) / 2);
    img.set(gx, gy, TEAM_RED.hl);
    img.set(gx - 1, gy, TEAM_RED.base);
    img.set(gx, gy + 1, TEAM_RED.shade);
    img.set(gx - 1, gy + 1, TEAM_RED.deep);
  };
  cap(false);
  cap(true);
  return { img: img.outlined(INK), slice: [12, 8, 12, 8], desc: 'Ornate header plaque. Center tiles horizontally; ends are fixed.' };
}

export function button(ramp: Ramp | typeof MOSS, pressed: boolean, desc: string): UiPiece {
  const r = { hl: ramp.hl, base: ramp.base, shade: ramp.shade, deep: ramp.deep };
  const W = 20, H = 20;
  const lip = pressed ? 0 : 3;
  const img = new Img(W, H);
  const off = pressed ? 2 : 0;
  for (let y = off; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let c: Color;
      const face = H - lip;
      if (y >= face) c = y === H - 1 ? mix(r.deep, INK, 0.4) : r.deep;
      else if (y === off) c = mix(r.hl, 0xffffffff, 0.35);
      else if (y === off + 1) c = r.hl;
      else if (y >= face - 2) c = r.shade;
      else c = r.base;
      if (x === 0 || x === W - 1) c = y >= face ? r.deep : r.shade;
      img.set(x, y, c);
    }
  }
  // Gloss dots.
  img.set(2, off + 2, mix(r.hl, 0xffffffff, 0.6));
  img.set(3, off + 2, r.hl);
  const out = roundCorners(img.outlined(INK).crop(0, off, W + 2, H + 2 - off), 2);
  const padded = new Img(W + 2, H + 2);
  padded.blit(out, 0, off);
  return { img: padded, slice: [5, 6, 5, 7], desc };
}

/** Square troop card frame with a portrait window and a cost band. */
export function card(team: Ramp, locked: boolean): UiPiece {
  const W = 38, H = 46;
  const img = new Img(W, H);
  const frame = locked ? { hl: STONE.hl, base: STONE.base, shade: STONE.shade, deep: STONE.deep } : { hl: WOOD.hl, base: WOOD.base, shade: WOOD.shade, deep: WOOD.deep };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let c = frame.base;
      if (x === 0 || y === 0) c = frame.hl;
      if (x === W - 1 || y === H - 1) c = frame.deep;
      if (y === H - 2) c = frame.shade;
      img.set(x, y, c);
    }
  }
  // Portrait window backdrop (team sky).
  const wx = 3, wy = 3, ww = W - 6, wh = 28;
  for (let y = 0; y < wh; y++) {
    for (let x = 0; x < ww; x++) {
      const t = y / wh;
      let c = locked ? mix(hex('#4a4450'), hex('#2a2430'), t) : t < 0.5 ? team.shade : team.deep;
      if (!locked && t >= 0.35 && t < 0.65 && bayer(x, y) < (t - 0.35) / 0.3) c = team.deep;
      if (!locked && y < 2) c = team.base;
      img.set(wx + x, wy + y, c);
    }
  }
  // Inner bevel around the window.
  img.hline(wx - 1, wx + ww, wy - 1, frame.deep);
  img.vline(wx - 1, wy - 1, wy + wh, frame.deep);
  img.hline(wx - 1, wx + ww, wy + wh, frame.hl);
  img.vline(wx + ww, wy - 1, wy + wh, frame.hl);
  // Cost band.
  const by = wy + wh + 2;
  img.rect(3, by, W - 6, H - by - 3, DARK);
  img.hline(3, W - 4, by, DARKER);
  // Gold corner pins.
  for (const [x, y] of [[1, 1], [W - 3, 1]]) {
    img.set(x, y, GOLD.hl);
    img.set(x + 1, y, GOLD.base);
    img.set(x, y + 1, GOLD.base);
    img.set(x + 1, y + 1, GOLD.deep);
  }
  return { img: roundCorners(img.outlined(INK), 2), desc: locked ? 'Locked troop card (stone).' : 'Troop card. Portrait window at (4,4) size 32x28; cost band below.' };
}

/** Round socket for Skills (and the raised Hero medallion when hero=true). */
export function socket(size: number, hero: boolean): UiPiece {
  const img = new Img(size, size + 3);
  const c = (size - 1) / 2;
  const rim = hero ? { hl: GOLD.hl, base: GOLD.base, shade: GOLD.shade, deep: GOLD.deep } : { hl: STONE.hl, base: STONE.base, shade: STONE.shade, deep: STONE.deep };
  // Drop shadow / raised base.
  img.ellipse(c + 0.5, c + 3.5, size / 2, size / 2, withAlpha(INK, 160));
  img.ellipse(c + 0.5, c + 0.5, size / 2, size / 2, (_x, _y, nx, ny) => (nx + ny < -0.6 ? rim.hl : nx + ny > 0.7 ? rim.deep : nx + ny > 0.2 ? rim.shade : rim.base));
  const inner = size / 2 - (hero ? 4 : 3);
  img.ellipse(c + 0.5, c + 0.5, inner, inner, (_x, _y, _nx, ny) => (ny < -0.55 ? DARKER : mix(hex('#3a2c40'), DARK, (ny + 1) / 2)));
  if (hero) {
    // Notches around the gold rim.
    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2;
      img.set(Math.round(c + Math.cos(ang) * (size / 2 - 2)), Math.round(c + Math.sin(ang) * (size / 2 - 2)), GOLD.deep);
    }
  }
  return { img: img.outlined(INK), anchor: [Math.round(c) + 1, Math.round(c) + 1], desc: hero ? 'Raised gold Hero medallion socket.' : 'Stone Skill socket.' };
}

/** Soft glow ring drawn behind ready Skill and Hero buttons. */
export function glowRing(size: number, color: Color): UiPiece {
  const img = new Img(size, size);
  const c = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x + 0.5 - c, y + 0.5 - c) / c;
      if (d > 1) continue;
      const a = d < 0.62 ? 0 : Math.max(0, 1 - Math.abs(d - 0.8) / 0.2);
      if (a > 0 && bayer(x, y) < a) img.set(x, y, withAlpha(color, Math.round(120 + a * 135)));
    }
  }
  return { img, anchor: [Math.floor(c), Math.floor(c)], desc: 'Ready glow ring (pulsed by the game).' };
}

export function tabButton(selected: boolean): UiPiece {
  const W = 38, H = selected ? 36 : 30;
  const r = selected ? { hl: GOLD.hl, base: hex('#8a5a3a'), shade: hex('#6a4028'), deep: hex('#4a2a1c') } : { hl: hex('#7a5a4a'), base: hex('#5a3e32'), shade: hex('#463024'), deep: hex('#33231c') };
  const img = new Img(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let c = r.base;
      if (y === 0) c = selected ? GOLD.base : r.hl;
      else if (y === 1 && selected) c = GOLD.hl;
      else if (x === 0) c = r.hl;
      else if (x === W - 1) c = r.deep;
      else if (y > H - 4) c = r.shade;
      img.set(x, y, c);
    }
  }
  if (selected) {
    img.vline(0, 0, H - 1, GOLD.shade);
    img.vline(W - 1, 0, H - 1, GOLD.deep);
  }
  return { img: roundCorners(img.outlined(INK), 2), desc: selected ? 'Selected tab (raised, gold trim).' : 'Tab.' };
}

export function tabBar(): UiPiece {
  const img = new Img(16, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) img.set(x, y, y === 0 ? INK : y === 1 ? hex('#6a4a3a') : y < 4 ? hex('#3e2a24') : hex('#2e1f1c'));
  for (let x = 0; x < 16; x += 4) img.set(x, 8, hex('#3e2a24'));
  return { img, slice: [2, 3, 2, 2], desc: 'Bottom tab bar background. 9-slice.' };
}

export interface WallTheme {
  block: { hl: Color; base: Color; shade: Color; deep: Color };
  alt: Color;
  mortar: Color;
  moss: boolean;
  beam: 'log' | 'frieze';
}

export const STONE_WALL: WallTheme = { block: { hl: STONE.hl, base: STONE.base, shade: STONE.shade, deep: STONE.deep }, alt: hex('#b8a896'), mortar: hex('#3c3236'), moss: true, beam: 'log' };
export const SAND_WALL: WallTheme = { block: { hl: hex('#fbe8b8'), base: hex('#e2c088'), shade: hex('#c49a5e'), deep: hex('#8e6a3e') }, alt: hex('#f0d2a0'), mortar: hex('#6a4a30'), moss: false, beam: 'frieze' };

/** Battle HUD wall: stacked blocks under a log beam or a carved frieze, themed per Age. */
export function stoneWall(theme: WallTheme = STONE_WALL): UiPiece {
  const W = 256, H = 220;
  const r = rand(4242);
  const img = new Img(W, H);
  const mortar = theme.mortar;
  const STONE = theme.block;
  // Stone block courses.
  const beamY = 8;
  let y = beamY + 8;
  let row = 0;
  while (y < H) {
    const bh = 11 + (row % 2);
    let x = -((row * 9) % 17);
    while (x < W) {
      const bw = 16 + Math.floor(r() * 12);
      const tint = r();
      const base = tint < 0.33 ? STONE.base : tint < 0.66 ? mix(STONE.base, STONE.shade, 0.35) : mix(STONE.base, theme.alt, 0.4);
      for (let j = 0; j < bh; j++) {
        for (let i = 0; i < bw; i++) {
          const px = x + i;
          const py = y + j;
          if (px < 0 || px >= W || py >= H) continue;
          let c = base;
          const edgeR = i === bw - 1, edgeB = j === bh - 1;
          if (edgeR || edgeB) c = mortar;
          else if (j === 0 || i === 0) c = mix(base, STONE.hl, 0.6);
          else if (j === bh - 2 || i === bw - 2) c = mix(base, STONE.deep, 0.45);
          else if (bayer(px, py) < 0.08) c = mix(base, STONE.shade, 0.5);
          // Rounded block corners.
          if ((i === 0 || i === bw - 2) && (j === 0 || j === bh - 2)) c = mix(base, STONE.deep, 0.3);
          img.set(px, py, c);
        }
      }
      // Moss tufts on some block tops.
      if (theme.moss && r() < 0.18) for (let k = 0; k < 4; k++) img.set(x + 2 + Math.floor(r() * (bw - 4)), y + (k % 2), k % 2 ? MOSS.shade : MOSS.base);
      x += bw;
    }
    y += bh;
    row++;
  }
  // Shade the wall slightly darker toward the bottom.
  img.map((c, px, py) => (c && py > 60 && bayer(px, py) < Math.min(0.45, (py - 60) / 300) ? mix(c, DARK, 0.35) : c));
  if (theme.beam === 'frieze') {
    // Carved frieze: terracotta band with a running key pattern.
    const T1 = hex('#d0603e'), T2 = hex('#a23f2c'), K = hex('#2a1a1c'), CAP = hex('#fbe8b8');
    for (let x = 0; x < W; x++) {
      for (let j = -1; j < 9; j++) {
        let c = j < 1 ? CAP : j > 6 ? T2 : T1;
        const kx = x % 8;
        const ky = j - 2;
        const key = ky >= 0 && ky < 4 && ((ky === 0 && kx < 6) || (kx === 5 && ky < 3) || (ky === 2 && kx >= 2 && kx <= 5) || (kx === 2 && ky >= 2) || (ky === 3 && kx < 3));
        if (key) c = K;
        img.set(x, beamY + j - 1, c);
      }
    }
    img.hline(0, W - 1, beamY - 2, INK);
    img.hline(0, W - 1, beamY + 8, INK);
    return { img, anchor: [W / 2, beamY - 2], desc: 'Ancient Age battle HUD wall: sandstone courses under a key-pattern frieze.' };
  }
  // Log beam across the top.
  for (let x = 0; x < W; x++) {
    for (let j = 0; j < 9; j++) {
      const c = j === 0 ? WOOD.hl : j < 3 ? WOOD.base : j < 7 ? (bayer(x, j) < 0.2 ? WOOD.shade : WOOD.base) : j === 7 ? WOOD.shade : WOOD.deep;
      img.set(x, beamY + j - 1, c);
    }
    if (x % 23 === 0) {
      // Log end rings / joints.
      img.vline(x, beamY, beamY + 6, WOOD.deep);
      img.vline(x + 1, beamY, beamY + 6, WOOD.hl);
    }
  }
  // Rope lashings.
  for (let x = 11; x < W; x += 46) {
    for (let j = -1; j < 9; j++) {
      img.set(x, beamY + j, j % 2 ? hex('#c89a5a') : hex('#8a6038'));
      img.set(x + 1, beamY + j, j % 2 ? hex('#8a6038') : hex('#c89a5a'));
      img.set(x + 2, beamY + j, hex('#6a4428'));
    }
  }
  // Ink line under the beam and on top.
  img.hline(0, W - 1, beamY - 2, INK);
  img.hline(0, W - 1, beamY + 8, INK);
  void BONE;
  return { img, anchor: [W / 2, beamY - 2], desc: 'Stone Age battle HUD wall: stone courses under a lashed log beam. Anchor = top-centre of the beam.' };
}

/** Victory / defeat ribbon. 9-slice: centre tiles, folded tails fixed. */
export function ribbon(ramp: Ramp | typeof GOLD): UiPiece {
  const W = 40, H = 22;
  const img = new Img(W, H);
  const r = { hl: ramp.hl, base: ramp.base, shade: ramp.shade, deep: ramp.deep };
  // Tails
  for (const flip of [false, true]) {
    for (let y = 6; y < H; y++) {
      for (let x = 0; x < 10; x++) {
        const notch = y > 9 && y < 18 && x < Math.abs(y - 13.5) - 1.5;
        if (notch) continue;
        const px = flip ? W - 1 - x : x;
        img.set(px, y, x > 7 ? r.deep : r.shade);
      }
    }
  }
  // Body
  for (let y = 2; y < H - 4; y++) {
    for (let x = 7; x < W - 7; x++) {
      const c = y === 2 ? r.hl : y === 3 ? mix(r.hl, r.base, 0.5) : y > H - 7 ? r.shade : r.base;
      img.set(x, y, c);
    }
  }
  return { img: img.outlined(INK), slice: [12, 6, 12, 8], desc: 'Result ribbon. Centre tiles horizontally.' };
}

export function smallPlaque(): UiPiece {
  const r = { hl: hex('#5a4652'), base: hex('#3a2d3c'), shade: hex('#2a2030'), deep: hex('#1f1724') };
  const img = roundCorners(bevelBox(12, 12, r, 1).outlined(INK), 1);
  return { img, slice: [4, 4, 4, 4], desc: 'Small dark plaque for counters (Food, Gold). 9-slice.' };
}

export const RAMPS = { TEAM_BLUE, TEAM_RED, GOLD, MOSS, WOOD, STONE };

/** Seamless stone backdrop for menu pages (no beam). */
export function wallBackground(theme: WallTheme = STONE_WALL): UiPiece {
  const full = stoneWall(theme).img;
  // Take a band of courses below the beam; its height is a multiple of the course pattern.
  const img = full.crop(0, 16, 256, 23 * 8);
  return { img, slice: [0, 0, 0, 0], desc: 'Menu backdrop: stone courses, tiles vertically.' };
}
