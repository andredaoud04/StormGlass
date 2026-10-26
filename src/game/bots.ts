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

/**
 * A reasonable human-like policy: defend at once when enemies get close to your fortress;
 * otherwise save up and send a tank first, then melee and ranged behind it.
 */
export function smartPolicy(): Policy {
  let plan: number[] = [];
  return (s) => {
    const troops = s.config.playerTroops;
    const f = food(s);
    const lane = s.config.laneLength;
    const threat = s.units.some((u) => u.alive && u.side === 1 && u.x < lane * 0.35);
    const melee = troops.findIndex((t) => t.kind === 'melee');
    const ranged = troops.findIndex((t) => t.kind === 'ranged');
    const tank = troops.findIndex((t) => t.kind === 'tank');
    if (threat) {
      const pick = tank >= 0 && f >= troops[tank].cost ? tank : melee;
      return pick >= 0 && f >= troops[pick].cost ? [{ type: 'deploy', slot: pick }] : [];
    }
    if (plan.length === 0) plan = [tank, melee, ranged, melee].filter((i) => i >= 0);
    const next = plan[0];
    const groupCost = plan.reduce((a, i) => a + troops[i].cost, 0);
    if (f >= groupCost || (f >= troops[next].cost && s.units.filter((u) => u.alive && u.side === 0).length > 0)) {
      plan.shift();
      return [{ type: 'deploy', slot: next }];
    }
    return [];
  };
}
