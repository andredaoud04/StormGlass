/**
 * Stormglass battle simulation.
 *
 * Pure and deterministic: the same config, seed and command list always give the same battle.
 * It runs on a fixed tick (config.tickRate per second) and never reads the clock, the DOM or
 * Math.random. The renderer reads state and the per-tick `events` list; it never writes state.
 */
import { createRng, nextInt } from './rng';
import { damageUnit } from './damage';
import { applyStatus, slowFactor, tickStatus } from './status';
import {
  BASE_TARGET,
  NO_TARGET,
  type BattleConfig,
  type BattleState,
  type BossPhase,
  type Command,
  type Side,
  type TroopStats,
  type Unit,
} from './types';

/** Melee hits land this far into the attack interval (max 8 ticks), so animation can wind up. */
const WINDUP_FRACTION = 0.4;
const MAX_WINDUP_TICKS = 8;
/** A unit may target an enemy up to this far behind its own position (lane units). */
const BEHIND_SLACK = 20;

export function createBattle(config: BattleConfig): BattleState {
  return {
    config,
    rng: createRng(config.seed),
    tick: 0,
    foodMilli: 0,
    foodRemainder: 0,
    foodSpentMilli: 0,
    playerBaseHp: config.playerBaseHp,
    enemyBaseHp: config.enemyBaseHp,
    units: [],
    projectiles: [],
    nextId: 1,
    waveIndex: 0,
    result: null,
    gold: { kills: 0, tanks: 0, base: 0, boss: 0 },
    wardUp: !!config.boss,
    bossId: 0,
    bossSpawned: false,
    bossMilestonesPaid: 0,
    skillCooldown: config.skill?.firstTicks ?? 0,
    skillsUsed: 0,
    baseMilestonesPaid: 0,
    kills: 0,
    tankKills: 0,
    deployed: 0,
    events: [],
  };
}

export function totalGold(s: BattleState): number {
  return s.gold.kills + s.gold.tanks + s.gold.base + s.gold.boss;
}

export function food(s: BattleState): number {
  return Math.floor(s.foodMilli / 1000);
}

export function secondsElapsed(s: BattleState): number {
  return s.tick / s.config.tickRate;
}

/** Time in seconds of the n-th enemy spawn in the looping wave sequence. */
export function waveSpawnTime(config: BattleConfig, n: number): { time: number; kind: TroopStats['kind'] } {
  const { spawns, loopFrom, loopPeriod } = config.wave;
  let t: number;
  let idx: number;
  if (n < spawns.length) {
    idx = n;
    t = spawns[n][0];
  } else {
    const segLen = spawns.length - loopFrom;
    const k = n - spawns.length;
    const cycle = Math.floor(k / segLen) + 1;
    idx = loopFrom + (k % segLen);
    t = spawns[idx][0] + cycle * loopPeriod;
  }
  return { time: t / config.waveSpeed, kind: spawns[idx][1] };
}

function aliveCount(s: BattleState, side: Side): number {
  let n = 0;
  for (const u of s.units) if (u.alive && u.side === side) n++;
  return n;
}

function spawnUnit(s: BattleState, side: Side, def: TroopStats): Unit {
  const { laneLength, spawnOffset } = s.config;
  const x = side === 0 ? spawnOffset : laneLength - spawnOffset;
  const unit: Unit = {
    id: s.nextId++,
    side,
    def,
    x,
    prevX: x,
    depth: nextInt(s.rng, -3, 3),
    hp: def.hp,
    maxHp: def.hp,
    cooldown: 0,
    windup: -1,
    target: NO_TARGET,
    alive: true,
    deadTicks: 0,
    walking: true,
    poison: { stacks: 0, ticks: 0, dpsPerStack: 0 },
    burn: { ticks: 0, dps: 0 },
    cold: { stacks: 0, ticks: 0 },
  };
  s.units.push(unit);
  s.events.push({ type: 'spawn', id: unit.id, side });
  return unit;
}

