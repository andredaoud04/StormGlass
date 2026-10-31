/**
 * Bosses: one champion per Age, drawn at twice the troop pixel scale. Each starts from its Age's
 * heavy troop, upscaled part by part with Scale2x (so every part still gets its own 1 px outline
 * and the frames stay real rig frames), then gets its own regalia: crowns, horns, capes, hats
 * and darker metal so it reads as a boss at a glance.
 */
import { Img, scale2x, type Color, type Palette } from '../img';
import { BONE, BRONZE, FELT, FUR, GOLD, IRON, MAIL, STEEL, SUIT, ALLOY, TEAM_RED, WOOD, INK, PLASMA, type Ramp } from '../palette';
import type { Limb, RigParts } from '../rig';
import { humanoidAnims } from './anims';
import { bruteRig } from './stone';
import { shieldwallRig } from './ancient';
import { knightRig } from './crusader';
import { musketeerRig } from './gunpowder';
import { walkerAnims, walkerRig } from './industrial';
import { mechAnims, mechRig } from './future';
import type { BipedRig } from './machines';
import type { TroopArt } from './catalog';

const X2 = (v: [number, number]): [number, number] => [v[0] * 2, v[1] * 2];

function bigLimb(l: Limb, recolor?: (c: Color) => Color): Limb {
  const img = scale2x(l.img);
  if (recolor) img.map((c) => (c ? recolor(c) : c));
  return { img, pivot: X2(l.pivot), ...(l.tip ? { tip: X2(l.tip) } : {}) };
}

/** Map every colour of one ramp onto another (e.g. bright mail to blackened iron). */
function rampSwap(pairs: [Record<string, Color>, Record<string, Color>][]): (c: Color) => Color {
  const m = new Map<Color, Color>();
  for (const [from, to] of pairs) for (const k of Object.keys(from)) if (to[k] !== undefined) m.set(from[k], to[k]);
  return (c) => m.get(c) ?? c;
}

/** A humanoid rig at twice the pixel scale. */
function bigRig(r: RigParts, recolor?: (c: Color) => Color): RigParts {
  const L = (l?: Limb) => (l ? bigLimb(l, recolor) : undefined);
  const heads: Record<string, Limb> = {};
  for (const [k, v] of Object.entries(r.heads)) heads[k] = bigLimb(v, recolor);
  return {
    ...r,
    frameW: r.frameW * 2 + 8,
    frameH: r.frameH * 2,
    hip: [r.hip[0] * 2 + 4, r.hip[1] * 2 - 4],
    torso: bigLimb(r.torso, recolor),
    neck: X2(r.neck),
    frontShoulder: X2(r.frontShoulder),
    backShoulder: X2(r.backShoulder),
    frontHip: X2(r.frontHip),
    backHip: X2(r.backHip),
    heads,
    frontArm: bigLimb(r.frontArm, recolor),
    backArm: bigLimb(r.backArm, recolor),
    frontLeg: bigLimb(r.frontLeg, recolor),
    backLeg: bigLimb(r.backLeg, recolor),
    weapon: L(r.weapon),
    weaponAlt: L(r.weaponAlt),
    back: L(r.back),
    offhand: L(r.offhand),
    poseScale: 2,
  };
}

/** Put a piece of regalia on top of every head variant; the head grows upward to make room. */
function crown(r: RigParts, rows: string[], pal: Palette, at: [number, number]): void {
  const c = Img.fromGrid(rows, pal);
  for (const [k, h] of Object.entries(r.heads)) {
    const up = Math.max(0, -at[1]);
    const left = Math.max(0, -at[0]);
    const w = Math.max(h.img.w + left, at[0] + left + c.w);
    const img = new Img(w, h.img.h + up);
    img.blit(h.img, left, up);
    img.blit(c, at[0] + left, at[1] + up);
    r.heads[k] = { img, pivot: [h.pivot[0] + left, h.pivot[1] + up] };
  }
}

/** A cape hung from the neck, drawn behind everything. */
function cape(r: RigParts, rows: string[], pal: Palette, pivot: [number, number]): void {
  r.back = { img: Img.fromGrid(rows, pal), pivot };
}

