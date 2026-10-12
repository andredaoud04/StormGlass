/** Deterministic scheduling for the battle simulation. Rendering FPS is not game time. */
export const BATTLE_TICK_MS = 100;
export const MAX_BATTLE_CATCH_UP_TICKS = 5;
const CLOCK_EPSILON_MS = 1e-6;

export interface BattleClockAdvance {
  ticks: number;
  remainderMs: number;
  droppedTicks: number;
}

/**
 * Accumulate elapsed wall time into whole 100ms simulation steps.
 * At most five steps are processed per rendered frame; any older backlog is
 * discarded rather than fast-forwarding an unattended battle indefinitely.
 * Pausing resets the partial tick so resuming never awards background progress.
 */
export function advanceBattleClock(
  accumulatorMs: number,
  elapsedMs: number,
  paused = false,
): BattleClockAdvance {
  if (paused) return { ticks: 0, remainderMs: 0, droppedTicks: 0 };

  const previous = Number.isFinite(accumulatorMs) && accumulatorMs > 0
    ? accumulatorMs % BATTLE_TICK_MS
    : 0;
  const elapsed = Number.isFinite(elapsedMs) && elapsedMs > 0 ? elapsedMs : 0;
  const total = previous + elapsed;
  const due = Math.floor((total + CLOCK_EPSILON_MS) / BATTLE_TICK_MS);
  const ticks = Math.min(due, MAX_BATTLE_CATCH_UP_TICKS);
  const fractional = total - due * BATTLE_TICK_MS;
  const remainderMs = Math.abs(fractional) < CLOCK_EPSILON_MS ? 0 : Math.max(0, fractional);

  return { ticks, remainderMs, droppedTicks: due - ticks };
}
