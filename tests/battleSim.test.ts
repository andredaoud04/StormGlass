import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  BattleSimState,
  MAX_ALIVE_ENEMIES,
  SIM_STEP,
  UnitSpawn,
  activateSkill,
  advanceFrame,
  createBattleState,
  createRng,
  deployHero,
  deployPlayerUnit,
  interpolateForRender,
  livingNonBossEnemies,
  stepBattle,
} from '../src/logic/battleSim';
import { AGES, getBaseFoodRate } from '../src/data/gameData';
import type { BattleUnit, UnitDef } from '../src/types/game';
import type { BattleMode } from '../src/logic/rules';

const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const enemyDef = (id: string, role: UnitDef['role'], hp = 40): UnitDef => ({
  id, name: id, ageId: 'stone', role, cost: 10, hp, damage: 6, speed: 5, range: 3, attackSpeed: 1,
  unlockCostGold: 0, description: '', projectileType: 'none',
});
const ROSTER = [enemyDef('club', 'melee'), enemyDef('sling', 'ranged'), enemyDef('brute', 'tank', 120)];

const battle = (battleType: BattleMode = 'campaign', overrides: Partial<BattleSimState> = {}) => ({
  ...createBattleState({
    battleType, foodRate: 10, playerBaseHp: 500, playerBaseMaxHp: 500, enemyBaseMaxHp: 500, enemyRoster: ROSTER, timeline: 1,
  }),
  // A test-provided Food stockpile is a grant on top of normal generation.
  ...(overrides.food !== undefined ? { foodGranted: overrides.food } : {}),
  ...overrides,
});

const warrior: UnitSpawn = { unitDefId: 'w', name: 'Warrior', role: 'melee', hp: 1000, damage: 10, speed: 5, range: 3, attackSpeed: 1 };

const run = (state: BattleSimState, seconds: number, rng = seeded(1)) => {
  for (let i = 0; i < Math.round(seconds / SIM_STEP); i++) state = stepBattle(state, rng).state;
  return state;
};

describe('fixed-timestep battle simulation', () => {
  it('does not mutate the input state', () => {
    const start = deployPlayerUnit(battle('campaign', { food: 50 }), warrior, 10);
    const snapshot = JSON.stringify(start);
    stepBattle(start, seeded(1));
    assert.equal(JSON.stringify(start), snapshot);
  });

  it('is deterministic for the same seed and inputs', () => {
    const start = deployPlayerUnit(battle('campaign', { food: 50 }), warrior, 10);
    assert.deepEqual(run(start, 20, seeded(7)), run(start, 20, seeded(7)));
  });

  it('lands exactly one swing per attack cycle against the base', () => {
    // Warrior starts inside enemy-base range with an empty enemy roster, so only base swings occur.
    let s = battle('campaign', { enemyRoster: [], food: 50 });
    s = deployPlayerUnit(s, warrior, 10);
    s = { ...s, units: s.units.map((u) => ({ ...u, x: 90, attackCooldown: 0 })) };
    s = run(s, 10);
    // Swings at t=0.1, 1.1, ... 9.1 → 10 hits of 10 damage.
    assert.equal(s.enemyBaseHp, 500 - 100);
  });

  it('spawns the first campaign enemy at the timeline-1 interval, not before', () => {
    const rng = seeded(3);
    let s = battle();
    s = run(s, 3.4, rng);
    assert.equal(s.units.length, 0);
    s = run(s, 0.1, rng);
    assert.equal(s.units.filter((u) => u.side === 'enemy').length, 1);
  });

  it('charges Food once per deploy and refuses unaffordable troops', () => {
    const s = battle('campaign', { food: 15 });
    const once = deployPlayerUnit(s, warrior, 10);
    assert.equal(once.food, 5);
    assert.equal(deployPlayerUnit(once, warrior, 10), once);
  });

  it('ignores a skill re-activation while it is cooling down', () => {
    const s = battle();
    const first = activateSkill(s, 'volley', 1, 0);
    assert.equal(first.skillCooldowns.volley, 10);
    assert.equal(activateSkill(first, 'volley', 1, 0), first);
  });

  it('counts dungeon kills without paying campaign Gold, and pays 1/5 Gold in campaign', () => {
    const corpse = (uid: string, role: UnitDef['role']): BattleUnit => ({
      uid, unitDefId: uid, name: uid, side: 'enemy', role, x: 60, hp: 0, maxHp: 40, damage: 0, speed: 0, range: 0,
      attackSpeed: 1, attackCooldown: 1, isAttacking: false, isWalking: false, hitFlash: 0, stasisFrozenRemaining: 0, rallyBuffRemaining: 0,
    });
    const withEnemies = (mode: BattleMode) =>
      stepBattle(battle(mode, { enemyRoster: [], units: [corpse('e-1', 'melee'), corpse('e-2', 'tank')] }), seeded(1)).state;
    const dungeon = withEnemies('legends');
    assert.equal(dungeon.normalKills, 1);
    assert.equal(dungeon.tankKills, 1);
    assert.equal(dungeon.goldEarnedInBattle, 0);
    assert.equal(withEnemies('campaign').goldEarnedInBattle, 6);
  });

  it('requires the boss to die before a Bosses base kill wins', () => {
    let s = battle('bosses', { enemyBaseHp: 0 });
    s = run(s, 3.5);
    assert.equal(s.result, null);
    const boss = s.units.find((u) => u.isBoss);
    assert.ok(boss);
    s = { ...s, units: s.units.map((u) => (u.isBoss ? { ...u, hp: 0 } : u)) };
    const { state, events } = stepBattle(s, seeded(1));
    assert.equal(state.result, 'victory');
    assert.ok(events.includes('victory'));
  });

  it('ends Rush with victory when the timer expires', () => {
    const s = run(battle('rush', { enemyRoster: [] }), 45);
    assert.equal(s.result, 'victory');
  });

  it('declares defeat when the player base falls and then stops advancing', () => {
    const s = stepBattle(battle('campaign', { playerBaseHp: 0, enemyRoster: [] }), seeded(1)).state;
    assert.equal(s.result, 'defeat');
    assert.equal(stepBattle(s, seeded(1)).state, s);
  });

  it('spends a projectile harmlessly when its target already died', () => {
    let s = battle('campaign', { enemyRoster: [] });
    s = {
      ...s,
      projectiles: [{ id: 'p1', type: 'arrow', startX: 10, targetX: 50, currentX: 10, y: 20, side: 'player', damage: 99, targetUid: 'gone', progress: 0.9 }],
    };
    const next = stepBattle(s, seeded(1)).state;
    assert.equal(next.projectiles.length, 0);
    assert.equal(next.enemyBaseHp, 500);
  });
});

