import type { Ramp } from '../palette';
import { weaponTip, type AnimSpec, type RigParts } from '../rig';
import { humanoidAnims } from './anims';
import { bruteRig, clubberRig, slingerRig } from './stone';
import { archerRig, shieldwallRig, spearmanRig } from './ancient';
import { crossbowRig, footmanRig, knightRig } from './crusader';
import { cannonAnims, cannonRig, musketeerRig, pikemanRig } from './gunpowder';
import { TEAM_BLUE } from '../palette';

/** Anything with a frame size and a hip point (humanoid rigs and machine rigs). */
export type Sized = Pick<RigParts, 'frameW' | 'frameH' | 'hip'>;

export interface TroopArt {
  id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rig: (team: Ramp) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  anims: (r: any) => AnimSpec[];
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

/** Later Ages keep the whole fallen body inside the frame. */
const ROOMY = { roomyDeath: true };

/** Muzzle for a gun-style troop: the weapon tip on the firing (recoil) frame. */
const aimed = (rig: (t: typeof TEAM_BLUE) => RigParts): [number, number] => weaponTip(rig(TEAM_BLUE), { body: [-2, 0], frontArm: -100, weapon: 80 });

export const CRUSADER_TROOPS: TroopArt[] = [
  { id: 'crusader_footman', rig: footmanRig, anims: (r) => humanoidAnims(r, 'swing', { weapon: 50, frontArm: -20, offhand: 0 }, ROOMY) },
  { id: 'crusader_crossbow', rig: crossbowRig, anims: (r) => humanoidAnims(r, 'shoot', { weapon: 75, frontArm: -45 }, ROOMY), muzzle: aimed(crossbowRig), projectile: 'proj.bolt' },
  { id: 'crusader_knight', rig: knightRig, anims: (r) => humanoidAnims(r, 'swing', { weapon: 60, frontArm: -35, offhand: 0 }, ROOMY) },
];

export const GUNPOWDER_TROOPS: TroopArt[] = [
  { id: 'gunpowder_pikeman', rig: pikemanRig, anims: (r) => humanoidAnims(r, 'thrust', { weapon: 4, frontArm: -25, weaponBehind: true }, ROOMY) },
  { id: 'gunpowder_musketeer', rig: musketeerRig, anims: (r) => humanoidAnims(r, 'shoot', { weapon: 40, frontArm: -30 }, ROOMY), muzzle: aimed(musketeerRig), projectile: 'proj.musket', muzzleFx: 'fx.muzzle,fx.gunsmoke' },
  { id: 'gunpowder_cannon', rig: cannonRig, anims: cannonAnims, portraitAt: [10, 14] },
];

export const ALL_TROOPS: TroopArt[] = [...STONE_TROOPS, ...ANCIENT_TROOPS, ...CRUSADER_TROOPS, ...GUNPOWDER_TROOPS];