const P = (...ramps: [string, { hl: Color; base: Color; shade: Color; deep: Color }][]): Palette => {
  const p: Palette = { o: INK };
  for (const [letters, ramp] of ramps) {
    const [a, b, c, d] = letters.split('');
    p[a] = ramp.hl;
    p[b] = ramp.base;
    p[c] = ramp.shade;
    p[d] = ramp.deep;
  }
  return p;
};

const CAPE_ROWS = (w: number, h: number): string[] => {
  // Shoulder clasp at the top right; the cloth streams back (left) and widens toward a ragged hem.
  const rows: string[] = [];
  for (let y = 0; y < h; y++) {
    const t = Math.min(1, y / (h * 0.75));
    const half = Math.round(3 + (w / 2 - 4) * t);
    const centre = w - 4 - (w / 2 - 4) * t;
    let row = '';
    for (let x = 0; x < w; x++) {
      const dx = x - centre + 0.5;
      if (Math.abs(dx) > half) {
        row += '.';
        continue;
      }
      const hem = y === h - 1 && (x % 3 === 0);
      if (hem) {
        row += '.';
        continue;
      }
      const fold = (x + Math.floor(y / 6)) % 5 === 0;
      row += y < 2 ? 'B' : dx < -half + 2 ? 'A' : fold ? 'C' : dx > half - 2 ? 'D' : 'B';
    }
    rows.push(row);
  }
  return rows;
};

// ---------- Stone: Ograk the Mountain ----------
export function ograkRig(team: Ramp): RigParts {
  const r = bigRig(bruteRig(team));
  // A crown of great horns and bone spikes.
  crown(r, [
    'O..............O..........O',
    'On.....O......OnO.....O...nO',
    '.On...OnO....OnnnO...OnO..On',
    '.Onn.OnnnO..OnnnnnO.OnnnO.On',
    '..OnnOnnnnOOnnnnnnnOnnnnnOnn',
    '...ONNNNNNNNNNNNNNNNNNNNNNN.',
  ], { ...P(['OonN', BONE]) }, [2, -4]);
  cape(r, CAPE_ROWS(24, 34), P(['ABCD', FUR]), [21, 0]);
  return r;
}

// ---------- Ancient: The Bronze Bull ----------
export function bullRig(team: Ramp): RigParts {
  const r = bigRig(shieldwallRig(team));
  crown(r, [
    'OO..................................OO',
    'Oon................................noO',
    '.onn..............................nno.',
    '..nnn............................nnn..',
    '...nnnn........................nnnn...',
    '....ZZzzz....................zzzZZ....',
    '.....ZZzzzzx..............xzzzzZZ.....',
    '.......ZZzzzzxxxxxxxxxxxxzzzzZZ.......',
    '..........xxxxxxxxxxxxxxxxxx..........',
  ], { ...P(['Zzxy', BRONZE]), O: BONE.hl, o: BONE.base, n: BONE.shade }, [-3, -4]);
  cape(r, CAPE_ROWS(26, 38), P(['ABCD', TEAM_RED]), [23, 0]);
  return r;
}

// ---------- Crusader: Baron Ironveil ----------
export function baronRig(team: Ramp): RigParts {
  const dark = rampSwap([[MAIL, IRON]]);
  const r = bigRig(knightRig(team), dark);
  crown(r, [
    '.Y...Y...Y...Y.',
    '.y..YyY.YyY..y.',
    'YyYYyyyYyyyYYyY',
    'yGyyyGyyyGyyyGy',
    'ggggggggggggggg',
  ], P(['Yygg', GOLD], ['G---', { hl: TEAM_RED.base, base: TEAM_RED.base, shade: TEAM_RED.base, deep: TEAM_RED.base }]), [6, -3]);
  cape(r, CAPE_ROWS(28, 40), P(['ABCD', { hl: FELT.hl, base: FELT.base, shade: FELT.shade, deep: FELT.deep }]), [25, 0]);
  return r;
}

