import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dungeonEntryKeyCost, campaignGoldPayout, settleLegendsFirstClear } from '../src/logic/rules';
import type { PlayerProfile } from '../src/types/game';

const profile = (overrides: Partial<PlayerProfile> = {}) => ({
  runePoints: 0,
  legendsChapter: 1,
  legendsClaimedChapterIds: [],
  ...overrides,
} as PlayerProfile);

describe('Dungeon Key settlement', () => {
  it('charges a new Rush, Legends, Bosses, or Survival entry', () => {
    for (const kind of ['rush', 'legends', 'bosses', 'survival'] as const) {
      assert.equal(dungeonEntryKeyCost(kind), 1);
    }
  });
  it('never charges campaign, Hell, continued Survival, or retry of a paid Legends chapter', () => {
    assert.equal(dungeonEntryKeyCost('campaign'), 0);
    assert.equal(dungeonEntryKeyCost('hell'), 0);
    assert.equal(dungeonEntryKeyCost('survival', { survivalWave: 2 }), 0);
    assert.equal(dungeonEntryKeyCost('legends', { freeLegendsRetry: true }), 0);
  });
  it('does not exempt a fresh Survival or Legends attempt', () => {
    assert.equal(dungeonEntryKeyCost('survival', { survivalWave: 1 }), 1);
    assert.equal(dungeonEntryKeyCost('legends', { freeLegendsRetry: false }), 1);
  });
});

describe('Campaign Gold', () => {
  it('pays 1 normal and 5 tank kills, without double application', () => {
    assert.equal(campaignGoldPayout(6, 0, false), 6);
    assert.equal(campaignGoldPayout(6, 0.25, false), 8);
  });
  it('adds existing base destruction reward only when won and applies bonus once', () => {
    assert.equal(campaignGoldPayout(6, 0.25, true), 20);
    assert.equal(campaignGoldPayout(6, 0.25, false), 8);
  });
  it('does not create rewards from negative or nonfinite amounts', () => {
    assert.equal(campaignGoldPayout(-100, -2), 0);
    assert.equal(campaignGoldPayout(Number.NaN, 0), 0);
  });
});

describe('Legends ownership', () => {
  it('awards a first chapter clear once', () => {
    const first = settleLegendsFirstClear(profile(), 1);
    assert.equal(first.runePoints, 1);
    assert.equal(first.legendsChapter, 2);
    assert.deepEqual(first.legendsClaimedChapterIds, [1]);
    const repeat = settleLegendsFirstClear(first, 1);
    assert.equal(repeat.runePoints, 1);
    assert.deepEqual(repeat.legendsClaimedChapterIds, [1]);
  });
  it('does not award a new rune for repeatedly clearing final chapter', () => {
    const previous = profile({ runePoints: 8, legendsChapter: 4, legendsClaimedChapterIds: [1, 2, 3, 4] });
    const after = settleLegendsFirstClear(previous, 4);
    assert.equal(after.runePoints, 8);
    assert.equal(after.legendsChapter, 4);
  });
  it('rejects invalid chapters without changing progress', () => {
    const previous = profile();
    assert.equal(settleLegendsFirstClear(previous, 5), previous);
    assert.equal(settleLegendsFirstClear(previous, 0), previous);
  });
});
