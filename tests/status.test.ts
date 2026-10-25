import { describe, expect, it } from 'vitest';
import { createBattle, stepBattle } from '../src/sim/battle';
import { applyStatus, slowFactor } from '../src/sim/status';
import type { BattleConfig, BattleState, TroopStats, Unit } from '../src/sim/types';
import { buildBattleConfig } from '../src/game/battleSetup';

function setup(): { s: BattleState; u: Unit } {
  const c: BattleConfig = {
    ...buildBattleConfig({ seed: 3, loadout: ['stone_brute'], enemyAge: 0, armyAge: 0, timeline: 1 }),
    wave: { spawns: [[0.05, 'tank']], loopFrom: 0, loopPeriod: 1000 },
  };
  const s = createBattle(c);
  stepBattle(s);
  const u = s.units.find((x) => x.side === 1)!;
  u.hp = u.maxHp = 1e9; // survive any amount of damage-over-time
  return { s, u };
}

describe('poison', () => {
  it('caps at 5 stacks and expires 4 s after the last hit', () => {
    const { s, u } = setup();
    for (let i = 0; i < 20; i++) applyStatus(s, u, 'poison', 100);
    expect(u.poison.stacks).toBe(5);
    const before = u.hp;
    for (let i = 0; i < 20; i++) stepBattle(s);
    expect(before - u.hp).toBeCloseTo(5 * 100 * 0.08, 5);
    for (let i = 0; i < 100; i++) stepBattle(s);
    expect(u.poison.stacks).toBe(0);
    const after = u.hp;
    for (let i = 0; i < 40; i++) stepBattle(s);
    expect(u.hp).toBe(after);
  });
});

describe('burn', () => {
  it('does not stack; stronger replaces weaker, weaker does nothing', () => {
    const { s, u } = setup();
    applyStatus(s, u, 'burn', 100);
    expect(u.burn.dps).toBeCloseTo(20);
    applyStatus(s, u, 'burn', 50);
    expect(u.burn.dps).toBeCloseTo(20);
    applyStatus(s, u, 'burn', 300);
    expect(u.burn.dps).toBeCloseTo(60);
    for (let i = 0; i < 61; i++) stepBattle(s);
    expect(u.burn.ticks).toBe(0);
  });
});

describe('cold', () => {
  it('caps at 3 stacks (45% slow) and never stops a unit', () => {
    const { s, u } = setup();
    for (let i = 0; i < 50; i++) applyStatus(s, u, 'cold', 10);
    expect(u.cold.stacks).toBe(3);
    expect(slowFactor(s, u)).toBeCloseTo(0.55);
  });

  it('a unit hit with Cold every tick forever still walks and attacks', () => {
    const { s, u } = setup();
    const x0 = u.x;
    for (let i = 0; i < 20 * 30; i++) {
      applyStatus(s, u, 'cold', 10);
      stepBattle(s);
    }
    expect(u.x).toBeLessThan(x0 - 100); // still advanced across the lane
    expect(slowFactor(s, u)).toBeGreaterThan(0.5);
  });

  it('expires 2.5 s after the last hit', () => {
    const { s, u } = setup();
    applyStatus(s, u, 'cold', 10);
    for (let i = 0; i < 50; i++) stepBattle(s);
    expect(slowFactor(s, u)).toBe(1);
  });
});

describe('bosses', () => {
  it('take half-strength effects', () => {
    const { s, u } = setup();
    u.def = { ...u.def, boss: true } as TroopStats;
    applyStatus(s, u, 'burn', 100);
    expect(u.burn.dps).toBeCloseTo(10);
    for (let i = 0; i < 3; i++) applyStatus(s, u, 'cold', 10);
    expect(slowFactor(s, u)).toBeCloseTo(1 - 0.45 * 0.5);
  });
});

describe('effect sources', () => {
  it('a troop with onHit effects applies them in a real battle', () => {
    const base = buildBattleConfig({ seed: 5, loadout: ['stone_clubber'], enemyAge: 0, armyAge: 0, timeline: 1 });
    const c: BattleConfig = { ...base, playerTroops: [{ ...base.playerTroops[0], onHit: ['poison', 'cold'] }] };
    const s = createBattle(c);
    let saw = 0;
    while (s.tick < 20 * 30 && !s.result) {
      stepBattle(s, s.foodMilli >= 5000 ? [{ type: 'deploy', slot: 0 }] : []);
      saw += s.events.filter((e) => e.type === 'status').length;
    }
    expect(saw).toBeGreaterThan(0);
  });
});
