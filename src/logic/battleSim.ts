import type { BattleUnit, FloatingText, Particle, Projectile, UnitDef } from '../types/game';
import type { BattleMode } from './rules';

/**
 * Authoritative fixed-timestep combat simulation.
 *
 * The whole battle advances in SIM_STEP increments, independent of display frame rate.
 * Every function here is pure: it never touches React, audio, timers or Math.random.
 * Callers inject randomness and translate returned events into sound.
 */
export const SIM_STEP = 0.1;
export const LANE_PLAYER_BASE = 8;
export const LANE_ENEMY_BASE = 92;
const PROJECTILE_SPEED = 2.8; // progress per second
const HIT_FLASH = 0.15;

export type SkillId = 'stasis' | 'volley' | 'rally';
export type SimEvent = 'melee' | 'ranged' | 'hit' | 'coin' | 'victory' | 'defeat';
export type Rng = () => number;

export const SKILL_COOLDOWNS: Record<SkillId, number> = { stasis: 12, volley: 10, rally: 16 };

/** Stats a caller supplies to put a unit on the lane; runtime fields are filled by the simulation. */
export type UnitSpawn = Pick<BattleUnit, 'unitDefId' | 'name' | 'role' | 'hp' | 'damage' | 'speed' | 'range' | 'attackSpeed'> &
  Partial<Pick<BattleUnit, 'projectileType' | 'isBoss' | 'attackCooldown'>>;

export interface BattleSimState {
  battleType: BattleMode;
  time: number;
  food: number;
  foodRate: number;
  playerBaseHp: number;
  playerBaseMaxHp: number;
  enemyBaseHp: number;
  enemyBaseMaxHp: number;
  units: BattleUnit[];
  projectiles: Projectile[];
  floatingTexts: FloatingText[];
  particles: Particle[];
  enemyRoster: UnitDef[];
  spawnInterval: number;
  spawnTimer: number;
  bossSpawned: boolean;
  rushTimerRemaining: number;
  skillCooldowns: Record<SkillId, number>;
  goldEarnedInBattle: number;
  normalKills: number;
  tankKills: number;
  result: 'victory' | 'defeat' | null;
  nextId: number;
}

export interface BattleSetup {
  battleType: BattleMode;
  foodRate: number;
  playerBaseHp: number;
  playerBaseMaxHp: number;
  enemyBaseMaxHp: number;
  enemyRoster: UnitDef[];
  timeline: number;
  rushDuration?: number;
}

export const GATE_COLOSSUS: UnitSpawn = {
  unitDefId: 'gate_colossus',
  name: 'Gate Colossus',
  role: 'boss',
  hp: 850,
  damage: 55,
  speed: 3.5,
  range: 6.0,
  attackSpeed: 1.4,
  attackCooldown: 0.4,
  projectileType: 'none',
  isBoss: true,
};

export function enemySpawnInterval(battleType: BattleMode, timeline: number): number {
  if (battleType === 'rush') return 1.4;
  return 3.5 / (1 + (timeline - 1) * 0.12);
}

export function createBattleState(setup: BattleSetup): BattleSimState {
  return {
    battleType: setup.battleType,
    time: 0,
    food: 0,
    foodRate: setup.foodRate,
    playerBaseHp: setup.playerBaseHp,
    playerBaseMaxHp: setup.playerBaseMaxHp,
    enemyBaseHp: setup.enemyBaseMaxHp,
    enemyBaseMaxHp: setup.enemyBaseMaxHp,
    units: [],
    projectiles: [],
    floatingTexts: [],
    particles: [],
    enemyRoster: setup.enemyRoster,
    spawnInterval: enemySpawnInterval(setup.battleType, setup.timeline),
    spawnTimer: 0,
    bossSpawned: false,
    rushTimerRemaining: setup.rushDuration ?? 45,
    skillCooldowns: { stasis: 0, volley: 0, rally: 0 },
    goldEarnedInBattle: 0,
    normalKills: 0,
    tankKills: 0,
    result: null,
    nextId: 1,
  };
}

