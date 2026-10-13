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
/** Integer steps per second. Time, Food and the Rush clock derive from the integer tick count so
 * repeated 0.1 additions cannot drift (50 × 0.1 summed is 4.999…, which would delay a 5-Food troop). */
export const STEPS_PER_SECOND = 10;
/** Longest real frame the render loop feeds into the simulation; a stall cannot fast-forward the battle. */
export const MAX_FRAME_SECONDS = 0.25;
/**
 * Engineering limit, not a balance value: the most living non-boss enemies allowed on the lane.
 * While at the cap the spawn timer holds at "ready" instead of banking extra spawns, so the next
 * enemy appears only once a slot frees. Tunable for readability/performance; boss spawns ignore it.
 */
export const MAX_ALIVE_ENEMIES = 6;
/** WBS 1.7.8: transient impact effects are capped at 16 (newest kept); purely visual, never gameplay. */
export const MAX_TRANSIENT_EFFECTS = 16;
const EPS = 1e-9;
export const LANE_PLAYER_BASE = 8;
export const LANE_ENEMY_BASE = 92;
const PROJECTILE_SPEED = 2.8; // progress per second
const HIT_FLASH = 0.15;

export type SkillId = 'stasis' | 'volley' | 'rally';
export type SimEvent = 'melee' | 'ranged' | 'hit' | 'coin' | 'victory' | 'defeat';
export type Rng = () => number;

