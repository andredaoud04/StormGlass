import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { advanceBattleClock } from '../src/logic/battleClock';

describe('100ms battle scheduling', () => {
  it('keeps the same step count at 30/60/120 frames per second', () => {
    for (const fps of [30, 60, 120]) {
      let remainder = 0;
      let ticks = 0;
      for (let i = 0; i < fps * 10; i++) {
        const step = advanceBattleClock(remainder, 1000 / fps);
        ticks += step.ticks;
        remainder = step.remainderMs;
      }
      assert.equal(ticks, 100);
    }
  });
  it('does not advance on a partial tick or during pause', () => {
    const partial = advanceBattleClock(0, 99);
    assert.equal(partial.ticks, 0);
    assert.equal(advanceBattleClock(partial.remainderMs, 1).ticks, 1);
    assert.equal(advanceBattleClock(99, 5000, true).ticks, 0);
  });
  it('caps stalls without storing catch-up backlog', () => {
    const stall = advanceBattleClock(0, 30000);
    assert.equal(stall.ticks, 5);
    assert.equal(stall.remainderMs, 0);
    assert.equal(advanceBattleClock(stall.remainderMs, 0).ticks, 0);
  });
});