function applyCommand(s: BattleState, cmd: Command): void {
  if (cmd.type === 'retreat') {
    s.result = 'retreat';
    s.events.push({ type: 'end', result: 'retreat' });
    return;
  }
  if (cmd.type === 'skill') {
    castStormcall(s);
    return;
  }
  const def = s.config.playerTroops[cmd.slot];
  if (!def) {
    s.events.push({ type: 'deployFail', slot: cmd.slot, reason: 'slot' });
    return;
  }
  const costMilli = def.cost * 1000;
  if (s.foodMilli < costMilli) {
    s.events.push({ type: 'deployFail', slot: cmd.slot, reason: 'food' });
    return;
  }
  if (aliveCount(s, 0) >= s.config.maxUnitsPerSide) {
    s.events.push({ type: 'deployFail', slot: cmd.slot, reason: 'cap' });
    return;
  }
  s.foodMilli -= costMilli;
  s.foodSpentMilli += costMilli;
  s.deployed++;
  spawnUnit(s, 0, def);
}

/** Lightning on the enemy closest to your fortress; everything within the radius is hit. */
function castStormcall(s: BattleState): void {
  const sk = s.config.skill;
  if (!sk) {
    s.events.push({ type: 'skillFail', reason: 'locked' });
    return;
  }
  if (s.skillCooldown > 0) {
    s.events.push({ type: 'skillFail', reason: 'cooldown' });
    return;
  }
  let target: Unit | null = null;
  for (const u of s.units) if (u.alive && u.side === 1 && (!target || u.x < target.x || (u.x === target.x && u.id < target.id))) target = u;
  if (!target) {
    // Nothing to strike: the charge is not spent.
    s.events.push({ type: 'skillFail', reason: 'target' });
    return;
  }
  const x = target.x;
  s.skillCooldown = sk.cooldownTicks;
  s.skillsUsed++;
  s.events.push({ type: 'skill', x, radius: sk.radius });
  const bolt: TroopStats = { id: 'stormcall', kind: 'ranged', cost: 0, hp: 0, dmg: sk.dmg, interval: 1, range: 0, speed: 0, tank: true };
  for (const u of s.units) {
    if (!u.alive || u.side !== 1 || Math.abs(u.x - x) > sk.radius) continue;
    hitUnit(s, 0, bolt, u, u.def.bossDef ? Math.round(sk.dmg * sk.bossMul) : sk.dmg, true);
  }
}

function distanceToBase(s: BattleState, u: Unit): number {
  return u.side === 0 ? s.config.laneLength - u.x : u.x;
}

/** Closest living enemy in front of `u` (or slightly behind), with its distance. */
function nearestEnemy(s: BattleState, u: Unit): { unit: Unit | null; dist: number } {
  let best: Unit | null = null;
  let bestDist = Infinity;
  const dir = u.side === 0 ? 1 : -1;
  for (const e of s.units) {
    if (!e.alive || e.side === u.side) continue;
    const ahead = (e.x - u.x) * dir;
    if (ahead < -BEHIND_SLACK) continue;
    const d = Math.abs(e.x - u.x);
    if (d < bestDist || (d === bestDist && best !== null && e.id < best.id)) {
      best = e;
      bestDist = d;
    }
  }
  return { unit: best, dist: bestDist };
}

function findUnit(s: BattleState, id: number): Unit | undefined {
  for (const u of s.units) if (u.id === id) return u;
  return undefined;
}

function damageBase(s: BattleState, side: Side, dmg: number, heavy: boolean): void {
  if (side === 1 && s.wardUp) {
    s.events.push({ type: 'wardHit', dmg });
    return;
  }
  if (side === 1) {
    s.enemyBaseHp = Math.max(0, s.enemyBaseHp - dmg);
    payBaseGold(s);
  } else {
    s.playerBaseHp = Math.max(0, s.playerBaseHp - dmg);
  }
  s.events.push({ type: 'baseHit', side, dmg, heavy });
}