function makeUnit(state: BattleSimState, side: BattleUnit['side'], spawn: UnitSpawn): BattleUnit {
  const prefix = spawn.role === 'hero' ? 'hero' : spawn.isBoss ? 'boss' : side === 'player' ? 'p' : 'e';
  return {
    uid: `${prefix}-${state.nextId++}`,
    unitDefId: spawn.unitDefId,
    name: spawn.name,
    side,
    role: spawn.role,
    x: side === 'player' ? LANE_PLAYER_BASE : LANE_ENEMY_BASE,
    hp: spawn.hp,
    maxHp: spawn.hp,
    damage: spawn.damage,
    speed: spawn.speed,
    range: spawn.range,
    attackSpeed: spawn.attackSpeed,
    attackCooldown: spawn.attackCooldown ?? (side === 'player' ? 0.2 : 0.3),
    isAttacking: false,
    isWalking: true,
    hitFlash: 0,
    stasisFrozenRemaining: 0,
    rallyBuffRemaining: 0,
    projectileType: spawn.projectileType,
    isBoss: spawn.isBoss,
  };
}

const cloneState = (s: BattleSimState): BattleSimState => ({
  ...s,
  units: s.units.map((u) => ({ ...u })),
  projectiles: s.projectiles.map((p) => ({ ...p })),
  floatingTexts: s.floatingTexts.slice(),
  particles: s.particles.slice(),
  skillCooldowns: { ...s.skillCooldowns },
});

const canAct = (s: BattleSimState) => s.result === null;

/** Spends Food and places a player troop. Returns the same state when unaffordable or finished. */
export function deployPlayerUnit(state: BattleSimState, spawn: UnitSpawn, foodCost: number): BattleSimState {
  if (!canAct(state) || !(foodCost >= 0) || state.food < foodCost) return state;
  const next = cloneState(state);
  next.food -= foodCost;
  next.units.push(makeUnit(next, 'player', spawn));
  return next;
}

/** Applies an equipped skill. Returns the same state while it is cooling down. */
export function activateSkill(state: BattleSimState, skillId: SkillId, level: number, armyAgeIndex: number): BattleSimState {
  if (!canAct(state) || state.skillCooldowns[skillId] > 0) return state;
  const next = cloneState(state);
  next.skillCooldowns[skillId] = SKILL_COOLDOWNS[skillId];
  if (skillId === 'stasis') {
    const duration = 3.0 + (level - 1) * 0.35;
    for (const u of next.units) if (u.side === 'enemy') u.stasisFrozenRemaining = duration;
  } else if (skillId === 'volley') {
    const dmg = 80 + armyAgeIndex * 16 + (level - 1) * 24;
    for (const u of next.units) {
      if (u.side === 'enemy') {
        u.hp = Math.max(0, u.hp - dmg);
        u.hitFlash = HIT_FLASH;
      }
    }
    next.floatingTexts.push({ id: `ft-${next.nextId++}`, text: `VOLLEY -${dmg}`, x: 55, y: 40, color: '#f97316', opacity: 1, life: 1.2 });
  } else {
    const duration = 6.0 + (level - 1) * 0.4;
    for (const u of next.units) if (u.side === 'player') u.rallyBuffRemaining = duration;
  }
  return next;
}

function findTarget(units: BattleUnit[], unit: BattleUnit): { target: BattleUnit | null; dist: number } {
  const isPlayer = unit.side === 'player';
  let dist = Infinity;
  let target: BattleUnit | null = null;
  for (const t of units) {
    if (t.side === unit.side || t.hp <= 0) continue;
    const d = isPlayer ? t.x - unit.x : unit.x - t.x;
    if (d >= 0 && d < dist) {
      dist = d;
      target = t;
    }
  }
  return { target, dist };
}

const baseDistance = (unit: BattleUnit) =>
  unit.side === 'player' ? LANE_ENEMY_BASE - unit.x : unit.x - LANE_PLAYER_BASE;

function spawnEnemies(s: BattleSimState, dt: number, rng: Rng) {
  s.spawnTimer += dt;
  // Small epsilon keeps accumulated 0.1 steps from missing an exact interval boundary.
  if (s.spawnTimer + 1e-9 < s.spawnInterval) return;
  s.spawnTimer = Math.max(0, s.spawnTimer - s.spawnInterval);

  if (s.battleType === 'bosses' && !s.bossSpawned) {
    s.bossSpawned = true;
    s.units.push(makeUnit(s, 'enemy', GATE_COLOSSUS));
    return;
  }
  if (s.enemyRoster.length === 0) return;
  const roll = rng();
  let def = s.enemyRoster[0];
  if (roll > 0.65 && s.enemyRoster[1]) def = s.enemyRoster[1];
  if (roll > 0.88 && s.enemyRoster[2]) def = s.enemyRoster[2];
  s.units.push(makeUnit(s, 'enemy', { ...def, unitDefId: def.id }));
}

