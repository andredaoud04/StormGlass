import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dungeonEntryKeyCost, campaignGoldPayout, settleLegendsFirstClear, claimDailyCrate, isDailyCrateClaimed, msUntilNextUtcDay, utcDateKey } from '../src/logic/rules';
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

describe('Daily crate', () => {
  const base = { gold: 40, gems: 100, keys: 2, lastDailyClaimDate: null } as unknown as PlayerProfile;
  it('grants +25 Gems and +1 Key, never Gold', () => {
    const claimed = claimDailyCrate(base, '2026-10-13');
    assert.equal(claimed.gems, 125);
    assert.equal(claimed.keys, 3);
    assert.equal(claimed.gold, 40);
    assert.equal(claimed.lastDailyClaimDate, '2026-10-13');
    assert.ok(isDailyCrateClaimed(claimed, '2026-10-13'));
  });
  it('second same-day claim is a no-op', () => {
    const once = claimDailyCrate(base, '2026-10-13');
    const twice = claimDailyCrate(once, '2026-10-13');
    assert.equal(twice, once);
    assert.equal(twice.gems, 125);
    assert.equal(twice.keys, 3);
  });
  it('next UTC day can be claimed again', () => {
    const next = claimDailyCrate(claimDailyCrate(base, '2026-10-13'), '2026-10-14');
    assert.equal(next.gems, 150);
    assert.equal(next.keys, 4);
  });
  it('rejects malformed dates', () => {
    assert.equal(claimDailyCrate(base, ''), base);
  });
  it('reports time until the next UTC midnight', () => {
    assert.equal(msUntilNextUtcDay(new Date('2026-10-13T18:30:00Z')), 5.5 * 3600 * 1000);
    assert.equal(utcDateKey(new Date('2026-10-13T23:59:59Z')), '2026-10-13');
  });
});
