/**
 * Bosses drawn natively at the game's one pixel size (D39/D41): every part is painted at full
 * resolution with shaded primitives, then given one-pixel rim light, shade and material seams.
 * Nothing is upscaled, so a boss has the same pixel density as the troops around it, just more of it.
 */
import { Img, bayer, mix, type Color } from '../img';
import * as PAL from '../palette';
import { BONE, BRONZE, FELT, FUR, GOLD, HAIR, HAIR_RED, INK, IRON, LEATHER, LINEN, MOUTH, SKIN, STEEL, STONE, TEAM_RED, WHITE, WOOD, teamTint, type Ramp } from '../palette';
import type { Limb, RigParts } from '../rig';

export type R4 = { hl: Color; base: Color; shade: Color; deep: Color };
const r4 = (r: R4): R4 => ({ hl: r.hl, base: r.base, shade: r.shade, deep: r.deep });

// ---------- One-pixel shading ----------

/** Every ramp in the master palette, so a colour can step one shade lighter or darker. */
const STEPS = (() => {
  const m = new Map<Color, { up: Color; down: Color }>();
  for (const v of Object.values(PAL)) {
    if (!v || typeof v !== 'object' || !('base' in v)) continue;
    const r = v as R4;
    const seq = [r.hl, r.base, r.shade, r.deep];
    seq.forEach((c, i) => {
      if (!m.has(c)) m.set(c, { up: seq[Math.max(0, i - 1)], down: seq[Math.min(3, i + 1)] });
    });
  }
  return m;
})();
const lighter = (c: Color) => STEPS.get(c)?.up ?? mix(c, 0xfff8ecff, 0.25);
const darker = (c: Color) => STEPS.get(c)?.down ?? mix(c, 0x1e1526ff, 0.3);

/**
 * One-pixel finish: rim light on top-left edges, shade on bottom-right edges, single-pixel seams
 * between materials and a little single-pixel texture in flat areas. Ink pixels count as edges.
 */
export function redetail(src: Img): Img {
  const out = src.clone();
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= src.w || y >= src.h ? 0 : src.get(x, y));
  const edge = (v: Color) => !v || v === INK;
  for (let y = 0; y < src.h; y++) {
    for (let x = 0; x < src.w; x++) {
      const c = src.get(x, y);
      if (!c || c === INK || c === WHITE) continue;
      const l = at(x - 1, y), u = at(x, y - 1), r = at(x + 1, y), d = at(x, y + 1);
      if (edge(u) || edge(l)) out.set(x, y, lighter(c));
      else if (edge(d) || edge(r)) out.set(x, y, darker(c));
      else if ((r && r !== c) || (d && d !== c)) {
        if (at(x + 1, y + 1) !== c) out.set(x, y, darker(c));
      } else if (bayer(x, y) < 0.035 && (x + y) % 3 === 0) out.set(x, y, darker(c));
    }
  }
  return out;
}

// ---------- Painting primitives ----------

/** Light from the top-left: highlight, base, shade, deep by the surface normal. */
const lit = (r: R4, nx: number, ny: number): Color => (nx + ny < -0.75 ? r.hl : nx + ny > 0.8 ? r.deep : nx + ny > 0.25 ? r.shade : r.base);

export function ball(img: Img, cx: number, cy: number, rx: number, ry: number, r: R4): void {
  img.ellipse(cx, cy, rx, ry, (_x, _y, nx, ny) => lit(r, nx, ny));
}

/** A box lit from the top-left (no outline). */
export function box(img: Img, x: number, y: number, w: number, h: number, r: R4): void {
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      let c = r.base;
      if (j === h - 1) c = r.deep;
      else if (i === w - 1 || j === h - 2) c = r.shade;
      else if (i === 0 || j === 0) c = r.hl;
      img.set(x + i, y + j, c);
    }
  }
}