/** Gold for each milestone of enemy base damage, paid exactly once each. */
function payBaseGold(s: BattleState): void {
  const { enemyBaseHp: maxHp, baseGoldSteps: steps, baseGoldTotal: total, goldEnabled } = s.config;
  if (!goldEnabled || steps <= 0) return;
  const lost = maxHp - s.enemyBaseHp;
  const reached = Math.min(steps, Math.floor((lost * steps) / maxHp + 1e-9));
  while (s.baseMilestonesPaid < reached) {
    const i = s.baseMilestonesPaid;
    const amount = Math.floor((total * (i + 1)) / steps) - Math.floor((total * i) / steps);
    s.baseMilestonesPaid++;
    if (amount > 0) {
      s.gold.base += amount;
      s.events.push({ type: 'gold', amount, reason: 'base', x: s.config.laneLength });
    }
  }
}

function hitUnit(s: BattleState, attackerSide: Side, attacker: TroopStats, target: Unit, dmg: number, ranged: boolean): void {
  if (!target.alive) return;
  s.events.push({ type: 'hit', target: target.id, side: target.side, dmg, x: target.x, heavy: attacker.kind === 'tank', ranged });
  if (attacker.onHit) for (const k of attacker.onHit) applyStatus(s, target, k, attacker.dmg);
  damageUnit(s, target, dmg, attackerSide);
}

function landAttack(s: BattleState, u: Unit): void {
  const def = u.def;
  if (def.kind === 'ranged') {
    // Ranged units fire a projectile at the swing's target (or the base).
    let targetX: number;
    let target = u.target;
    if (target === BASE_TARGET) {
      targetX = u.side === 0 ? s.config.laneLength : 0;
    } else {
      const t = findUnit(s, target);
      if (!t || !t.alive) {
        const n = nearestEnemy(s, u);
        if (!n.unit || n.dist > def.range) return;
        target = n.unit.id;
        targetX = n.unit.x;
      } else targetX = t.x;
    }
    const p = {
      id: s.nextId++,
      side: u.side,
      x: u.x,
      prevX: u.x,
      target,
      targetX,
      dmg: def.dmg,
      attackerDmg: def.dmg,
      onHit: def.onHit,
      done: false,
    };
    s.projectiles.push(p);
    s.events.push({ type: 'shoot', id: u.id, projectile: p.id });
    return;
  }
  if (u.target === BASE_TARGET) {
    if (distanceToBase(s, u) <= def.range) damageBase(s, u.side === 0 ? 1 : 0, def.dmg, def.kind === 'tank');
    return;
  }
  let t = findUnit(s, u.target);
  if (!t || !t.alive || Math.abs(t.x - u.x) > def.range + BEHIND_SLACK) {
    const n = nearestEnemy(s, u);
    t = n.unit && n.dist <= def.range ? n.unit : undefined;
  }
  if (t) hitUnit(s, u.side, def, t, def.dmg, false);
}

function stepUnit(s: BattleState, u: Unit): void {
  if (u.boss) {
    stepBoss(s, u);
    return;
  }
  const dt = 1 / s.config.tickRate;
  const slow = slowFactor(s, u);
  u.prevX = u.x;
  if (u.cooldown > 0) u.cooldown = Math.max(0, u.cooldown - slow);

  if (u.windup >= 0) {
    u.windup -= slow;
    if (u.windup <= 0) {
      u.windup = -1;
      landAttack(s, u);
    }
    return;
  }

  const n = nearestEnemy(s, u);
  const baseDist = distanceToBase(s, u);
  let target = NO_TARGET;
  if (n.unit && n.dist <= u.def.range) target = n.unit.id;
  else if (baseDist <= u.def.range) target = BASE_TARGET;

  if (target !== NO_TARGET) {
    u.walking = false;
    u.target = target;
    if (u.cooldown <= 0) {
      const intervalTicks = u.def.interval * s.config.tickRate;
      u.cooldown = intervalTicks;
      u.windup = Math.min(MAX_WINDUP_TICKS, Math.max(1, Math.round(intervalTicks * WINDUP_FRACTION)));
      s.events.push({ type: 'swing', id: u.id });
    }
    return;
  }

  u.walking = true;
  u.target = NO_TARGET;
  const dir = u.side === 0 ? 1 : -1;
  u.x += dir * u.def.speed * dt * slow;
  // Never walk through the enemy base.
  if (u.side === 0) u.x = Math.min(u.x, s.config.laneLength);
  else u.x = Math.max(u.x, 0);
}

