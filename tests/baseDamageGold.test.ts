import test from 'node:test';
import assert from 'node:assert/strict';
import { createBattleState, createRng, stepBattle, BASE_GOLD_MAX_MILESTONES, type BattleSimState } from '../src/logic/battleSim';
import { campaignGoldPayout } from '../src/logic/rules';
import { AGES } from '../src/data/gameData';

const stone = AGES[0];

function hitBase(battleType: BattleSimState['battleType'], hpSequence: number[]) {
  let s = createBattleState({ seed: 1, battleType, foodRate: 0, playerBaseHp: 420, playerBaseMaxHp: 420, enemyBaseMaxHp: 400, enemyRoster: [], enemyWave: [], timeline: 1 });
  const rng = createRng(1);
  const golds: number[] = [];
  for (const hp of hpSequence) {
    s = stepBattle({ ...s, enemyBaseHp: hp }, rng).state;
    golds.push(s.goldEarnedInBattle);
  }
  return { s, golds };
}

test('campaign pays +1 Gold per full 5% of enemy base max HP removed, once each', () => {
  // 400 max HP: one milestone per 20 HP removed.
  const { golds } = hitBase('campaign', [399, 381, 380, 380, 361, 300, 300]);
  assert.deepEqual(golds, [0, 0, 1, 1, 1, 5, 5]);
});

test('base-damage Gold is capped at 20 and destruction adds the +10 bounty once at settlement', () => {
  const { s } = hitBase('campaign', [200, 0]);
  assert.equal(s.goldEarnedInBattle, BASE_GOLD_MAX_MILESTONES);
  assert.equal(s.result, 'victory');
  assert.equal(campaignGoldPayout(s.goldEarnedInBattle, 0, true), 30);
  // Coin bonus multiplies the combined total exactly once.
  assert.equal(campaignGoldPayout(s.goldEarnedInBattle, 0.25, true), 38);
});

test('partial base damage is kept on defeat/retreat (no destruction bounty)', () => {
  const { s } = hitBase('campaign', [300]);
  assert.equal(campaignGoldPayout(s.goldEarnedInBattle, 0, false), 5);
});

test('no base-damage Gold outside campaign', () => {
  for (const mode of ['rush', 'legends', 'bosses', 'survival', 'hell'] as const) {
    const { s } = hitBase(mode, [100]);
    assert.equal(s.goldEarnedInBattle, 0, mode);
  }
});

test('repairing or re-hitting the base never re-pays a milestone', () => {
  const { golds } = hitBase('campaign', [300, 400, 300, 290]);
  assert.deepEqual(golds, [5, 5, 5, 5]);
});
