/**
 * Save data with a schema version. Old saves are upgraded step by step through MIGRATIONS,
 * then repaired (clamped, unknown ids dropped) so a damaged save never crashes the game.
 */
import { BALANCE, troopDef } from './balance';

export const SAVE_SCHEMA = 4;
export const SAVE_KEY = 'stormglass.save';

export interface Settings {
  sound: boolean;
  /** Turns off screen shake and big flashes. */
  reducedMotion: boolean;
  /** Battles run at double speed (once unlocked). */
  fast: boolean;
}

export interface Stats {
  battles: number;
  wins: number;
  losses: number;
  retreats: number;
  goldEarned: number;
  kills: number;
}

export interface SaveData {
  schema: typeof SAVE_SCHEMA;
  createdAt: number;
  gold: number;
  gems: number;
  keys: number;
  runePoints: number;
  /** Your troops' Age, 0 = Stone. Changes only through Evolution. */
  armyAge: number;
  /** Frontier: the Age of the furthest battle unlocked. Can be one Age ahead of your army. */
  enemyAge: number;
  /** Frontier stage within that Age, 0-based; the last stage is the boss. */
  stage: number;
  /** An earlier battle picked for replay (index from the start of the Timeline), or -1 for the frontier. */
  pick: number;
  timeline: number;
  prestige: number;
  /** Ages whose boss is beaten on the current Timeline (unlocks Evolution). */
  beaten: number[];
  /** Troop slots bought with Gold ('ranged', 'tank'). Kept forever. */
  slots: string[];
  /** Upgrade levels (Food, Base). Reset on Evolution. */
  upgrades: Record<string, number>;
  /** Campaign battle counter (for authored first-battle moments and seeds). */
  battleNo: number;
  stats: Stats;
  settings: Settings;
  /** One-time hints already shown. */
  seen: string[];
}

export function newSave(now = 0): SaveData {
  return {
    schema: SAVE_SCHEMA,
    createdAt: now,
    gold: BALANCE.economy.startingGold,
    gems: 0,
    keys: 0,
    runePoints: 0,
    armyAge: 0,
    enemyAge: 0,
    timeline: 1,
    prestige: 0,
    stage: 0,
    pick: -1,
    beaten: [],
    slots: [],
    upgrades: {},
    battleNo: 0,
    stats: { battles: 0, wins: 0, losses: 0, retreats: 0, goldEarned: 0, kills: 0 },
    settings: { sound: true, reducedMotion: false, fast: false },
    seen: [],
  };
}

type AnySave = Record<string, unknown> & { schema?: number; version?: number };

/** Each entry upgrades a save from schema N to N+1. */
export const MIGRATIONS: Record<number, (s: AnySave) => AnySave> = {
  // v0 was the pre-release draft: { version: 0, gold, age, unlocked }.
  0: (s) => ({
    schema: 1,
    createdAt: 0,
    gold: num(s.gold, 0),
    armyAge: num(s.age, 0),
    enemyAge: num(s.age, 0),
    timeline: 1,
    ownedTroops: Array.isArray(s.unlocked) ? s.unlocked : ['stone_clubber'],
    stats: {},
    settings: {},
  }),
  // v1 -> v2: the four currencies, Prestige count, upgrade levels, hints.
  1: (s) => ({ ...s, schema: 2, gems: 0, keys: 0, runePoints: 0, prestige: 0, upgrades: {}, battleNo: num((s.stats as AnySave | undefined)?.battles, 0), seen: [] }),
  // v2 -> v3: campaign stages and the Age Camp. Owned troops become slots; old upgrades are
  // refunded as Gold so nothing bought is lost; the enemy rejoins your army's Age at stage 1.
  2: (s) => {
    const owned = Array.isArray(s.ownedTroops) ? (s.ownedTroops as unknown[]).filter((id): id is string => typeof id === 'string' && isTroop(id)) : [];
    const kinds = new Set(owned.map((id) => troopDef(id).kind));
    const slots = kinds.has('tank') ? ['ranged', 'tank'] : kinds.has('ranged') ? ['ranged'] : [];
    let refund = 0;
    if (s.upgrades && typeof s.upgrades === 'object') {
      for (const v of Object.values(s.upgrades)) {
        const lv = Math.max(0, Math.min(40, Math.floor(num(v, 0))));
        for (let i = 0; i < lv; i++) refund += Math.round(6 * Math.pow(1.25, i));
      }
    }
    const army = num(s.armyAge, 0);
    return { ...s, schema: 3, gold: num(s.gold, 0) + refund, enemyAge: army, stage: 0, slots, camp: {}, beaten: Array.isArray(s.beaten) ? (s.beaten as number[]).filter((a) => a <= army) : [] };
  },
  // v3 -> v4: We Are Warriors format. The Age Camp is gone (its Gold is refunded); the frontier
  // stays where it was, and a beaten boss opens the next Age's battles.
  3: (s) => {
    let refund = 0;
    const army = num(s.armyAge, 0);
    if (s.camp && typeof s.camp === 'object') {
      for (const [k, v] of Object.entries(s.camp)) {
        const base = ({ food: 8, fortress: 6, melee: 6, ranged: 8, tank: 10 } as Record<string, number>)[k] ?? 0;
        const lv = Math.max(0, Math.min(40, Math.floor(num(v, 0))));
        for (let i = 0; i < lv; i++) refund += Math.round(base * Math.pow(1.5, army) * Math.pow(1.35, i));
      }
    }
    const beaten = Array.isArray(s.beaten) ? (s.beaten as number[]) : [];
    let enemyAge = num(s.enemyAge, army);
    let stage = num(s.stage, 0);
    if (beaten.includes(enemyAge) && enemyAge < 5) {
      enemyAge++;
      stage = 0;
    }
    return { ...s, schema: 4, gold: num(s.gold, 0) + refund, upgrades: {}, camp: undefined, enemyAge, stage, pick: -1 };
  },
};

