import type { BattleConfig, SkillConfig, TroopKind, TroopStats, WaveScript } from '../sim/types';
import { BALANCE, ageDef, troopDef, type TroopDef } from './balance';

const KIND: Record<string, TroopKind> = { m: 'melee', r: 'ranged', t: 'tank' };

/** Repeat a group's pattern (e.g. "mr") out to `count` units: "mrmrm". */
function grow(units: string, count: number): string {
  let out = '';
  for (let i = 0; i < count; i++) out += units[i % units.length];
  return out;
}

/**
 * Expand a stage's hand-made groups into the sim's spawn list. Later Ages field bigger enemy
 * armies (waves.density), and every repeat of the tail is a new, larger wave (waves.escalation)
 * until the last expanded wave, which then repeats.
 */
export function stageWave(enemyAge: number, stage: number): WaveScript {
  const W = BALANCE.waves;
  const w = W[ageDef(enemyAge).id][stage];
  const density = W.density[enemyAge] ?? 1;
  const esc = W.escalation;
  const groups = w.groups.trim().split(/\s+/).map((g) => {
    const [t, units] = g.split(':');
    return { t: Number(t), units };
  });
  const out: { t: number; k: TroopKind; wave: boolean }[] = [];
  const emit = (t: number, units: string, count: number, first: boolean) => {
    // Bigger groups walk out faster so a group never runs into the next one.
    const gap = Math.min(W.groupGap, 7 / Math.max(1, count));
    const pattern = grow(units, count);
    [...pattern].forEach((u, k) => out.push({ t: Math.round((t + k * gap) * 100) / 100, k: KIND[u], wave: first && k === 0 }));
  };
  groups.forEach((g, gi) => emit(g.t, g.units, Math.max(1, Math.round(g.units.length * density)), gi === 0));
  const tail = groups.slice(w.loopFrom);
  let lastStart = 0;
  for (let c = 1; c <= esc.expandWaves; c++) {
    const extra = Math.min(esc.maxExtra, Math.round(esc.perWave * c * density));
    tail.forEach((g, gi) => {
      const t = g.t + c * w.loopPeriod;
      if (gi === 0) lastStart = t;
      emit(t, g.units, Math.max(1, Math.round(g.units.length * density)) + extra, gi === 0);
    });
  }
  out.sort((a, b) => a.t - b.t);
  const loopFrom = out.findIndex((o) => o.t >= lastStart);
  const waveStarts: number[] = [];
  out.forEach((o, i) => o.wave && waveStarts.push(i));
  return { spawns: out.map((o) => [o.t, o.k]), loopFrom, loopPeriod: w.loopPeriod, waveStarts };
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
    goldPerKill: b.economy.goldPerKill,
    goldPerTankKill: b.economy.goldPerTankKill,
    baseGoldTotal: Math.round(enemy.baseGold * goldMul),
    baseGoldSteps: b.economy.baseGoldSteps,
    status: b.status,
    boss: isBossStage(stage) ? bossStats(input.enemyAge, timelineMul, goldMul) : undefined,
    skill: input.stormcall ? stormcallConfig(input.armyAge, Math.max(kindMul('melee'), kindMul('ranged'), kindMul('tank'))) : undefined,
  };
}