/** Small seeded PRNG (mulberry32) so a battle can be replayed from its recorded seed. */
export function createRng(seed: number): Rng {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const SKILL_COOLDOWNS: Record<SkillId, number> = { stasis: 12, volley: 10, rally: 16 };

/** Stats a caller supplies to put a unit on the lane; runtime fields are filled by the simulation. */
export type UnitSpawn = Pick<BattleUnit, 'unitDefId' | 'name' | 'role' | 'hp' | 'damage' | 'speed' | 'range' | 'attackSpeed'> &
  Partial<Pick<BattleUnit, 'projectileType' | 'isBoss' | 'attackCooldown'>>;

export interface BattleSimState {
  battleType: BattleMode;
  /** Seed of the RNG the caller steps this battle with (recorded for replayable action traces). */
  seed: number;
  /** Completed fixed steps. Authoritative clock; `time` is derived from it. */
  tick: number;
  time: number;
  /** Current Food = foodGranted + foodRate × elapsed seconds − foodSpent (fraction retained). */
  food: number;
  foodRate: number;
  foodSpent: number;
  /** Food added outside normal generation (0 in normal play; lets tests start with a stockpile). */
  foodGranted: number;
  playerBaseHp: number;
  playerBaseMaxHp: number;
  enemyBaseHp: number;
  enemyBaseMaxHp: number;
  units: BattleUnit[];
  projectiles: Projectile[];
  floatingTexts: FloatingText[];
  particles: Particle[];
  enemyRoster: UnitDef[];
  /** Authored finite wave (campaign). When set, enemies spawn in exactly this order and then stop. */
  enemyWave: UnitDef[] | null;
  enemyWaveIndex: number;
  spawnInterval: number;
  spawnTimer: number;
  bossSpawned: boolean;
  rushDuration: number;
  rushTimerRemaining: number;
  heroUsed: boolean;
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
  /** Finite authored enemy order; omit for endless random spawning (Rush, Survival, Dungeons). */
  enemyWave?: UnitDef[];
  timeline: number;
  rushDuration?: number;
  seed?: number;
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
    seed: setup.seed ?? 0,
    tick: 0,
    time: 0,
    food: 0,
    foodRate: setup.foodRate,
    foodSpent: 0,
    foodGranted: 0,
    playerBaseHp: setup.playerBaseHp,
    playerBaseMaxHp: setup.playerBaseMaxHp,
    enemyBaseHp: setup.enemyBaseMaxHp,
    enemyBaseMaxHp: setup.enemyBaseMaxHp,
    units: [],
    projectiles: [],
    floatingTexts: [],
    particles: [],
    enemyRoster: setup.enemyRoster,
    enemyWave: setup.enemyWave ? setup.enemyWave.slice() : null,
    enemyWaveIndex: 0,
    spawnInterval: enemySpawnInterval(setup.battleType, setup.timeline),
    spawnTimer: 0,
    bossSpawned: false,
    rushDuration: setup.rushDuration ?? 45,
    rushTimerRemaining: setup.rushDuration ?? 45,
    heroUsed: false,
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

const elapsedSeconds = (tick: number) => tick / STEPS_PER_SECOND;
const currentFood = (s: BattleSimState) => s.foodGranted + (s.foodRate * s.tick) / STEPS_PER_SECOND - s.foodSpent;
/** Counts a timer down one step, snapping float residue to zero so expiry lands on the intended tick. */
const tickDown = (v: number, dt: number) => (v - dt <= EPS ? 0 : v - dt);

/** Spends Food and places a player troop. Returns the same state when unaffordable or finished. */
export function deployPlayerUnit(state: BattleSimState, spawn: UnitSpawn, foodCost: number): BattleSimState {
  if (!canAct(state) || !(foodCost >= 0) || state.food < foodCost) return state;
  const next = cloneState(state);
  next.foodSpent += foodCost;
  next.food = currentFood(next);
  next.units.push(makeUnit(next, 'player', spawn));
  return next;
}

/** Places the equipped Hero once per battle. Returns the same state if already used or finished. */
export function deployHero(state: BattleSimState, spawn: UnitSpawn): BattleSimState {
  if (!canAct(state) || state.heroUsed) return state;
  const next = cloneState(state);
  next.heroUsed = true;
  next.units.push(makeUnit(next, 'player', { ...spawn, role: 'hero' }));
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

function findTarget(
  units: BattleUnit[],
  unit: BattleUnit,
  isAlive: (u: BattleUnit) => boolean = (u) => u.hp > 0,
): { target: BattleUnit | null; dist: number } {
  const isPlayer = unit.side === 'player';
  let dist = Infinity;
  let target: BattleUnit | null = null;
  for (const t of units) {
    if (t.side === unit.side || !isAlive(t)) continue;
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

export const livingNonBossEnemies = (units: BattleUnit[]) =>
  units.reduce((n, u) => (u.side === 'enemy' && !u.isBoss && u.hp > 0 ? n + 1 : n), 0);

function spawnEnemies(s: BattleSimState, dt: number, rng: Rng) {
  s.spawnTimer += dt;
  // Small epsilon keeps accumulated 0.1 steps from missing an exact interval boundary.
  if (s.spawnTimer + EPS < s.spawnInterval) return;

  if (s.battleType === 'bosses' && !s.bossSpawned) {
    s.spawnTimer = Math.max(0, s.spawnTimer - s.spawnInterval);
    s.bossSpawned = true;
    s.units.push(makeUnit(s, 'enemy', GATE_COLOSSUS));
    return;
  }
  // Lane full: hold the timer one step short of ready, so the enemy arrives on the first step a slot
  // is free, then the next waits a full interval. Nothing is banked while held.
  if (livingNonBossEnemies(s.units) >= MAX_ALIVE_ENEMIES) {
    s.spawnTimer = s.spawnInterval - dt;
    return;
  }
  if (s.enemyWave) {
    // Finite wave: once every authored enemy has entered, the lane stops refilling.
    if (s.enemyWaveIndex >= s.enemyWave.length) return;
    s.spawnTimer = Math.max(0, s.spawnTimer - s.spawnInterval);
    const def = s.enemyWave[s.enemyWaveIndex++];
    s.units.push(makeUnit(s, 'enemy', { ...def, unitDefId: def.id }));
    return;
  }
  s.spawnTimer = Math.max(0, s.spawnTimer - s.spawnInterval);
  if (s.enemyRoster.length === 0) return;
  const roll = rng();
  let def = s.enemyRoster[0];
  if (roll > 0.65 && s.enemyRoster[1]) def = s.enemyRoster[1];
  if (roll > 0.88 && s.enemyRoster[2]) def = s.enemyRoster[2];
  s.units.push(makeUnit(s, 'enemy', { ...def, unitDefId: def.id }));
}

/** Advances the battle by exactly one fixed step. Input state is not mutated. */
export function stepBattle(state: BattleSimState, rng: Rng): { state: BattleSimState; events: SimEvent[] } {
  if (state.result) return { state, events: [] };
  const dt = SIM_STEP;
  const s = cloneState(state);
  const events: SimEvent[] = [];
  s.tick += 1;
  s.time = elapsedSeconds(s.tick);
  s.food = currentFood(s);

  if (s.battleType === 'rush') s.rushTimerRemaining = Math.max(0, s.rushDuration - s.time);
  for (const k of Object.keys(s.skillCooldowns) as SkillId[]) s.skillCooldowns[k] = tickDown(s.skillCooldowns[k], dt);

  spawnEnemies(s, dt, rng);

  // Movement and swing timing use positions from the start of the step, so update order is irrelevant.
  const snapshot = s.units.map((u) => ({ ...u }));
  const swinging: BattleUnit[] = [];
  for (const unit of s.units) {
    const wasFrozen = unit.stasisFrozenRemaining > 0;
    unit.stasisFrozenRemaining = tickDown(unit.stasisFrozenRemaining, dt);
    unit.rallyBuffRemaining = tickDown(unit.rallyBuffRemaining, dt);
    unit.hitFlash = tickDown(unit.hitFlash, dt);
    if (wasFrozen) {
      unit.isWalking = false;
      unit.isAttacking = false;
      continue;
    }
    const cooldown = tickDown(unit.attackCooldown, dt);
    const { target, dist } = findTarget(snapshot, unit);
    if ((target && dist <= unit.range) || baseDistance(unit) <= unit.range) {
      // One swing per cooldown cycle, regardless of step size.
      const swing = cooldown === 0;
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

  // All swings in a step land simultaneously: who may swing and who may be targeted is judged by hit
  // points at the start of this phase, so two units trading blows both connect regardless of array
  // order. (Resolving sequentially let whichever side spawned first win every even trade.)
  const hpAtSwing = new Map(s.units.map((u) => [u.uid, u.hp]));
  const aliveAtSwing = (u: BattleUnit) => (hpAtSwing.get(u.uid) ?? 0) > 0;
  for (const unit of swinging) {
    if (!aliveAtSwing(unit)) continue;
    const isPlayer = unit.side === 'player';
    const dmg = Math.round(unit.damage * (unit.rallyBuffRemaining > 0 ? 1.45 : 1));
    const ranged = !!unit.projectileType && unit.projectileType !== 'none';
    const { target, dist } = findTarget(s.units, unit, aliveAtSwing);
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
    .filter((t) => t.life > 0 && t.opacity > 0)
    .slice(-MAX_TRANSIENT_EFFECTS);
  s.particles = s.particles
    .map((p) => ({ ...p, x: p.x + p.vx * dt, y: p.y + p.vy * dt, alpha: p.alpha - dt * 2.5, life: p.life - dt }))
    .filter((p) => p.life > 0 && p.alpha > 0)
    .slice(-MAX_TRANSIENT_EFFECTS);

  const bossCleared = s.battleType !== 'bosses' || (s.bossSpawned && !s.units.some((u) => u.side === 'enemy' && u.role === 'boss'));
  if (s.battleType === 'rush' && s.rushTimerRemaining <= 0) s.result = 'victory';
  else if (s.battleType !== 'rush' && s.enemyBaseHp <= 0 && bossCleared) s.result = 'victory';
  else if (s.playerBaseHp <= 0) s.result = 'defeat';
  if (s.result) events.push(s.result);

  return { state: s, events };
}

export interface FrameResult {
  state: BattleSimState;
  /** State before the last step taken this frame (interpolation base), or null when no step ran. */
  prev: BattleSimState | null;
  accumulator: number;
  steps: number;
}

/**
 * Feeds one rendered frame into the fixed-step simulation. The render loop and the tests share this
 * function, so display frame rate only changes how many whole steps run per frame, never their size.
 * While paused nothing advances and leftover partial time is discarded.
 * `onStep` sees each step (for sounds); `beforeStep` lets a caller inject commands at exact ticks.
 */
export function advanceFrame(
  state: BattleSimState,
  accumulator: number,
  frameSeconds: number,
  rng: Rng,
  opts: {
    paused?: boolean;
    beforeStep?: (s: BattleSimState) => BattleSimState;
    onStep?: (s: BattleSimState, events: SimEvent[]) => void;
  } = {},
): FrameResult {
  if (opts.paused || state.result) return { state, prev: null, accumulator: 0, steps: 0 };
  // Non-finite inputs (NaN/Infinity from a bad timestamp) count as no time, so they can never poison the clock.
  const frame = Number.isFinite(frameSeconds) ? Math.max(0, Math.min(MAX_FRAME_SECONDS, frameSeconds)) : 0;
  let acc = (Number.isFinite(accumulator) ? Math.max(0, accumulator) : 0) + frame;
  let prev: BattleSimState | null = null;
  let steps = 0;
  while (!state.result && acc + EPS >= SIM_STEP) {
    acc -= SIM_STEP;
    if (opts.beforeStep) state = opts.beforeStep(state);
    prev = state;
    const r = stepBattle(state, rng);
    state = r.state;
    steps += 1;
    opts.onStep?.(state, r.events);
  }
  return { state, prev, accumulator: Math.max(0, acc), steps };
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