/** A tapering vertical slab from width w0 at y0 to w1 at y1, centred on cx0..cx1. */
export function slab(img: Img, cx0: number, y0: number, w0: number, cx1: number, y1: number, w1: number, r: R4): void {
  for (let y = y0; y <= y1; y++) {
    const t = y1 === y0 ? 0 : (y - y0) / (y1 - y0);
    const cx = cx0 + (cx1 - cx0) * t;
    const half = (w0 + (w1 - w0) * t) / 2;
    for (let x = Math.round(cx - half); x < Math.round(cx + half); x++) {
      const nx = (x - cx) / Math.max(1, half);
      img.set(x, y, lit(r, nx, (t - 0.5) * 0.6));
    }
  }
}

/** A thick stroke along a polyline (horns, straps, capes' edges). */
export function stroke(img: Img, pts: [number, number][], width: number[] | number, r: R4): void {
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
    for (let k = 0; k <= steps; k++) {
      const t = k / steps;
      const w = Array.isArray(width) ? width[i] + (width[i + 1] - width[i]) * t : width;
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t;
      img.ellipse(x, y, w / 2, w / 2, (_a, _b, nx, ny) => lit(r, nx, ny));
    }
  }
}

/** Stern eyes for a face looking right: a white glint, an ink pupil, a heavy brow slanting down to the nose. */
export function eye(img: Img, x: number, y: number, brow: Color): void {
  img.set(x, y, WHITE);
  img.set(x + 1, y, INK);
  img.set(x + 1, y + 1, INK);
  img.set(x, y + 1, INK);
  img.set(x - 1, y - 2, brow);
  img.set(x, y - 2, brow);
  img.set(x + 1, y - 1, brow);
  img.set(x + 2, y - 1, brow);
}

const finish = (img: Img): Img => redetail(img);
const limb = (img: Img, pivot: [number, number], tip?: [number, number]): Limb => ({ img: finish(img), pivot, ...(tip ? { tip } : {}) });

// ---------- Shared body plan ----------

/** Frame and attach points shared by the humanoid bosses (facing right, lit top-left). */
function plan(parts: Pick<RigParts, 'torso' | 'heads' | 'frontArm' | 'backArm' | 'frontLeg' | 'backLeg'> & Partial<RigParts>): RigParts {
  return {
    frameW: 104,
    frameH: 78,
    hip: [50, 62],
    footY: 12,
    neck: [2, -19],
    frontShoulder: [8, -16],
    backShoulder: [-8, -16],
    frontHip: [4, -1],
    backHip: [-5, -1],
    outline: INK,
    poseScale: 2,
    ...parts,
  };
}

/** A darker copy of a part (far arm and leg). */
function far(l: Limb): Limb {
  const img = l.img.clone();
  img.map((c) => (c && c !== INK && c !== WHITE ? darker(c) : c));
  return { ...l, img };
}

function leg(top: R4, boot: R4, w = 11, h = 13, cuff?: R4): Limb {
  const img = new Img(w + 2, h + 1);
  slab(img, w / 2 + 1, 0, w, w / 2 + 1, h - 5, w - 2, top);
  if (cuff) box(img, 1, h - 6, w, 2, cuff);
  slab(img, w / 2 + 1, h - 4, w - 1, w / 2 + 2, h - 1, w + 1, boot);
  return limb(img, [Math.round(w / 2) + 1, 0]);
}

function arm(upper: R4, hand: R4, w = 8, h = 17, wrap?: R4): Limb {
  const img = new Img(w + 2, h + 3);
  slab(img, w / 2 + 1, 0, w + 1, w / 2 + 1, h - 5, w - 1, upper);
  if (wrap) box(img, 1, h - 8, w, 3, wrap);
  ball(img, w / 2 + 1, h - 1, w / 2, 3.5, hand);
  return limb(img, [Math.round(w / 2) + 1, 2], [Math.round(w / 2) + 1, h - 1]);
}

// ---------- Stone: Ograk the Mountain ----------
// A hunched giant with boulder shoulders, a braided red beard, a crown of great horns and a stone maul.

