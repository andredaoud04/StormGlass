import { describe, expect, it } from 'vitest';
import { buildBattleConfig } from '../src/game/battleSetup';
import { createBattle, stepBattle } from '../src/sim/battle';
import type { BattleConfig, SimEvent } from '../src/sim/types';

const QUIET = { spawns: [[9999, 'melee']] as [number, 'melee'][], loopFrom: 0, loopPeriod: 9999 };
const base = (over: Partial<BattleConfig> = {}): BattleConfig => ({ ...buildBattleConfig({ seed: 5, loadout: ['crusader_footman', 'crusader_crossbow', 'crusader_knight'], enemyAge: 2, stage: 1, armyAge: 2, timeline: 1 }), wave: QUIET, ...over });

function run(cfg: BattleConfig, ticks: number, each?: (s: ReturnType<typeof createBattle>, i: number) => void): { s: ReturnType<typeof createBattle>; events: SimEvent[] } {
  const s = createBattle(cfg);
  const events: SimEvent[] = [];
  for (let i = 0; i < ticks && !s.result; i++) {
    each?.(s, i);
    events.push(...stepBattle(s));
  }
  return { s, events };
}

describe('garrisons (D42)', () => {
  it('the enemy garrison charges out once per threshold as its fortress is worn down', () => {
    const cfg = base();
    const { events } = run(cfg, 400, (s, i) => {
      if (i === 10) s.enemyBaseHp = cfg.enemyBaseHp * 0.39;
      if (i === 60) s.enemyBaseHp = cfg.enemyBaseHp * 0.2;
    });
    const sorties = events.filter((e) => e.type === 'sortie' && e.side === 1);
    expect(sorties).toHaveLength(cfg.sortie!.thresholds.length);
    const spawned = events.filter((e) => e.type === 'spawn' && e.side === 1).length;
    expect(spawned).toBe(cfg.sortie!.units.reduce((a, u) => a + u.length, 0));
  });

  it('your garrison rallies when your fortress is breached, and holds the middle instead of winning for you', () => {
    const cfg = base({ towers: undefined });
    const { s, events } = run(cfg, 900, (st, i) => {
      if (i === 5) st.playerBaseHp = cfg.playerBaseHp * 0.75;
    });
    expect(events.filter((e) => e.type === 'sortie' && e.side === 0)).toHaveLength(1);
    const mine = s.units.filter((u) => u.alive && u.side === 0);
    expect(mine.length).toBe(cfg.rally!.units[0].length);
    for (const u of mine) expect(u.x).toBeLessThanOrEqual(cfg.laneLength * cfg.rally!.leash! + 5);
    expect(s.enemyBaseHp).toBe(cfg.enemyBaseHp);
  });

  it('a garrison is stronger than the ordinary troops of its side', () => {
    const cfg = base();
    expect(cfg.sortie!.troops.melee.hp).toBeGreaterThan(cfg.enemyTroops.melee.hp);
    expect(cfg.rally!.troops.melee.dmg).toBeGreaterThan(cfg.playerTroops[0].dmg);
  });
});

describe('guard towers (D42)', () => {
  it('a fortress shoots attackers at its gate, and only there', () => {
    const cfg = base({ wave: { spawns: [[0.05, 'melee']], loopFrom: 0, loopPeriod: 9999 }, playerBaseHp: 1e9 });
    const { events } = run(cfg, 20 * 40);
    const shots = events.filter((e) => e.type === 'towerShot' && e.side === 0);
    expect(shots.length).toBeGreaterThanOrEqual(2);
    // The lone attacker dies to the tower before it can do much.
    expect(events.some((e) => e.type === 'death' && e.side === 1)).toBe(true);
    // Nothing is shot in mid-lane: the first shot comes only after the walk down the lane.
    const cfg2 = base({ playerBaseHp: 1e9 });
    const s = createBattle(cfg2);
    const early: SimEvent[] = [];
    for (let i = 0; i < 40; i++) early.push(...stepBattle(s));
    expect(early.some((e) => e.type === 'towerShot')).toBe(false);
  });

  it("your tower grows with the Base upgrade; the enemy's is weaker than its troops", () => {
    const a = buildBattleConfig({ seed: 1, loadout: ['stone_clubber'], enemyAge: 0, stage: 2, armyAge: 0, timeline: 1, fortressMul: 1 });
    const b = buildBattleConfig({ seed: 1, loadout: ['stone_clubber'], enemyAge: 0, stage: 2, armyAge: 0, timeline: 1, fortressMul: 2 });
    expect(b.towers![0].dmg).toBeGreaterThan(a.towers![0].dmg * 1.8);
    expect(a.towers![1].dmg).toBeLessThan(a.enemyTroops.melee.dmg);
  });
});

