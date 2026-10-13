import { PlayerProfile } from '../types/game';
import { normalizeLoadout } from '../logic/loadout';
import { AGES } from '../data/gameData';

const SAVE_KEY = 'stormglass-save-v1';

export const INITIAL_PROFILE: PlayerProfile = {
  timeline: 1,
  gold: 18,
  gems: 160,
  keys: 2,
  runePoints: 1,
  lastDailyClaimDate: null,
  lastDailyKeyRefillDate: null,
  lastDailySpinDate: null,
  claimedMissionIds: [],
  legendsClaimedChapterIds: [],

  armyAge: 'stone',
  opponentStage: 1,
  clearedEnemyStages: [],
  unlockedTroopIds: ['stone_clubber'],
  troopLoadout: ['stone_clubber'],

  foodLevel: 1,
  baseLevel: 1,

  cards: {
    iron_wolf: { cardId: 'iron_wolf', level: 1, copies: 1 },
  },
  skills: {
    stasis: { skillId: 'stasis', level: 1, copies: 1, unlocked: true },
    volley: { skillId: 'volley', level: 1, copies: 0, unlocked: false },
    rally: { skillId: 'rally', level: 1, copies: 0, unlocked: false },
  },
  equippedSkills: ['stasis', null, null],
  runes: {},

  heroesUnlocked: [],
  equippedHeroId: null,
  heroRanks: {},

  rushHighWins: 0,
  legendsChapter: 1,
  bossStage: 1,
  survivalBestStreak: 0,

  soundEnabled: true,
};

export function loadProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { ...INITIAL_PROFILE };

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid profile save format');
    const profile: PlayerProfile = {
      ...INITIAL_PROFILE,
      ...parsed,
      cards: { ...INITIAL_PROFILE.cards, ...(parsed.cards || {}) },
      skills: { ...INITIAL_PROFILE.skills, ...(parsed.skills || {}) },
      equippedSkills: Array.isArray(parsed.equippedSkills) && parsed.equippedSkills.length === 3
        ? parsed.equippedSkills
        : ['stasis', null, null],
      runes: { ...(parsed.runes || {}) },
      heroRanks: { ...(parsed.heroRanks || {}) },
      clearedEnemyStages: Array.isArray(parsed.clearedEnemyStages) ? parsed.clearedEnemyStages : [],
      claimedMissionIds: Array.isArray(parsed.claimedMissionIds) ? parsed.claimedMissionIds : [],
      legendsClaimedChapterIds: Array.isArray(parsed.legendsClaimedChapterIds)
        ? parsed.legendsClaimedChapterIds
        : Array.from({ length: Math.max(0, Math.min(3, Number(parsed.legendsChapter || 1) - 1)) }, (_, i) => i + 1),
      unlockedTroopIds: Array.isArray(parsed.unlockedTroopIds)
        ? Array.from(new Set(parsed.unlockedTroopIds.filter((id: unknown): id is string => typeof id === 'string')))
        : ['stone_clubber'],
      // Never inherit INITIAL_PROFILE's Stone loadout for an older save; it is derived below.
      troopLoadout: Array.isArray(parsed.troopLoadout) ? parsed.troopLoadout : [],
    };

    // Repair invalid negative/nonfinite balances without removing legitimate positive currency.
    for (const currency of ['gold', 'gems', 'keys', 'runePoints'] as const) {
      const value = Number(profile[currency]);
      profile[currency] = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
    }
    profile.timeline = Math.max(1, Math.floor(Number(profile.timeline) || 1));
    profile.opponentStage = Math.max(1, Math.min(6, Math.floor(Number(profile.opponentStage) || 1)));
    if (!AGES.some((age) => age.id === profile.armyAge)) profile.armyAge = 'stone';
    // Three-slot troop loadout: missing/invalid entries fall back to the legacy default order.
    profile.troopLoadout = normalizeLoadout(profile);

    // Check UTC daily key refill
    const todayUtc = new Date().toISOString().slice(0, 10);
    if (profile.lastDailyKeyRefillDate !== todayUtc) {
      profile.keys = Math.max(profile.keys, 2);
      profile.lastDailyKeyRefillDate = todayUtc;
    }

    return profile;
  } catch (err) {
    console.error('Failed to load profile:', err);
    // Preserve unreadable saves locally before the fallback profile is auto-saved.
    try {
      const damaged = localStorage.getItem(SAVE_KEY);
      if (damaged && !localStorage.getItem(`${SAVE_KEY}-recovery`)) {
        localStorage.setItem(`${SAVE_KEY}-recovery`, damaged);
      }
    } catch { /* Storage may be blocked or exhausted. */ }
    return { ...INITIAL_PROFILE };
  }
}

export function saveProfile(profile: PlayerProfile): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(profile));
  } catch (err) {
    console.error('Failed to save profile:', err);
  }
}
