/**
 * The meta game around the campaign: the daily bonus, Dungeon Keys, Survival and Cards.
 * Pure rules: the day number is passed in, never read from the clock here.
 */
import { BALANCE } from './balance';
import { buildBattleConfig } from './battleSetup';
import { heroUnlocked, hornUnlocked, loadout } from './progress';
import type { SaveData } from './save';
import { foodRateMilli, fortressMul, starPower } from './upgrades';
import type { BattleConfig, TroopKind } from '../sim/types';

export const CARD_KINDS: TroopKind[] = ['melee', 'ranged', 'tank'];

/** Day number in the player's own time zone. */
export function dayOf(nowMs: number, tzOffsetMin = 0): number {
  return Math.floor((nowMs - tzOffsetMin * 60000) / 86400000);
}

/** Start a new day's counters when the day has changed. */
export function rollDay(s: SaveData, day: number): void {
  if (s.daily.day !== day) s.daily = { day, wins: 0, keysUsed: 0 };
}

/** Campaign victories still paying the daily bonus today. */
export function dailyLeft(s: SaveData, day: number): number {
  const used = s.daily.day === day ? s.daily.wins : 0;
  return Math.max(0, BALANCE.economy.daily.wins - used);
}

/**
 * Extra Gold for a campaign victory under the daily bonus. Counts the win; call once per victory.
 */
export function claimDaily(s: SaveData, day: number, gold: number): number {
  rollDay(s, day);
  if (s.daily.wins >= BALANCE.economy.daily.wins) return 0;
  s.daily.wins++;
  const bonus = Math.round(gold * (BALANCE.economy.daily.mul - 1));
  s.gold += bonus;
  s.stats.goldEarned += bonus;
  return bonus;
}

// ---------- Cards ----------

export function cardLevel(s: SaveData, kind: TroopKind): number {
  return s.cards[kind] ?? 0;
}

/** Troop HP and damage multiplier from a Card. */
export function cardMul(s: SaveData, kind: TroopKind): number {
  return 1 + BALANCE.meta.cards.perLevel * cardLevel(s, kind);
}

/** Gems for the next Card level, or null at the maximum. */
export function cardCost(s: SaveData, kind: TroopKind): number | null {
  const c = BALANCE.meta.cards;
  const lv = cardLevel(s, kind);
  return lv >= c.maxLevel ? null : Math.round(c.baseCost * Math.pow(c.costGrowth, lv));
}

export function buyCard(s: SaveData, kind: TroopKind): boolean {
  const c = cardCost(s, kind);
  if (c === null || s.gems < c) return false;
  s.gems -= c;
  s.cards[kind] = cardLevel(s, kind) + 1;
  return true;
}

export function cardsAffordable(s: SaveData): number {
  return CARD_KINDS.filter((k) => {
    const c = cardCost(s, k);
    return c !== null && s.gems >= c;
  }).length;
}

/** Card multipliers for every kind, for the battle builder. */
export function cardMuls(s: SaveData): Record<TroopKind, number> {
  return { melee: cardMul(s, 'melee'), ranged: cardMul(s, 'ranged'), tank: cardMul(s, 'tank') };
}

// ---------- Survival ----------

export function survivalUnlocked(s: SaveData): boolean {
  return s.prestige > 0 || s.armyAge >= BALANCE.meta.survival.unlockArmyAge;
}

export function keysLeft(s: SaveData, day: number): number {
  const used = s.daily.day === day ? s.daily.keysUsed : 0;
  return Math.max(0, BALANCE.meta.survival.keysPerDay - used);
}

/** Spend one Dungeon Key for today. */
export function useKey(s: SaveData, day: number): boolean {
  rollDay(s, day);
  if (keysLeft(s, day) <= 0) return false;
  s.daily.keysUsed++;
  return true;
}

/**
 * A Survival run: your army against endless, growing waves of your own Age. The enemy fortress
 * cannot be hurt; the run ends when yours falls. No Gold (Locked Rule 5).
 */
export function survivalConfig(s: SaveData, seed: number): BattleConfig {
  const m = BALANCE.meta.survival;
  const cfg = buildBattleConfig({
    seed,
    loadout: loadout(s),
    enemyAge: s.armyAge,
    stage: m.stage,
    armyAge: s.armyAge,
    timeline: s.timeline,
    foodRateMilli: foodRateMilli(s),
    fortressMul: fortressMul(s),
    powerMul: starPower(s),
    kindMul: cardMuls(s),
    campaign: false,
    stormcall: true,
    kitchen: true,
    horn: hornUnlocked(s),
    hero: heroUnlocked(s),
  });
  return { ...cfg, endless: true, sortie: undefined, enrage: { fromWave: m.enrageFrom, perWave: m.enragePerWave } };
}

/** Gems for a finished Survival run; also records a new best. Call once per run. */
export function applySurvival(s: SaveData, waves: number): { gems: number; record: boolean } {
  const m = BALANCE.meta.survival;
  const record = waves > s.survivalBest;
  const gems = Math.max(0, waves) * m.gemsPerWave + (record ? m.recordGems : 0);
  if (record) s.survivalBest = waves;
  s.gems += gems;
  s.stats.battles++;
  return { gems, record };
}
