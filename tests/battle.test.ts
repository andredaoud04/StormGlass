import { describe, expect, it } from 'vitest';
import { createBattle, food, stateHash, stepBattle, totalGold, waveSpawnTime } from '../src/sim/battle';
import type { BattleConfig, BattleState, Command } from '../src/sim/types';
import { buildBattleConfig } from '../src/game/battleSetup';
import { BALANCE } from '../src/game/balance';
import { cyclePolicy, runBattle } from '../src/game/bots';

const STONE = ['stone_clubber', 'stone_slinger', 'stone_brute'];

function config(over: Partial<BattleConfig> = {}): BattleConfig {
  return { ...buildBattleConfig({ seed: 7, loadout: STONE, enemyAge: 0, armyAge: 0, timeline: 1 }), ...over };
}

function stepN(s: BattleState, n: number, cmds: Command[] = []): void {
  for (let i = 0; i < n; i++) stepBattle(s, i === 0 ? cmds : []);
}

describe('food', () => {
  it('starts at 0 and rises exactly 1 per second in the Stone Age', () => {
    const s = createBattle(config());
    expect(food(s)).toBe(0);
    stepN(s, 20);
    expect(food(s)).toBe(1);
    stepN(s, 80);
    expect(food(s)).toBe(5);
  });

  it('handles rates that do not divide the tick rate without drift', () => {
    const s = createBattle(config({ foodRateMilli: 1333 }));
    stepN(s, 20 * 30);
    expect(s.foodMilli).toBe(1333 * 30);
  });

  it('spends Food exactly once per deploy', () => {
    const s = createBattle(config());
    stepN(s, 100); // 5 Food
    stepBattle(s, [{ type: 'deploy', slot: 0 }, { type: 'deploy', slot: 0 }]);
    expect(s.foodSpentMilli).toBe(5000);
    expect(s.units.filter((u) => u.side === 0)).toHaveLength(1);
    expect(s.events.filter((e) => e.type === 'deployFail')).toHaveLength(1);
    expect(s.foodMilli).toBe(50); // the one tick of income after spending
  });

  it('does not spend Food on a failed deploy (bad slot or full lane)', () => {
    const s = createBattle(config({ maxUnitsPerSide: 1 }));
    stepN(s, 400);
    const before = s.foodMilli;
    stepBattle(s, [{ type: 'deploy', slot: 5 }]);
    expect(s.foodSpentMilli).toBe(0);
    stepBattle(s, [{ type: 'deploy', slot: 0 }]);
    stepBattle(s, [{ type: 'deploy', slot: 0 }]);
    expect(s.foodSpentMilli).toBe(5000);
    expect(s.foodMilli).toBe(before + 3 * 50 - 5000);
  });
});

describe('determinism', () => {
  it('gives identical results for the same seed and commands', () => {
    const a = runBattle(config(), cyclePolicy([0, 1, 0, 2]));
    const b = runBattle(config(), cyclePolicy([0, 1, 0, 2]));
    expect(stateHash(a.state)).toBe(stateHash(b.state));
    expect(a.seconds).toBe(b.seconds);
  });

  it('replays from a recorded command log', () => {
    const log: [number, Command[]][] = [];
    const live = createBattle(config({ seed: 99 }));
    const policy = cyclePolicy([0, 0, 1]);
    while (!live.result && live.tick < 6000) {
      const cmds = policy(live);
      if (cmds.length) log.push([live.tick, cmds]);
      stepBattle(live, cmds);
    }
    const replay = createBattle(config({ seed: 99 }));
    let li = 0;
    while (!replay.result && replay.tick < 6000) {
      const cmds = li < log.length && log[li][0] === replay.tick ? log[li++][1] : [];
      stepBattle(replay, cmds);
    }
    expect(stateHash(replay)).toBe(stateHash(live));
  });
});

