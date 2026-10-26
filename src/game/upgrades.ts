/** Army upgrades bought with Gold. Curves live in balance.json; this file only applies them. */
import { BALANCE, type UpgradeId } from './balance';
import type { SaveData } from './save';

export const UPGRADE_IDS: UpgradeId[] = ['food', 'fortress', 'power'];

export function level(s: SaveData, id: UpgradeId): number {
  return s.upgrades[id] ?? 0;
}

/** Gold to buy the next level, or null at max level. */
export function upgradeCost(s: SaveData, id: UpgradeId): number | null {
  const u = BALANCE.upgrades[id];
  const lv = level(s, id);
  if (lv >= u.maxLevel) return null;
  return Math.round(u.baseCost * Math.pow(u.costGrowth, lv));
}

export function buyUpgrade(s: SaveData, id: UpgradeId): boolean {
  const c = upgradeCost(s, id);
  if (c === null || s.gold < c) return false;
  s.gold -= c;
  s.upgrades[id] = level(s, id) + 1;
  return true;
}

/** Player Food income in milli-Food per second. Stone base is exactly 1 Food/s. */
export function foodRateMilli(s: SaveData): number {
  return Math.round(1000 + level(s, 'food') * BALANCE.upgrades.food.perLevel * 1000);
}

export function fortressMul(s: SaveData): number {
  return 1 + level(s, 'fortress') * BALANCE.upgrades.fortress.perLevel;
}

export function powerMul(s: SaveData): number {
  return 1 + level(s, 'power') * BALANCE.upgrades.power.perLevel;
}

/** Display value of an upgrade at a level, e.g. "1.3/S" or "x1.4". */
export function upgradeValue(id: UpgradeId, lv: number): string {
  const u = BALANCE.upgrades[id];
  const v = id === 'food' ? 1 + lv * u.perLevel : 1 + lv * u.perLevel;
  const t = (Math.round(v * 100) / 100).toString();
  return id === 'food' ? `${t}/S` : `x${t}`;
}
