import { describe, expect, it } from 'vitest';
import { newSave } from '../src/game/save';
import { buyUpgrade, foodRateMilli, fortressMul, powerMul, upgradeCost } from '../src/game/upgrades';
import { BALANCE } from '../src/game/balance';

describe('upgrades', () => {
  it('Stone Food starts at exactly 1 per second', () => {
    expect(foodRateMilli(newSave())).toBe(1000);
  });

  it('costs Gold exactly once per level and raises the stat', () => {
    const s = newSave();
    s.gold = 1000;
    const c0 = upgradeCost(s, 'food')!;
    expect(buyUpgrade(s, 'food')).toBe(true);
    expect(s.gold).toBe(1000 - c0);
    expect(s.upgrades.food).toBe(1);
    expect(foodRateMilli(s)).toBe(1100);
    expect(upgradeCost(s, 'food')!).toBeGreaterThan(c0);
  });

  it('refuses without enough Gold and changes nothing', () => {
    const s = newSave();
    s.gold = 0;
    expect(buyUpgrade(s, 'power')).toBe(false);
    expect(s.upgrades.power).toBeUndefined();
    expect(powerMul(s)).toBe(1);
  });

  it('stops at max level', () => {
    const s = newSave();
    s.gold = 1e15;
    const max = BALANCE.upgrades.fortress.maxLevel;
    for (let i = 0; i < max + 5; i++) buyUpgrade(s, 'fortress');
    expect(s.upgrades.fortress).toBe(max);
    expect(upgradeCost(s, 'fortress')).toBeNull();
    expect(fortressMul(s)).toBeCloseTo(1 + max * BALANCE.upgrades.fortress.perLevel);
  });

  it('every curve is bounded: finite costs and finite stats at max level', () => {
    for (const u of Object.values(BALANCE.upgrades)) {
      const last = u.baseCost * Math.pow(u.costGrowth, u.maxLevel - 1);
      expect(Number.isFinite(last)).toBe(true);
      expect(1 + u.maxLevel * u.perLevel).toBeLessThan(10);
    }
  });
});
