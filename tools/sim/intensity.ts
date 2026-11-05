/**
 * Combat intensity report: plays one battle per chosen stage with the smart bot and measures how
 * busy and how varied the fight is. Used to compare early and late game.
 * Usage: npx tsx tools/sim/intensity.ts
 */
import { ageDef } from '../../src/game/balance';
import { buildBattleConfig } from '../../src/game/battleSetup';
import { smartPolicy } from '../../src/game/bots';
import { loadout } from '../../src/game/progress';
import { newSave } from '../../src/game/save';
import { fortressMul, foodRateMilli } from '../../src/game/upgrades';
import { createBattle, stepBattle } from '../../src/sim/battle';

export interface Intensity {
  label: string;
  seconds: number;
  result: string;
  /** Average living units on the field (both sides). */
  avgUnits: number;
  peakUnits: number;
  /** Hits landed per second (unit and fortress hits). */
  hitsPerSec: number;
  /** Units hit by area attacks (more than one target per strike) per second. */
  multiHitsPerSec: number;
  killsPerSec: number;
  /** Seconds with no hit at all, as a share of the battle. */
  quietShare: number;
  /** Distinct hit types seen (single, splash, pierce, cleave, crit...). */
  enemySpawns: number;
}

export function measure(age: number, stage: number, level: number, label: string): Intensity {
  const s0 = newSave(1);
  s0.armyAge = age;
  s0.slots = ['ranged', 'tank'];
  s0.upgrades = { food: level, fortress: level };
  const cfg = buildBattleConfig({ seed: 99, loadout: loadout(s0), enemyAge: age, stage, armyAge: age, timeline: 1, foodRateMilli: foodRateMilli(s0), fortressMul: fortressMul(s0), campaign: true, stormcall: true, kitchen: true });
  const s = createBattle(cfg);
  const policy = smartPolicy();
  let unitTicks = 0;
  let peak = 0;
  let hits = 0;
  let multi = 0;
  let kills = 0;
  let spawns = 0;
  const hitSeconds = new Set<number>();
  while (!s.result && s.tick < 300 * cfg.tickRate) {
    const ev = stepBattle(s, policy(s));
    const alive = s.units.filter((u) => u.alive).length;
    unitTicks += alive;
    peak = Math.max(peak, alive);
    const perTick = new Map<number, number>();
    for (const e of ev) {
      if (e.type === 'hit' || e.type === 'baseHit') {
        hits++;
        hitSeconds.add(Math.floor(s.tick / cfg.tickRate));
      }
      if (e.type === 'hit') perTick.set(e.dmg, (perTick.get(e.dmg) ?? 0) + 1);
      if (e.type === 'death') kills++;
      if (e.type === 'spawn' && e.side === 1) spawns++;
    }
    for (const n of perTick.values()) if (n > 1) multi += n;
  }
  const sec = s.tick / cfg.tickRate;
  return {
    label: `${label} (${ageDef(age).name} stage ${stage + 1}, upgrades ${level})`,
    seconds: Math.round(sec),
    result: String(s.result),
    avgUnits: Math.round((unitTicks / s.tick) * 10) / 10,
    peakUnits: peak,
    hitsPerSec: Math.round((hits / sec) * 10) / 10,
    multiHitsPerSec: Math.round((multi / sec) * 10) / 10,
    killsPerSec: Math.round((kills / sec) * 100) / 100,
    quietShare: Math.round((1 - hitSeconds.size / Math.ceil(sec)) * 100) / 100,
    enemySpawns: spawns,
  };
}

if (process.argv[1]?.endsWith('intensity.ts')) {
  const rows = [measure(0, 1, 3, 'EARLY'), measure(0, 3, 9, 'EARLY'), measure(4, 3, 9, 'LATE'), measure(5, 2, 6, 'LATE'), measure(5, 3, 9, 'LATE')];
  console.table(rows);
}
