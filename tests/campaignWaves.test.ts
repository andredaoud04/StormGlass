import test from 'node:test';
import assert from 'node:assert/strict';
import { createBattleState, createRng, stepBattle, deployPlayerUnit, type BattleSimState } from '../src/logic/battleSim';
import { campaignEnemyWave, campaignWaveSize, CAMPAIGN_ENEMY_ORDER } from '../src/logic/campaignWaves';
import { AGES } from '../src/data/gameData';
import { battle } from '../scripts/campaignPacing';

const stone = AGES[0];
const clubber = stone.units[0];

function campaign(timeline = 1): BattleSimState {
  return createBattleState({
    seed: 7, battleType: 'campaign', foodRate: 1, playerBaseHp: 420, playerBaseMaxHp: 420,
    enemyBaseMaxHp: 420, enemyRoster: stone.units, enemyWave: campaignEnemyWave(stone, timeline), timeline,
  });
}

test('wave size is order length + min(3, Timeline − 1)', () => {
  const len = CAMPAIGN_ENEMY_ORDER.stone.length;
  assert.equal(campaignWaveSize('stone', 1), len);
  assert.equal(campaignWaveSize('stone', 2), len + 1);
  assert.equal(campaignWaveSize('stone', 4), len + 3);
  assert.equal(campaignWaveSize('stone', 9), len + 3);
  assert.deepEqual(campaignEnemyWave(stone, 1).map((u) => u.role), CAMPAIGN_ENEMY_ORDER.stone);
  // Extra Timeline enemies repeat the order from the start.
  assert.equal(campaignEnemyWave(stone, 2).at(-1)!.role, CAMPAIGN_ENEMY_ORDER.stone[0]);
  for (const age of AGES) assert.ok(campaignEnemyWave(age, 1).every((u) => u.ageId === age.id));
});

test('a campaign battle spawns exactly the authored wave, then the lane stops refilling', () => {
  let s = campaign();
  const rng = createRng(1);
  const seen = new Set<string>();
  while (!s.result && s.tick < 1200) {
    s = stepBattle(s, rng).state;
    for (const u of s.units) if (u.side === 'enemy') seen.add(u.uid);
  }
  assert.equal(seen.size, campaignWaveSize('stone', 1));
  assert.equal(s.enemyWaveIndex, s.enemyWave!.length);
});

test('endless modes still spawn without a wave list', () => {
  let s = createBattleState({ seed: 1, battleType: 'survival', foodRate: 1, playerBaseHp: 1e9, playerBaseMaxHp: 1e9, enemyBaseMaxHp: 420, enemyRoster: stone.units, timeline: 1 });
  assert.equal(s.enemyWave, null);
  const rng = createRng(1);
  const seen = new Set<string>();
  while (!s.result && s.tick < 1200) { s = stepBattle(s, rng).state; for (const u of s.units) if (u.side === 'enemy') seen.add(u.uid); }
  assert.ok(seen.size > campaignWaveSize('stone', 1));
});

test('two equal troops trading blows on the same step both land, whatever the array order', () => {
  for (const enemyFirst of [true, false]) {
    let s = createBattleState({ seed: 1, battleType: 'survival', foodRate: 0, playerBaseHp: 420, playerBaseMaxHp: 420, enemyBaseMaxHp: 420, enemyRoster: [], timeline: 1 });
    const mk = (side: 'player' | 'enemy', x: number) => ({ ...s.units[0], uid: `${side}-1`, unitDefId: clubber.id, name: clubber.name, side, role: 'melee' as const, x, hp: 32, maxHp: 72, damage: 16, speed: 0, range: 4.5, attackSpeed: 1, attackCooldown: 0, isAttacking: false, isWalking: false, hitFlash: 0, stasisFrozenRemaining: 0, rallyBuffRemaining: 0, projectileType: 'none' as const });
    const p = mk('player', 48), e = mk('enemy', 52);
    s = { ...s, units: enemyFirst ? [e, p] : [p, e] };
    const rng = createRng(1);
    s = stepBattle(s, rng).state; // both swing: 32 → 16
    for (let i = 0; i < 10; i++) s = stepBattle(s, rng).state; // both swing again: 16 → 0
    assert.equal(s.units.length, 0, `enemyFirst=${enemyFirst}: both should fall together`);
  }
});

test('fresh save: deploying Clubbers wins Battle 1; doing nothing loses it', () => {
  const fresh = () => ({ gold: 18, age: 0, stage: 1, cleared: new Set<number>(), food: 1, base: 1, owned: new Set(['stone_clubber']) });
  const active = battle(fresh(), 1);
  const idle = battle(fresh(), 1, false);
  assert.equal(active.won, true);
  assert.ok(active.time > 30 && active.time < 120, `Battle 1 took ${active.time}s`);
  assert.equal(idle.won, false);
});

test('deploying with a stockpile still respects the wave (no extra enemies from commands)', () => {
  let s = { ...campaign(), foodGranted: 100 };
  const rng = createRng(3);
  for (let i = 0; i < 5; i++) s = deployPlayerUnit(s, { ...clubber, unitDefId: clubber.id }, clubber.cost);
  while (!s.result && s.tick < 600) s = stepBattle(s, rng).state;
  assert.ok(s.enemyWaveIndex <= s.enemyWave!.length);
});

test('every Age after Stone sends a tank in campaign, so tank-kill Gold exists', () => {
  assert.ok(!campaignEnemyWave(stone, 1).some((u) => u.role === 'tank'), 'Stone Battle 1 stays tank-free');
  for (const age of AGES.slice(1)) assert.ok(campaignEnemyWave(age, 1).some((u) => u.role === 'tank'), age.id);
});
