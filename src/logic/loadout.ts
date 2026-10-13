import type { PlayerProfile, UnitDef } from '../types/game';
import { AGES, getAgeIndex } from '../data/gameData';

export const LOADOUT_SLOTS = 3;

type LoadoutSource = Pick<PlayerProfile, 'armyAge' | 'unlockedTroopIds'> & { troopLoadout?: unknown };

/**
 * Troops the player may field: owned units of the current Army Age or the
 * immediately previous Age, in default order (current Age first, then previous).
 * "Owned" = purchased/granted (unlockedTroopIds) or the current Age's free melee.
 */
export function eligibleTroops(profile: LoadoutSource): UnitDef[] {
  const idx = getAgeIndex(profile.armyAge);
  if (idx < 0) return [];
  const current = AGES[idx];
  const previous = idx > 0 ? AGES[idx - 1] : null;
  const owned = Array.isArray(profile.unlockedTroopIds) ? profile.unlockedTroopIds : [];
  return [...current.units, ...(previous ? previous.units : [])].filter(
    (u) => owned.includes(u.id) || (u.ageId === current.id && u.unlockCostGold === 0),
  );
}

/**
 * Returns a valid three-slot loadout: keeps the player's eligible, distinct picks in
 * order, then fills empty slots from eligible troops in default order (max 3).
 */
export function normalizeLoadout(profile: LoadoutSource): string[] {
  const eligibleIds = eligibleTroops(profile).map((u) => u.id);
  const saved = Array.isArray(profile.troopLoadout) ? profile.troopLoadout : [];
  const result: string[] = [];
  for (const id of saved) {
    if (result.length >= LOADOUT_SLOTS) break;
    if (typeof id === 'string' && eligibleIds.includes(id) && !result.includes(id)) result.push(id);
  }
  for (const id of eligibleIds) {
    if (result.length >= LOADOUT_SLOTS) break;
    if (!result.includes(id)) result.push(id);
  }
  return result;
}

/** Profile with its troopLoadout normalized (same object when already valid). */
export function withNormalizedLoadout<T extends LoadoutSource & { troopLoadout: string[] }>(profile: T): T {
  const next = normalizeLoadout(profile);
  const current = profile.troopLoadout;
  if (Array.isArray(current) && current.length === next.length && current.every((id, i) => id === next[i])) return profile;
  return { ...profile, troopLoadout: next };
}

/**
 * Puts `unitId` into `slot`. If the troop is already equipped elsewhere the two
 * slots swap. Ineligible troops or invalid slots leave the (normalized) loadout unchanged.
 */
export function setLoadoutSlot(profile: LoadoutSource, slot: number, unitId: string): string[] {
  const loadout = normalizeLoadout(profile);
  const eligibleIds = eligibleTroops(profile).map((u) => u.id);
  if (!Number.isInteger(slot) || slot < 0 || slot >= loadout.length || !eligibleIds.includes(unitId)) return loadout;
  const next = [...loadout];
  const existing = next.indexOf(unitId);
  if (existing === slot) return loadout;
  if (existing >= 0) next[existing] = next[slot];
  next[slot] = unitId;
  return next;
}

/** UnitDefs for the normalized loadout, in slot order (what combat renders). */
export function loadoutUnits(profile: LoadoutSource): UnitDef[] {
  const eligible = eligibleTroops(profile);
  return normalizeLoadout(profile)
    .map((id) => eligible.find((u) => u.id === id))
    .filter((u): u is UnitDef => Boolean(u));
}