export function ograkNative(team: Ramp): RigParts {
  const fur = teamTint(FUR, team, 0.42);
  const skin = r4(SKIN);
  const stone = r4(STONE);
  const beard = r4(HAIR_RED);

  // Head 34x36: horn crown on top, skull, stern face looking right, beard hanging below.
  const head = new Img(34, 38);
  stroke(head, [[9, 15], [4, 10], [2, 4], [4, 0]], [5, 4, 3, 1.5], r4(BONE));
  stroke(head, [[24, 14], [29, 9], [31, 3], [29, 0]], [5, 4, 3, 1.5], r4(BONE));
  ball(head, 16, 19, 11, 10, r4(HAIR));
  ball(head, 19, 22, 8.5, 7.5, skin);
  for (const [x, h] of [[11, 4], [15, 6], [19, 5], [23, 3]]) stroke(head, [[x, 11], [x, 11 - h]], [3, 1], r4(BONE));
  head.hline(8, 27, 12, BONE.deep);
  eye(head, 20, 21, HAIR_RED.deep);
  eye(head, 25, 21, HAIR_RED.deep);
  head.set(27, 23, SKIN.shade);
  head.set(28, 24, SKIN.deep);
  head.ellipse(19, 30, 9, 7, (_x, _y, nx, ny) => lit(beard, nx, ny));
  stroke(head, [[19, 30], [17, 37]], [5, 3], beard);
  stroke(head, [[24, 30], [24, 36]], [4, 2], beard);
  head.hline(21, 25, 26, MOUTH);
  head.set(12, 22, SKIN.shade);
  const hurt = head.clone();
  hurt.set(20, 21, INK);
  hurt.set(25, 21, INK);
  hurt.hline(21, 25, 26, INK);
  hurt.set(23, 27, MOUTH);

  // Torso 40x30: a barrel chest and belly under a heavy fur mantle, boulder pauldrons, rope belt, fur kilt.
  const torso = new Img(42, 30);
  ball(torso, 21, 12, 14, 10, skin);
  ball(torso, 22, 18, 12, 7, skin);
  torso.hline(15, 27, 11, SKIN.shade);
  torso.vline(21, 9, 17, SKIN.shade);
  stroke(torso, [[6, 6], [21, 9], [36, 6]], 8, fur);
  ball(torso, 7, 6, 7.5, 6.5, stone);
  ball(torso, 35, 6, 7.5, 6.5, stone);
  torso.set(4, 3, STONE.hl);
  torso.set(33, 3, STONE.hl);
  box(torso, 10, 21, 23, 3, r4(LEATHER));
  slab(torso, 21, 23, 24, 21, 29, 28, fur);
  for (const x of [10, 15, 20, 26, 31]) torso.set(x, 29, 0);

  const hand = skin;
  const front = arm(skin, hand, 11, 19, r4(LEATHER));
  const fl = leg(fur, r4(LEATHER), 13, 13);

  // Maul: a rope-bound boulder on a long haft (points up at 0; grip near the haft's end).
  const maul = new Img(26, 46);
  box(maul, 11, 12, 4, 34, r4(WOOD));
  ball(maul, 13, 9, 12, 9, stone);
  maul.hline(4, 22, 11, LEATHER.base);
  maul.hline(5, 21, 12, LEATHER.shade);
  maul.set(6, 5, STONE.hl);
  maul.set(17, 3, STONE.deep);
  maul.set(19, 13, STONE.deep);

  const capeImg = new Img(30, 40);
  slab(capeImg, 24, 0, 10, 13, 39, 24, fur);
  for (let y = 4; y < 40; y += 6) capeImg.set(13 + (y % 5), y, FUR.deep);
  for (let x = 2; x < 26; x += 3) capeImg.set(x, 39, 0);

  return plan({
    torso: limb(torso, [21, 28]),
    heads: { normal: limb(head, [17, 37]), hurt: limb(hurt, [17, 37]) },
    neck: [2, -24],
    frontShoulder: [12, -20],
    backShoulder: [-12, -20],
    frontHip: [6, -1],
    backHip: [-6, -1],
    frontArm: front,
    backArm: far(front),
    frontLeg: fl,
    backLeg: far(fl),
    weapon: limb(maul, [13, 40]),
    back: limb(capeImg, [24, 2]),
  });
}


