import { describe, expect, it } from 'vitest';
import { newSave } from '../src/game/save';
import { applyOutcome, canEvolve, canPrestige, canUnlock, evolve, evolveCost, loadout, prestige, unlockTroop } from '../src/game/progress';
import { BALANCE } from '../src/game/balance';

describe('loadout', () => {
  it('a new player owns only the Clubber', () => {
    expect(loadout(newSave())).toEqual(['stone_clubber']);
  });

  it('never exceeds 3 slots and is ordered melee, ranged, tank', () => {
    const s = newSave();
    s.ownedTroops.push('stone_brute', 'stone_slinger');
    expect(loadout(s)).toEqual(['stone_clubber', 'stone_slinger', 'stone_brute']);
  });

  it('only current and previous Age troops are deployable', () => {
    const s = newSave();
    s.ownedTroops.push('stone_slinger', 'stone_brute');
    s.armyAge = 1;
    const l = loadout(s);
    expect(l).toEqual(['ancient_spearman', 'stone_slinger', 'stone_brute']);
    s.armyAge = 2;
    expect(loadout(s)).toEqual(['crusader_footman']);
  });
});

describe('unlocks', () => {
  it('costs Gold once and persists', () => {
    const s = newSave();
    s.gold = 30;
    expect(canUnlock(s, 'stone_slinger')).toBe(true);
    expect(unlockTroop(s, 'stone_slinger')).toBe(true);
    expect(s.gold).toBe(30 - BALANCE.ages[0].troops[1].unlockGold);
    expect(unlockTroop(s, 'stone_slinger')).toBe(false);
    expect(s.ownedTroops.filter((t) => t === 'stone_slinger')).toHaveLength(1);
  });

  it('cannot unlock without enough Gold or for another Age', () => {
    const s = newSave();
    s.gold = 5;
    expect(unlockTroop(s, 'stone_slinger')).toBe(false);
    s.gold = 1e6;
    expect(unlockTroop(s, 'ancient_archer')).toBe(false);
  });
});

describe('battle outcomes', () => {
  it('pays campaign Gold exactly once, also on defeat and retreat', () => {
    const s = newSave();
    applyOutcome(s, { result: 'defeat', gold: 7, kills: 3, enemyAge: 0, campaign: true });
    applyOutcome(s, { result: 'retreat', gold: 2, kills: 0, enemyAge: 0, campaign: true });
    expect(s.gold).toBe(18 + 9);
    expect(s.enemyAge).toBe(0);
  });

  it('non-campaign battles never pay Gold', () => {
    const s = newSave();
    applyOutcome(s, { result: 'victory', gold: 50, kills: 3, enemyAge: 0, campaign: false });
    expect(s.gold).toBe(18);
    expect(s.enemyAge).toBe(0);
  });

  it('a win advances the next enemy one Age but never changes your army', () => {
    const s = newSave();
    applyOutcome(s, { result: 'victory', gold: 20, kills: 5, enemyAge: 0, campaign: true });
    expect(s.enemyAge).toBe(1);
    expect(s.armyAge).toBe(0);
    expect(s.beaten).toEqual([0]);
  });

  it('the enemy never goes past the Future Age', () => {
    const s = newSave();
    s.enemyAge = 5;
    applyOutcome(s, { result: 'victory', gold: 0, kills: 0, enemyAge: 5, campaign: true });
    expect(s.enemyAge).toBe(5);
  });
});

describe('evolution', () => {
  it('costs Gold until that Age is beaten, then is free', () => {
    const s = newSave();
    expect(evolveCost(s)).toBe(BALANCE.ages[1].evolveGold);
    s.gold = 0;
    expect(canEvolve(s)).toBe(false);
    s.beaten.push(1);
    expect(evolveCost(s)).toBe(0);
    expect(evolve(s)).toBe(true);
    expect(s.armyAge).toBe(1);
    expect(s.gold).toBe(0);
  });

  it('there is no seventh Age', () => {
    const s = newSave();
    s.armyAge = 5;
    s.gold = 1e9;
    expect(evolveCost(s)).toBeNull();
    expect(evolve(s)).toBe(false);
    expect(BALANCE.ages.map((a) => a.id)).toEqual(['stone', 'ancient', 'crusader', 'gunpowder', 'industrial', 'future']);
  });
});

describe('prestige', () => {
  it('needs a Future army and a beaten Future fortress, costs nothing', () => {
    const s = newSave();
    s.armyAge = 5;
    expect(canPrestige(s)).toBe(false);
    s.beaten = [0, 1, 2, 3, 4, 5];
    s.gold = 123;
    s.ownedTroops.push('stone_slinger');
    expect(prestige(s)).toBe(true);
    expect(s.timeline).toBe(2);
    expect(s.prestige).toBe(1);
    expect(s.armyAge).toBe(0);
    expect(s.enemyAge).toBe(0);
    expect(s.beaten).toEqual([]);
    expect(s.gold).toBe(123);
    expect(s.ownedTroops).toContain('stone_slinger');
  });

  it('cannot prestige with a beaten Future enemy but an older army', () => {
    const s = newSave();
    s.armyAge = 4;
    s.beaten = [5];
    expect(prestige(s)).toBe(false);
  });
});
