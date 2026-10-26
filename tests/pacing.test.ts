import { describe, expect, it } from 'vitest';
import { simulatePacing } from '../tools/sim/pacing';

describe('pacing (headless simulator)', () => {
  it('a smart player reaches the first Prestige in roughly an hour', () => {
    const r = simulatePacing('smart');
    expect(r.firstWinMin).not.toBeNull();
    expect(r.firstWinMin!).toBeLessThan(3);
    expect(r.prestigeMin).not.toBeNull();
    expect(r.prestigeMin!).toBeGreaterThan(30);
    expect(r.prestigeMin!).toBeLessThan(100);
    // Every Evolution happens, in order.
    for (let i = 1; i < r.evolutionsMin.length; i++) expect(r.evolutionsMin[i]!).toBeGreaterThanOrEqual(r.evolutionsMin[i - 1]!);
  });

  it('battles last about a minute on average', () => {
    const r = simulatePacing('smart');
    expect(r.avgBattleSec).toBeGreaterThan(40);
    expect(r.avgBattleSec).toBeLessThan(100);
  });
});