function num(v: unknown, d: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : d;
}

function int(v: unknown, d: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.floor(num(v, d))));
}

/** Upgrade an unknown save object to the current schema and repair bad fields. */
export function migrate(raw: unknown): SaveData {
  if (!raw || typeof raw !== 'object') return newSave();
  let s = { ...(raw as AnySave) };
  let v = typeof s.schema === 'number' ? s.schema : typeof s.version === 'number' ? s.version : 0;
  if (v > SAVE_SCHEMA) return repair(s); // from a newer build: keep what we understand
  while (v < SAVE_SCHEMA) {
    const step = MIGRATIONS[v];
    if (!step) return newSave();
    s = step(s);
    v++;
  }
  return repair(s);
}

export function repair(s: AnySave): SaveData {
  const d = newSave(num(s.createdAt, 0));
  const maxAge = BALANCE.ages.length - 1;
  const stats = (s.stats ?? {}) as AnySave;
  const settings = (s.settings ?? {}) as AnySave;
  const upgrades: Record<string, number> = {};
  if (s.upgrades && typeof s.upgrades === 'object') for (const [k, v] of Object.entries(s.upgrades)) if (k in BALANCE.upgrades.tracks) upgrades[k] = int(v, 0, 0, 999);
  const slotList = Array.isArray(s.slots) ? (s.slots as unknown[]).filter((x): x is string => x === 'ranged' || x === 'tank') : [];
  const slots = slotList.includes('tank') ? ['ranged', 'tank'] : slotList.includes('ranged') ? ['ranged'] : [];
  const armyAge = int(s.armyAge, 0, 0, maxAge);
  return {
    ...d,
    gold: int(s.gold, d.gold, 0, 1e12),
    gems: int(s.gems, 0, 0, 1e9),
    keys: int(s.keys, 0, 0, 1e6),
    runePoints: int(s.runePoints, 0, 0, 1e6),
    armyAge,
    // The frontier is never behind your army, and at most one Age ahead of it.
    enemyAge: Math.max(armyAge, Math.min(armyAge + 1, maxAge, int(s.enemyAge, armyAge, 0, maxAge))),
    stage: int(s.stage, 0, 0, BALANCE.campaign.stagesPerAge - 1),
    pick: int(s.pick, -1, -1, 1e6),
    timeline: int(s.timeline, 1, 1, 999),
    prestige: int(s.prestige, 0, 0, 999),
    beaten: Array.isArray(s.beaten) ? [...new Set((s.beaten as unknown[]).filter((a): a is number => Number.isInteger(a) && (a as number) >= 0 && (a as number) <= maxAge))] : [],
    slots,
    upgrades,
    battleNo: int(s.battleNo, 0, 0, 1e9),
    stats: {
      battles: int(stats.battles, 0, 0, 1e9),
      wins: int(stats.wins, 0, 0, 1e9),
      losses: int(stats.losses, 0, 0, 1e9),
      retreats: int(stats.retreats, 0, 0, 1e9),
      goldEarned: int(stats.goldEarned, 0, 0, 1e12),
      kills: int(stats.kills, 0, 0, 1e12),
    },
    settings: { sound: settings.sound !== false, reducedMotion: settings.reducedMotion === true, fast: settings.fast === true },
    seen: Array.isArray(s.seen) ? (s.seen as unknown[]).filter((x): x is string => typeof x === 'string') : [],
  };
}

function isTroop(id: string): boolean {
  try {
    troopDef(id);
    return true;
  } catch {
    return false;
  }
}

export interface Storage {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}

export function loadSave(store: Storage | null): SaveData {
  try {
    const txt = store?.getItem(SAVE_KEY);
    if (!txt) return newSave(Date.now());
    return migrate(JSON.parse(txt));
  } catch {
    return newSave(Date.now());
  }
}

export function writeSave(store: Storage | null, s: SaveData): void {
  try {
    store?.setItem(SAVE_KEY, JSON.stringify(s));
  } catch {
    // Storage full or blocked: the game keeps running; progress is kept in memory.
  }
}