/** A stern face looking right inside a helmet or under a hat: eyes, brow, nose, mouth, optional beard. */
function face(img: Img, cx: number, cy: number, brow: Color, beard?: R4, moustache = false): void {
  ball(img, cx, cy, 7, 6.5, r4(SKIN));
  eye(img, cx + 1, cy - 1, brow);
  eye(img, cx + 5, cy - 1, brow);
  img.set(cx + 7, cy + 1, SKIN.shade);
  img.set(cx + 8, cy + 2, SKIN.deep);
  if (beard) {
    img.ellipse(cx + 1, cy + 5, 6.5, 4, (_x, _y, nx, ny) => lit(beard, nx, ny));
    img.hline(cx + 2, cx + 6, cy + 3, MOUTH);
  } else if (moustache) {
    img.hline(cx + 2, cx + 7, cy + 3, HAIR.shade);
    img.set(cx + 1, cy + 4, HAIR.shade);
    img.set(cx + 8, cy + 4, HAIR.shade);
  } else img.hline(cx + 3, cx + 6, cy + 4, MOUTH);
}

const hurtOf = (head: Img, eyes: [number, number][]): Img => {
  const h = head.clone();
  for (const [x, y] of eyes) {
    h.set(x, y, INK);
    h.set(x + 1, y + 1, INK);
  }
  return h;
};

function cape(color: R4, w = 30, h = 40): Limb {
  const img = new Img(w, h);
  slab(img, w - 6, 0, 10, Math.round(w * 0.42), h - 1, w - 6, color);
  for (let y = 5; y < h; y += 7) img.vline(Math.round(w * 0.42) + ((y * 3) % 7) - 2, y, y + 3, color.shade);
  for (let x = 3; x < w - 6; x += 3) img.set(x, h - 1, 0);
  return limb(img, [w - 6, 2]);
}

// ---------- Ancient: The Bronze Bull ----------
// A towering bronze hoplite: bull-horned helm with a red crest, muscle cuirass, round shield, long spear.

export function bullNative(team: Ramp): RigParts {
  const bronze = r4(BRONZE);
  const crest = teamTint(r4(TEAM_RED), team, 0.6);
  const head = new Img(36, 36);
  stroke(head, [[8, 26], [4, 30], [2, 26], [3, 21]], [3, 3, 2, 1], r4(BONE));
  stroke(head, [[28, 14], [34, 10], [35, 4], [32, 1]], [4, 3.5, 2.5, 1.5], r4(BONE));
  stroke(head, [[8, 14], [3, 9], [2, 3], [5, 0]], [4, 3.5, 2.5, 1.5], r4(BONE));
  // Crest: a red horsehair ridge sweeping back.
  stroke(head, [[24, 9], [16, 5], [7, 7], [3, 13]], [4, 5, 4, 3], crest);
  ball(head, 18, 19, 11, 10.5, bronze);
  face(head, 21, 22, HAIR.deep, r4(HAIR));
  // Cheek guard and brow band.
  head.hline(9, 28, 15, BRONZE.deep);
  box(head, 9, 16, 5, 11, bronze);
  const hurt = hurtOf(head, [[22, 21], [26, 21]]);

  const torso = new Img(36, 28);
  ball(torso, 18, 11, 13, 10, bronze);
  torso.hline(12, 24, 10, BRONZE.shade);
  torso.vline(18, 4, 16, BRONZE.shade);
  torso.set(14, 7, BRONZE.hl);
  torso.set(22, 7, BRONZE.hl);
  for (let i = 0; i < 7; i++) box(torso, 6 + i * 3.5, 19, 3, 8, i % 2 ? r4(LINEN) : crest);
  box(torso, 6, 18, 24, 2, bronze);

  const front = arm(r4(SKIN), r4(SKIN), 9, 18, bronze);
  const fl = leg(r4(SKIN), bronze, 11, 13, bronze);

  const spear = new Img(10, 62);
  box(spear, 4, 10, 3, 52, r4(WOOD));
  spear.poly([[5, 0], [9, 7], [5, 12], [1, 7]], (x) => (x < 5 ? BRONZE.hl : BRONZE.shade));
  spear.hline(3, 7, 12, BRONZE.deep);

  const shield = new Img(28, 28);
  ball(shield, 14, 14, 13, 13, bronze);
  shield.ellipse(14, 14, 10, 10, (_x, _y, nx, ny) => lit(crest, nx, ny));
  shield.ellipse(14, 14, 6, 6, (_x, _y, nx, ny) => lit(bronze, nx, ny));
  stroke(shield, [[9, 10], [6, 6]], 2, r4(BONE));
  stroke(shield, [[19, 10], [22, 6]], 2, r4(BONE));

  return plan({
    torso: limb(torso, [18, 26]),
    heads: { normal: limb(head, [18, 35]), hurt: limb(hurt, [18, 35]) },
    neck: [2, -22],
    frontShoulder: [11, -18],
    backShoulder: [-10, -18],
    frontArm: front,
    backArm: far(front),
    frontLeg: fl,
    backLeg: far(fl),
    weapon: limb(spear, [5, 44]),
    offhand: limb(shield, [14, 14]),
    offhandInFront: true,
    back: cape(crest, 30, 40),
  });
}