function stepProjectiles(s: BattleState): void {
  const move = s.config.projectileSpeed / s.config.tickRate;
  for (const p of s.projectiles) {
    if (p.done) continue;
    p.prevX = p.x;
    let t: Unit | undefined;
    if (p.target === BASE_TARGET) p.targetX = p.side === 0 ? s.config.laneLength : 0;
    else {
      t = findUnit(s, p.target);
      if (t && t.alive) p.targetX = t.x;
    }
    const dx = p.targetX - p.x;
    if (Math.abs(dx) <= move) {
      p.x = p.targetX;
      p.done = true;
      if (p.target === BASE_TARGET) damageBase(s, p.side === 0 ? 1 : 0, p.dmg, false);
      else if (t && t.alive) {
        s.events.push({ type: 'hit', target: t.id, side: t.side, dmg: p.dmg, x: t.x, heavy: false, ranged: true });
        if (p.onHit) for (const k of p.onHit) applyStatus(s, t, k, p.attackerDmg);
        damageUnit(s, t, p.dmg, p.side);
      } else s.events.push({ type: 'fizzle', projectile: p.id, x: p.x });
    } else p.x += Math.sign(dx) * move;
  }
  s.projectiles = s.projectiles.filter((p) => !p.done);
}

function stepEnemySpawns(s: BattleState): void {
  const now = s.tick / s.config.tickRate;
  const boss = s.config.boss;
  if (boss?.bossDef && !s.bossSpawned && now + 1e-9 >= boss.bossDef.spawnSec) {
    // The boss always gets in, even on a full lane.
    s.bossSpawned = true;
    const u = spawnUnit(s, 1, boss);
    u.boss = { phase: 'raid', timer: 0, raidHp: u.hp, charged: false, dashing: false, pierced: [], strikes: 0, strikeX: u.x };
    s.bossId = u.id;
    s.events.push({ type: 'bossSpawn', id: u.id });
  }
  // At most one spawn per tick; a full lane holds the queue instead of banking spawns.
  const next = waveSpawnTime(s.config, s.waveIndex);
  if (next.time <= now + 1e-9 && aliveCount(s, 1) < s.config.maxUnitsPerSide) {
    spawnUnit(s, 1, s.config.enemyTroops[next.kind]);
    s.waveIndex++;
  }
}

function stepFood(s: BattleState): void {
  const total = s.config.foodRateMilli + s.foodRemainder;
  const gain = Math.floor(total / s.config.tickRate);
  s.foodRemainder = total - gain * s.config.tickRate;
  s.foodMilli += gain;
}

/**
 * Advance the battle by one fixed tick. Commands are applied at the start of the tick, in order.
 * Returns the events produced during this tick (also left on state.events until the next step).
 */
export function stepBattle(s: BattleState, commands: readonly Command[] = []): BattleState['events'] {
  s.events = [];
  if (s.result) return s.events;
  for (const c of commands) {
    if (s.result) break;
    applyCommand(s, c);
  }
  if (s.result) return s.events;

  s.tick++;
  if (s.skillCooldown > 0) s.skillCooldown--;
  stepFood(s);
  stepEnemySpawns(s);
  for (const u of s.units) if (u.alive) tickStatus(s, u);
  for (const u of s.units) if (u.alive) stepUnit(s, u);
  stepProjectiles(s);
  if (s.wardUp && s.bossSpawned && !s.units.some((u) => u.id === s.bossId && u.alive)) {
    s.wardUp = false;
    s.events.push({ type: 'wardBreak' });
  }
  // Bodies stay one second for the death animation, then leave the state.
  for (const u of s.units) if (!u.alive) u.deadTicks++;
  s.units = s.units.filter((u) => u.alive || u.deadTicks < s.config.tickRate);

  if (s.enemyBaseHp <= 0) {
    s.result = 'victory';
    s.events.push({ type: 'end', result: 'victory' });
  } else if (s.playerBaseHp <= 0) {
    s.result = 'defeat';
    s.events.push({ type: 'end', result: 'defeat' });
  }
  return s.events;
}

