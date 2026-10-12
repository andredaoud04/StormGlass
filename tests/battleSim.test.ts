import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  BattleSimState,
  SIM_STEP,
  UnitSpawn,
  activateSkill,
  createBattleState,
  deployPlayerUnit,
  interpolateForRender,
  stepBattle,
} from '../src/logic/battleSim';
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
