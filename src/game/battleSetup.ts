import type { BattleConfig, KitchenConfig, SkillConfig, TroopKind, TroopStats, WaveScript } from '../sim/types';
import { BALANCE, ageDef, troopDef, type TroopDef } from './balance';

const KIND: Record<string, TroopKind> = { m: 'melee', r: 'ranged', t: 'tank' };

/**
 * The enemy's spawn list for a stage, We Are Warriors style: an enemy on the lane from the first
 * second, a numbered wave every `period` seconds released as one clump (each bigger than the
 * last), and a trickle of single units between waves. Wave contents cycle through the stage's
 * hand-made recipe letters, so every stage keeps its own mix. Deterministic.
 */
export function stageWave(enemyAge: number, stage: number): WaveScript {
  const W = BALANCE.waves;
  const S = W.stream;
  const recipe = W[ageDef(enemyAge).id][stage].groups
    .trim()
    .split(/\s+/)
    .map((g) => g.split(':')[1])
    .join('');
  const density = W.density[enemyAge] ?? 1;
  const out: { t: number; k: TroopKind; wave: boolean }[] = [];
  let cursor = 0;
  const next = () => KIND[recipe[cursor++ % recipe.length]];
  for (let n = 0; n < S.waves; n++) {
    const t0 = S.firstAt + n * S.period;
    const size = Math.min(S.maxWave, Math.max(1, Math.round(S.baseSize * density * S.stageSize[stage] * Math.pow(S.growth, n))));
    for (let k = 0; k < size; k++) out.push({ t: Math.round((t0 + k * S.clumpGap) * 100) / 100, k: next(), wave: k === 0 });
    // Single units between waves keep the lane busy (melee first: they are the cheap pressure).
    for (let j = 1; j <= S.trickle; j++) out.push({ t: Math.round((t0 + (j * S.period) / (S.trickle + 1)) * 100) / 100, k: j % 2 ? 'melee' : next(), wave: false });
  }
  out.sort((a, b) => a.t - b.t);
  const lastStart = S.firstAt + (S.waves - 1) * S.period;
  const loopFrom = out.findIndex((o) => o.t >= lastStart);
  const waveStarts: number[] = [];
  out.forEach((o, i) => o.wave && waveStarts.push(i));
  return { spawns: out.map((o) => [o.t, o.k]), loopFrom, loopPeriod: S.period, waveStarts };
}

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
  /** Stormcall is unlocked for this player. */
  stormcall?: boolean;
  /** The in-battle Food upgrade is unlocked. */
  kitchen?: boolean;
}

export function troopStats(d: TroopDef, hpMul = 1, dmgMul = 1): TroopStats {
  const t = d.traits ?? {};
  return {
    ...(t.cleave ? { cleave: t.cleave } : {}),
    ...(t.pierce ? { pierce: t.pierce } : {}),
    ...(t.splash ? { splash: t.splash } : {}),
    ...(t.armor ? { armor: t.armor } : {}),
    ...(t.onHit ? { onHit: t.onHit } : {}),
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

export function kitchenConfig(loadout: string[]): KitchenConfig {
  const k = BALANCE.skills.kitchen;
  const cheapest = Math.min(...loadout.slice(0, 3).map((id) => troopDef(id).cost));
  return { baseCostMilli: Math.round(cheapest * k.costMul * 1000), growth: k.growth, perLevel: k.perLevel, maxLevel: k.maxLevel };
}

export function stormcallConfig(armyAge: number, mul: number): SkillConfig {
  const sk = BALANCE.skills.stormcall;
  const tank = ageDef(armyAge).troops.find((t) => t.kind === 'tank')!;
  const tr = BALANCE.sim.tickRate;
  return { dmg: Math.round(tank.dmg * sk.dmgMul * mul), radius: sk.radius, cooldownTicks: Math.round(sk.cooldownSec * tr), firstTicks: Math.round(sk.firstReadySec * tr), bossMul: sk.bossMul };
}

export function buildBattleConfig(input: BattleSetupInput): BattleConfig {
  const b = BALANCE;
  const enemy = ageDef(input.enemyAge);
  const tl = Math.max(1, input.timeline) - 1;
  const c = b.campaign;
  const stage = Math.max(0, Math.min(c.stagesPerAge - 1, input.stage ?? 0));
  const timelineMul = 1 + b.timeline.enemyStatPerTimeline * tl;
  const enemyMul = (enemy.enemyPower ?? b.timeline.enemyPower) * timelineMul * (enemy.stagePower ?? c.stagePower)[stage];
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
    band: b.sim.band,
    combat: b.combat,
    foodRateMilli: input.foodRateMilli ?? Math.round(ageDef(input.armyAge).foodRate * 1000),
    playerBaseHp: Math.round(ageDef(input.armyAge).fortressHp * b.economy.playerBaseHpMul * (input.fortressMul ?? 1)),
    enemyBaseHp: Math.round(enemy.fortressHp * (1 + b.timeline.enemyFortressPerTimeline * tl) * c.stageFortress[stage]),
    playerTroops: input.loadout.slice(0, 3).map((id) => {
      const d = troopDef(id);
      return troopStats(d, kindMul(d.kind), kindMul(d.kind));
    }),
    enemyTroops,
    wave: stageWave(input.enemyAge, stage),
    waveSpeed: (1 + b.timeline.spawnSpeedPerTimeline * tl) * c.stagePace[stage],
    goldEnabled: input.campaign ?? true,
    goldPerKill: Math.round(b.economy.killGold[input.enemyAge] * goldMul),
    goldPerTankKill: Math.round(b.economy.killGold[input.enemyAge] * b.economy.tankKillMul * goldMul),
    startFoodMilli: Math.min(...input.loadout.slice(0, 3).map((id) => troopDef(id).cost)) * b.economy.startFood * 1000,
    kitchen: input.kitchen ? kitchenConfig(input.loadout) : undefined,
    baseGoldTotal: Math.round(enemy.baseGold * goldMul),
    baseGoldSteps: b.economy.baseGoldSteps,
    status: b.status,
    boss: isBossStage(stage) ? bossStats(input.enemyAge, timelineMul, goldMul) : undefined,
    skill: input.stormcall ? stormcallConfig(input.armyAge, Math.max(kindMul('melee'), kindMul('ranged'), kindMul('tank'))) : undefined,
  };
}
