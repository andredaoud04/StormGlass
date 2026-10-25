/** Simple player policies for the headless simulator and tests. Pure: no clock, no randomness. */
import { createBattle, food, stepBattle } from '../sim/battle';
import type { BattleConfig, BattleState, Command } from '../sim/types';

export type Policy = (s: BattleState) => Command[];

/** Cycles through the loadout in a fixed pattern, deploying the next card as soon as it is affordable. */
export function cyclePolicy(pattern: number[]): Policy {
  let i = 0;
  return (s) => {
    const slot = pattern[i % pattern.length];
    const def = s.config.playerTroops[slot];
    if (def && food(s) >= def.cost) {
      i++;
      return [{ type: 'deploy', slot }];
    }
    return [];
  };
}

/** Default bot: mostly melee, a ranged unit every third deploy, a tank when the lane is busy. */
export function mixedPolicy(s0: BattleConfig): Policy {
  const n = s0.playerTroops.length;
  if (n === 1) return cyclePolicy([0]);
  if (n === 2) return cyclePolicy([0, 0, 1]);
  return cyclePolicy([0, 1, 0, 2]);
}

export interface RunResult {
  result: BattleState['result'];
  seconds: number;
  gold: number;
  state: BattleState;
}

export function runBattle(config: BattleConfig, policy: Policy, maxSeconds = 300): RunResult {
  const s = createBattle(config);
  const maxTicks = maxSeconds * config.tickRate;
  while (!s.result && s.tick < maxTicks) stepBattle(s, policy(s));
  return {
    result: s.result,
    seconds: s.tick / config.tickRate,
    gold: s.gold.kills + s.gold.tanks + s.gold.base,
    state: s,
  };
}