// ---------- Crusader: Baron Ironveil ----------
// A black-iron knight: crowned great helm with a red plume, broad pauldrons, a red tabard with a
// gold cross, a kite shield and a greatsword.

export function baronNative(team: Ramp): RigParts {
  const iron = r4(IRON);
  const red = teamTint(r4(TEAM_RED), team, 0.7);
  const gold = r4(GOLD);
  const head = new Img(30, 36);
  stroke(head, [[18, 12], [12, 4], [4, 2], [1, 8]], [4, 5, 4, 3], red);
  for (const x of [9, 14, 19, 24]) stroke(head, [[x, 12], [x, 8]], [3, 1.5], gold);
  box(head, 7, 12, 20, 3, gold);
  // Great helm: a flat-topped iron pot with an eye slit and breaths.
  box(head, 6, 14, 21, 21, iron);
  head.ellipse(16, 15, 10, 3, (_x, _y, nx, ny) => lit(iron, nx, ny));
  head.hline(15, 26, 22, INK);
  head.hline(16, 25, 23, INK);
  head.set(22, 22, 0xff5a4fff);
  head.vline(16, 14, 34, IRON.deep);
  for (const y of [27, 29, 31]) head.hline(21, 24, y, IRON.deep);
  const hurt = head.clone();
  hurt.set(22, 22, INK);

  const torso = new Img(40, 30);
  slab(torso, 20, 2, 26, 20, 22, 22, iron);
  ball(torso, 6, 6, 7, 6, iron);
  ball(torso, 34, 6, 7, 6, iron);
  slab(torso, 20, 6, 16, 20, 29, 20, red);
  box(torso, 18, 9, 4, 16, gold);
  box(torso, 13, 13, 14, 4, gold);
  box(torso, 11, 21, 18, 3, r4(LEATHER));

  const front = arm(iron, iron, 10, 18, gold);
  const fl = leg(iron, iron, 12, 13, red);

  const sword = new Img(16, 54);
  box(sword, 6, 0, 5, 38, r4(STEEL));
  sword.vline(8, 1, 36, STEEL.hl);
  box(sword, 1, 38, 15, 3, gold);
  box(sword, 7, 41, 3, 10, r4(LEATHER));
  ball(sword, 8.5, 52, 2.5, 2, gold);

  const shield = new Img(22, 30);
  shield.poly([[0, 0], [21, 0], [21, 14], [11, 29], [0, 14]], (x, y) => (x < 4 || y < 2 ? red.hl : x > 17 ? red.shade : red.base));
  box(shield, 9, 3, 4, 20, gold);
  box(shield, 4, 8, 14, 4, gold);

  return plan({
    torso: limb(torso, [20, 28]),
    heads: { normal: limb(head, [16, 35]), hurt: limb(hurt, [16, 35]) },
    neck: [2, -22],
    frontShoulder: [12, -18],
    backShoulder: [-12, -18],
    frontArm: front,
    backArm: far(front),
    frontLeg: fl,
    backLeg: far(fl),
    weapon: limb(sword, [8, 45]),
    offhand: limb(shield, [11, 12]),
    back: cape({ hl: FELT.hl, base: FELT.base, shade: FELT.shade, deep: FELT.deep }, 32, 44),
  });
}

