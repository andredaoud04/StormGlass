import { describe, expect, it } from 'vitest';
import { SAVE_SCHEMA, loadSave, migrate, newSave, writeSave } from '../src/game/save';
import { BALANCE } from '../src/game/balance';

class MemStore {
  data = new Map<string, string>();
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
}

describe('save', () => {
  it('a new save starts with 18 Gold, Stone Age, only the Clubber', () => {
    const s = newSave();
    expect(s.gold).toBe(BALANCE.economy.startingGold);
    expect(s.gold).toBe(18);
    expect(s.armyAge).toBe(0);
    expect(s.slots).toEqual([]);
    expect(s.stage).toBe(0);
    expect(s.schema).toBe(SAVE_SCHEMA);
  });

  it('round-trips through storage', () => {
    const store = new MemStore();
    const s = newSave(5);
    s.gold = 77;
    s.slots.push('ranged');
    s.upgrades.food = 2;
    writeSave(store, s);
    expect(loadSave(store)).toEqual(s);
  });

  it('migrates a v0 draft save step by step to the current schema', () => {
    const m = migrate({ version: 0, gold: 40, age: 1, unlocked: ['stone_clubber', 'stone_slinger', 'bogus'] });
    expect(m.schema).toBe(SAVE_SCHEMA);
    expect(m.gold).toBe(40);
    expect(m.armyAge).toBe(1);
    expect(m.enemyAge).toBe(1);
    expect(m.slots).toEqual(['ranged']);
    expect(m.gems).toBe(0);
    expect(m.prestige).toBe(0);
  });

  it('migrates a v1 save and keeps its progress', () => {
    const m = migrate({ schema: 1, gold: 300, armyAge: 2, enemyAge: 3, timeline: 2, ownedTroops: ['stone_brute'], beaten: [0, 1, 2], stats: { battles: 12 } });
    expect(m.gold).toBe(300);
    expect(m.armyAge).toBe(2);
    // Its Crusader fortress was beaten, so the Gunpowder battles are open.
    expect(m.enemyAge).toBe(3);
    expect(m.stage).toBe(0);
    expect(m.beaten).toEqual([0, 1, 2]);
    expect(m.battleNo).toBe(12);
    expect(m.slots).toEqual(['ranged', 'tank']);
  });

  it('migrates a v2 save to campaign stages and refunds old upgrades as Gold', () => {
    const m = migrate({ schema: 2, gold: 100, armyAge: 1, enemyAge: 2, ownedTroops: ['stone_clubber', 'stone_slinger'], upgrades: { food: 2 }, beaten: [0, 1] });
    expect(m.schema).toBe(SAVE_SCHEMA);
    expect(m.gold).toBe(100 + 6 + Math.round(6 * 1.25));
    expect(m.enemyAge).toBe(2);
    expect(m.stage).toBe(0);
    expect(m.slots).toEqual(['ranged']);
    expect(m.upgrades).toEqual({});
    expect(m.beaten).toEqual([0, 1]);
  });

  it('migrates a v3 save to the We Are Warriors format and refunds the Age Camp as Gold', () => {
    const m = migrate({ schema: 3, gold: 50, armyAge: 0, enemyAge: 0, stage: 4, beaten: [0], slots: ['ranged'], camp: { food: 2, melee: 1 } });
    expect(m.schema).toBe(SAVE_SCHEMA);
    expect(m.gold).toBe(50 + 8 + Math.round(8 * 1.35) + 6);
    expect(m.upgrades).toEqual({});
    expect(m.enemyAge).toBe(1);
    expect(m.stage).toBe(0);
    expect(m.pick).toBe(-1);
    expect(m.slots).toEqual(['ranged']);
  });

  it('repairs corrupt fields instead of crashing', () => {
    const m = migrate({ schema: SAVE_SCHEMA, gold: -5, armyAge: 99, enemyAge: 'x', stage: 77, beaten: [1, 1, 'a', 42], slots: 'nope', upgrades: { food: -3, bogus: 4 }, settings: { sound: false } });
    expect(m.gold).toBe(0);
    expect(m.armyAge).toBe(BALANCE.ages.length - 1);
    expect(m.enemyAge).toBe(m.armyAge);
    expect(m.pick).toBe(-1);
    expect(m.stage).toBe(BALANCE.campaign.stagesPerAge - 1);
    expect(m.beaten).toEqual([1]);
    expect(m.slots).toEqual([]);
    expect(m.upgrades).toEqual({ food: 0 });
    expect(m.settings.sound).toBe(false);
  });

  it('falls back to a new save on garbage', () => {
    const store = new MemStore();
    store.setItem('stormglass.save', '{not json');
    expect(loadSave(store).gold).toBe(18);
    expect(migrate(null).gold).toBe(18);
  });
});
