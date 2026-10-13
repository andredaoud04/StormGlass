import type { PlayerProfile } from '../types/game';
import { AGES } from '../data/gameData';

export interface Mission {
  id: string;
  text: string;
  rewardGems: number;
  progress: number;
  goal: number;
}

const RANGED_UNIT_IDS = new Set(AGES.flatMap((age) => age.units).filter((u) => u.role === 'ranged').map((u) => u.id));

/** Missions read real saved progress; Evolution's free melee troop must not count as a ranged unlock. */
export function getMissions(profile: PlayerProfile): Mission[] {
  return [
    { id: 'm2', text: 'Reach Food Level 2 or higher', rewardGems: 30, progress: profile.foodLevel, goal: 2 },
    { id: 'm3', text: 'Destroy 1 Enemy Fortress Base', rewardGems: 50, progress: profile.clearedEnemyStages.length, goal: 1 },
    {
      id: 'm4',
      text: 'Unlock Slinger or Archer in Upgrades',
      rewardGems: 40,
      progress: profile.unlockedTroopIds.filter((id) => RANGED_UNIT_IDS.has(id)).length,
      goal: 1,
    },
  ];
}

export function hasClaimableMission(profile: PlayerProfile): boolean {
  return getMissions(profile).some((m) => m.progress >= m.goal && !profile.claimedMissionIds.includes(m.id));
}

export function canSpinToday(profile: PlayerProfile, todayUtc = new Date().toISOString().slice(0, 10)): boolean {
  return profile.lastDailySpinDate !== todayUtc;
}