/** Advances the battle by exactly one fixed step. Input state is not mutated. */
export function stepBattle(state: BattleSimState, rng: Rng, dt = SIM_STEP): { state: BattleSimState; events: SimEvent[] } {
  if (state.result) return { state, events: [] };
  const s = cloneState(state);
  const events: SimEvent[] = [];
  s.time += dt;
  s.food += s.foodRate * dt;

  if (s.battleType === 'rush') s.rushTimerRemaining = Math.max(0, s.rushTimerRemaining - dt);
  for (const k of Object.keys(s.skillCooldowns) as SkillId[]) s.skillCooldowns[k] = Math.max(0, s.skillCooldowns[k] - dt);

  spawnEnemies(s, dt, rng);

  // Movement and swing timing use positions from the start of the step, so update order is irrelevant.
  const snapshot = s.units.map((u) => ({ ...u }));
  const swinging: BattleUnit[] = [];
  for (const unit of s.units) {
    const wasFrozen = unit.stasisFrozenRemaining > 0;
    unit.stasisFrozenRemaining = Math.max(0, unit.stasisFrozenRemaining - dt);
    unit.rallyBuffRemaining = Math.max(0, unit.rallyBuffRemaining - dt);
    unit.hitFlash = Math.max(0, unit.hitFlash - dt);
    if (wasFrozen) {
      unit.isWalking = false;
      unit.isAttacking = false;
      continue;
    }
    const cooldown = Math.max(0, unit.attackCooldown - dt);
    const { target, dist } = findTarget(snapshot, unit);
    if ((target && dist <= unit.range) || baseDistance(unit) <= unit.range) {
      // One swing per cooldown cycle, regardless of step size.
      const swing = cooldown <= 1e-9;
      if (swing) swinging.push(unit);
      unit.isWalking = false;
      unit.isAttacking = true;
      unit.attackCooldown = swing ? unit.attackSpeed : cooldown;
    } else {
      const move = unit.speed * dt * (unit.side === 'player' ? 1 : -1);
      unit.x = Math.max(LANE_PLAYER_BASE, Math.min(LANE_ENEMY_BASE, unit.x + move));
      unit.isWalking = true;
      unit.isAttacking = false;
      unit.attackCooldown = cooldown;
    }
  }

  // Resolve swings against current hit points so already-dead units are never targeted.
  for (const unit of swinging) {
    if (unit.hp <= 0) continue;
    const isPlayer = unit.side === 'player';
    const dmg = Math.round(unit.damage * (unit.rallyBuffRemaining > 0 ? 1.45 : 1));
    const ranged = !!unit.projectileType && unit.projectileType !== 'none';
    const { target, dist } = findTarget(s.units, unit);
    const hitsUnit = target && dist <= unit.range;
    if (!hitsUnit && baseDistance(unit) > unit.range) continue;
    const targetX = hitsUnit ? target!.x : isPlayer ? LANE_ENEMY_BASE : LANE_PLAYER_BASE;

    if (ranged) {
      events.push('ranged');
      s.projectiles.push({
        id: `proj-${s.nextId++}`,
        type: unit.projectileType as Projectile['type'],
        startX: unit.x,
        targetX,
        currentX: unit.x,
        y: 20,
        side: unit.side,
        damage: dmg,
        targetUid: hitsUnit ? target!.uid : undefined,
        progress: 0,
      });
      continue;
    }
    events.push('melee');
    if (hitsUnit) {
      target!.hp = Math.max(0, target!.hp - dmg);
      target!.hitFlash = HIT_FLASH;
    } else if (isPlayer) {
      s.enemyBaseHp = Math.max(0, s.enemyBaseHp - dmg);
    } else {
      s.playerBaseHp = Math.max(0, s.playerBaseHp - dmg);
    }
    s.floatingTexts.push({
      id: `ft-${s.nextId++}`,
      text: `-${dmg}`,
      x: targetX,
      y: hitsUnit ? 28 : 40,
      color: hitsUnit ? (isPlayer ? '#60a5fa' : '#f87171') : isPlayer ? '#38bdf8' : '#ef4444',
      opacity: 1,
      life: hitsUnit ? 0.8 : 0.9,
    });
  }

  // Projectiles land on their locked target; a shot at a unit that already died is spent harmlessly.
  const flying: Projectile[] = [];
  for (const p of s.projectiles) {
    const progress = p.progress + dt * PROJECTILE_SPEED;
    if (progress < 1) {
      flying.push({ ...p, progress, currentX: p.startX + (p.targetX - p.startX) * progress });
      continue;
    }
    events.push('hit');
    if (p.targetUid) {
      const target = s.units.find((u) => u.uid === p.targetUid && u.hp > 0);
      if (target) {
        target.hp = Math.max(0, target.hp - p.damage);
        target.hitFlash = HIT_FLASH;
      }
    } else if (p.side === 'player') {
      s.enemyBaseHp = Math.max(0, s.enemyBaseHp - p.damage);
    } else {
      s.playerBaseHp = Math.max(0, s.playerBaseHp - p.damage);
    }
    s.particles.push({
      id: `spark-${s.nextId++}`,
      x: p.targetX,
      y: 20,
      vx: (rng() - 0.5) * 8,
      vy: rng() * 8,
      color: '#fbbf24',
      size: 3,
      alpha: 1,
      life: 0.3,
    });
    s.floatingTexts.push({
      id: `ft-${s.nextId++}`,
      text: `-${p.damage}`,
      x: p.targetX,
      y: 30,
      color: p.side === 'player' ? '#60a5fa' : '#f87171',
      opacity: 1,
      life: 0.7,
    });
  }
  s.projectiles = flying;

  // Deaths, kill tracking (all modes) and Gold (campaign only).
  const living: BattleUnit[] = [];
  for (const u of s.units) {
    if (u.hp > 0) {
      living.push(u);
      continue;
    }
    events.push('hit');
    if (u.side !== 'enemy') continue;
    const isTank = u.role === 'tank';
    if (isTank) s.tankKills += 1;
    else s.normalKills += 1;
    if (s.battleType === 'campaign') {
      const earned = isTank ? 5 : 1;
      s.goldEarnedInBattle += earned;
      events.push('coin');
      s.floatingTexts.push({ id: `ft-${s.nextId++}`, text: `+${earned}G`, x: u.x, y: 35, color: '#fbbf24', opacity: 1, life: 0.8 });
    }
  }
  s.units = living;

  s.floatingTexts = s.floatingTexts
    .map((t) => ({ ...t, y: t.y + dt * 12, opacity: t.opacity - dt * 1.1, life: t.life - dt }))
    .filter((t) => t.life > 0 && t.opacity > 0);
  s.particles = s.particles
    .map((p) => ({ ...p, x: p.x + p.vx * dt, y: p.y + p.vy * dt, alpha: p.alpha - dt * 2.5, life: p.life - dt }))
    .filter((p) => p.life > 0 && p.alpha > 0);

  const bossCleared = s.battleType !== 'bosses' || (s.bossSpawned && !s.units.some((u) => u.side === 'enemy' && u.role === 'boss'));
  if (s.battleType === 'rush' && s.rushTimerRemaining <= 0) s.result = 'victory';
  else if (s.battleType !== 'rush' && s.enemyBaseHp <= 0 && bossCleared) s.result = 'victory';
  else if (s.playerBaseHp <= 0) s.result = 'defeat';
  if (s.result) events.push(s.result);

  return { state: s, events };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Blends render positions between two simulation steps so 10 Hz logic animates smoothly at display rate. */
export function interpolateForRender(prev: BattleSimState, cur: BattleSimState, alpha: number) {
  const t = Math.max(0, Math.min(1, alpha));
  const prevUnits = new Map(prev.units.map((u) => [u.uid, u]));
  const prevProj = new Map(prev.projectiles.map((p) => [p.id, p]));
  const prevText = new Map(prev.floatingTexts.map((f) => [f.id, f]));
  const prevPart = new Map(prev.particles.map((p) => [p.id, p]));
  return {
    units: cur.units.map((u) => {
      const p = prevUnits.get(u.uid);
      return p ? { ...u, x: lerp(p.x, u.x, t) } : u;
    }),
    projectiles: cur.projectiles.map((pr) => {
      const p = prevProj.get(pr.id);
      return p ? { ...pr, currentX: lerp(p.currentX, pr.currentX, t) } : pr;
    }),
    floatingTexts: cur.floatingTexts.map((f) => {
      const p = prevText.get(f.id);
      return p ? { ...f, y: lerp(p.y, f.y, t), opacity: lerp(p.opacity, f.opacity, t) } : f;
    }),
    particles: cur.particles.map((pa) => {
      const p = prevPart.get(pa.id);
      return p ? { ...pa, x: lerp(p.x, pa.x, t), y: lerp(p.y, pa.y, t), alpha: lerp(p.alpha, pa.alpha, t) } : pa;
    }),
  };
}