describe('render interpolation', () => {
  it('blends unit positions between steps and leaves new units at their spawn point', () => {
    const prev = deployPlayerUnit(battle('campaign', { food: 50, enemyRoster: [] }), warrior, 10);
    const cur = stepBattle(prev, seeded(1)).state;
    const fresh = deployPlayerUnit({ ...cur, food: 50 }, warrior, 10);
    const view = interpolateForRender(prev, fresh, 0.5);
    assert.equal(view.units[0].x, (prev.units[0].x + cur.units[0].x) / 2);
    assert.equal(view.units[1].x, 8);
  });
});

// ---------------------------------------------------------------------------------------------
// Frame-rate invariance, Food exactness, pause, enemy cap, boss gate and settlement inputs.
// ---------------------------------------------------------------------------------------------

const STONE = AGES[0].units;
const unitSpawn = (i: number): UnitSpawn => {
  const d = STONE[i];
  return { unitDefId: d.id, name: d.name, role: d.role, hp: d.hp, damage: d.damage, speed: d.speed, range: d.range, attackSpeed: d.attackSpeed, projectileType: d.projectileType };
};
const CLUBBER = unitSpawn(0);
const SLINGER = unitSpawn(1);
const HERO: UnitSpawn = { unitDefId: 'hero', name: 'Hero', role: 'hero', hp: 400, damage: 40, speed: 8, range: 5.5, attackSpeed: 0.9, projectileType: 'slash' };

const enemyAt = (uid: string, overrides: Partial<BattleUnit> = {}): BattleUnit => ({
  uid, unitDefId: uid, name: uid, side: 'enemy', role: 'melee', x: 80, hp: 1e6, maxHp: 1e6, damage: 0, speed: 0, range: 0,
  attackSpeed: 1, attackCooldown: 99, isAttacking: false, isWalking: false, hitFlash: 0, stasisFrozenRemaining: 0, rallyBuffRemaining: 0,
  ...overrides,
});

