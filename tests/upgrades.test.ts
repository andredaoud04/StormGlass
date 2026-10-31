import { describe, expect, it } from 'vitest';
import { newSave } from '../src/game/save';
import { affordableCount, buyUpgrade, canUnlockSlot, foodRateMilli, fortressMul, kindMul, maxLevel, unlockSlot, upgradeCost } from '../src/game/upgrades';
import { BALANCE } from '../src/game/balance';

describe('Age Camp', () => {
  it('Stone Food starts at exactly 1 per second', () => {
    expect(foodRateMilli(newSave())).toBe(1000);
  });

  it('costs Gold exactly once per level and raises the stat', () => {
    const s = newSave();
    s.gold = 1000;
    const c0 = upgradeCost(s, 'food')!;
    expect(buyUpgrade(s, 'food')).toBe(true);
    expect(s.gold).toBe(1000 - c0);
    expect(s.camp.food).toBe(1);
    expect(foodRateMilli(s)).toBe(Math.round(1000 * (1 + BALANCE.camp.tracks.food.perLevel)));
    expect(upgradeCost(s, 'food')!).toBeGreaterThan(c0);
  });

  it('refuses without enough Gold and changes nothing', () => {
    const s = newSave();
    s.gold = 0;
    expect(buyUpgrade(s, 'melee')).toBe(false);
    expect(s.camp.melee).toBeUndefined();
    expect(kindMul(s).melee).toBe(1);
  });

  it('cannot train ranged or tank before the slot is bought', () => {
    const s = newSave();
    s.gold = 1e6;
    expect(buyUpgrade(s, 'ranged')).toBe(false);
    expect(buyUpgrade(s, 'tank')).toBe(false);
  });

  it('stops at max level, which grows each Timeline', () => {
    const s = newSave();
    s.gold = 1e15;
    const max = BALANCE.camp.maxLevel;
    for (let i = 0; i < max + 5; i++) buyUpgrade(s, 'fortress');
    expect(s.camp.fortress).toBe(max);
    expect(upgradeCost(s, 'fortress')).toBeNull();
    expect(fortressMul(s)).toBeCloseTo(1 + max * BALANCE.camp.tracks.fortress.perLevel);
    s.timeline = 3;
    expect(maxLevel(s)).toBe(max + 2 * BALANCE.camp.maxLevelPerTimeline);
    expect(upgradeCost(s, 'fortress')).not.toBeNull();
  });

  it('prices restart low in every Age but scale with the Age', () => {
    const s = newSave();
    const stone = upgradeCost(s, 'melee')!;
    s.armyAge = 3;
    expect(upgradeCost(s, 'melee')!).toBeGreaterThan(stone);
  });

  it('every curve is bounded: finite costs and finite stats at max level', () => {
    const top = BALANCE.camp.maxLevel + 50 * BALANCE.camp.maxLevelPerTimeline;
    for (const t of Object.values(BALANCE.camp.tracks)) {
      const last = t.baseCost * Math.pow(BALANCE.camp.ageCostGrowth, 5) * Math.pow(BALANCE.camp.costGrowth, top);
      expect(Number.isFinite(last)).toBe(true);
    }
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
