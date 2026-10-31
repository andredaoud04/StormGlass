import { describe, expect, it } from 'vitest';
import { simulatePacing } from '../tools/sim/pacing';
import { BALANCE } from '../src/game/balance';
import { buildBattleConfig } from '../src/game/battleSetup';
import { runBattle, smartPolicy } from '../src/game/bots';
import { loadout } from '../src/game/progress';
import { newSave } from '../src/game/save';
import { fortressMul, foodRateMilli, maxLevel } from '../src/game/upgrades';

describe('pacing (headless simulator, We Are Warriors format)', () => {
  const r = simulatePacing('smart');

  it('first win within 3 minutes; every boss falls; every Evolution happens in order', () => {
    expect(r.firstWinMin).not.toBeNull();
    expect(r.firstWinMin!).toBeLessThan(3);
    for (const b of r.bossesMin) expect(b).not.toBeNull();
    for (let i = 1; i < r.evolutionsMin.length; i++) expect(r.evolutionsMin[i]!).toBeGreaterThan(r.evolutionsMin[i - 1]!);
  });

  it('a slow climb: Ages after Stone take 60 to 130 minutes each; first Prestige 5 to 10 hours', () => {
    const e = r.evolutionsMin as number[];
    expect(e[0]).toBeGreaterThan(25);
    for (let i = 1; i < e.length; i++) {
      const span = e[i] - e[i - 1];
      expect(span).toBeGreaterThan(60);
      expect(span).toBeLessThan(130);
    }
    expect(r.prestigeMin!).toBeGreaterThan(300);
    expect(r.prestigeMin!).toBeLessThan(600);
  });

  it('no wall: the frontier is rarely lost', () => {
    expect(r.losses / r.battles).toBeLessThan(0.25);
  });
});

describe('endless campaign', () => {
  it('on Timeline 3 every boss is beatable with full upgrades', () => {
    for (let age = 0; age < BALANCE.ages.length; age++) {
      const s = newSave(1);
      s.armyAge = age;
      s.timeline = 3;
      s.slots = ['ranged', 'tank'];
      const lv = maxLevel(s);
      s.upgrades = { food: lv, fortress: lv };
      const cfg = buildBattleConfig({ seed: 7, loadout: loadout(s), enemyAge: age, stage: 4, armyAge: age, timeline: 3, foodRateMilli: foodRateMilli(s), fortressMul: fortressMul(s), campaign: true, stormcall: true });
      expect(runBattle(cfg, smartPolicy(), 300).result, BALANCE.ages[age].id).toBe('victory');
    }
  });
});
