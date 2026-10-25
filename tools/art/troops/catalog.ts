import type { Ramp } from '../palette';
import type { AnimSpec, RigParts } from '../rig';
import { humanoidAnims } from './anims';
import { bruteRig, clubberRig, slingerRig } from './stone';

export interface TroopArt {
  id: string;
  rig: (team: Ramp) => RigParts;
  anims: (r: RigParts) => AnimSpec[];
  /** Where the projectile leaves, relative to the anchor (facing right), for ranged troops. */
  muzzle?: [number, number];
  projectile?: string;
}

export const STONE_TROOPS: TroopArt[] = [
  { id: 'stone_clubber', rig: clubberRig, anims: (r) => humanoidAnims(r, 'swing', { weapon: 120, frontArm: -10 }) },
  { id: 'stone_slinger', rig: slingerRig, anims: (r) => humanoidAnims(r, 'sling', { weapon: 10, frontArm: -10 }), muzzle: [6, -22], projectile: 'proj.stone' },
  { id: 'stone_brute', rig: bruteRig, anims: (r) => humanoidAnims(r, 'swing', { weapon: 130, frontArm: -15 }) },
];
