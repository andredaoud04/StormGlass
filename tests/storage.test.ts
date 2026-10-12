import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_PROFILE, loadProfile, saveProfile } from '../src/services/storage';

const values = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => { values.set(key, value); },
  removeItem: (key: string) => { values.delete(key); },
};
Object.assign(globalThis, { localStorage: localStorageMock });
beforeEach(() => values.clear());

describe('Persistent player saves', () => {
  it('round trips campaign and permanent collection progress', () => {
    const player = {
      ...INITIAL_PROFILE,
      gold: 123,
      gems: 99,
      timeline: 3,
      armyAge: 'crusader' as const,
      unlockedTroopIds: ['stone_clubber', 'stone_slinger', 'crusader_swordsman'],
      legendsClaimedChapterIds: [1, 2],
      claimedMissionIds: ['m2'],
    };
    saveProfile(player);
    const actual = loadProfile();
    assert.equal(actual.gold, 123);
    assert.equal(actual.gems, 99);
    assert.equal(actual.timeline, 3);
    assert.deepEqual(actual.unlockedTroopIds, player.unlockedTroopIds);
    assert.deepEqual(actual.legendsClaimedChapterIds, [1, 2]);
    assert.deepEqual(actual.claimedMissionIds, ['m2']);
  });

  it('migrates old Legends clears without reissuing first-clear rewards', () => {
    localStorageMock.setItem('stormglass-save-v1', JSON.stringify({
      ...INITIAL_PROFILE,
      legendsChapter: 4,
      legendsClaimedChapterIds: undefined,
      gold: 170,
    }));
    const actual = loadProfile();
    assert.deepEqual(actual.legendsClaimedChapterIds, [1, 2, 3]);
    assert.equal(actual.gold, 170);
  });

  it('repairs negative/nonfinite currencies while preserving legitimate balances', () => {
    localStorageMock.setItem('stormglass-save-v1', JSON.stringify({
      ...INITIAL_PROFILE, gold: -30, gems: 76, keys: -3, runePoints: 'NaN',
      lastDailyKeyRefillDate: new Date().toISOString().slice(0, 10),
    }));
    const actual = loadProfile();
    assert.equal(actual.gold, 0);
    assert.equal(actual.gems, 76);
    assert.equal(actual.keys, 0);
    assert.equal(actual.runePoints, 0);
  });

  it('backs up invalid saves before returning safe defaults', () => {
    localStorageMock.setItem('stormglass-save-v1', '{"invalidJson":');
    const actual = loadProfile();
    assert.equal(actual.armyAge, INITIAL_PROFILE.armyAge);
    assert.equal(localStorageMock.getItem('stormglass-save-v1-recovery'), '{"invalidJson":');
  });
});
