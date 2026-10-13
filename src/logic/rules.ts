import type { PlayerProfile } from '../types/game';

export type BattleMode = 'campaign' | 'rush' | 'legends' | 'bosses' | 'survival' | 'hell';

export interface DungeonEntryOptions {
  survivalWave?: number;
  freeLegendsRetry?: boolean;
}

/** The key is charged once on entry, never when rewards are claimed. */
export function dungeonEntryKeyCost(type: BattleMode, options?: DungeonEntryOptions): 0 | 1 {
  if (type === 'campaign' || type === 'hell') return 0;
  if (type === 'survival' && (options?.survivalWave || 1) > 1) return 0;
  if (type === 'legends' && options?.freeLegendsRetry) return 0;
  return 1;
}

/** Campaign Gold is earned by fighting, then bonuses are applied once to the total. */
export function campaignGoldPayout(rawKillGold: number, coinBonus: number, enemyBaseDestroyed = false): number {
  const eligible = Math.max(0, Number.isFinite(rawKillGold) ? rawKillGold : 0);
  const multiplier = 1 + Math.max(0, Number.isFinite(coinBonus) ? coinBonus : 0);
  const baseReward = enemyBaseDestroyed ? 10 : 0; // Existing provisional base destruction award.
  return Math.round((eligible + baseReward) * multiplier);
}

/** Legends Rune Points are first-clear rewards, not repeatable chapter-farming rewards. */
export function settleLegendsFirstClear(profile: PlayerProfile, chapter: number): PlayerProfile {
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > 4) return profile;
  const alreadyClaimed = profile.legendsClaimedChapterIds.includes(chapter);
  return {
    ...profile,
    runePoints: profile.runePoints + (alreadyClaimed ? 0 : 1),
    legendsChapter: Math.min(4, Math.max(profile.legendsChapter, chapter + 1)),
    legendsClaimedChapterIds: alreadyClaimed
      ? profile.legendsClaimedChapterIds
      : [...profile.legendsClaimedChapterIds, chapter],
  };
}

export const DAILY_CRATE_GEMS = 25;
export const DAILY_CRATE_KEYS = 1;

export function utcDateKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function isDailyCrateClaimed(profile: Pick<PlayerProfile, 'lastDailyClaimDate'>, todayUtc: string): boolean {
  return profile.lastDailyClaimDate === todayUtc;
}

/** Daily crate (1.6.4 / 1.5.9): +25 Gems, +1 Key, once per UTC date. Never grants Gold. */
export function claimDailyCrate(profile: PlayerProfile, todayUtc: string): PlayerProfile {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(todayUtc) || isDailyCrateClaimed(profile, todayUtc)) return profile;
  return {
    ...profile,
    gems: profile.gems + DAILY_CRATE_GEMS,
    keys: profile.keys + DAILY_CRATE_KEYS,
    lastDailyClaimDate: todayUtc,
  };
}

/** Milliseconds until the next UTC midnight, when the next crate becomes claimable. */
export function msUntilNextUtcDay(now: Date = new Date()): number {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(0, next - now.getTime());
}
