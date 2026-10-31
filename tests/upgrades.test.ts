import { describe, expect, it } from 'vitest';
import { newSave } from '../src/game/save';
import { affordableCount, buyUpgrade, canUnlockSlot, foodRateMilli, fortressMul, maxLevel, unlockSlot, upgradeCost } from '../src/game/upgrades';
import { BALANCE } from '../src/game/balance';

describe('Gold upgrades (Food, Base)', () => {
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
    expect(foodRateMilli(s)).toBe(Math.round(1000 * (1 + BALANCE.upgrades.tracks.food.perLevel)));
    expect(upgradeCost(s, 'food')!).toBeGreaterThan(c0);
  });

  it('refuses without enough Gold and changes nothing', () => {
    const s = newSave();
    s.gold = 0;
    expect(buyUpgrade(s, 'fortress')).toBe(false);
    expect(s.upgrades.fortress).toBeUndefined();
    expect(fortressMul(s)).toBe(1);
  });

  it('stops at max level, which grows each Timeline', () => {
    const s = newSave();
    s.gold = 1e15;
    const max = BALANCE.upgrades.maxLevel;
    for (let i = 0; i < max + 5; i++) buyUpgrade(s, 'fortress');
    expect(s.upgrades.fortress).toBe(max);
    expect(upgradeCost(s, 'fortress')).toBeNull();
    expect(fortressMul(s)).toBeCloseTo(1 + max * BALANCE.upgrades.tracks.fortress.perLevel);
    s.timeline = 3;
    expect(maxLevel(s)).toBe(max + 2 * BALANCE.upgrades.maxLevelPerTimeline);
    expect(upgradeCost(s, 'fortress')).not.toBeNull();
  });

  it('prices scale with your Age', () => {
    const s = newSave();
    const stone = upgradeCost(s, 'food')!;
    s.armyAge = 3;
    expect(upgradeCost(s, 'food')!).toBeGreaterThan(stone);
  });
});

describe('slots', () => {
  it('Ranged first, then Tank; each bought once and kept', () => {
    const s = newSave();
    s.gold = 1000;
    expect(canUnlockSlot(s, 'tank')).toBe(false);
    expect(unlockSlot(s, 'ranged')).toBe(true);
    expect(s.gold).toBe(1000 - BALANCE.economy.slotUnlock.ranged);
    expect(unlockSlot(s, 'ranged')).toBe(false);
    expect(unlockSlot(s, 'tank')).toBe(true);
    expect(s.slots).toEqual(['ranged', 'tank']);
  });

  it('counts what you can afford for the tab badge', () => {
    const s = newSave();
    s.gold = 0;
    expect(affordableCount(s)).toBe(0);
    s.gold = 1000;
    expect(affordableCount(s)).toBeGreaterThan(2);
  });
});
