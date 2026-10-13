import test from 'node:test';
import assert from 'node:assert/strict';
import { canSpinToday, getMissions, hasClaimableMission } from '../src/logic/missions';
import { INITIAL_PROFILE } from '../src/services/storage';

const fresh = () => structuredClone(INITIAL_PROFILE);

test('fresh save has no claimable mission, so no badge', () => {
  assert.equal(hasClaimableMission(fresh()), false);
});

test('Evolution-granted melee does not complete the ranged-unlock mission', () => {
  const p = { ...fresh(), armyAge: 'ancient' as const, unlockedTroopIds: ['stone_clubber', 'ancient_hoplite'] };
  const m4 = getMissions(p).find((m) => m.id === 'm4')!;
  assert.equal(m4.progress, 0);
  assert.equal(hasClaimableMission(p), false);
});

test('unlocking a ranged troop completes m4 and lights the badge until claimed', () => {
  const p = { ...fresh(), unlockedTroopIds: ['stone_clubber', 'stone_slinger'] };
  assert.equal(hasClaimableMission(p), true);
  assert.equal(hasClaimableMission({ ...p, claimedMissionIds: ['m4'] }), false);
});

test('spin badge only before today\'s spin', () => {
  assert.equal(canSpinToday(fresh(), '2026-10-13'), true);
  assert.equal(canSpinToday({ ...fresh(), lastDailySpinDate: '2026-10-13' }, '2026-10-13'), false);
  assert.equal(canSpinToday({ ...fresh(), lastDailySpinDate: '2026-10-12' }, '2026-10-13'), true);
});