describe('gold', () => {
  it('pays 1 per normal kill and 5 per tank kill, once', () => {
    const c = config({ enemyTroops: { ...config().enemyTroops, ranged: { ...config().enemyTroops.tank } } });
    const s = createBattle(c);
    const policy = cyclePolicy([2, 0]);
    let goldEvents = 0;
    let deaths = 0;
    while (!s.result && s.tick < 20 * 200) {
      stepBattle(s, policy(s));
      for (const e of s.events) {
        if (e.type === 'gold' && e.reason !== 'base') goldEvents++;
        if (e.type === 'death' && e.side === 1) deaths++;
      }
    }
    expect(s.tankKills).toBeGreaterThan(0);
    expect(goldEvents).toBe(deaths);
    expect(s.gold.kills).toBe(s.kills - s.tankKills);
    expect(s.gold.tanks).toBe(s.tankKills * 5);
  });

  it('pays exactly the base Gold total when the enemy base falls', () => {
    const r = runBattle(config(), cyclePolicy([0, 1, 0, 2]));
    expect(r.result).toBe('victory');
    expect(r.state.gold.base).toBe(BALANCE.ages[0].baseGold);
    expect(r.state.baseMilestonesPaid).toBe(BALANCE.economy.baseGoldSteps);
  });

  it('pays no Gold outside campaign battles', () => {
    const r = runBattle(config({ goldEnabled: false }), cyclePolicy([0, 1, 0, 2]));
    expect(totalGold(r.state)).toBe(0);
    expect(r.state.kills).toBeGreaterThan(0);
  });

  it('keeps Gold earned before a retreat and stops the battle', () => {
    const s = createBattle(config());
    const policy = cyclePolicy([0]);
    while (s.tick < 20 * 40) stepBattle(s, policy(s));
    const earned = totalGold(s);
    stepBattle(s, [{ type: 'retreat' }]);
    expect(s.result).toBe('retreat');
    const tick = s.tick;
    stepN(s, 50, [{ type: 'deploy', slot: 0 }]);
    expect(s.tick).toBe(tick);
    expect(totalGold(s)).toBe(earned);
  });
});

describe('waves', () => {
  it('spawn times never go backwards for any Age or Timeline', () => {
    for (let age = 0; age < 6; age++) {
      for (const timeline of [1, 2, 5]) {
        const c = buildBattleConfig({ seed: 1, loadout: STONE, enemyAge: age, armyAge: 0, timeline });
        let last = -1;
        for (let n = 0; n < 60; n++) {
          const t = waveSpawnTime(c, n).time;
          expect(t).toBeGreaterThanOrEqual(last);
          last = t;
        }
      }
    }
  });

  it('spawns enemies exactly on the authored schedule', () => {
    const c = config({ playerBaseHp: 1e9 });
    const s = createBattle(c);
    const spawnTicks: number[] = [];
    while (s.tick < 20 * 50 && !s.result) {
      stepBattle(s);
      for (const e of s.events) if (e.type === 'spawn' && e.side === 1) spawnTicks.push(s.tick);
    }
    const expected = c.wave.spawns.filter(([t]) => t <= 50).map(([t]) => Math.round(t * 20));
    expect(spawnTicks.slice(0, expected.length)).toEqual(expected);
  });
});

describe('battle end', () => {
  it('Battle 1 is winnable with Clubbers only in about a minute', () => {
    const r = runBattle(config({ playerTroops: config().playerTroops.slice(0, 1) }), cyclePolicy([0]));
    expect(r.result).toBe('victory');
    expect(r.seconds).toBeGreaterThan(35);
    expect(r.seconds).toBeLessThan(110);
  });

  it('loses when the player does nothing', () => {
    const r = runBattle(config(), () => [], 400);
    expect(r.result).toBe('defeat');
  });

  it('ignores steps after the battle ends', () => {
    const r = runBattle(config(), () => [], 400);
    const h = stateHash(r.state);
    stepN(r.state, 20, [{ type: 'deploy', slot: 0 }]);
    expect(stateHash(r.state)).toBe(h);
  });
});