// ---------- Bosses ----------
//
// A boss raids down the lane, strikes your army with its move set, then falls back to heal at
// its fortress and raids again. It never targets your fortress and never walks past `reach`,
// so your fortress only falls to ordinary troops.

function setBossPhase(s: BattleState, u: Unit, phase: BossPhase): void {
  const b = u.boss!;
  b.phase = phase;
  b.timer = 0;
  b.dashing = false;
  u.windup = -1;
  if (phase === 'raid') {
    b.raidHp = u.hp;
    b.charged = false;
    b.strikes = 0;
    b.pierced = [];
  }
  s.events.push({ type: 'bossPhase', id: u.id, phase });
}

function bossHome(s: BattleState): number {
  return s.config.laneLength - s.config.spawnOffset;
}

/** The lowest lane x the boss may reach. */
function bossLimit(s: BattleState, u: Unit): number {
  return s.config.laneLength * (1 - u.def.bossDef!.reach);
}

/** Living player unit closest to the enemy fortress (the front of your army). */
function frontmostEnemy(s: BattleState): Unit | null {
  let best: Unit | null = null;
  for (const e of s.units) if (e.alive && e.side === 0 && (!best || e.x > best.x || (e.x === best.x && e.id < best.id))) best = e;
  return best;
}

function startBossStrike(s: BattleState, u: Unit, x: number): void {
  const d = u.def.bossDef!;
  const ticks = Math.max(1, Math.round(d.windup * s.config.tickRate));
  u.windup = ticks;
  u.cooldown = u.def.interval * s.config.tickRate;
  u.boss!.strikeX = x;
  u.walking = false;
  s.events.push({ type: 'swing', id: u.id });
  s.events.push({ type: 'bossWindup', id: u.id, move: d.move, x, ticks });
}

/** Area damage centred on `x`. Quake also chills; every strike knocks a little. */
function landBossStrike(s: BattleState, u: Unit): void {
  const d = u.def.bossDef!;
  const b = u.boss!;
  s.events.push({ type: 'bossStrike', id: u.id, move: d.move, x: b.strikeX, radius: d.radius });
  for (const e of s.units) {
    if (!e.alive || e.side === u.side || Math.abs(e.x - b.strikeX) > d.radius) continue;
    if (d.move === 'quake') applyStatus(s, e, 'cold', u.def.dmg);
    hitUnit(s, u.side, u.def, e, u.def.dmg, d.move === 'barrage');
  }
  b.strikes++;
}

