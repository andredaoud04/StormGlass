/**
 * Age Camp: five upgrade tracks bought with Gold. Levels reset on Evolution, so prices start low
 * again in every Age. Slot unlocks (Ranged, Tank) are bought once and kept forever.
 * Curves live in balance.json; this file only applies them.
 */
import type { TroopKind } from '../sim/types';
import { BALANCE, type CampId } from './balance';
import type { SaveData } from './save';

export const CAMP_IDS: CampId[] = ['food', 'fortress', 'melee', 'ranged', 'tank'];
export type SlotId = 'ranged' | 'tank';

export function level(s: SaveData, id: CampId): number {
  return s.camp[id] ?? 0;
}

export function maxLevel(s: SaveData): number {
  const c = BALANCE.camp;
  return c.maxLevel + c.maxLevelPerTimeline * (Math.max(1, s.timeline) - 1);
}

export function hasSlot(s: SaveData, slot: SlotId): boolean {
  return s.slots.includes(slot);
}

/** A troop track can only be trained once its slot is unlocked. */
export function trackOpen(s: SaveData, id: CampId): boolean {
  return id === 'ranged' || id === 'tank' ? hasSlot(s, id) : true;
}

/** Gold to buy the next level, or null at max level. */
export function upgradeCost(s: SaveData, id: CampId): number | null {
  const c = BALANCE.camp;
  const lv = level(s, id);
  if (lv >= maxLevel(s)) return null;
  return Math.round(c.tracks[id].baseCost * Math.pow(c.ageCostGrowth, s.armyAge) * Math.pow(c.costGrowth, lv));
}

export function canBuy(s: SaveData, id: CampId): boolean {
  const c = upgradeCost(s, id);
  return trackOpen(s, id) && c !== null && s.gold >= c;
}

export function buyUpgrade(s: SaveData, id: CampId): boolean {
  const c = upgradeCost(s, id);
  if (c === null || !canBuy(s, id)) return false;
  s.gold -= c;
  s.camp[id] = level(s, id) + 1;
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

/** The track's multiplier at a level, e.g. 1.36 at level 3 of a 12% track. */
export function trackMul(id: CampId, lv: number): number {
  return 1 + lv * BALANCE.camp.tracks[id].perLevel;
}

/** Player Food income in milli-Food per second. Stone base is exactly 1 Food/s. */
export function foodRateMilli(s: SaveData): number {
  const base = BALANCE.ages[s.armyAge]?.foodRate ?? 1;
  return Math.round(base * trackMul('food', level(s, 'food')) * 1000);
}

export function fortressMul(s: SaveData): number {
  return trackMul('fortress', level(s, 'fortress'));
}

export function kindMul(s: SaveData): Record<TroopKind, number> {
  return { melee: trackMul('melee', level(s, 'melee')), ranged: trackMul('ranged', level(s, 'ranged')), tank: trackMul('tank', level(s, 'tank')) };
}

/** Display value of a track at a level, e.g. "x1.36". */
export function upgradeValue(id: CampId, lv: number): string {
  return `x${Math.round(trackMul(id, lv) * 100) / 100}`;
}

/** Number of things the player can buy right now (for the tab badge). */
export function affordableCount(s: SaveData): number {
  let n = 0;
  for (const id of CAMP_IDS) if (canBuy(s, id)) n++;
  for (const slot of ['ranged', 'tank'] as SlotId[]) if (canUnlockSlot(s, slot)) n++;
  return n;
}
