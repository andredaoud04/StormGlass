import type { BattleConfig, KitchenConfig, SkillConfig, SortieConfig, TroopKind, TroopStats, WaveScript } from '../sim/types';
import { BALANCE, ageDef, troopDef, type TroopDef } from './balance';

const KIND: Record<string, TroopKind> = { m: 'melee', r: 'ranged', t: 'tank' };

/** Small deterministic generator for per-battle variety (never Math.random). */
function seeded(seed: number): () => number {
  let a = (seed | 0) ^ 0x9e3779b9;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function recipeOf(enemyAge: number, stage: number): string {
  return BALANCE.waves[ageDef(enemyAge).id][stage].groups
    .trim()
    .split(/\s+/)
    .map((g) => g.split(':')[1])
    .join('');
}

/**
 * The enemy's spawn list for a stage, We Are Warriors style: an enemy on the lane from the first
 * second, a numbered wave every `period` seconds released as one clump (each bigger than the
 * last), and a trickle of single units between waves. Wave contents cycle through the stage's
 * hand-made recipe letters, so every stage keeps its own mix.
 *
 * The seed makes every battle a little different (D42): where the recipe starts, each wave's size
 * (+-jitter) and which waves are BIG waves (every bigEvery-th, bigMul times the size). The same
 * seed always gives the same script.
 */
export function stageWave(enemyAge: number, stage: number, seed = 0): WaveScript {
  const W = BALANCE.waves;
  const S = W.stream;
  const recipe = recipeOf(enemyAge, stage);
  const rnd = seeded(seed * 31 + enemyAge * 7 + stage);
  const density = W.density[enemyAge] ?? 1;
  const out: { t: number; k: TroopKind; wave: boolean }[] = [];
  let cursor = Math.floor(rnd() * recipe.length);
  const next = () => KIND[recipe[cursor++ % recipe.length]];
  const bigPhase = Math.floor(rnd() * S.bigEvery);
  const bigWaves: number[] = [];
  for (let n = 0; n < S.waves; n++) {
    const t0 = S.firstAt + n * S.period;
    // Battle 1 is the tutorial fight: no surges and no size swings until the late ramp.
    const calm = enemyAge === 0 && stage === 0 && n + 2 < S.rampFrom;
    const big = !calm && n + 1 >= S.bigFrom && (n + bigPhase) % S.bigEvery === S.bigEvery - 1;
    if (big) bigWaves.push(n + 1);
    const vary = n === 0 || calm ? 1 : 1 + (rnd() * 2 - 1) * S.jitter;
    // The cap lifts with the late ramp, so a stalled battle always ends.
    const cap = S.maxWave * Math.pow(S.rampGrowth, Math.max(0, n + 2 - S.rampFrom));
    const size = Math.min(Math.round(cap), Math.max(1, Math.round(S.baseSize * density * S.stageSize[stage] * Math.pow(S.growth, n) * Math.pow(S.rampGrowth, Math.max(0, n + 2 - S.rampFrom)) * vary * (big ? S.bigMul : 1))));
    for (let k = 0; k < size; k++) out.push({ t: Math.round((t0 + k * S.clumpGap) * 100) / 100, k: next(), wave: k === 0 });
    // Single units between waves keep the lane busy (melee first: they are the cheap pressure).
    for (let j = 1; j <= S.trickle; j++) out.push({ t: Math.round((t0 + (j * S.period) / (S.trickle + 1)) * 100) / 100, k: j % 2 ? 'melee' : next(), wave: false });
  }
  out.sort((a, b) => a.t - b.t);
  const lastStart = S.firstAt + (S.waves - 1) * S.period;
  const loopFrom = out.findIndex((o) => o.t >= lastStart);
  const waveStarts: number[] = [];
  out.forEach((o, i) => o.wave && waveStarts.push(i));
  return { spawns: out.map((o) => [o.t, o.k]), loopFrom, loopPeriod: S.period, waveStarts, bigWaves };
}

/** The garrison's counterattacks for a stage: who charges out at each fortress threshold. */
export function stageSortie(enemyAge: number, stage: number, seed: number, enemyTroops: Record<TroopKind, TroopStats>): SortieConfig {
  const R = BALANCE.waves.sortie;
  const first = enemyAge === 0 && stage === 0;
  const thresholds = first ? R.firstBattle.thresholds : R.thresholds;
  const sizes = first ? R.firstBattle.sizes : R.sizes;
  const recipe = recipeOf(enemyAge, stage);
  const rnd = seeded(seed * 17 + 5);
  let cursor = Math.floor(rnd() * recipe.length);
  const density = BALANCE.waves.density[enemyAge] ?? 1;
  const scale = Math.sqrt(density) * BALANCE.waves.stream.stageSize[stage];
  const hasTank = recipe.includes('t');
  const units = sizes.map((n, i) => {
    const size = Math.max(1, Math.round(n * scale));
    const list: TroopKind[] = [];
    // The last stand is led by a heavy, when this stage fields one.
    if (i === sizes.length - 1 && hasTank && !first) list.push('tank');
    while (list.length < size) list.push(KIND[recipe[cursor++ % recipe.length]]);
    return list;
  });
  const troops = {} as Record<TroopKind, TroopStats>;
  for (const k of Object.keys(enemyTroops) as TroopKind[]) {
    const t = enemyTroops[k];
    troops[k] = { ...t, hp: Math.round(t.hp * R.powerMul), dmg: Math.round(t.dmg * R.powerMul) };
  }
  return { thresholds, units, troops, gapTicks: Math.max(1, Math.round(R.gapSec * BALANCE.sim.tickRate)) };
}

/** Your garrison's rallies: clumps of the troop kinds you own, stronger than usual. */
export function playerRally(troops: TroopStats[], armyAge: number): SortieConfig {
  const R = BALANCE.waves.rally;
  const scale = Math.sqrt(BALANCE.waves.density[armyAge] ?? 1);
  const by = {} as Record<TroopKind, TroopStats>;
  const boost = (t: TroopStats): TroopStats => ({ ...t, hp: Math.round(t.hp * R.powerMul), dmg: Math.round(t.dmg * R.powerMul) });
  const melee = troops.find((t) => t.kind === 'melee') ?? troops[0];
  for (const k of ['melee', 'ranged', 'tank'] as TroopKind[]) by[k] = boost(troops.find((t) => t.kind === k) ?? melee);
  const kinds = troops.map((t) => t.kind);
  const units = R.sizes.map((n, i) => {
    const size = Math.max(1, Math.round(n * scale));
    const list: TroopKind[] = [];
    // A heavy leads when you own one; the rest alternate melee and ranged.
    if (kinds.includes('tank') && i > 0) list.push('tank');
    while (list.length < size) list.push(kinds.includes('ranged') && list.length % 3 === 2 ? 'ranged' : 'melee');
    return list;
  });
  return { thresholds: R.thresholds, units, troops: by, gapTicks: Math.max(1, Math.round(R.gapSec * BALANCE.sim.tickRate)), leash: R.leash };
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
  /** Extra Gold multiplier (Prestige Stars, daily bonus). */
  goldBonus?: number;
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
  const goldMul = Math.pow(b.timeline.goldGrowthPerTimeline, tl) * (input.goldBonus ?? 1);
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
    enemyBaseHp: Math.round(enemy.fortressHp * (1 + b.timeline.enemyFortressPerTimeline * tl) * c.stageFortress[stage] * c.fortressScale),
    playerTroops: input.loadout.slice(0, 3).map((id) => {
      const d = troopDef(id);
      return { ...troopStats(d, kindMul(d.kind), kindMul(d.kind)), redeployTicks: Math.round(b.economy.redeploy[d.kind] * b.sim.tickRate) };
    }),
    enemyTroops,
    wave: stageWave(input.enemyAge, stage, input.seed),
    sortie: stageSortie(input.enemyAge, stage, input.seed, enemyTroops),
    enrage: { fromWave: b.waves.stream.rampFrom, perWave: b.waves.stream.enragePerWave },
    rally: playerRally(input.loadout.slice(0, 3).map((id) => troopStats(troopDef(id), kindMul(troopDef(id).kind), kindMul(troopDef(id).kind))), input.armyAge),
    towers: [
      { dmg: Math.round(ageDef(input.armyAge).troops.find((t) => t.kind === 'melee')!.dmg * b.economy.tower.dmgMul * (input.fortressMul ?? 1)), range: b.economy.tower.range, intervalTicks: Math.round(b.economy.tower.intervalSec * b.sim.tickRate) },
      { dmg: Math.round(enemyTroops.melee.dmg * b.economy.tower.dmgMul * (b.economy.tower.enemyMul ?? 1) * (input.enemyAge === 0 && stage === 0 ? b.waves.sortie.firstBattle.towerMul : 1)), range: b.economy.tower.range, intervalTicks: Math.round(b.economy.tower.intervalSec * b.sim.tickRate) },
    ],
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
