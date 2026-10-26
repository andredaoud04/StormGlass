import type { Ramp } from '../palette';
import type { AnimSpec, RigParts } from '../rig';
import { humanoidAnims } from './anims';
import { bruteRig, clubberRig, slingerRig } from './stone';
import { archerRig, shieldwallRig, spearmanRig } from './ancient';
import { crossbowRig, footmanRig, knightRig } from './crusader';
import { musketeerRig, pikemanRig } from './gunpowder';
import { CANNON_FRAME, cannonAnims } from './vehicles';

export interface TroopArt {
  id: string;
  rig?: (team: Ramp) => RigParts;
  anims?: (r: RigParts) => AnimSpec[];
  /** For non-rig troops (vehicles): builds the sheet directly. */
  custom?: (team: Ramp) => { anims: AnimSpec[]; frameW: number; frameH: number; anchor: [number, number] };
  /** Where the projectile leaves, relative to the anchor (facing right), for ranged troops. */
  muzzle?: [number, number];
  projectile?: string;
}

export const STONE_TROOPS: TroopArt[] = [
  { id: 'stone_clubber', rig: clubberRig, anims: (r) => humanoidAnims(r, 'swing', { weapon: 120, frontArm: -10 }) },
  { id: 'stone_slinger', rig: slingerRig, anims: (r) => humanoidAnims(r, 'sling', { weapon: 10, frontArm: -10 }), muzzle: [6, -22], projectile: 'proj.stone' },
  { id: 'stone_brute', rig: bruteRig, anims: (r) => humanoidAnims(r, 'swing', { weapon: 130, frontArm: -15 }) },
];

export const ANCIENT_TROOPS: TroopArt[] = [
  { id: 'ancient_spearman', rig: spearmanRig, anims: (r) => humanoidAnims(r, 'thrust', { weapon: 4, frontArm: -25, offhand: 0, weaponBehind: true }) },
  { id: 'ancient_archer', rig: archerRig, anims: (r) => humanoidAnims(r, 'bow', { weapon: 25, frontArm: -5 }), muzzle: [8, -17], projectile: 'proj.arrow' },
  { id: 'ancient_guard', rig: shieldwallRig, anims: (r) => humanoidAnims(r, 'thrust', { weapon: 60, frontArm: -40, offhand: 0 }) },
];

export const CRUSADER_TROOPS: TroopArt[] = [
  { id: 'crusader_footman', rig: footmanRig, anims: (r) => humanoidAnims(r, 'swing', { weapon: 40, frontArm: -20, offhand: 0 }) },
  { id: 'crusader_crossbow', rig: crossbowRig, anims: (r) => humanoidAnims(r, 'shoot', { weapon: 150, frontArm: -10 }), muzzle: [10, -16], projectile: 'proj.arrow' },
  { id: 'crusader_knight', rig: knightRig, anims: (r) => humanoidAnims(r, 'swing', { weapon: 120, frontArm: -15, offhand: 0 }) },
];

export const GUNPOWDER_TROOPS: TroopArt[] = [
  { id: 'gunpowder_pikeman', rig: pikemanRig, anims: (r) => humanoidAnims(r, 'thrust', { weapon: 0, frontArm: -20, weaponBehind: true }) },
  { id: 'gunpowder_musketeer', rig: musketeerRig, anims: (r) => humanoidAnims(r, 'shoot', { weapon: 20, frontArm: -15 }), muzzle: [16, -18], projectile: 'proj.ball' },
  { id: 'gunpowder_cannon', custom: (team) => ({ anims: cannonAnims(team), frameW: CANNON_FRAME.w, frameH: CANNON_FRAME.h, anchor: CANNON_FRAME.anchor }) },
];

export const ALL_TROOPS: TroopArt[] = [...STONE_TROOPS, ...ANCIENT_TROOPS, ...CRUSADER_TROOPS, ...GUNPOWDER_TROOPS];

/** Build any troop's animations, frame size and anchor (feet on the ground). */
export function makeTroop(t: TroopArt, team: Ramp): { anims: AnimSpec[]; frameW: number; frameH: number; anchor: [number, number] } {
  if (t.custom) return t.custom(team);
  const r = t.rig!(team);
  return { anims: t.anims!(r), frameW: r.frameW, frameH: r.frameH, anchor: [r.hip[0], r.hip[1] + 4] };
}
