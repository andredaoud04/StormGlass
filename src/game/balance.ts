import raw from '../data/balance.json';
import type { BandRules, BossDef, CombatRules, StatusKind, StatusRules, TroopKind } from '../sim/types';

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
  traits?: { cleave?: number; pierce?: number; splash?: number; armor?: number; onHit?: StatusKind[] };
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

/** One stage's hand-made recipe: groups as "second:units" (m, r, t). The unit letters, in order, are the stage's wave recipe. */
export interface StageWave {
  groups: string;
}

export interface WaveStream {
  period: number;
  firstAt: number;
  clumpGap: number;
  baseSize: number;
  growth: number;
  maxWave: number;
  trickle: number;
  waves: number;
  stageSize: number[];
  /** Every bigEvery-th wave is a big wave, bigMul times the usual size; sizes vary by +-jitter per battle. */
  bigEvery: number;
  bigMul: number;
  jitter: number;
  /** From this wave on, waves grow by rampGrowth each, so no battle stalls forever. */
  /** The first wave that may be a big wave. */
  bigFrom: number;
  /** Past rampFrom, enemy troops also gain this share of HP and damage per wave. */
  enragePerWave: number;
  rampFrom: number;
  rampGrowth: number;
}

export interface SortieRules {
  thresholds: number[];
  sizes: number[];
  powerMul: number;
  gapSec: number;
  firstBattle: { thresholds: number[]; sizes: number[]; towerMul: number };
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
  sim: { tickRate: number; laneLength: number; spawnOffset: number; maxUnitsPerSide: number; projectileSpeed: number; band: BandRules };
  economy: { startingGold: number; killGold: number[]; tankKillMul: number; startFood: number; baseGoldSteps: number; playerBaseHpMul: number; slotUnlock: { ranged: number; tank: number }; tower: { dmgMul: number; range: number; intervalSec: number; enemyMul?: number }; redeploy: Record<'melee' | 'ranged' | 'tank', number>; daily: { wins: number; mul: number } };
  status: StatusRules;
  ages: AgeDef[];
  waves: Record<AgeId, StageWave[]> & { density: number[]; stream: WaveStream; sortie: SortieRules; rally: { thresholds: number[]; sizes: number[]; powerMul: number; gapSec: number; leash: number } };
  combat: CombatRules;
  upgrades: UpgradeRules;
  evolution: { cost: number[] };
  campaign: { stagesPerAge: number; stagePower: number[]; stageFortress: number[]; stagePace: number[]; fortressScale: number };
  bosses: Record<AgeId, BossInfo>;
  skills: { kitchen: { name: string; costMul: number; growth: number; perLevel: number; maxLevel: number; unlockStage: number }; stormcall: { name: string; dmgMul: number; radius: number; cooldownSec: number; firstReadySec: number; bossMul: number; unlockStage: number }; speedUnlockStage: number };
  meta: {
    survival: { unlockArmyAge: number; keysPerDay: number; gemsPerWave: number; recordGems: number; stage: number; enrageFrom: number; enragePerWave: number };
    cards: { perLevel: number; baseCost: number; costGrowth: number; maxLevel: number };
  };
  timeline: { enemyPower: number; enemyStatPerTimeline: number; enemyFortressPerTimeline: number; spawnSpeedPerTimeline: number; goldGrowthPerTimeline: number; star: { power: number; gold: number } };
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