// ---------- Gunpowder: Admiral Blackpowder ----------
export function admiralRig(team: Ramp): RigParts {
  const r = bigRig(musketeerRig(team));
  // A grand bicorne with gold piping and a plume.
  crown(r, [
    '..........WWw.............',
    '.........WWww.............',
    '....FFFFFFFFFFFFFFF.......',
    '..FFGGGGGGGGGGGGGGGFF.....',
    '.FGGGGGGGGGGGGGGGGGGGF....',
    'FGGGGGGGzZZzGGGGGGGGGGF...',
    'FGGGGGGzZYYZzGGGGGGGGGGF..',
    'FfGGGGGGzZZzGGGGGGGGGGGfF.',
    '.ffffffffffffffffffffffff.',
    '..YYYYYYYYYYYYYYYYYYYYYY..',
  ], { ...P(['FGff', FELT], ['YZzz', GOLD]), W: STEEL.hl, w: STEEL.base }, [-2, -6]);
  cape(r, CAPE_ROWS(24, 34), P(['ABCD', SUIT]), [21, 0]);
  return r;
}

// ---------- Machines at twice the scale ----------
function bigBiped(r: BipedRig, recolor?: (c: Color) => Color): BipedRig {
  const S = (img: Img) => {
    const o = scale2x(img);
    if (recolor) o.map((c) => (c ? recolor(c) : c));
    return o;
  };
  const sw = (ramp: BipedRig['legRamp']) => (recolor ? { hl: recolor(ramp.hl), base: recolor(ramp.base), shade: recolor(ramp.shade), deep: recolor(ramp.deep) } : ramp);
  return {
    ...r,
    frameW: r.frameW * 2,
    frameH: r.frameH * 2,
    hip: [r.hip[0] * 2, r.hip[1] * 2 + 4],
    body: S(r.body),
    hurtBody: r.hurtBody ? S(r.hurtBody) : undefined,
    bodyPivot: X2(r.bodyPivot),
    pelvisH: r.pelvisH * 2,
    frontHip: r.frontHip * 2,
    backHip: r.backHip * 2,
    thigh: r.thigh * 2,
    shin: r.shin * 2,
    legW: [r.legW[0] * 2, r.legW[1] * 2],
    legRamp: sw(r.legRamp),
    shinRamp: r.shinRamp ? sw(r.shinRamp) : undefined,
    foot: S(r.foot),
    ankle: X2(r.ankle),
    arm: { img: S(r.arm.img), pivot: X2(r.arm.pivot), ...(r.arm.tip ? { tip: X2(r.arm.tip) } : {}) },
    shoulder: X2(r.shoulder),
    backArm: r.backArm ? { img: S(r.backArm.img), pivot: X2(r.backArm.pivot) } : undefined,
    backShoulder: r.backShoulder ? X2(r.backShoulder) : undefined,
    stride: r.stride * 2,
  };
}

// ---------- Industrial: The Iron Juggernaut ----------
export function juggernautRig(team: Ramp): BipedRig {
  return bigBiped(walkerRig(team), rampSwap([[BRONZE, { hl: GOLD.hl, base: GOLD.shade, shade: GOLD.deep, deep: WOOD.deep }]]));
}

// ---------- Future: OMEGA Core ----------
export function omegaRig(team: Ramp): BipedRig {
  // Black-and-gold chassis with a plasma core.
  return bigBiped(mechRig(team), rampSwap([[ALLOY, { hl: SUIT.hl, base: SUIT.base, shade: SUIT.shade, deep: SUIT.deep }], [SUIT, { hl: GOLD.base, base: GOLD.shade, shade: GOLD.deep, deep: WOOD.deep }]]));
}

/** Pose set at boss scale; machine poses use their own animators. */
export const BOSS_TROOPS: TroopArt[] = [
  { id: 'boss_stone', rig: ograkRig, anims: (r) => humanoidAnims(r, 'swing', { weapon: 130, frontArm: -15 }, { roomyDeath: true }) },
  { id: 'boss_ancient', rig: bullRig, anims: (r) => humanoidAnims(r, 'thrust', { weapon: 60, frontArm: -40, offhand: 0 }, { roomyDeath: true }) },
  { id: 'boss_crusader', rig: baronRig, anims: (r) => humanoidAnims(r, 'swing', { weapon: 60, frontArm: -35, offhand: 0 }, { roomyDeath: true }) },
  { id: 'boss_gunpowder', rig: admiralRig, anims: (r) => humanoidAnims(r, 'shoot', { weapon: 40, frontArm: -30 }, { roomyDeath: true }), sfx: 'cannon' },
  { id: 'boss_industrial', rig: juggernautRig, anims: walkerAnims, sfx: 'steam' },
  { id: 'boss_future', rig: omegaRig, anims: mechAnims, sfx: 'zap_heavy' },
];

void PLASMA;
