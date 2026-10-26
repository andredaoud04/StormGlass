import raw from '../data/balance.json';
import type { StatusRules, TroopKind, WaveScript } from '../sim/types';

export type AgeId = 'stone' | 'ancient' | 'crusader' | 'gunpowder' | 'industrial' | 'future';
export const AGE_IDS: AgeId[] = ['stone', 'ancient', 'crusader', 'gunpowder', 'industrial', 'future'];

export interface TroopDef {
  id: string;
  name: string;
  kind: TroopKind;
  cost: number;
  hp: number;
  dmg: number;
  interval: number;
  range: number;
  speed: number;
  unlockGold: number;
}

export interface AgeDef {
  id: AgeId;
  name: string;
  fortressHp: number;
  baseGold: number;
  /** Gold to evolve into this Age before its enemy fortress is beaten (then free). */
  evolveGold: number;
  troops: TroopDef[];
}

export type UpgradeId = 'food' | 'fortress' | 'power';
export interface UpgradeDef {
  name: string;
  icon: string;
  maxLevel: number;
  baseCost: number;
  costGrowth: number;
  /** Food: +food/s per level. Fortress and Power: +fraction per level. */
  perLevel: number;
  unit: string;
}

export interface Balance {
  version: number;
  sim: { tickRate: number; laneLength: number; spawnOffset: number; maxUnitsPerSide: number; projectileSpeed: number };
  economy: { startingGold: number; goldPerKill: number; goldPerTankKill: number; baseGoldSteps: number };
  status: StatusRules;
  ages: AgeDef[];
  waves: Record<AgeId, WaveScript>;
  upgrades: Record<UpgradeId, UpgradeDef>;
  timeline: { enemyPower: number; enemyStatPerTimeline: number; enemyFortressPerTimeline: number; spawnSpeedPerTimeline: number };
}

export const BALANCE = raw as unknown as Balance;

export function ageDef(index: number): AgeDef {
  const a = BALANCE.ages[index];
  if (!a) throw new Error(`No Age at index ${index}`);
  return a;
}

export function troopDef(id: string): TroopDef {
  for (const a of BALANCE.ages) for (const t of a.troops) if (t.id === id) return t;
  throw new Error(`Unknown troop ${id}`);
}

export function ageOfTroop(id: string): number {
  return BALANCE.ages.findIndex((a) => a.troops.some((t) => t.id === id));
}
