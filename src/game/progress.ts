/** Pure progression rules: loadout, campaign stages, battle results, Evolution, Prestige. */
import { BALANCE, ageDef } from './balance';
import { isBossStage } from './battleSetup';
import type { SaveData } from './save';
import { hasSlot } from './upgrades';

export const MAX_SLOTS = 3;
export const FINAL_AGE = BALANCE.ages.length - 1;
export const STAGES = BALANCE.campaign.stagesPerAge;

/** Troops you deploy: your Age's melee, plus ranged and tank once their slots are bought. */
export function loadout(s: SaveData): string[] {
  return ageDef(s.armyAge)
    .troops.filter((t) => t.kind === 'melee' || hasSlot(s, t.kind as 'ranged' | 'tank'))
    .map((t) => t.id)
    .slice(0, MAX_SLOTS);
}

/** The current Age's boss is beaten; the next step is Evolution (or Prestige in the Future Age). */
export function bossBeaten(s: SaveData): boolean {
  return s.beaten.includes(s.enemyAge);
}

export function onBossStage(s: SaveData): boolean {
  return isBossStage(s.stage);
}

/** Campaign position counted from the start of the Timeline, 1-based (Stone 1-5, Ancient 6-10, ...). */
export function stageNumber(s: SaveData): number {
  return s.enemyAge * STAGES + s.stage + 1;
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
    if (o.campaign && o.enemyAge === s.enemyAge && (o.stage ?? s.stage) === s.stage) {
      if (isBossStage(s.stage)) {
        if (!s.beaten.includes(s.enemyAge)) s.beaten.push(s.enemyAge);
      } else s.stage++;
    }
  } else if (o.result === 'defeat') s.stats.losses++;
  else s.stats.retreats++;
}

/** Evolution is free and opens once the current Age's boss is beaten. */
export function canEvolve(s: SaveData): boolean {
  return s.armyAge < FINAL_AGE && bossBeaten(s);
}

/** Moves army and enemy to the next Age at stage 1. Age Camp levels reset; slots stay. */
export function evolve(s: SaveData): boolean {
  if (!canEvolve(s)) return false;
  s.armyAge++;
  s.enemyAge = s.armyAge;
  s.stage = 0;
  s.camp = {};
  return true;
}

/** Prestige needs a Future army and a beaten Future boss. It costs nothing. */
export function canPrestige(s: SaveData): boolean {
  return s.armyAge === FINAL_AGE && bossBeaten(s);
}

/** Starts the next Timeline at Stone stage 1. Timelines never end. */
export function prestige(s: SaveData): boolean {
  if (!canPrestige(s)) return false;
  s.prestige++;
  s.timeline++;
  s.armyAge = 0;
  s.enemyAge = 0;
  s.stage = 0;
  s.camp = {};
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