/** Player commands keyed by the tick they are issued before. */
const SCHEDULE: Record<number, (s: BattleSimState) => BattleSimState> = {
  50: (s) => deployPlayerUnit(s, CLUBBER, 5),
  90: (s) => deployPlayerUnit(s, SLINGER, 8),
  100: (s) => deployHero(s, HERO),
  140: (s) => deployPlayerUnit(s, CLUBBER, 5),
  150: (s) => activateSkill(s, 'volley', 1, 0),
  155: (s) => activateSkill(s, 'volley', 1, 0), // still cooling down: ignored
  210: (s) => activateSkill(s, 'stasis', 1, 0),
  230: (s) => deployPlayerUnit(s, CLUBBER, 5),
  240: (s) => deployPlayerUnit(s, SLINGER, 8),
  320: (s) => activateSkill(s, 'rally', 1, 0),
  400: (s) => deployPlayerUnit(s, CLUBBER, 5),
  450: (s) => activateSkill(s, 'volley', 1, 0),
  480: (s) => deployPlayerUnit(s, SLINGER, 8),
  520: (s) => deployPlayerUnit(s, CLUBBER, 5),
};

const invarianceStart = () => createBattleState({
  battleType: 'campaign', seed: 42, foodRate: getBaseFoodRate(1), playerBaseHp: 5000, playerBaseMaxHp: 5000,
  enemyBaseMaxHp: 5000, enemyRoster: STONE, timeline: 1,
});

/** Drives the battle exactly like the render loop does, with the given sequence of frame lengths. */
function playAtFrames(nextFrame: () => number, checkpoints: number[]) {
  let state = invarianceStart();
  let acc = 0;
  const rng = createRng(state.seed);
  const snaps = new Map<number, string>();
  const last = Math.max(...checkpoints);
  while (state.tick < last) {
    const r = advanceFrame(state, acc, nextFrame(), rng, {
      beforeStep: (s) => (SCHEDULE[s.tick] ? SCHEDULE[s.tick](s) : s),
      onStep: (s) => { if (checkpoints.includes(s.tick)) snaps.set(s.tick, JSON.stringify(s)); },
    });
    state = r.state;
    acc = r.accumulator;
    assert.equal(state.result, null, 'battle should still be running for this trace');
  }
  return snaps;
}

describe('frame-rate invariance', () => {
  const checkpoints = [100, 300, 600]; // 10s, 30s, 60s of game time
  const fixed = (fps: number) => () => 1 / fps;
  const reference = playAtFrames(fixed(60), checkpoints);

  it('produces a non-trivial 60 FPS trace (troops deployed, hero used, enemies died)', () => {
    const end = JSON.parse(reference.get(600)!) as BattleSimState;
    assert.equal(end.time, 60);
    assert.ok(end.foodSpent >= 30, `foodSpent=${end.foodSpent}`);
    assert.ok(end.normalKills + end.tankKills > 0);
    assert.equal(end.heroUsed, true);
  });

  for (const fps of [30, 120, 5]) {
    it(`matches 60 FPS exactly at 10/30/60s when rendered at ${fps} FPS`, () => {
      const snaps = playAtFrames(fixed(fps), checkpoints);
      for (const t of checkpoints) assert.equal(snaps.get(t), reference.get(t), `diverged at tick ${t}`);
    });
  }

  it('matches with irregular frame lengths (5-250ms jitter)', () => {
    const jitter = createRng(99);
    const snaps = playAtFrames(() => 0.005 + jitter() * 0.245, checkpoints);
    for (const t of checkpoints) assert.equal(snaps.get(t), reference.get(t), `diverged at tick ${t}`);
  });

  it('a long stall advances at most MAX_FRAME_SECONDS of game time', () => {
    const r = advanceFrame(invarianceStart(), 0, 5, createRng(1));
    assert.equal(r.state.tick, 2);
  });
});

describe('Food exactness', () => {
  const fresh = (rate: number) => createBattleState({ battleType: 'campaign', foodRate: rate, playerBaseHp: 500, playerBaseMaxHp: 500, enemyBaseMaxHp: 500, enemyRoster: [], timeline: 1 });

  it('starts at 0 and makes the 5-Food Clubber affordable at exactly 5.0s, not before', () => {
    let s = fresh(getBaseFoodRate(1));
    assert.equal(s.food, 0);
    s = run(s, 4.9);
    assert.equal(deployPlayerUnit(s, CLUBBER, 5), s, 'unaffordable at 4.9s');
    s = run(s, 0.1);
    assert.equal(s.time, 5);
    assert.equal(s.food, 5);
    const deployed = deployPlayerUnit(s, CLUBBER, 5);
    assert.notEqual(deployed, s);
    assert.equal(deployed.food, 0);
  });

  it('retains the fractional remainder after spending', () => {
    let s = run(fresh(getBaseFoodRate(2)), 5); // 1.09/s x 5s = 5.45
    s = deployPlayerUnit(s, CLUBBER, 5);
    assert.ok(Math.abs(s.food - 0.45) < 1e-9, `food=${s.food}`);
    s = run(s, 0.3);
    assert.ok(Math.abs(s.food - (0.45 + 0.327)) < 1e-9, `food=${s.food}`);
  });

  it('accumulates exactly over a long battle (60s at 1.0/s is exactly 60)', () => {
    assert.equal(run(fresh(1), 60).food, 60);
  });
});