describe('card reload (D42)', () => {
  it('a card cannot be sent again until it reloads; the heavy takes longest', () => {
    const cfg = base();
    const s = createBattle(cfg);
    s.foodMilli = 1_000_000;
    stepBattle(s, [{ type: 'deploy', slot: 2 }]);
    const ev = stepBattle(s, [{ type: 'deploy', slot: 2 }]);
    expect(ev.some((e) => e.type === 'deployFail' && e.reason === 'cooldown')).toBe(true);
    expect(s.units.filter((u) => u.side === 0)).toHaveLength(1);
    // Other cards are not blocked.
    stepBattle(s, [{ type: 'deploy', slot: 0 }]);
    expect(s.units.filter((u) => u.side === 0)).toHaveLength(2);
    const [m, r, t] = cfg.playerTroops.map((p) => p.redeployTicks!);
    expect(t).toBeGreaterThan(r);
    expect(r).toBeGreaterThan(m);
    // A failed deploy spends no Food.
    const before = s.foodMilli;
    stepBattle(s, [{ type: 'deploy', slot: 2 }]);
    expect(s.foodMilli).toBeGreaterThanOrEqual(before);
    for (let i = 0; i < t; i++) stepBattle(s);
    stepBattle(s, [{ type: 'deploy', slot: 2 }]);
    expect(s.units.filter((u) => u.side === 0 && u.def.kind === 'tank')).toHaveLength(2);
  });
});

describe('counter triangle (D42)', () => {
  it('melee beats ranged, ranged beats tanks, tanks beat melee', () => {
    const m = base().combat.matchup;
    expect(m.melee!.ranged).toBeGreaterThan(1);
    expect(m.ranged!.tank).toBeGreaterThan(1);
    expect(m.tank!.melee).toBeGreaterThan(1);
  });
});

describe('War Horn and the Hero (D44)', () => {
  const withSkills = (): BattleConfig => ({ ...buildBattleConfig({ seed: 5, loadout: ['crusader_footman', 'crusader_crossbow', 'crusader_knight'], enemyAge: 2, stage: 1, armyAge: 2, timeline: 1, horn: true, hero: true }), wave: QUIET, playerBaseHp: 1e9 });

  it('the War Horn makes your troops faster for a few seconds, then reloads', () => {
    const walk = (horn: boolean): number => {
      const cfg = withSkills();
      const s = createBattle(cfg);
      s.foodMilli = 1_000_000;
      s.hornCooldown = 0;
      stepBattle(s, [{ type: 'deploy', slot: 0 }]);
      if (horn) stepBattle(s, [{ type: 'horn' }]);
      for (let i = 0; i < 60; i++) stepBattle(s);
      return s.units[0].x;
    };
    expect(walk(true)).toBeGreaterThan(walk(false) * 1.2);
    const cfg = withSkills();
    const s = createBattle(cfg);
    // Not ready at the start; a second use waits for the cooldown.
    expect(stepBattle(s, [{ type: 'horn' }]).some((e) => e.type === 'skillFail')).toBe(true);
    s.hornCooldown = 0;
    expect(stepBattle(s, [{ type: 'horn' }]).some((e) => e.type === 'horn')).toBe(true);
    expect(stepBattle(s, [{ type: 'horn' }]).some((e) => e.type === 'skillFail')).toBe(true);
    for (let i = 0; i < cfg.horn!.durTicks + 2; i++) stepBattle(s);
    expect(s.hasteTicks).toBe(0);
  });

  it('the Hero is one champion at a time; its cooldown runs only after it falls', () => {
    const cfg = withSkills();
    const s = createBattle(cfg);
    s.heroCooldown = 0;
    expect(stepBattle(s, [{ type: 'hero' }]).some((e) => e.type === 'hero')).toBe(true);
    const hero = s.units.find((u) => u.id === s.heroId)!;
    expect(hero.def.hp).toBeGreaterThan(cfg.playerTroops[2].hp * 2);
    expect(stepBattle(s, [{ type: 'hero' }]).some((e) => e.type === 'skillFail')).toBe(true);
    const cd = s.heroCooldown;
    for (let i = 0; i < 40; i++) stepBattle(s);
    expect(s.heroCooldown).toBe(cd);
    hero.alive = false;
    for (let i = 0; i < 40; i++) stepBattle(s);
    expect(s.heroCooldown).toBeLessThan(cd);
  });

  it('both are locked until earned', () => {
    const plain = buildBattleConfig({ seed: 5, loadout: ['stone_clubber'], enemyAge: 0, armyAge: 0, timeline: 1 });
    expect(plain.horn).toBeUndefined();
    expect(plain.hero).toBeUndefined();
    const s = createBattle(plain);
    expect(stepBattle(s, [{ type: 'hero' }]).some((e) => e.type === 'skillFail' && e.reason === 'locked')).toBe(true);
  });
});
