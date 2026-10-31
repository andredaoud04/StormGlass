/**
 * Gold upgrades in the We Are Warriors format: Food rate and Base HP. Both reset when you
 * Evolve (the new Age starts stronger). Ranged and Tank slots are bought once and kept forever.
 * Curves live in balance.json; this file only applies them.
 */
import { BALANCE, type UpgradeId } from './balance';
import type { SaveData } from './save';

export const UPGRADE_IDS: UpgradeId[] = ['food', 'fortress'];
export type SlotId = 'ranged' | 'tank';

export function level(s: SaveData, id: UpgradeId): number {
  return s.upgrades[id] ?? 0;
}

export function maxLevel(s: SaveData): number {
  const u = BALANCE.upgrades;
  return u.maxLevel + u.maxLevelPerTimeline * (Math.max(1, s.timeline) - 1);
}

export function hasSlot(s: SaveData, slot: SlotId): boolean {
  return s.slots.includes(slot);
}

/** Gold to buy the next level, or null at max level. */
export function upgradeCost(s: SaveData, id: UpgradeId): number | null {
  const u = BALANCE.upgrades;
  const lv = level(s, id);
  if (lv >= maxLevel(s)) return null;
  return Math.round(u.tracks[id].baseCost * Math.pow(u.ageCostGrowth, s.armyAge) * Math.pow(u.costGrowth, lv));
}

export function canBuy(s: SaveData, id: UpgradeId): boolean {
  const c = upgradeCost(s, id);
  return c !== null && s.gold >= c;
}

export function buyUpgrade(s: SaveData, id: UpgradeId): boolean {
  const c = upgradeCost(s, id);
  if (c === null || s.gold < c) return false;
  s.gold -= c;
  s.upgrades[id] = level(s, id) + 1;
  return true;
}

export function slotCost(slot: SlotId): number {
  return BALANCE.economy.slotUnlock[slot];
}

/** Ranged comes first, then Tank. */
export function canUnlockSlot(s: SaveData, slot: SlotId): boolean {
  if (hasSlot(s, slot)) return false;
  if (slot === 'tank' && !hasSlot(s, 'ranged')) return false;
  return s.gold >= slotCost(slot);
}

export function unlockSlot(s: SaveData, slot: SlotId): boolean {
  if (!canUnlockSlot(s, slot)) return false;
  s.gold -= slotCost(slot);
  s.slots.push(slot);
  return true;
}

export function trackMul(id: UpgradeId, lv: number): number {
  return 1 + lv * BALANCE.upgrades.tracks[id].perLevel;
}

/** Player Food income in milli-Food per second. Stone base is exactly 1 Food/s. */
export function foodRateMilli(s: SaveData): number {
  const base = BALANCE.ages[s.armyAge]?.foodRate ?? 1;
  return Math.round(base * trackMul('food', level(s, 'food')) * 1000);
}

export function fortressMul(s: SaveData): number {
  return trackMul('fortress', level(s, 'fortress'));
}

/** Display value of an upgrade at a level: Food in Food/s, Base as a multiplier. */
export function upgradeValue(s: SaveData, id: UpgradeId, lv: number): string {
  if (id === 'food') {
    const v = (BALANCE.ages[s.armyAge]?.foodRate ?? 1) * trackMul('food', lv);
    return `${Math.round(v * 100) / 100}/S`;
  }
  return `x${Math.round(trackMul(id, lv) * 100) / 100}`;
}

/** Number of things the player can buy right now (for the tab badge). */
export function affordableCount(s: SaveData): number {
  let n = 0;
  for (const id of UPGRADE_IDS) if (canBuy(s, id)) n++;
  for (const slot of ['ranged', 'tank'] as SlotId[]) if (canUnlockSlot(s, slot)) n++;
  return n;
}
