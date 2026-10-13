import type { AgeDef, AgeId, UnitDef, UnitRole } from '../types/game';

type WaveRole = Extract<UnitRole, 'melee' | 'ranged' | 'tank'>;

/**
 * WBS 1.1.4: each Age has an enemy-order list, and a campaign battle sends
 * order length + min(3, Timeline − 1) enemies, then stops. Extra Timeline
 * enemies repeat the order from the start.
 *
 * MODEL values (not owner-locked), checked with scripts/campaignPacing.ts:
 * - Stone sends no tank so a fresh save can win Battle 1 with Clubbers (~67s).
 * - Later Ages close each wave with a tank, so the locked +5 tank-kill Gold
 *   exists in campaign.
 * Stages 2–6 are only winnable with the documented later-Age Food costs
 * (6/9/14 … 10/16/23); with the old 15/28/52+ table no Ancient-or-later army
 * can win a battle. Re-run the pacing script after changing either.
 */
const STONE_ORDER: WaveRole[] = ['melee', 'melee', 'melee', 'ranged', 'melee'];
const LATER_ORDER: WaveRole[] = ['melee', 'melee', 'melee', 'ranged', 'tank'];

export const CAMPAIGN_ENEMY_ORDER: Record<AgeId, WaveRole[]> = {
  stone: STONE_ORDER,
  ancient: LATER_ORDER,
  crusader: LATER_ORDER,
  gunpowder: LATER_ORDER,
  industrial: LATER_ORDER,
  future: LATER_ORDER,
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
