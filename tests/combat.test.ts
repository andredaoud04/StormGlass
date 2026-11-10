import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/game/balance';
import { buildBattleConfig, stageWave } from '../src/game/battleSetup';
import { createBattle, stepBattle, waveNumberAt, waveSpawnTime } from '../src/sim/battle';
import type { BattleConfig, BattleState, TroopStats } from '../src/sim/types';
import { measure } from '../tools/sim/intensity';

const QUIET = { spawns: [[999, 'melee']] as [number, 'melee'][], loopFrom: 0, loopPeriod: 999 };

/** A battle with one attacker of ours facing a hand-placed enemy line. */
function arena(attacker: TroopStats, enemies: { x: number; def?: Partial<TroopStats> }[], over: Partial<BattleConfig> = {}): BattleState {
  const base = buildBattleConfig({ seed: 3, loadout: ['stone_clubber'], enemyAge: 0, armyAge: 0, timeline: 1 });
  const cfg = { ...base, playerTroops: [attacker], playerBaseHp: 1e9, wave: QUIET, ...over };
  const s = createBattle(cfg);
  s.foodMilli = 1e6;
  stepBattle(s, [{ type: 'deploy', slot: 0 }]);
  const me = s.units[0];
  me.x = 400;
  enemies.forEach((e, i) => {
    s.units.push({ ...me, id: 100 + i, side: 1, x: e.x, prevX: e.x, def: { ...base.enemyTroops.melee, hp: 1e6, dmg: 0, ...e.def }, hp: 1e6, maxHp: 1e6, cooldown: 99999, windup: -1, target: -1, alive: true, lane: 0 });
  });
  return s;
}

function hitsUntil(s: BattleState, ticks: number) {
  const hits: { target: number; dmg: number; area?: string }[] = [];
  for (let i = 0; i < ticks; i++) for (const e of stepBattle(s)) if (e.type === 'hit' && e.side === 1) hits.push({ target: e.target, dmg: e.dmg, area: e.area });
  return hits;
}

describe('traits', () => {
  const clubber = () => ({ ...buildBattleConfig({ seed: 1, loadout: ['stone_clubber'], enemyAge: 0, armyAge: 0, timeline: 1 }).playerTroops[0] });

  it('cleave: one swing hits several enemies in reach', () => {
    const s = arena({ ...clubber(), cleave: 3 }, [{ x: 450 }, { x: 460 }, { x: 470 }, { x: 900 }]);
    const hits = hitsUntil(s, 40);
    const targets = new Set(hits.map((h) => h.target));
    expect(targets.has(100) && targets.has(101) && targets.has(102)).toBe(true);
    expect(targets.has(103)).toBe(false);
    expect(hits.some((h) => h.area === 'cleave')).toBe(true);
  });

  it('pierce: a shot carries on through the enemies behind its target', () => {
    const slinger = { ...buildBattleConfig({ seed: 1, loadout: ['stone_slinger'], enemyAge: 0, armyAge: 0, timeline: 1 }).playerTroops[0], pierce: 3 };
    const s = arena(slinger, [{ x: 500 }, { x: 540 }, { x: 570 }]);
    const hits = hitsUntil(s, 80);
    expect(new Set(hits.map((h) => h.target)).size).toBe(3);
    expect(hits.some((h) => h.area === 'pierce')).toBe(true);
  });

  it('splash: everyone around the impact takes a share; far enemies are safe', () => {
    const s = arena({ ...clubber(), kind: 'tank', splash: 60 }, [{ x: 450 }, { x: 480 }, { x: 700 }]);
    let splash = 0;
    const hits: number[] = [];
    for (let i = 0; i < 40; i++) for (const e of stepBattle(s)) {
      if (e.type === 'splash') splash++;
      if (e.type === 'hit' && e.side === 1) hits.push(e.target);
    }
    expect(splash).toBeGreaterThan(0);
    expect(hits).toContain(101);
    expect(hits).not.toContain(102);
  });

  it('armor halves ranged damage only; class matchups scale damage', () => {
    const slinger = buildBattleConfig({ seed: 1, loadout: ['stone_slinger'], enemyAge: 0, armyAge: 0, timeline: 1 }).playerTroops[0];
    const plain = hitsUntil(arena(slinger, [{ x: 500, def: { kind: 'tank' } }]), 80)[0].dmg;
    const armored = hitsUntil(arena(slinger, [{ x: 500, def: { kind: 'tank', armor: 0.5 } }]), 80)[0].dmg;
    expect(armored).toBe(Math.max(1, Math.round(plain * 0.5)));
    const vsRanged = hitsUntil(arena(clubber(), [{ x: 450, def: { kind: 'ranged' } }]), 40)[0].dmg;
    const vsTank = hitsUntil(arena(clubber(), [{ x: 450, def: { kind: 'tank' } }]), 40)[0].dmg;
    expect(vsRanged).toBeGreaterThan(vsTank);
  });

  it('every later Age has troops with traits; Stone stays simple', () => {
    for (const a of BALANCE.ages.slice(1)) expect(a.troops.filter((t) => t.traits).length, a.id).toBeGreaterThanOrEqual(2);
    expect(BALANCE.ages[0].troops.filter((t) => t.traits).length).toBeLessThanOrEqual(1);
  });
});

