/**
 * Save data with a schema version. Old saves are upgraded step by step through MIGRATIONS,
 * then repaired (clamped, unknown ids dropped) so a damaged save never crashes the game.
 */
import { BALANCE, troopDef } from './balance';

export const SAVE_SCHEMA = 2;
export const SAVE_KEY = 'stormglass.save';

export interface Settings {
  sound: boolean;
  /** Turns off screen shake and big flashes. */
  reducedMotion: boolean;
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
  /** The next enemy fortress's Age. Advances by one per campaign win. */
  enemyAge: number;
  timeline: number;
  prestige: number;
  /** Enemy Ages beaten on the current Timeline (makes that Age's Evolution free). */
  beaten: number[];
  /** Troop unlocks bought with Gold. Kept through Prestige. */
  ownedTroops: string[];
  /** Upgrade levels by id. */
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
    beaten: [],
    ownedTroops: ['stone_clubber'],
    upgrades: {},
    battleNo: 0,
    stats: { battles: 0, wins: 0, losses: 0, retreats: 0, goldEarned: 0, kills: 0 },
    settings: { sound: true, reducedMotion: false },
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
  const owned = Array.isArray(s.ownedTroops) ? (s.ownedTroops as unknown[]).filter((id): id is string => typeof id === 'string' && isTroop(id)) : [];
  const stats = (s.stats ?? {}) as AnySave;
  const settings = (s.settings ?? {}) as AnySave;
  const upgrades: Record<string, number> = {};
  if (s.upgrades && typeof s.upgrades === 'object') for (const [k, v] of Object.entries(s.upgrades)) upgrades[k] = int(v, 0, 0, 999);
  return {
    ...d,
    gold: int(s.gold, d.gold, 0, 1e12),
    gems: int(s.gems, 0, 0, 1e9),
    keys: int(s.keys, 0, 0, 1e6),
    runePoints: int(s.runePoints, 0, 0, 1e6),
    armyAge: int(s.armyAge, 0, 0, maxAge),
    enemyAge: int(s.enemyAge, 0, 0, maxAge),
    timeline: int(s.timeline, 1, 1, 999),
    prestige: int(s.prestige, 0, 0, 999),
    beaten: Array.isArray(s.beaten) ? [...new Set((s.beaten as unknown[]).filter((a): a is number => Number.isInteger(a) && (a as number) >= 0 && (a as number) <= maxAge))] : [],
    ownedTroops: [...new Set(['stone_clubber', ...owned])],
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
    settings: { sound: settings.sound !== false, reducedMotion: settings.reducedMotion === true },
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
