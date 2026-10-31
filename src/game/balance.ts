import raw from '../data/balance.json';
import type { BossDef, StatusRules, TroopKind } from '../sim/types';

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
}

export interface AgeDef {
  id: AgeId;
  name: string;
  fortressHp: number;
  /** Base Food income (Food/s) for an army of this Age, before upgrades. Stone is locked at 1. */
  foodRate: number;
  baseGold: number;
  /** Enemy troop strength at this stage on Timeline 1 (x troop stats). Grows per stage so progress needs upgrades. */
  enemyPower?: number;
  /** Enemy strength by stage in this Age (overrides campaign.stagePower). Tuned so each stage needs a few more upgrade levels. */
  stagePower?: number[];
  troops: TroopDef[];
}

/** Gold upgrades (We Are Warriors format). Levels reset on Evolution. */
export type UpgradeId = 'food' | 'fortress';
export interface UpgradeTrack {
  name: string;
  icon: string;
  baseCost: number;
  /** Fraction added per level (Food: x Food rate; Base: x fortress HP). */
  perLevel: number;
  unit: string;
}

export interface UpgradeRules {
  maxLevel: number;
  /** Extra max levels per Timeline after the first. */
  maxLevelPerTimeline: number;
  costGrowth: number;
  ageCostGrowth: number;
  tracks: Record<UpgradeId, UpgradeTrack>;
}

/** One stage's hand-made wave: groups as "second:units" (m, r, t), e.g. "8:mm 20:mr". */
export interface StageWave {
  groups: string;
  /** Index of the first group in the repeating tail. */
  loopFrom: number;
  loopPeriod: number;
}

export interface BossInfo extends Omit<BossDef, 'move'> {
  name: string;
  move: BossDef['move'];
  hpMul: number;
  dmgMul: number;
  interval: number;
  range: number;
  speed: number;
}

export interface Balance {
  version: number;
  sim: { tickRate: number; laneLength: number; spawnOffset: number; maxUnitsPerSide: number; projectileSpeed: number };
  economy: { startingGold: number; goldPerKill: number; goldPerTankKill: number; baseGoldSteps: number; playerBaseHpMul: number; slotUnlock: { ranged: number; tank: number } };
  status: StatusRules;
  ages: AgeDef[];
  waves: Record<AgeId, StageWave[]> & { groupGap: number };
  upgrades: UpgradeRules;
  evolution: { cost: number[] };
  campaign: { stagesPerAge: number; stagePower: number[]; stageFortress: number[]; stagePace: number[] };
  bosses: Record<AgeId, BossInfo>;
  skills: { stormcall: { name: string; dmgMul: number; radius: number; cooldownSec: number; firstReadySec: number; bossMul: number; unlockStage: number }; speedUnlockStage: number };
  timeline: { enemyPower: number; enemyStatPerTimeline: number; enemyFortressPerTimeline: number; spawnSpeedPerTimeline: number; goldGrowthPerTimeline: number };
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