function stepBoss(s: BattleState, u: Unit): void {
  const d = u.def.bossDef!;
  const b = u.boss!;
  const tr = s.config.tickRate;
  const dt = 1 / tr;
  const slow = slowFactor(s, u);
  const home = bossHome(s);
  const limit = bossLimit(s, u);
  u.prevX = u.x;
  b.timer++;
  if (u.cooldown > 0) u.cooldown = Math.max(0, u.cooldown - slow);

  if (u.windup >= 0) {
    u.windup -= slow;
    if (u.windup <= 0) {
      u.windup = -1;
      landBossStrike(s, u);
      if (d.move === 'blink' && b.phase === 'raid' && b.strikes >= (d.strikes ?? 2)) {
        // Blink home at once.
        s.events.push({ type: 'bossBlink', id: u.id, from: u.x, to: home });
        u.x = home;
        u.prevX = home;
        setBossPhase(s, u, 'rest');
      }
    }
    return;
  }

  if (b.phase === 'retreat') {
    u.walking = true;
    u.x = Math.min(home, u.x + u.def.speed * 1.4 * dt * slow);
    if (u.x >= home) setBossPhase(s, u, 'rest');
    return;
  }

  const n = nearestEnemy(s, u);
  const inRange = n.unit && n.dist <= u.def.range;

  if (b.phase === 'rest') {
    u.walking = false;
    u.hp = Math.min(u.maxHp, u.hp + u.maxHp * d.healPerSec * dt);
    // Defends itself at home, but does not advance.
    if (inRange && u.cooldown <= 0) startBossStrike(s, u, n.unit!.x);
    else if (b.timer >= d.restSec * tr) setBossPhase(s, u, 'raid');
    return;
  }

  // Raid.
  const lost = (b.raidHp - u.hp) / u.maxHp;
  if (b.timer >= d.raidSec * tr || lost >= d.retreatAt) {
    setBossPhase(s, u, 'retreat');
    return;
  }

  if ((d.move === 'charge' || d.move === 'lance') && !b.charged) {
    if (b.dashing || (n.unit && n.dist <= (d.chargeRange ?? 0))) {
      if (!b.dashing) s.events.push({ type: 'bossDash', id: u.id });
      b.dashing = true;
      u.walking = true;
      const step = u.def.speed * (d.chargeSpeed ?? 3) * dt * slow;
      const from = u.x;
      u.x = Math.max(limit, u.x - step);
      const dashDmg = Math.round(u.def.dmg * (d.chargeMul ?? 1.5));
      if (d.move === 'lance') {
        // Lance: pierce every unit the dash passes, then stop at the reach limit or after the run.
        for (const e of s.units) {
          if (!e.alive || e.side === u.side || b.pierced.includes(e.id)) continue;
          if (e.x <= from + 10 && e.x >= u.x - 10) {
            b.pierced.push(e.id);
            hitUnit(s, u.side, u.def, e, dashDmg, false);
            if (e.alive) e.x = Math.max(s.config.spawnOffset, e.x - (d.knockback ?? 0));
          }
        }
        if (u.x <= limit || from - u.x < 1e-9 || b.pierced.length >= 6) {
          b.dashing = false;
          b.charged = true;
        }
      } else {
        const t = nearestEnemy(s, u);
        if (u.x <= limit || (t.unit && t.dist <= u.def.range * 0.5)) {
          b.dashing = false;
          b.charged = true;
          s.events.push({ type: 'bossStrike', id: u.id, move: d.move, x: u.x - u.def.range * 0.5, radius: d.radius });
          for (const e of s.units) {
            if (!e.alive || e.side === u.side || Math.abs(e.x - (u.x - u.def.range * 0.5)) > d.radius) continue;
            hitUnit(s, u.side, u.def, e, dashDmg, false);
            if (e.alive) e.x = Math.max(s.config.spawnOffset, e.x - (d.knockback ?? 0));
          }
        }
      }
      return;
    }
  }

  if (d.move === 'blink' && u.cooldown <= 0) {
    const f = frontmostEnemy(s);
    if (f) {
      const to = Math.max(limit, Math.min(home, f.x + u.def.range * 0.6));
      if (Math.abs(f.x - to) <= u.def.range) {
        if (Math.abs(to - u.x) > 1) {
          s.events.push({ type: 'bossBlink', id: u.id, from: u.x, to });
          u.x = to;
          u.prevX = to;
        }
        startBossStrike(s, u, f.x);
        return;
      }
    }
  }

  if (inRange) {
    u.walking = false;
    if (u.cooldown <= 0) {
      // Barrage aims at the thickest point of the front: the frontmost unit.
      const tx = d.move === 'barrage' ? (frontmostEnemy(s) ?? n.unit!).x : n.unit!.x;
      startBossStrike(s, u, tx);
    }
    return;
  }

  if (u.x > limit) {
    u.walking = true;
    u.x = Math.max(limit, u.x - u.def.speed * dt * slow);
  } else u.walking = false;
}

/** Stable digest of the battle state for determinism tests and replays. */
export function stateHash(s: BattleState): string {
  const parts: (string | number)[] = [s.tick, s.foodMilli, s.playerBaseHp, s.enemyBaseHp, s.waveIndex, s.result ?? '-', s.wardUp ? 1 : 0];
  for (const u of s.units) parts.push(u.id, u.side, u.x.toFixed(6), u.hp.toFixed(6), u.alive ? 1 : 0);
  for (const p of s.projectiles) parts.push(p.id, p.x.toFixed(6));
  let h = 2166136261;
  const str = parts.join('|');
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return (h >>> 0).toString(16);
}
