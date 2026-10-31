import type { BattleConfig, TroopKind, TroopStats } from '../sim/types';
import { BALANCE, ageDef, troopDef, type TroopDef } from './balance';

export function isBossStage(stage: number): boolean {
  return stage === BALANCE.campaign.stagesPerAge - 1;
}

/** Boss troop for an Age, scaled from that Age's tank. */
export function bossStats(enemyAge: number, mul: number, goldMul = 1): TroopStats {
  const age = ageDef(enemyAge);
  const info = BALANCE.bosses[age.id];
  const tank = age.troops.find((t) => t.kind === 'tank')!;
  const { name: _n, hpMul, dmgMul, interval, range, speed, ...def } = info;
  return {
    id: `boss_${age.id}`,
    kind: 'tank',
    cost: 0,
    hp: Math.round(tank.hp * hpMul * mul),
    dmg: Math.round(tank.dmg * dmgMul * mul),
    interval,
    range,
    speed,
    tank: true,
    boss: true,
    bossDef: { ...def, gold: Math.round(def.gold * goldMul) },
  };
}

export interface BattleSetupInput {
  seed: number;
  /** Troop ids in the player's 3 slots. */
  loadout: string[];
  /** Enemy Age index (0 = Stone). */
  enemyAge: number;
  /** Stage within the Age, 0-based. The last stage is the boss stage. Default 0. */
  stage?: number;
  /** Player army Age index; sets the player base HP. */
  armyAge: number;
  timeline: number;
  foodRateMilli?: number;
  /** Fortress HP multiplier from upgrades. */
  fortressMul?: number;
  /** Troop HP and damage multiplier from upgrades, for every troop. */
  powerMul?: number;
  /** Extra HP and damage multiplier per troop kind (Age Camp). */
  kindMul?: Partial<Record<TroopKind, number>>;
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
  const c = b.campaign;
  const stage = Math.max(0, Math.min(c.stagesPerAge - 1, input.stage ?? 0));
  const timelineMul = 1 + b.timeline.enemyStatPerTimeline * tl;
  const enemyMul = (enemy.enemyPower ?? b.timeline.enemyPower) * timelineMul * c.stagePower[stage];
  const enemyTroops = {} as Record<TroopKind, TroopStats>;
  for (const t of enemy.troops) enemyTroops[t.kind] = troopStats(t, enemyMul, enemyMul);
  const power = input.powerMul ?? 1;
  const kindMul = (k: TroopKind) => power * (input.kindMul?.[k] ?? 1);
  const goldMul = Math.pow(b.timeline.goldGrowthPerTimeline, tl);
  return {
    seed: input.seed,
    tickRate: b.sim.tickRate,
    laneLength: b.sim.laneLength,
    spawnOffset: b.sim.spawnOffset,
    maxUnitsPerSide: b.sim.maxUnitsPerSide,
    projectileSpeed: b.sim.projectileSpeed,
    foodRateMilli: input.foodRateMilli ?? Math.round(ageDef(input.armyAge).foodRate * 1000),
    playerBaseHp: Math.round(ageDef(input.armyAge).fortressHp * b.economy.playerBaseHpMul * (input.fortressMul ?? 1)),
    enemyBaseHp: Math.round(enemy.fortressHp * (1 + b.timeline.enemyFortressPerTimeline * tl) * c.stageFortress[stage]),
    playerTroops: input.loadout.slice(0, 3).map((id) => {
      const d = troopDef(id);
      return troopStats(d, kindMul(d.kind), kindMul(d.kind));
    }),
    enemyTroops,
    wave: b.waves[enemy.id],
    waveSpeed: (1 + b.timeline.spawnSpeedPerTimeline * tl) * c.stagePace[stage],
    goldEnabled: input.campaign ?? true,
    goldPerKill: b.economy.goldPerKill,
    goldPerTankKill: b.economy.goldPerTankKill,
    baseGoldTotal: Math.round(enemy.baseGold * goldMul),
    baseGoldSteps: b.economy.baseGoldSteps,
    status: b.status,
    boss: isBossStage(stage) ? bossStats(input.enemyAge, timelineMul, goldMul) : undefined,
  };
}
