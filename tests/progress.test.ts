import { describe, expect, it } from 'vitest';
import { newSave } from '../src/game/save';
import { applyOutcome, battleNumber, bossBeaten, canEvolve, canPrestige, evolve, evolveCost, evolveUnlocked, frontier, loadout, pickBattle, prestige, selected, speedUnlocked, STAGES, stormcallUnlocked } from '../src/game/progress';
import { BALANCE } from '../src/game/balance';

type Save = ReturnType<typeof newSave>;
const fight = (s: Save, result: 'victory' | 'defeat' | 'retreat', gold = 0) => {
  const r = selected(s);
  applyOutcome(s, { result, gold, kills: 0, enemyAge: r.age, stage: r.stage, campaign: true });
};
const winStone = (s: Save) => {
  for (let i = 0; i < STAGES; i++) fight(s, 'victory');
};

describe('loadout', () => {
  it('a new player owns only the Clubber', () => {
    expect(loadout(newSave())).toEqual(['stone_clubber']);
  });

  it('slots fill with your Age’s troops, ordered melee, ranged, tank', () => {
    const s = newSave();
    s.slots = ['ranged', 'tank'];
    expect(loadout(s)).toEqual(['stone_clubber', 'stone_slinger', 'stone_brute']);
    s.armyAge = 2;
    expect(loadout(s)).toEqual(['crusader_footman', 'crusader_crossbow', 'crusader_knight']);
  });
});

describe('battles', () => {
  it('are numbered in order: 4 battles then a boss per Age', () => {
    expect(STAGES).toBe(5);
    const s = newSave();
    expect(battleNumber(selected(s))).toBe(1);
    for (let i = 0; i < STAGES - 1; i++) fight(s, 'victory');
    expect(battleNumber(selected(s))).toBe(5);
    expect(bossBeaten(s, 0)).toBe(false);
    fight(s, 'victory');
    expect(bossBeaten(s, 0)).toBe(true);
    // The next Age's battles open, but your army does not change.
    expect(battleNumber(selected(s))).toBe(6);
    expect(s.enemyAge).toBe(1);
    expect(s.armyAge).toBe(0);
  });

  it('a loss or retreat keeps the Gold and the battle', () => {
    const s = newSave();
    fight(s, 'victory');
    fight(s, 'defeat', 7);
    fight(s, 'retreat', 2);
    expect(s.gold).toBe(18 + 9);
    expect(frontier(s)).toBe(1);
  });

  it('earlier battles can be replayed for Gold without moving the frontier', () => {
    const s = newSave();
    fight(s, 'victory');
    fight(s, 'victory');
    pickBattle(s, -1);
    expect(battleNumber(selected(s))).toBe(2);
    pickBattle(s, -5);
    expect(battleNumber(selected(s))).toBe(1);
    fight(s, 'victory', 40);
    expect(s.gold).toBe(18 + 40);
    expect(frontier(s)).toBe(2);
    pickBattle(s, 9);
    expect(battleNumber(selected(s))).toBe(3);
    expect(s.pick).toBe(-1);
  });

  it('non-campaign battles never pay Gold or move the campaign', () => {
    const s = newSave();
    applyOutcome(s, { result: 'victory', gold: 50, kills: 3, enemyAge: 0, stage: 0, campaign: false });
    expect(s.gold).toBe(18);
    expect(frontier(s)).toBe(0);
  });
});

describe('evolution (We Are Warriors format)', () => {
  it('opens after your Age’s boss and costs Gold', () => {
    const s = newSave();
    s.gold = 1e9;
    expect(evolveUnlocked(s)).toBe(false);
    expect(canEvolve(s)).toBe(false);
    winStone(s);
    expect(evolveUnlocked(s)).toBe(true);
    s.gold = (evolveCost(s) ?? 0) - 1;
    expect(canEvolve(s)).toBe(false);
    s.gold += 1;
    expect(canEvolve(s)).toBe(true);
  });

  it('resets Gold and upgrades, keeps slots, never changes the frontier', () => {
    const s = newSave();
    winStone(s);
    s.slots = ['ranged'];
    s.upgrades = { food: 5, fortress: 3 };
    s.gold = (evolveCost(s) ?? 0) + 777;
    const f = frontier(s);
    expect(evolve(s)).toBe(true);
    expect(s.armyAge).toBe(1);
    expect(s.gold).toBe(0);
    expect(s.upgrades).toEqual({});
    expect(s.slots).toEqual(['ranged']);
    expect(frontier(s)).toBe(f);
    // The next Evolution needs the Ancient boss.
    s.gold = 1e9;
    expect(canEvolve(s)).toBe(false);
  });

  it('costs rise every Age and there is no seventh Age', () => {
    const c = BALANCE.evolution.cost;
    for (let i = 2; i < c.length; i++) expect(c[i]).toBeGreaterThan(c[i - 1]);
    const s = newSave();
    s.armyAge = 5;
    s.enemyAge = 5;
    s.beaten = [5];
    s.gold = 1e12;
    expect(evolveCost(s)).toBeNull();
    expect(evolve(s)).toBe(false);
    expect(BALANCE.ages.map((a) => a.id)).toEqual(['stone', 'ancient', 'crusader', 'gunpowder', 'industrial', 'future']);
  });
});

describe('prestige (endless Timelines)', () => {
  it('needs a Future army and the Future boss, costs nothing, restarts at battle 1', () => {
    const s = newSave();
    s.armyAge = 5;
    s.enemyAge = 5;
    s.stage = 4;
    expect(canPrestige(s)).toBe(false);
    s.beaten = [0, 1, 2, 3, 4, 5];
    s.slots = ['ranged', 'tank'];
    s.upgrades = { food: 9 };
    expect(prestige(s)).toBe(true);
    expect(s.timeline).toBe(2);
    expect(s.prestige).toBe(1);
    expect(s.armyAge).toBe(0);
    expect(frontier(s)).toBe(0);
    expect(s.beaten).toEqual([]);
    expect(s.upgrades).toEqual({});
    expect(s.slots).toEqual(['ranged', 'tank']);
  });

  it('there is always another Timeline', () => {
    const s = newSave();
    for (let t = 0; t < 20; t++) {
      s.armyAge = 5;
      s.enemyAge = 5;
      s.beaten = [5];
      expect(prestige(s)).toBe(true);
    }
    expect(s.timeline).toBe(21);
  });
});

describe('unlocks by campaign progress', () => {
  it('double speed from Stone stage 3, Stormcall from Stone stage 4, and they stay', () => {
    const s = newSave();
    expect(speedUnlocked(s)).toBe(false);
    expect(stormcallUnlocked(s)).toBe(false);
    s.stage = 2;
    expect(speedUnlocked(s)).toBe(true);
    expect(stormcallUnlocked(s)).toBe(false);
    s.stage = 3;
    expect(stormcallUnlocked(s)).toBe(true);
    s.enemyAge = 1;
    s.stage = 0;
    expect(speedUnlocked(s) && stormcallUnlocked(s)).toBe(true);
  });
});
