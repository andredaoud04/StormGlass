import { describe, expect, it } from 'vitest';
import { newSave } from '../src/game/save';
import { applyOutcome, bossBeaten, canEvolve, canPrestige, evolve, loadout, prestige, stageNumber, STAGES } from '../src/game/progress';
import { BALANCE } from '../src/game/balance';

const win = (s: ReturnType<typeof newSave>) => applyOutcome(s, { result: 'victory', gold: 0, kills: 0, enemyAge: s.enemyAge, stage: s.stage, campaign: true });

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

describe('campaign stages', () => {
  it('has 5 stages per Age and the last one is the boss', () => {
    expect(STAGES).toBe(5);
    const s = newSave();
    for (let i = 0; i < STAGES - 1; i++) win(s);
    expect(s.stage).toBe(4);
    expect(bossBeaten(s)).toBe(false);
    expect(stageNumber(s)).toBe(5);
    win(s);
    expect(bossBeaten(s)).toBe(true);
    expect(s.stage).toBe(4);
  });

  it('winning never evolves you; only the boss unlocks Evolution', () => {
    const s = newSave();
    win(s);
    win(s);
    expect(s.armyAge).toBe(0);
    expect(s.enemyAge).toBe(0);
    expect(canEvolve(s)).toBe(false);
  });

  it('a loss or retreat replays the same stage and keeps the Gold', () => {
    const s = newSave();
    win(s);
    applyOutcome(s, { result: 'defeat', gold: 7, kills: 3, enemyAge: 0, stage: 1, campaign: true });
    applyOutcome(s, { result: 'retreat', gold: 2, kills: 0, enemyAge: 0, stage: 1, campaign: true });
    expect(s.gold).toBe(18 + 9);
    expect(s.stage).toBe(1);
  });

  it('non-campaign battles never pay Gold or move the campaign', () => {
    const s = newSave();
    applyOutcome(s, { result: 'victory', gold: 50, kills: 3, enemyAge: 0, stage: 0, campaign: false });
    expect(s.gold).toBe(18);
    expect(s.stage).toBe(0);
  });
});

describe('evolution', () => {
  it('is free after the boss, moves army and enemy together and resets the Camp', () => {
    const s = newSave();
    s.slots = ['ranged'];
    s.camp = { food: 3, melee: 2 };
    for (let i = 0; i < STAGES; i++) win(s);
    s.gold = 0;
    expect(canEvolve(s)).toBe(true);
    expect(evolve(s)).toBe(true);
    expect(s.armyAge).toBe(1);
    expect(s.enemyAge).toBe(1);
    expect(s.stage).toBe(0);
    expect(s.camp).toEqual({});
    expect(s.slots).toEqual(['ranged']);
    expect(s.gold).toBe(0);
    expect(stageNumber(s)).toBe(6);
  });

  it('there is no seventh Age', () => {
    const s = newSave();
    s.armyAge = 5;
    s.enemyAge = 5;
    s.beaten = [5];
    expect(evolve(s)).toBe(false);
    expect(BALANCE.ages.map((a) => a.id)).toEqual(['stone', 'ancient', 'crusader', 'gunpowder', 'industrial', 'future']);
  });
});

describe('prestige (endless Timelines)', () => {
  it('needs the Future boss beaten, costs nothing, restarts at Stone stage 1', () => {
    const s = newSave();
    s.armyAge = 5;
    s.enemyAge = 5;
    s.stage = 4;
    expect(canPrestige(s)).toBe(false);
    s.beaten = [0, 1, 2, 3, 4, 5];
    s.gold = 123;
    s.slots = ['ranged', 'tank'];
    expect(prestige(s)).toBe(true);
    expect(s.timeline).toBe(2);
    expect(s.prestige).toBe(1);
    expect(s.armyAge).toBe(0);
    expect(s.enemyAge).toBe(0);
    expect(s.stage).toBe(0);
    expect(s.beaten).toEqual([]);
    expect(s.gold).toBe(123);
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
  it('double speed from Stone stage 3, Stormcall from Stone stage 4, and they stay', async () => {
    const { speedUnlocked, stormcallUnlocked } = await import('../src/game/progress');
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
