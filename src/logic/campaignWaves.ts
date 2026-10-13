import type { AgeDef, AgeId, UnitDef, UnitRole } from '../types/game';

type WaveRole = Extract<UnitRole, 'melee' | 'ranged' | 'tank'>;

/**
 * WBS 1.1.4: each Age has an enemy-order list, and a campaign battle sends
 * order length + min(3, Timeline − 1) enemies, then stops. Extra Timeline
 * enemies repeat the order from the start.
 *
 * MODEL values (not owner-locked). Lengths/compositions were chosen with
 * scripts/campaignPacing.ts so a fresh Stone save can win Battle 1 by
 * deploying Clubbers (~60s) and every stage stays winnable with the
 * existing upgrade prices. Re-run that script after changing them.
 */
const STANDARD_ORDER: WaveRole[] = ['melee', 'melee', 'melee', 'ranged', 'melee'];

export const CAMPAIGN_ENEMY_ORDER: Record<AgeId, WaveRole[]> = {
  stone: STANDARD_ORDER,
  ancient: STANDARD_ORDER,
  crusader: STANDARD_ORDER,
  gunpowder: STANDARD_ORDER,
  industrial: STANDARD_ORDER,
  future: STANDARD_ORDER,
};

export function campaignWaveSize(ageId: AgeId, timeline: number): number {
  const extra = Math.min(3, Math.max(0, Math.floor(timeline) - 1));
  return CAMPAIGN_ENEMY_ORDER[ageId].length + extra;
}

/** The exact enemies a campaign battle against this Age will send, in order. */
export function campaignEnemyWave(age: AgeDef, timeline: number): UnitDef[] {
  const order = CAMPAIGN_ENEMY_ORDER[age.id];
  const size = campaignWaveSize(age.id, timeline);
  const wave: UnitDef[] = [];
  for (let i = 0; i < size; i++) {
    const role = order[i % order.length];
    const unit = age.units.find((u) => u.role === role) ?? age.units[0];
    wave.push(unit);
  }
  return wave;
}
