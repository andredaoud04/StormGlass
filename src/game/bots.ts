/** Simple player policies for the headless simulator and tests. Pure: no clock, no randomness. */
import { createBattle, food, kitchenCost, stepBattle } from '../sim/battle';
import type { BattleConfig, BattleState, Command } from '../sim/types';

export type Policy = (s: BattleState) => Command[];

/** Cycles through the loadout in a fixed pattern, deploying the next card as soon as it is affordable. */
export function cyclePolicy(pattern: number[]): Policy {
  let i = 0;
  return (s) => {
    const slot = pattern[i % pattern.length];
    const def = s.config.playerTroops[slot];
    if (def && food(s) >= def.cost && (s.cardWait[slot] ?? 0) <= 0) {
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
    gold: s.gold.kills + s.gold.tanks + s.gold.base + s.gold.boss,
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
    // Grow the economy while the lane is safe: this is how you out-build the enemy (D42).
    const kc = kitchenCost(s);
    // Three levels early, the rest once an army is standing.
    const mine = s.units.filter((u) => u.alive && u.side === 0).length;
    if (!threat && kc !== null && s.foodMilli >= kc && (s.kitchenLevel < 3 || mine >= 3)) return [{ type: 'kitchen' }];
    const ready = (i: number) => i >= 0 && f >= troops[i].cost && (s.cardWait[i] ?? 0) <= 0;
    if (threat) {
      // Under attack: whatever is ready, heaviest first.
      const pick = [tank, melee, ranged].find(ready);
      return pick !== undefined ? [{ type: 'deploy', slot: pick }] : [];
    }
    if (plan.length === 0) plan = [tank, melee, ranged, melee].filter((i) => i >= 0);
    const next = plan[0];
    const groupCost = plan.reduce((a, i) => a + troops[i].cost, 0);
    if (f >= groupCost || (f >= troops[next].cost && s.units.filter((u) => u.alive && u.side === 0).length > 0)) {
      if (ready(next)) {
        plan.shift();
        return [{ type: 'deploy', slot: next }];
      }
      // The next card is still reloading: send another that is ready rather than sit on Food.
      const other = plan.slice(1).find(ready);
      if (other !== undefined && f >= troops[next].cost + troops[other].cost) {
        plan.splice(plan.indexOf(other, 1), 1);
        return [{ type: 'deploy', slot: other }];
      }
    }
    return [];
  };
}