// ---------- Gunpowder: Admiral Blackpowder ----------
// A broad admiral in a red greatcoat with gold epaulettes, a plumed bicorne over a powdered wig,
// white breeches, tall boots and a brass-mouthed blunderbuss.

export function admiralNative(team: Ramp): RigParts {
  const coat = teamTint(r4(TEAM_RED), team, 0.75);
  const felt = { hl: FELT.hl, base: FELT.base, shade: FELT.shade, deep: FELT.deep };
  const gold = r4(GOLD);
  const wig = r4(LINEN);
  const head = new Img(40, 34);
  // Bicorne: a wide black hat worn side-on, gold piping, a white plume.
  stroke(head, [[3, 14], [12, 7], [26, 6], [37, 13]], [4, 8, 8, 4], felt);
  head.hline(4, 36, 15, GOLD.shade);
  stroke(head, [[22, 6], [26, 1], [31, 0]], [3, 3, 2], wig);
  ball(head, 21, 10, 3, 3, gold);
  ball(head, 13, 22, 6, 7, wig);
  ball(head, 12, 27, 4, 4, wig);
  face(head, 22, 22, HAIR.deep, undefined, true);
  const hurt = hurtOf(head, [[23, 21], [27, 21]]);

  const torso = new Img(40, 32);
  slab(torso, 20, 2, 26, 20, 31, 32, coat);
  box(torso, 16, 2, 8, 6, wig);
  for (const y of [10, 15, 20]) {
    torso.set(17, y, GOLD.base);
    torso.set(23, y, GOLD.base);
  }
  box(torso, 7, 22, 26, 3, r4(LEATHER));
  ball(torso, 20, 23, 2.5, 2, gold);
  stroke(torso, [[4, 4], [11, 3]], 5, gold);
  stroke(torso, [[29, 3], [36, 4]], 5, gold);
  for (const x of [5, 8, 30, 33]) torso.vline(x, 6, 8, GOLD.shade);

  const front = arm(coat, r4(LINEN), 10, 18, gold);
  const fl = leg(r4(LINEN), felt, 11, 13, felt);

  const gun = new Img(14, 46);
  box(gun, 4, 26, 6, 16, r4(WOOD));
  box(gun, 5, 6, 4, 22, r4(BRONZE));
  gun.poly([[1, 0], [12, 0], [9, 7], [4, 7]], (x) => (x < 5 ? BRONZE.hl : BRONZE.shade));
  gun.hline(4, 9, 16, BRONZE.deep);
  box(gun, 3, 30, 8, 2, r4(IRON));

  return plan({
    torso: limb(torso, [20, 30]),
    heads: { normal: limb(head, [20, 33]), hurt: limb(hurt, [20, 33]) },
    neck: [2, -24],
    frontShoulder: [12, -20],
    backShoulder: [-12, -20],
    frontArm: front,
    backArm: far(front),
    frontLeg: fl,
    backLeg: far(fl),
    weapon: limb(gun, [7, 34]),
    back: cape({ hl: coat.shade, base: coat.deep, shade: 0x4a1226ff, deep: 0x2e0c1aff }, 28, 40),
  });
}


// ---------- Machines: native bodies on the biped machine rig ----------

