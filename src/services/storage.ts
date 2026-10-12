import { PlayerProfile } from '../types/game';

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
      unlockedTroopIds: Array.isArray(parsed.unlockedTroopIds) ? parsed.unlockedTroopIds : ['stone_clubber'],
    };

    // Check UTC daily key refill
    const todayUtc = new Date().toISOString().slice(0, 10);
    if (profile.lastDailyKeyRefillDate !== todayUtc) {
      profile.keys = Math.max(profile.keys, 2);
      profile.lastDailyKeyRefillDate = todayUtc;
    }

    return profile;
  } catch (err) {
    console.error('Failed to load profile:', err);
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
