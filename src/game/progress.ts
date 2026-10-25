/** Pure progression rules: loadout, unlocks, battle results, Evolution, Prestige. */
import { BALANCE, ageDef, ageOfTroop, troopDef } from './balance';
import type { SaveData } from './save';

export const MAX_SLOTS = 3;
export const FINAL_AGE = BALANCE.ages.length - 1;

/** Troops you may deploy: owned troops of your current Age (then the previous Age), max 3. */
export function loadout(s: SaveData): string[] {
  const cur = ageDef(s.armyAge).troops.filter((t) => s.ownedTroops.includes(t.id) || t.unlockGold === 0).map((t) => t.id);
  const out = [...cur];
  if (out.length < MAX_SLOTS && s.armyAge > 0) {
    for (const t of ageDef(s.armyAge - 1).troops) {
      if (out.length >= MAX_SLOTS) break;
      if (s.ownedTroops.includes(t.id) && !out.some((id) => troopDef(id).kind === t.kind)) out.push(t.id);
    }
  }
  const order = { melee: 0, ranged: 1, tank: 2 };
  return out.slice(0, MAX_SLOTS).sort((a, b) => order[troopDef(a).kind] - order[troopDef(b).kind]);
}

export function isOwned(s: SaveData, id: string): boolean {
  return s.ownedTroops.includes(id) || troopDef(id).unlockGold === 0;
}

export function canUnlock(s: SaveData, id: string): boolean {
  const age = ageOfTroop(id);
  return !isOwned(s, id) && age === s.armyAge && s.gold >= troopDef(id).unlockGold;
}

export function unlockTroop(s: SaveData, id: string): boolean {
  if (!canUnlock(s, id)) return false;
  s.gold -= troopDef(id).unlockGold;
  s.ownedTroops.push(id);
  return true;
}

export interface BattleOutcome {
  result: 'victory' | 'defeat' | 'retreat';
  gold: number;
  kills: number;
  /** Enemy Age this battle was fought against. */
  enemyAge: number;
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
    if (o.campaign) {
      if (!s.beaten.includes(o.enemyAge)) s.beaten.push(o.enemyAge);
      if (o.enemyAge === s.enemyAge && s.enemyAge < FINAL_AGE) s.enemyAge++;
    }
  } else if (o.result === 'defeat') s.stats.losses++;
  else s.stats.retreats++;
}

/** Gold needed to evolve to the next Age: free once that Age's fortress is beaten. */
export function evolveCost(s: SaveData): number | null {
  if (s.armyAge >= FINAL_AGE) return null;
  const next = s.armyAge + 1;
  return s.beaten.includes(next) ? 0 : ageDef(next).evolveGold;
}

export function canEvolve(s: SaveData): boolean {
  const c = evolveCost(s);
  return c !== null && s.gold >= c;
}

export function evolve(s: SaveData): boolean {
  const c = evolveCost(s);
  if (c === null || s.gold < c) return false;
  s.gold -= c;
  s.armyAge++;
  return true;
}

/** Prestige needs a Future army and a beaten Future fortress. It costs nothing. */
export function canPrestige(s: SaveData): boolean {
  return s.armyAge === FINAL_AGE && s.beaten.includes(FINAL_AGE);
}

export function prestige(s: SaveData): boolean {
  if (!canPrestige(s)) return false;
  s.prestige++;
  s.timeline++;
  s.armyAge = 0;
  s.enemyAge = 0;
  s.beaten = [];
  return true;
}