describe('bosses', () => {
  const ARMY = ['stone_clubber', 'stone_slinger', 'stone_brute'];
  const bossConfig = (age = 0, over: Partial<BattleConfig> = {}) => {
    const loadout = BALANCE.ages[age].troops.map((t) => t.id);
    return { ...buildBattleConfig({ seed: 3, loadout, enemyAge: age, armyAge: age, stage: 4, timeline: 1 }), ...over };
  };

  it('only the last stage of an Age has a boss', () => {
    for (let st = 0; st < 4; st++) expect(buildBattleConfig({ seed: 1, loadout: ARMY, enemyAge: 0, armyAge: 0, stage: st, timeline: 1 }).boss).toBeUndefined();
    expect(bossConfig().boss?.boss).toBe(true);
  });

  it('the ward keeps the enemy fortress safe until the boss falls', () => {
    const cfg = bossConfig(0, { playerBaseHp: 1e9 });
    const s = createBattle(cfg);
    expect(s.wardUp).toBe(true);
    const full = s.enemyBaseHp;
    // A Brute at the enemy gate, before the boss arrives.
    s.foodMilli = 100_000;
    stepBattle(s, [{ type: 'deploy', slot: 2 }]);
    const brute = s.units.find((u) => u.side === 0)!;
    brute.x = cfg.laneLength - 60;
    brute.hp = brute.maxHp = 1e9;
    let wardHits = 0;
    for (let i = 0; i < 5 * cfg.tickRate; i++) for (const e of stepBattle(s)) if (e.type === 'wardHit') wardHits++;
    expect(wardHits).toBeGreaterThan(0);
    expect(s.enemyBaseHp).toBe(full);
  });

  it('every boss raids and falls back, and never damages your fortress', () => {
    for (let age = 0; age < BALANCE.ages.length; age++) {
      const cfg = bossConfig(age, { playerBaseHp: 1e9 });
      const s = createBattle(cfg);
      const phases = new Set<string>();
      let bossDamageToBase = 0;
      let lastBaseHp = s.playerBaseHp;
      for (let i = 0; i < 90 * cfg.tickRate && !s.result; i++) {
        const ev = stepBattle(s, i % 40 === 0 ? [{ type: 'deploy', slot: 0 }] : []);
        for (const e of ev) if (e.type === 'bossPhase') phases.add(e.phase);
        const boss = s.units.find((u) => u.id === s.bossId);
        if (boss) expect(boss.x).toBeGreaterThanOrEqual(cfg.laneLength * (1 - cfg.boss!.bossDef!.reach) - 1e-6);
        if (s.playerBaseHp < lastBaseHp && ev.some((e) => e.type === 'bossStrike' && e.x < cfg.spawnOffset)) bossDamageToBase++;
        lastBaseHp = s.playerBaseHp;
      }
      expect(s.bossSpawned).toBe(true);
      expect(phases.has('retreat') || phases.has('rest')).toBe(true);
      expect(bossDamageToBase).toBe(0);
    }
  });

  it('killing the boss breaks the ward and pays its Gold in full, exactly once', () => {
    const cfg = bossConfig(0, { playerBaseHp: 1e9 });
    const s = createBattle(cfg);
    while (!s.bossSpawned) stepBattle(s);
    const boss = s.units.find((u) => u.id === s.bossId)!;
    // An unkillable hero stands in front of the boss and wears it down through the normal damage path.
    s.foodMilli = 100_000;
    stepBattle(s, [{ type: 'deploy', slot: 0 }]);
    const hero = s.units.find((u) => u.side === 0)!;
    hero.def = { ...hero.def, dmg: Math.ceil(boss.maxHp / 6), speed: 400 };
    hero.hp = hero.maxHp = 1e9;
    let broke = 0;
    for (let i = 0; i < 60 * cfg.tickRate && boss.alive; i++) for (const e of stepBattle(s)) if (e.type === 'wardBreak') broke++;
    for (let i = 0; i < 5; i++) for (const e of stepBattle(s)) if (e.type === 'wardBreak') broke++;
    expect(boss.alive).toBe(false);
    expect(broke).toBe(1);
    expect(s.wardUp).toBe(false);
    expect(s.gold.boss).toBe(cfg.boss!.bossDef!.gold);
  });

  it('boss battles are deterministic', () => {
    const cfg = bossConfig(5);
    const a = runBattle(cfg, cyclePolicy([0, 1, 0, 2]), 200);
    const b = runBattle(cfg, cyclePolicy([0, 1, 0, 2]), 200);
    expect(stateHash(a.state)).toBe(stateHash(b.state));
  });
});