describe('pause', () => {
  it('advances nothing while paused and discards partial time', () => {
    let s = run(battle('campaign'), 3.0);
    s = deployPlayerUnit(s, CLUBBER, 0);
    s = activateSkill(s, 'volley', 1, 0);
    const before = JSON.stringify(s);
    let acc = 0.09;
    for (let i = 0; i < 600; i++) {
      const r = advanceFrame(s, acc, 1 / 60, createRng(1), { paused: true });
      assert.equal(r.state, s);
      assert.equal(r.steps, 0);
      acc = r.accumulator;
    }
    assert.equal(acc, 0, 'no banked time to fast-forward on resume');
    assert.equal(JSON.stringify(s), before); // Food, spawn timer, cooldowns and units untouched
  });
});

describe('alive-enemy cap', () => {
  const tough = (id: string): UnitDef => ({ ...enemyDef(id, 'melee', 1e6), speed: 0 });
  const capped = (mode: BattleMode = 'campaign') =>
    battle(mode, { enemyRoster: [tough('a'), tough('b'), tough('c')], playerBaseHp: 1e9, playerBaseMaxHp: 1e9 });

  it(`never exceeds ${MAX_ALIVE_ENEMIES} living non-boss enemies and holds without banking`, () => {
    let s = capped();
    const rng = seeded(5);
    for (let i = 0; i < 1200; i++) {
      s = stepBattle(s, rng).state;
      assert.ok(livingNonBossEnemies(s.units) <= MAX_ALIVE_ENEMIES);
    }
    assert.equal(livingNonBossEnemies(s.units), MAX_ALIVE_ENEMIES);
    assert.ok(s.spawnTimer <= s.spawnInterval + 1e-9, 'timer held at ready, not banked');
    // Free every slot: exactly one enemy arrives now, the next only after a full interval.
    s = { ...s, units: s.units.map((u) => ({ ...u, hp: 0 })) };
    s = stepBattle(s, rng).state;
    assert.equal(livingNonBossEnemies(s.units), 1);
    s = run(s, 3.3, rng);
    assert.equal(livingNonBossEnemies(s.units), 1);
    s = run(s, 0.1, rng);
    assert.equal(livingNonBossEnemies(s.units), 1, 'interval is 3.5s: still waiting at +3.4s');
    s = run(s, 0.1, rng);
    assert.equal(livingNonBossEnemies(s.units), 2);
  });

  it('never blocks the boss spawn', () => {
    let s = capped('bosses');
    s = { ...s, units: Array.from({ length: MAX_ALIVE_ENEMIES }, (_, i) => enemyAt(`e-x${i}`)) };
    s = run(s, 3.5);
    assert.equal(s.bossSpawned, true);
    assert.equal(s.units.filter((u) => u.isBoss).length, 1);
    assert.equal(livingNonBossEnemies(s.units), MAX_ALIVE_ENEMIES);
  });
});

describe('boss gate', () => {
  it('needs both base destroyed and boss killed; spawning continues after the base falls', () => {
    let s = battle('bosses', { enemyBaseHp: 0, playerBaseHp: 1e9, playerBaseMaxHp: 1e9 });
    s = run(s, 3.5);
    assert.ok(s.units.some((u) => u.isBoss));
    s = run(s, 3.5);
    assert.equal(s.result, null);
    assert.ok(s.units.some((u) => !u.isBoss && u.side === 'enemy'), 'spawns continue after base destruction');

    // Boss dead but base standing: still no victory.
    let standing = run(battle('bosses', { playerBaseHp: 1e9, playerBaseMaxHp: 1e9 }), 3.5);
    standing = { ...standing, units: standing.units.map((u) => (u.isBoss ? { ...u, hp: 0 } : u)) };
    standing = run(standing, 1);
    assert.equal(standing.result, null);
    assert.equal(standing.bossSpawned, true);

    // Both gates met: victory, reported exactly once.
    s = { ...s, units: s.units.map((u) => (u.isBoss ? { ...u, hp: 0 } : u)) };
    const won = stepBattle(s, seeded(1));
    assert.equal(won.state.result, 'victory');
    assert.equal(won.events.filter((e) => e === 'victory').length, 1);
    assert.equal(stepBattle(won.state, seeded(1)).events.length, 0);
  });

  it('does not grant victory before the boss has spawned', () => {
    const s = run(battle('bosses', { enemyBaseHp: 0 }), 3.4);
    assert.equal(s.bossSpawned, false);
    assert.equal(s.result, null);
  });
});

