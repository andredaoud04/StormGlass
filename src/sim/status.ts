/**
 * Status effects: Poison, Burn, Cold. All are bounded by design:
 * - Poison: up to maxStacks stacks, each a fixed % of the attacker's damage per second.
 * - Burn: one instance; a stronger burn replaces a weaker one, a weaker one does nothing.
 * - Cold: slows move and attack speed per stack, capped at maxStacks, so a unit never stops.
 * Every effect expires `durationSec` after the last hit. Bosses take `bossMultiplier` strength.
 * Bases never receive effects (only units reach this module).
 */
import { damageUnit } from './damage';
import type { BattleState, StatusKind, Unit } from './types';

function bossMul(s: BattleState, u: Unit): number {
  return u.def.boss ? s.config.status.bossMultiplier : 1;
}

export function applyStatus(s: BattleState, u: Unit, kind: StatusKind, attackerDmg: number): void {
  if (!u.alive) return;
  const r = s.config.status;
  const rate = s.config.tickRate;
  const mul = bossMul(s, u);
  if (kind === 'poison') {
    u.poison.stacks = Math.min(r.poison.maxStacks, u.poison.stacks + 1);
    u.poison.ticks = Math.round(r.poison.durationSec * rate);
    u.poison.dpsPerStack = Math.max(u.poison.dpsPerStack, attackerDmg * r.poison.perStackPctOfAttackerDmgPerSec * mul);
  } else if (kind === 'burn') {
    const dps = attackerDmg * r.burn.pctOfAttackerDmgPerSec * mul;
    if (u.burn.ticks > 0 && dps < u.burn.dps) return;
    u.burn.dps = dps;
    u.burn.ticks = Math.round(r.burn.durationSec * rate);
  } else {
    u.cold.stacks = Math.min(r.cold.maxStacks, u.cold.stacks + 1);
    u.cold.ticks = Math.round(r.cold.durationSec * rate);
  }
  s.events.push({ type: 'status', target: u.id, kind });
}

/** Movement and attack-speed multiplier from Cold, in (0, 1]. Never 0: Cold cannot stun. */
export function slowFactor(s: BattleState, u: Unit): number {
  if (u.cold.ticks <= 0 || u.cold.stacks <= 0) return 1;
  const r = s.config.status.cold;
  const slow = Math.min(r.maxStacks, u.cold.stacks) * r.slowPerStack * bossMul(s, u);
  return Math.max(0.1, 1 - slow);
}

/** Damage-over-time and expiry, once per tick. */
export function tickStatus(s: BattleState, u: Unit): void {
  const rate = s.config.tickRate;
  if (u.poison.ticks > 0) {
    const dmg = (u.poison.stacks * u.poison.dpsPerStack) / rate;
    u.poison.ticks--;
    if (u.poison.ticks === 0) u.poison = { stacks: 0, ticks: 0, dpsPerStack: 0 };
    if (dmg > 0) {
      s.events.push({ type: 'dot', target: u.id, kind: 'poison', dmg, x: u.x });
      damageUnit(s, u, dmg, u.side === 0 ? 1 : 0);
    }
  }
  if (!u.alive) return;
  if (u.burn.ticks > 0) {
    const dmg = u.burn.dps / rate;
    u.burn.ticks--;
    if (u.burn.ticks === 0) u.burn = { ticks: 0, dps: 0 };
    if (dmg > 0) {
      s.events.push({ type: 'dot', target: u.id, kind: 'burn', dmg, x: u.x });
      damageUnit(s, u, dmg, u.side === 0 ? 1 : 0);
    }
  }
  if (u.cold.ticks > 0) {
    u.cold.ticks--;
    if (u.cold.ticks === 0) u.cold.stacks = 0;
  }
}
