import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/game/balance';
import { runBattle, smartPolicy } from '../src/game/bots';
import { applySurvival, buyCard, cardCost, cardMul, claimDaily, dailyLeft, dayOf, keysLeft, survivalConfig, survivalUnlocked, useKey } from '../src/game/meta';
import { evolve, prestige } from '../src/game/progress';
import { migrate, newSave } from '../src/game/save';
import { battleFor } from '../src/game/session';
import { starGold, starPower } from '../src/game/upgrades';

describe('daily bonus', () => {
  it('the first wins of a day pay double, then it stops until the next day', () => {
    const s = newSave(1);
    const day = 100;
    const n = BALANCE.economy.daily.wins;
    expect(dailyLeft(s, day)).toBe(n);
    const before = s.gold;
    for (let i = 0; i < n; i++) expect(claimDaily(s, day, 50)).toBe(50);
    expect(s.gold).toBe(before + 50 * n);
    expect(claimDaily(s, day, 50)).toBe(0);
    expect(dailyLeft(s, day)).toBe(0);
    expect(dailyLeft(s, day + 1)).toBe(n);
    expect(claimDaily(s, day + 1, 10)).toBe(10);
  });

  it('the day follows the player time zone', () => {
    const noonUtc = 12 * 3600000;
    expect(dayOf(noonUtc, 0)).toBe(0);
    expect(dayOf(noonUtc, -780)).toBe(1); // UTC+13: already tomorrow
    expect(dayOf(noonUtc, 780)).toBe(-1);
  });
});

describe('Cards', () => {
  it('cost Gems, rise in price, strengthen that troop kind and are never lost', () => {
    const s = newSave(1);
    expect(buyCard(s, 'melee')).toBe(false);
    s.gems = 1000;
    const c0 = cardCost(s, 'melee')!;
    expect(buyCard(s, 'melee')).toBe(true);
    expect(s.gems).toBe(1000 - c0);
    expect(cardCost(s, 'melee')!).toBeGreaterThan(c0);
    expect(cardMul(s, 'melee')).toBeGreaterThan(1);
    expect(cardMul(s, 'tank')).toBe(1);
    const plain = battleFor(newSave(1), { age: 0, stage: 0 }, 1).playerTroops[0];
    const carded = battleFor(s, { age: 0, stage: 0 }, 1).playerTroops[0];
    expect(carded.hp).toBeGreaterThan(plain.hp);
    // Kept through Evolution and Prestige.
    s.beaten = [0];
    s.gold = 1e9;
    expect(evolve(s)).toBe(true);
    expect(s.cards.melee).toBe(1);
    s.armyAge = 5;
    s.beaten = [5];
    expect(prestige(s)).toBe(true);
    expect(s.cards.melee).toBe(1);
  });

  it('stop at the maximum level', () => {
    const s = newSave(1);
    s.gems = 1e9;
    for (let i = 0; i < 200; i++) buyCard(s, 'ranged');
    expect(s.cards.ranged).toBe(BALANCE.meta.cards.maxLevel);
    expect(cardCost(s, 'ranged')).toBeNull();
  });
});

describe('Survival', () => {
  it('unlocks after the first Evolution and costs one Key a run, a few Keys a day', () => {
    const s = newSave(1);
    expect(survivalUnlocked(s)).toBe(false);
    s.armyAge = 1;
    expect(survivalUnlocked(s)).toBe(true);
    const n = BALANCE.meta.survival.keysPerDay;
    for (let i = 0; i < n; i++) expect(useKey(s, 7)).toBe(true);
    expect(useKey(s, 7)).toBe(false);
    expect(keysLeft(s, 8)).toBe(n);
  });

  it('never pays Gold, cannot be won, ends in a few minutes and pays Gems per wave with a record bonus', () => {
    const s = newSave(1);
    s.armyAge = 2;
    s.enemyAge = 2;
    s.slots = ['ranged', 'tank'];
    s.upgrades = { food: 6, fortress: 6 };
    const cfg = survivalConfig(s, 4);
    const r = runBattle(cfg, smartPolicy(), 900);
    expect(r.result).toBe('defeat');
    expect(r.gold).toBe(0);
    expect(r.state.enemyBaseHp).toBe(cfg.enemyBaseHp);
    expect(r.seconds).toBeGreaterThan(60);
    expect(r.seconds).toBeLessThan(360);
    const goldBefore = s.gold;
    const first = applySurvival(s, r.state.waveNow);
    expect(first.record).toBe(true);
    expect(first.gems).toBe(r.state.waveNow * BALANCE.meta.survival.gemsPerWave + BALANCE.meta.survival.recordGems);
    expect(s.gold).toBe(goldBefore);
    const again = applySurvival(s, r.state.waveNow);
    expect(again.record).toBe(false);
    expect(again.gems).toBe(r.state.waveNow * BALANCE.meta.survival.gemsPerWave);
  });
});

describe('Prestige Stars', () => {
  it('each Prestige makes every troop stronger and every battle richer, for good', () => {
    const s = newSave(1);
    expect(starPower(s)).toBe(1);
    s.prestige = 2;
    expect(starPower(s)).toBeCloseTo(1 + 2 * BALANCE.timeline.star.power);
    expect(starGold(s)).toBeCloseTo(1 + 2 * BALANCE.timeline.star.gold);
    const a = battleFor(newSave(1), { age: 0, stage: 1 }, 1);
    const b = battleFor(s, { age: 0, stage: 1 }, 1);
    expect(b.playerTroops[0].dmg).toBeGreaterThan(a.playerTroops[0].dmg);
    expect(b.baseGoldTotal).toBeGreaterThan(a.baseGoldTotal);
  });
});

describe('save schema 5', () => {
  it('a schema 4 save gains Cards, the daily state and Survival without losing anything', () => {
    const m = migrate({ schema: 4, gold: 77, gems: 5, armyAge: 2, enemyAge: 2, stage: 3, slots: ['ranged'], upgrades: { food: 4 } });
    expect(m.gold).toBe(77);
    expect(m.gems).toBe(5);
    expect(m.upgrades.food).toBe(4);
    expect(m.cards).toEqual({ melee: 0, ranged: 0, tank: 0 });
    expect(m.daily.wins).toBe(0);
    expect(m.survivalBest).toBe(0);
  });
});
