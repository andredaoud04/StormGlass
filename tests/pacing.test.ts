import { describe, expect, it } from 'vitest';
import { simulatePacing } from '../tools/sim/pacing';
import { BALANCE } from '../src/game/balance';
import { battleFor } from '../src/game/session';
import { runBattle, smartPolicy } from '../src/game/bots';
import { newSave } from '../src/game/save';
import { maxLevel } from '../src/game/upgrades';

describe('pacing (headless simulator, We Are Warriors format)', () => {
  const r = simulatePacing('smart');

  it('first win within 3 minutes; every boss falls; every Evolution happens in order', () => {
    expect(r.firstWinMin).not.toBeNull();
    expect(r.firstWinMin!).toBeLessThan(3);
    for (const b of r.bossesMin) expect(b).not.toBeNull();
    for (let i = 1; i < r.evolutionsMin.length; i++) expect(r.evolutionsMin[i]!).toBeGreaterThan(r.evolutionsMin[i - 1]!);
  });

  it('We Are Warriors shape: a quick Stone Age, a short Ancient Age, then 80 to 130 minutes per Age; first Prestige 5 to 10 hours', () => {
    const e = r.evolutionsMin as number[];
    expect(e[0]).toBeLessThan(20);
    expect(e[1] - e[0]).toBeGreaterThan(25);
    expect(e[1] - e[0]).toBeLessThan(70);
    for (let i = 2; i < e.length; i++) {
      const span = e[i] - e[i - 1];
      expect(span).toBeGreaterThan(80);
      expect(span).toBeLessThan(130);
    }
    expect(r.prestigeMin!).toBeGreaterThan(300);
    expect(r.prestigeMin!).toBeLessThan(600);
  });

  it('no wall: losses happen (and still pay Gold) but stay under a third of battles', () => {
    expect(r.losses / r.battles).toBeLessThan(0.34);
  });
});

describe('endless campaign', () => {
  it('on Timeline 3 most bosses are beatable with full upgrades and two Prestige Stars', () => {
    let wins = 0;
    for (let age = 0; age < BALANCE.ages.length; age++) {
      const s = newSave(1);
      s.armyAge = age;
      s.timeline = 3;
      s.prestige = 2;
      s.slots = ['ranged', 'tank'];
      const lv = maxLevel(s);
      s.upgrades = { food: lv, fortress: lv };
      s.enemyAge = age;
      s.stage = 4;
      const won = [7, 11, 19].some((seed) => runBattle(battleFor(s, { age, stage: 4 }, seed), smartPolicy(), 420).result === 'victory');
      if (won) wins++;
    }
    expect(wins).toBeGreaterThanOrEqual(5);
  });
});
