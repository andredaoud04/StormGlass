import type { BattleConfig, TroopKind, TroopStats } from '../sim/types';
import { BALANCE, ageDef, troopDef, type TroopDef } from './balance';

export interface BattleSetupInput {
  seed: number;
  /** Troop ids in the player's 3 slots. */
  loadout: string[];
  /** Enemy Age index (0 = Stone). */
  enemyAge: number;
  /** Player army Age index; sets the player base HP. */
  armyAge: number;
  timeline: number;
  foodRateMilli?: number;
  /** Fortress HP multiplier from upgrades. */
  fortressMul?: number;
  /** Troop HP and damage multiplier from upgrades. */
  powerMul?: number;
  campaign?: boolean;
}

export function troopStats(d: TroopDef, hpMul = 1, dmgMul = 1): TroopStats {
  return {
    id: d.id,
    kind: d.kind,
    cost: d.cost,
    hp: Math.round(d.hp * hpMul),
    dmg: Math.round(d.dmg * dmgMul),
    interval: d.interval,
    range: d.range,
    speed: d.speed,
    tank: d.kind === 'tank',
  };
}

export function buildBattleConfig(input: BattleSetupInput): BattleConfig {
  const b = BALANCE;
  const enemy = ageDef(input.enemyAge);
  const tl = Math.max(1, input.timeline) - 1;
  const enemyMul = (enemy.enemyPower ?? b.timeline.enemyPower) * (1 + b.timeline.enemyStatPerTimeline * tl);
  const enemyTroops = {} as Record<TroopKind, TroopStats>;
  for (const t of enemy.troops) enemyTroops[t.kind] = troopStats(t, enemyMul, enemyMul);
  return {
    seed: input.seed,
    tickRate: b.sim.tickRate,
    laneLength: b.sim.laneLength,
    spawnOffset: b.sim.spawnOffset,
    maxUnitsPerSide: b.sim.maxUnitsPerSide,
    projectileSpeed: b.sim.projectileSpeed,
    foodRateMilli: input.foodRateMilli ?? Math.round(ageDef(input.armyAge).foodRate * 1000),
    playerBaseHp: Math.round(ageDef(input.armyAge).fortressHp * b.economy.playerBaseHpMul * (input.fortressMul ?? 1)),
    enemyBaseHp: Math.round(enemy.fortressHp * (1 + b.timeline.enemyFortressPerTimeline * tl)),
    playerTroops: input.loadout.slice(0, 3).map((id) => troopStats(troopDef(id), input.powerMul ?? 1, input.powerMul ?? 1)),
    enemyTroops,
    wave: b.waves[enemy.id],
    waveSpeed: 1 + b.timeline.spawnSpeedPerTimeline * tl,
    goldEnabled: input.campaign ?? true,
    goldPerKill: b.economy.goldPerKill,
    goldPerTankKill: b.economy.goldPerTankKill,
    baseGoldTotal: enemy.baseGold,
    baseGoldSteps: b.economy.baseGoldSteps,
    status: b.status,
  };
}