/** Iron Juggernaut body: a riveted boiler drum with a smokestack, a brass cockpit and a plough. */
export function juggernautBody(team: Ramp, hurt: boolean): Img {
  const metal = teamTint(r4(IRON), team, 0.42);
  const brass = r4(BRONZE);
  const img = new Img(48, 38);
  box(img, 5, 0, 7, 16, r4(IRON));
  box(img, 4, 0, 9, 3, brass);
  box(img, 5, 9, 7, 2, brass);
  ball(img, 23, 22, 20, 12, metal);
  for (const y of [13, 30]) for (let x = 8; x < 40; x += 3) img.set(x, y, IRON.hl);
  for (const x of [12, 31]) slab(img, x, 11, 3, x, 33, 3, brass);
  ball(img, 33, 10, 9, 7, brass);
  ball(img, 36, 10, 5, 3.5, { hl: 0xffd0c0ff, base: TEAM_RED.hl, shade: TEAM_RED.base, deep: TEAM_RED.shade });
  img.set(34, 8, WHITE);
  if (hurt) {
    img.line(33, 8, 38, 12, INK);
    img.line(36, 7, 35, 13, INK);
  }
  box(img, 15, 19, 9, 7, { hl: IRON.shade, base: IRON.deep, shade: INK, deep: INK });
  for (let x = 16; x < 23; x++) for (let y = 21; y < 25; y++) if ((x + y) % 2 === 0 || !hurt) img.set(x, y, y < 23 ? 0xffc33aff : 0xff7c1fff);
  img.poly([[40, 26], [47, 36], [33, 36]], (x) => (x > 42 ? IRON.shade : IRON.base));
  for (const x of [36, 39, 42]) img.vline(x, 30, 35, IRON.deep);
  return finish(img);
}

export function juggernautArm(team: Ramp): Limb {
  const metal = teamTint(r4(IRON), team, 0.42);
  const img = new Img(14, 26);
  ball(img, 6, 4, 5, 4, metal);
  box(img, 4, 7, 5, 9, r4(BRONZE));
  ball(img, 6, 19, 6, 5, metal);
  stroke(img, [[2, 21], [1, 25]], 2.5, r4(IRON));
  stroke(img, [[10, 21], [12, 25]], 2.5, r4(IRON));
  return limb(img, [6, 2], [6, 23]);
}

export function machineFoot(ramp: R4): Img {
  const img = new Img(16, 8);
  img.poly([[2, 0], [11, 0], [15, 5], [15, 7], [0, 7], [0, 4]], (x, y) => (y < 2 ? ramp.hl : x > 12 ? ramp.shade : ramp.base));
  img.hline(0, 15, 7, ramp.deep);
  return finish(img);
}

/** OMEGA Core body: a black-and-gold chassis around a blazing plasma core, with a visor and fins. */
export function omegaBody(hurt: boolean): Img {
  const suit = r4({ hl: 0x5e6688ff, base: 0x404668ff, shade: 0x2c304eff, deep: 0x1e2038ff });
  const gold = r4(GOLD);
  const img = new Img(42, 34);
  stroke(img, [[9, 6], [4, 0]], [3, 1.5], gold);
  stroke(img, [[29, 6], [35, 0]], [3, 1.5], gold);
  img.poly([[2, 10], [40, 10], [36, 28], [6, 28]], (x, y) => (y < 12 || x < 5 ? suit.hl : x > 34 ? suit.shade : suit.base));
  ball(img, 4, 12, 5, 4, gold);
  ball(img, 38, 12, 5, 4, gold);
  ball(img, 21, 6, 8, 5, suit);
  img.hline(17, 28, 6, hurt ? INK : 0x5ce6ffff);
  img.hline(19, 27, 7, hurt ? INK : 0xc4fbffff);
  img.hline(6, 36, 28, GOLD.shade);
  img.poly([[10, 29], [32, 29], [27, 33], [15, 33]], (x) => (x < 16 ? GOLD.base : GOLD.shade));
  // The core.
  const core = [0xfff8ecff, 0xc4fbffff, 0x5ce6ffff, 0x2a9cf0ff];
  img.ellipse(21, 19, 7, 7, (_x, _y, nx, ny) => {
    const d = Math.hypot(nx, ny);
    return hurt && d < 0.5 ? core[2] : core[d < 0.35 ? 0 : d < 0.6 ? 1 : d < 0.85 ? 2 : 3];
  });
  for (const [x, y] of [[13, 19], [29, 19], [21, 11], [21, 27]]) img.set(x, y, GOLD.hl);
  return finish(img);
}

