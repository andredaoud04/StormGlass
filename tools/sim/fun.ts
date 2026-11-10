/**
 * Fun report: is a battle a real fight? For every stage at its expected upgrade level it plays
 * several seeds with several player styles and measures tension, not just who wins:
 *   lost%    share of your fortress HP lost (0 = never threatened)
 *   close    how near the enemy got to your fortress (share of the lane; 1 = never left its gate)
 *   swings   times the front line crossed the middle of the lane
 *   camp%    share of the battle your army spent parked at the enemy gate
 *   waves    the wave number reached
 * Usage: npx tsx tools/sim/fun.ts [--ages=0,3] [--brief]
 */
import { ageDef, BALANCE } from '../../src/game/balance';
import { buildBattleConfig } from '../../src/game/battleSetup';
import { cyclePolicy, smartPolicy, type Policy } from '../../src/game/bots';
import { loadout } from '../../src/game/progress';
import { newSave } from '../../src/game/save';
import { fortressMul, foodRateMilli } from '../../src/game/upgrades';
import { createBattle, stepBattle } from '../../src/sim/battle';
import type { BattleConfig } from '../../src/sim/types';

export const PAR = [0, 3, 6, 9, 12];
export const STONE_PAR = [0, 1, 3, 5, 7];
const STONE_SLOTS: string[][] = [[], [], ['ranged'], ['ranged', 'tank'], ['ranged', 'tank']];

export interface Fun {
  result: string;
  seconds: number;
  lost: number;
  close: number;
  swings: number;
  camp: number;
  waves: number;
  gold: number;
}

export function configFor(age: number, stage: number, seed: number, levelDelta = 0): BattleConfig {
  const s = newSave(1);
  s.armyAge = age;
  s.slots = age === 0 ? STONE_SLOTS[stage] : ['ranged', 'tank'];
  const lv = Math.max(0, (age === 0 ? STONE_PAR : PAR)[stage] + levelDelta);
  s.upgrades = { food: lv, fortress: lv };
  return buildBattleConfig({ seed, loadout: loadout(s), enemyAge: age, stage, armyAge: age, timeline: 1, foodRateMilli: foodRateMilli(s), fortressMul: fortressMul(s), campaign: true, stormcall: age > 0 || stage >= 3, kitchen: age > 0 || stage >= 1 });
}

export function play(cfg: BattleConfig, policy: Policy, maxSeconds = 300): Fun {
  const s = createBattle(cfg);
  const L = cfg.laneLength;
  let close = 1;
  let swings = 0;
  let side = 0;
  let camp = 0;
  let wave = 0;
  while (!s.result && s.tick < maxSeconds * cfg.tickRate) {
    const ev = stepBattle(s, policy(s));
    for (const e of ev) if (e.type === 'wave') wave = e.n;
    let pMax = 0;
    let eMin = L;
    for (const u of s.units) {
      if (!u.alive || u.boss) continue;
      if (u.side === 0) pMax = Math.max(pMax, u.x);
      else eMin = Math.min(eMin, u.x);
    }
    close = Math.min(close, eMin / L);
    const front = (pMax + eMin) / 2;
    const now = front > L * 0.56 ? 1 : front < L * 0.44 ? -1 : side;
    if (now !== side && side !== 0) swings++;
    side = now;
    if (pMax > L * 0.82) camp++;
  }
  return {
    result: s.result ?? 'timeout',
    seconds: Math.round(s.tick / cfg.tickRate),
    lost: Math.round((1 - s.playerBaseHp / cfg.playerBaseHp) * 100),
    close: Math.round(close * 100) / 100,
    swings,
    camp: Math.round((camp / Math.max(1, s.tick)) * 100),
    waves: wave,
    gold: s.gold.kills + s.gold.tanks + s.gold.base + s.gold.boss,
  };
}

export const STYLES: Record<string, (cfg: BattleConfig) => Policy> = {
  smart: () => smartPolicy(),
  mixed: (c) => cyclePolicy(c.playerTroops.length === 1 ? [0] : c.playerTroops.length === 2 ? [0, 0, 1] : [0, 1, 0, 2]),
  melee: () => cyclePolicy([0]),
  ranged: (c) => cyclePolicy([c.playerTroops.length > 1 ? 1 : 0]),
  tank: (c) => cyclePolicy([c.playerTroops.length > 2 ? 2 : 0]),
};

if (process.argv[1]?.endsWith('fun.ts')) {
  const agesArg = process.argv.find((a) => a.startsWith('--ages='));
  const ages = agesArg ? agesArg.split('=')[1].split(',').map(Number) : BALANCE.ages.map((_, i) => i);
  const seeds = [3, 17, 41, 77];
  const all: Fun[] = [];
  const styleWins: Record<string, number> = {};
  let n = 0;
  for (const age of ages) {
    for (let stage = 0; stage < BALANCE.campaign.stagesPerAge; stage++) {
      const runs = seeds.map((seed) => play(configFor(age, stage, seed), STYLES.smart(configFor(age, stage, seed))));
      all.push(...runs);
      const avg = (k: keyof Fun) => Math.round((runs.reduce((a, r) => a + (r[k] as number), 0) / runs.length) * 100) / 100;
      const secs = runs.map((r) => r.seconds);
      const styles = Object.entries(STYLES).map(([name, mk]) => {
        const w = seeds.filter((seed) => play(configFor(age, stage, seed), mk(configFor(age, stage, seed))).result === 'victory').length;
        styleWins[name] = (styleWins[name] ?? 0) + w;
        return `${name[0]}${w}`;
      });
      n += seeds.length;
      if (!process.argv.includes('--brief'))
        console.log(
          `${ageDef(age).name.padEnd(10)} ${stage + 1}  win ${runs.filter((r) => r.result === 'victory').length}/${runs.length}  ${String(Math.min(...secs)).padStart(3)}-${String(Math.max(...secs)).padEnd(3)}s  lost ${String(avg('lost')).padStart(5)}%  close ${avg('close').toFixed(2)}  swings ${avg('swings').toFixed(1)}  camp ${String(avg('camp')).padStart(4)}%  waves ${avg('waves').toFixed(1)}  gold ${String(avg('gold')).padStart(5)}  styles ${styles.join(' ')}`,
        );
    }
  }
  const m = (k: keyof Fun) => (all.reduce((a, r) => a + (r[k] as number), 0) / all.length).toFixed(2);
  const untouched = all.filter((r) => r.result === 'victory' && r.lost === 0).length;
  console.log(`\nSmart bot at par: wins ${all.filter((r) => r.result === 'victory').length}/${all.length}, base untouched in ${untouched}, avg ${m('seconds')} s, lost ${m('lost')}%, swings ${m('swings')}, camp ${m('camp')}%, waves ${m('waves')}`);
  console.log('Wins by style (of ' + n + '):', JSON.stringify(styleWins));
}
