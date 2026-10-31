/**
 * Pure progression rules in the We Are Warriors format: a numbered sequence of battles (4 and a
 * boss per Age), any earlier battle replayable for Gold, and Evolution bought with Gold once
 * your Age's boss is beaten. Evolving resets Gold and upgrades; the campaign never ends.
 */
import { BALANCE, ageDef } from './balance';
import { isBossStage } from './battleSetup';
import type { SaveData } from './save';
import { hasSlot } from './upgrades';

export const MAX_SLOTS = 3;
export const FINAL_AGE = BALANCE.ages.length - 1;
export const STAGES = BALANCE.campaign.stagesPerAge;
export const LAST_INDEX = (FINAL_AGE + 1) * STAGES - 1;

/** Troops you deploy: your Age's melee, plus ranged and tank once their slots are bought. */
export function loadout(s: SaveData): string[] {
  return ageDef(s.armyAge)
    .troops.filter((t) => t.kind === 'melee' || hasSlot(s, t.kind as 'ranged' | 'tank'))
    .map((t) => t.id)
    .slice(0, MAX_SLOTS);
}

export interface StageRef {
  age: number;
  stage: number;
}

export const toIndex = (r: StageRef): number => r.age * STAGES + r.stage;
export const fromIndex = (i: number): StageRef => ({ age: Math.floor(i / STAGES), stage: i % STAGES });

/** The furthest battle unlocked on this Timeline. */
export function frontier(s: SaveData): number {
  return toIndex({ age: s.enemyAge, stage: s.stage });
}

/** The battle the player will fight next: their pick if they chose an earlier one, else the frontier. */
export function selected(s: SaveData): StageRef {
  const f = frontier(s);
  return fromIndex(s.pick >= 0 && s.pick <= f ? s.pick : f);
}

/** Move the battle picker by `step` (the arrows), clamped to battles already unlocked. */
export function pickBattle(s: SaveData, step: number): void {
  const f = frontier(s);
  const next = Math.max(0, Math.min(f, toIndex(selected(s)) + step));
  s.pick = next === f ? -1 : next;
}

/** Battle number shown to the player (1-based, counted from the start of the Timeline). */
export function battleNumber(r: StageRef): number {
  return toIndex(r) + 1;
}

export function bossBeaten(s: SaveData, age = s.enemyAge): boolean {
  return s.beaten.includes(age);
}

export interface BattleOutcome {
  result: 'victory' | 'defeat' | 'retreat';
  gold: number;
  kills: number;
  /** Enemy Age this battle was fought against. */
  enemyAge: number;
  /** Stage this battle was fought on. */
  stage?: number;
  campaign: boolean;
}

/** Apply a finished battle to the save. Call exactly once per battle. */
export function applyOutcome(s: SaveData, o: BattleOutcome): void {
  s.stats.battles++;
  s.stats.kills += o.kills;
  if (o.campaign) {
    s.battleNo++;
    s.gold += o.gold;
    s.stats.goldEarned += o.gold;
  }
  if (o.result === 'victory') {
    s.stats.wins++;
    const fought = toIndex({ age: o.enemyAge, stage: o.stage ?? s.stage });
    if (o.campaign && fought === frontier(s)) {
      if (isBossStage(s.stage)) {
        if (!s.beaten.includes(s.enemyAge)) s.beaten.push(s.enemyAge);
        // The next Age's battles open at once; fighting them before you Evolve is the hard way.
        if (s.enemyAge < FINAL_AGE) {
          s.enemyAge++;
          s.stage = 0;
        }
      } else s.stage++;
      s.pick = -1;
    }
  } else if (o.result === 'defeat') s.stats.losses++;
  else s.stats.retreats++;
}

/** Gold to evolve into the next Age (grows with the Timeline like rewards do), or null in the Future Age. */
export function evolveCost(s: SaveData): number | null {
  if (s.armyAge >= FINAL_AGE) return null;
  const tl = Math.max(1, s.timeline) - 1;
  return Math.round(BALANCE.evolution.cost[s.armyAge + 1] * Math.pow(BALANCE.timeline.goldGrowthPerTimeline, tl));
}

/** Evolution opens once your own Age's boss is beaten. */
export function evolveUnlocked(s: SaveData): boolean {
  return s.armyAge < FINAL_AGE && s.beaten.includes(s.armyAge);
}

export function canEvolve(s: SaveData): boolean {
  const c = evolveCost(s);
  return evolveUnlocked(s) && c !== null && s.gold >= c;
}

/** Pay, move your army up one Age, and start the new Age fresh: Gold and upgrades reset, slots stay. */
export function evolve(s: SaveData): boolean {
  if (!canEvolve(s)) return false;
  s.armyAge++;
  s.gold = 0;
  s.upgrades = {};
  s.pick = -1;
  return true;
}

/** Prestige needs a Future army and a beaten Future boss. It costs nothing. */
export function canPrestige(s: SaveData): boolean {
  return s.armyAge === FINAL_AGE && s.beaten.includes(FINAL_AGE);
}

/** Starts the next Timeline at Stone battle 1. Timelines never end. */
export function prestige(s: SaveData): boolean {
  if (!canPrestige(s)) return false;
  s.prestige++;
  s.timeline++;
  s.armyAge = 0;
  s.enemyAge = 0;
  s.stage = 0;
  s.pick = -1;
  s.gold = 0;
  s.upgrades = {};
  s.beaten = [];
  return true;
}

/** Stormcall unlocks on Stone stage 4 and stays unlocked. */
export function stormcallUnlocked(s: SaveData): boolean {
  return s.timeline > 1 || s.enemyAge > 0 || s.stage >= BALANCE.skills.stormcall.unlockStage - 1;
}

/** Double speed unlocks on Stone stage 3 and stays unlocked. */
export function speedUnlocked(s: SaveData): boolean {
  return s.timeline > 1 || s.enemyAge > 0 || s.stage >= BALANCE.skills.speedUnlockStage - 1;
}
