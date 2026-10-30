import type { Ramp } from '../palette';
import { weaponTip, type AnimSpec, type RigParts } from '../rig';
import { humanoidAnims } from './anims';
import { bruteRig, clubberRig, slingerRig } from './stone';
import { archerRig, shieldwallRig, spearmanRig } from './ancient';
import { crossbowRig, footmanRig, knightRig } from './crusader';
import { TEAM_BLUE } from '../palette';

export interface TroopArt {
  id: string;
  rig: (team: Ramp) => RigParts;
  anims: (r: RigParts) => AnimSpec[];
  /** Where the projectile leaves, relative to the anchor (facing right), for ranged troops. */
  muzzle?: [number, number];
  projectile?: string;
  /** Strip keys played at the muzzle when firing (comma separated), e.g. flash and smoke. */
  muzzleFx?: string;
  /** Top-left of the 32x28 card portrait crop in the first idle frame (default: centred on the head). */
  portraitAt?: [number, number];
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

/** Muzzle for a gun-style troop: the weapon tip while aimed level. */
const aimed = (rig: (t: typeof TEAM_BLUE) => RigParts): [number, number] => weaponTip(rig(TEAM_BLUE), { frontArm: -90, weapon: 90 });

export const CRUSADER_TROOPS: TroopArt[] = [
  { id: 'crusader_footman', rig: footmanRig, anims: (r) => humanoidAnims(r, 'swing', { weapon: 50, frontArm: -20, offhand: 0 }) },
  { id: 'crusader_crossbow', rig: crossbowRig, anims: (r) => humanoidAnims(r, 'shoot', { weapon: 75, frontArm: -45 }), muzzle: aimed(crossbowRig), projectile: 'proj.bolt' },
  { id: 'crusader_knight', rig: knightRig, anims: (r) => humanoidAnims(r, 'swing', { weapon: 60, frontArm: -35, offhand: 0 }) },
];

export const ALL_TROOPS: TroopArt[] = [...STONE_TROOPS, ...ANCIENT_TROOPS, ...CRUSADER_TROOPS];