describe('combat rules', () => {
  it('lands exactly one melee swing per cooldown against a unit, at any frame rate', () => {
    for (const frame of [1 / 120, 1 / 60, 1 / 30, 1 / 5]) {
      let s = deployPlayerUnit(battle('campaign', { enemyRoster: [], food: 50 }), warrior, 0);
      s = { ...s, units: [...s.units.map((u) => ({ ...u, attackCooldown: 0 })), enemyAt('e-dummy', { x: 10 })] };
      let acc = 0;
      while (s.tick < 100) {
        const r = advanceFrame(s, acc, frame, seeded(1));
        s = r.state;
        acc = r.accumulator;
      }
      const dummy = s.units.find((u) => u.uid === 'e-dummy')!;
      // Swings land on ticks 1, 11, ..., 91 (10 swings); a frame overshooting to tick 101 adds the 11th.
      const swings = Math.floor((s.tick - 1) / 10) + 1;
      assert.equal(1e6 - dummy.hp, swings * 10, `frame ${frame}`);
    }
  });

  it('a projectile whose target died in flight hits nothing, and the kill counts once', () => {
    let s = battle('campaign', { enemyRoster: [], units: [enemyAt('e-dead', { x: 50, hp: 0, maxHp: 40 })] });
    s = { ...s, projectiles: [{ id: 'p1', type: 'rock', startX: 10, targetX: 50, currentX: 46, y: 20, side: 'player', damage: 99, targetUid: 'e-dead', progress: 0.95 }] };
    const next = stepBattle(s, seeded(1)).state;
    assert.equal(next.projectiles.length, 0);
    assert.equal(next.enemyBaseHp, 500);
    assert.equal(next.normalKills, 1);
    assert.equal(next.goldEarnedInBattle, 1);
    assert.equal(next.units.length, 0);
  });

  it('tracks kills in every mode but earns ordinary Gold only in campaign', () => {
    for (const mode of ['campaign', 'rush', 'legends', 'bosses', 'survival', 'hell'] as BattleMode[]) {
      const units = [enemyAt('e-1', { hp: 0 }), enemyAt('e-2', { hp: 0, role: 'tank' }), enemyAt('e-3', { hp: 0 })];
      const s = stepBattle(battle(mode, { enemyRoster: [], units }), seeded(1)).state;
      assert.equal(s.normalKills, 2, mode);
      assert.equal(s.tankKills, 1, mode);
      assert.equal(s.goldEarnedInBattle, mode === 'campaign' ? 7 : 0, mode);
    }
  });

  it('deploys the Hero at most once, composing with same-render troop and skill commands', () => {
    let s = battle('campaign', { food: 20 });
    s = deployHero(s, HERO);
    s = deployPlayerUnit(s, CLUBBER, 5);
    s = activateSkill(s, 'rally', 1, 0);
    assert.equal(s.heroUsed, true);
    assert.equal(s.units.length, 2);
    assert.ok(s.units.every((u) => u.rallyBuffRemaining > 0));
    assert.equal(deployHero(s, HERO), s);
    assert.equal(s.food, 15);
  });

  it('Rush victory lands at exactly 45.0s', () => {
    let s = run(battle('rush', { enemyRoster: [] }), 44.9);
    assert.equal(s.result, null);
    s = stepBattle(s, seeded(1)).state;
    assert.equal(s.time, 45);
    assert.equal(s.result, 'victory');
  });

  it('skill cooldowns expire on the exact tick', () => {
    let s = activateSkill(battle('campaign', { enemyRoster: [] }), 'volley', 1, 0);
    s = run(s, 9.9);
    assert.ok(s.skillCooldowns.volley > 0);
    s = run(s, 0.1);
    assert.equal(s.skillCooldowns.volley, 0);
  });
});