export function omegaArm(): Limb {
  const alloy = r4({ hl: 0x5e6688ff, base: 0x404668ff, shade: 0x2c304eff, deep: 0x1e2038ff });
  const img = new Img(14, 26);
  ball(img, 6, 4, 5, 4, r4(GOLD));
  box(img, 3, 7, 7, 15, alloy);
  for (const y of [10, 15]) img.hline(3, 9, y, GOLD.base);
  ball(img, 6, 23, 3.5, 2.5, { hl: 0xffffffff, base: 0xc4fbffff, shade: 0x5ce6ffff, deep: 0x2a9cf0ff });
  return limb(img, [6, 2], [6, 24]);
}

// ---------- The Hero: the Stormcaller ----------
// Your champion (after the first Prestige): a hooded storm-knight in team blue with silver
// pauldrons and a glaive tipped with a shard of storm glass. Larger than a troop, smaller than a boss.

export function stormcallerRig(team: Ramp): RigParts {
  const cloak = r4(team);
  const silver = r4(STEEL);
  const glass: R4 = { hl: 0xffffffff, base: 0xc4fbffff, shade: 0x5ce6ffff, deep: 0x2a9cf0ff };
  const head = new Img(20, 20);
  // Hood, with the face in its shadow looking right.
  ball(head, 9, 10, 8.5, 8.5, cloak);
  stroke(head, [[4, 4], [1, 9], [2, 15]], [4, 4, 3], cloak);
  ball(head, 12, 12, 5.5, 5, r4(SKIN));
  eye(head, 12, 11, HAIR.deep);
  eye(head, 15, 11, HAIR.deep);
  head.hline(12, 15, 15, MOUTH);
  head.hline(7, 17, 6, team.deep);
  head.set(10, 3, 0xc4fbffff);
  const hurt = hurtOf(head, [[13, 11], [16, 11]]);

  const torso = new Img(22, 18);
  slab(torso, 11, 1, 15, 11, 17, 13, cloak);
  ball(torso, 4, 4, 4.5, 4, silver);
  ball(torso, 18, 4, 4.5, 4, silver);
  box(torso, 5, 11, 12, 2, r4(LEATHER));
  ball(torso, 11, 7, 2.5, 2.5, glass);
  torso.vline(11, 13, 17, team.hl);

  const front = arm(cloak, silver, 6, 12);
  const fl = leg({ hl: 0x5e6688ff, base: 0x404668ff, shade: 0x2c304eff, deep: 0x1e2038ff }, silver, 7, 9);

  // Glaive: a long haft with a storm-glass blade (points up at 0).
  const glaive = new Img(12, 44);
  box(glaive, 5, 12, 2, 32, r4(WOOD));
  glaive.poly([[6, 0], [11, 9], [7, 15], [4, 9]], (x) => (x < 6 ? glass.base : glass.shade));
  glaive.vline(6, 2, 12, 0xffffffff);
  box(glaive, 4, 14, 4, 2, silver);

  const cape = new Img(18, 24);
  slab(cape, 13, 0, 8, 8, 23, 14, { hl: team.base, base: team.shade, shade: team.deep, deep: team.deep });
  for (let x = 2; x < 15; x += 3) cape.set(x, 23, 0);

  return {
    frameW: 76,
    frameH: 56,
    hip: [36, 44],
    footY: 8,
    neck: [1, -15],
    frontShoulder: [6, -12],
    backShoulder: [-6, -12],
    frontHip: [3, -1],
    backHip: [-3, -1],
    outline: INK,
    torso: limb(torso, [11, 16]),
    heads: { normal: limb(head, [10, 19]), hurt: limb(hurt, [10, 19]) },
    frontArm: front,
    backArm: far(front),
    frontLeg: fl,
    backLeg: far(fl),
    weapon: limb(glaive, [6, 32]),
    back: limb(cape, [13, 1]),
  };
}