describe('escalating waves', () => {
  it('spawn times never go backwards, and later waves are bigger', () => {
    for (let age = 0; age < 6; age++) {
      for (let st = 0; st < 5; st++) {
        const cfg = { ...buildBattleConfig({ seed: 1, loadout: ['stone_clubber'], enemyAge: age, stage: st, armyAge: age, timeline: 1 }) };
        let last = -1;
        for (let n = 0; n < 200; n++) {
          const t = waveSpawnTime(cfg, n).time;
          expect(t).toBeGreaterThanOrEqual(last - 1e-9);
          last = t;
        }
        const w = stageWave(age, st);
        const starts = w.waveStarts!;
        expect(starts.length).toBeGreaterThanOrEqual(3);
        expect(starts.length).toBeGreaterThanOrEqual(10);
      }
    }
  });

  it('later Ages field bigger enemy armies', () => {
    const inFirst = (w: ReturnType<typeof stageWave>, sec: number) => w.spawns.filter(([t]) => t <= sec).length;
    expect(inFirst(stageWave(5, 1, 3), 200)).toBeGreaterThan(inFirst(stageWave(0, 1, 3), 200) * 1.5);
  });

  it('the enemy is on the lane from the first second; big waves are surges; a long battle ramps up', () => {
    const R = BALANCE.waves.stream;
    for (let age = 0; age < 6; age++) {
      for (let st = 0; st < 5; st++) {
        if (age === 0 && st === 0) continue;
        const w = stageWave(age, st, 5);
        expect(w.spawns[0][0]).toBeLessThanOrEqual(1);
        const starts = w.waveStarts!;
        const size = (i: number) => w.spawns.slice(starts[i], i + 1 < starts.length ? starts[i + 1] : w.spawns.length).length;
        const big = w.bigWaves!;
        expect(big.length).toBeGreaterThan(2);
        expect(Math.min(...big)).toBeGreaterThanOrEqual(R.bigFrom);
        // A big wave before the ramp is clearly larger than the ordinary wave before it.
        const b = big.find((n) => n < R.rampFrom && !big.includes(n - 1))!;
        expect(size(b - 1)).toBeGreaterThan(size(b - 2) * 1.5);
        // The last waves dwarf the first ones.
        expect(size(starts.length - 1)).toBeGreaterThanOrEqual(size(0) * 1.5);
      }
    }
  });

  it('every battle is a little different, but the same seed is the same battle; Battle 1 is always the same', () => {
    const key = (w: ReturnType<typeof stageWave>) => JSON.stringify(w.spawns.slice(0, 60)) + w.bigWaves!.join(',');
    expect(key(stageWave(2, 2, 11))).toBe(key(stageWave(2, 2, 11)));
    const distinct = new Set([1, 2, 3, 4, 5, 6].map((seed) => key(stageWave(2, 2, seed))));
    expect(distinct.size).toBeGreaterThan(3);
    const first = (seed: number) => JSON.stringify(stageWave(0, 0, seed).spawns.slice(0, 20));
    expect(first(1)).toBe(first(99));
  });

  it('wave numbers keep counting after the tail starts repeating', () => {
    const cfg = buildBattleConfig({ seed: 1, loadout: ['stone_clubber'], enemyAge: 2, stage: 1, armyAge: 2, timeline: 1 });
    const nums: number[] = [];
    for (let n = 0; n < 400; n++) {
      const w = waveNumberAt(cfg, n);
      if (w) nums.push(w);
    }
    for (let i = 1; i < nums.length; i++) expect(nums[i]).toBe(nums[i - 1] + 1);
    expect(nums.length).toBeGreaterThan((cfg.wave.waveStarts ?? []).length);
  });
});

describe('late game is a bigger, busier fight than early game', () => {
  it('more troops on the field, more hits, more multi-target hits', () => {
    const early = measure(0, 1, 3, 'early');
    const late = measure(5, 3, 13, 'late');
    expect(early.result).toBe('victory');
    expect(late.result).toBe('victory');
    expect(late.avgUnits).toBeGreaterThan(early.avgUnits * 2);
    expect(late.hitsPerSec).toBeGreaterThan(early.hitsPerSec * 2.5);
    expect(late.multiHitsPerSec).toBeGreaterThan(0.5);
    expect(late.peakUnits).toBeLessThanOrEqual(2 * BALANCE.sim.maxUnitsPerSide + 16);
  });
});
