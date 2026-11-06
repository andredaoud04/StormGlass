/**
 * Bosses: one champion per Age, each with its own silhouette and move set. The humanoid bosses
 * are painted natively in bossArt.ts (D41). The two machine bosses keep the walker and mech leg
 * geometry at twice the size (their legs are solved per frame at the native pixel), with natively
 * painted bodies, arms and feet.
 */
import { Img, scale2x, type Color } from '../img';
import { ALLOY, BRONZE, GOLD, IRON, PLASMA, SUIT, WOOD, type Ramp } from '../palette';
import { humanoidAnims } from './anims';
import { walkerAnims, walkerRig } from './industrial';
import { mechAnims, mechRig } from './future';
import { admiralNative, baronNative, bullNative, juggernautArm, juggernautBody, machineFoot, ograkNative, omegaArm, omegaBody, redetail } from './bossArt';
import type { BipedRig } from './machines';
import type { TroopArt } from './catalog';

const X2 = (v: [number, number]): [number, number] => [v[0] * 2, v[1] * 2];

/** Map every colour of one ramp onto another (e.g. bright mail to blackened iron). */
function rampSwap(pairs: [Record<string, Color>, Record<string, Color>][]): (c: Color) => Color {
  const m = new Map<Color, Color>();
  for (const [from, to] of pairs) for (const k of Object.keys(from)) if (to[k] !== undefined) m.set(from[k], to[k]);
  return (c) => m.get(c) ?? c;
}

// ---------- Machines at twice the scale ----------
function bigBiped(r: BipedRig, recolor?: (c: Color) => Color): BipedRig {
  const S = (img: Img) => {
    const o = scale2x(img);
    if (recolor) o.map((c) => (c ? recolor(c) : c));
    return redetail(o);
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
  // Geometry from the walker at boss size; the body, arm and feet are painted natively (D41).
  const r = bigBiped(walkerRig(team), rampSwap([[BRONZE, { hl: GOLD.hl, base: GOLD.shade, shade: GOLD.deep, deep: WOOD.deep }]]));
  return { ...r, body: juggernautBody(team, false), hurtBody: juggernautBody(team, true), bodyPivot: [21, 34], arm: juggernautArm(team), foot: machineFoot(IRON), ankle: [6, 0] };
}

// ---------- Future: OMEGA Core ----------
export function omegaRig(team: Ramp): BipedRig {
  // Black-and-gold chassis with a plasma core.
  const r = bigBiped(mechRig(team), rampSwap([[ALLOY, { hl: SUIT.hl, base: SUIT.base, shade: SUIT.shade, deep: SUIT.deep }], [SUIT, { hl: GOLD.base, base: GOLD.shade, shade: GOLD.deep, deep: WOOD.deep }]]));
  return { ...r, body: omegaBody(false), hurtBody: omegaBody(true), bodyPivot: [20, 30], arm: omegaArm(), foot: machineFoot(SUIT), ankle: [6, 0] };
}

/** Pose set at boss scale; machine poses use their own animators. */
export const BOSS_TROOPS: TroopArt[] = [
  { id: 'boss_stone', rig: ograkNative, anims: (r) => humanoidAnims(r, 'swing', { weapon: 130, frontArm: -15 }, { roomyDeath: true }) },
  { id: 'boss_ancient', rig: bullNative, anims: (r) => humanoidAnims(r, 'thrust', { weapon: 60, frontArm: -40, offhand: 0 }, { roomyDeath: true }) },
  { id: 'boss_crusader', rig: baronNative, anims: (r) => humanoidAnims(r, 'swing', { weapon: 60, frontArm: -35, offhand: 0 }, { roomyDeath: true }) },
  { id: 'boss_gunpowder', rig: admiralNative, anims: (r) => humanoidAnims(r, 'shoot', { weapon: 40, frontArm: -30 }, { roomyDeath: true }), sfx: 'cannon' },
  { id: 'boss_industrial', rig: juggernautRig, anims: walkerAnims, sfx: 'steam' },
  { id: 'boss_future', rig: omegaRig, anims: mechAnims, sfx: 'zap_heavy' },
];

void PLASMA;
