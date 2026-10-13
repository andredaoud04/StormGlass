export type AgeId = 'stone' | 'ancient' | 'crusader' | 'gunpowder' | 'industrial' | 'future';

export type UnitRole = 'melee' | 'ranged' | 'tank' | 'hero' | 'boss';

export interface UnitDef {
  id: string;
  name: string;
  ageId: AgeId;
  role: UnitRole;
  cost: number; // Food cost
  hp: number;
  damage: number;
  speed: number; // Movement speed units/sec
  range: number; // Attack range
  attackSpeed: number; // Attack cooldown in seconds
  unlockCostGold: number; // 0 if unlocked by default
  description: string;
  projectileType?: 'none' | 'rock' | 'arrow' | 'bolt' | 'bullet' | 'plasma' | 'slash';
}

export interface AgeDef {
  id: AgeId;
  name: string;
  eraNumber: number; // 1 to 6
  baseHp: number;
  evolveCostGold: number;
  description: string;
  themeColor: string;
  environmentSky: string;
  environmentGround: string;
  units: UnitDef[];
}

export interface BattleUnit {
  uid: string;
  unitDefId: string;
  name: string;
  side: 'player' | 'enemy';
  role: UnitRole;
  x: number; // 0 to 100 on battlefield lane
  hp: number;
  maxHp: number;
  damage: number;
  speed: number;
  range: number;
  attackSpeed: number;
  attackCooldown: number;
  isAttacking: boolean;
  isWalking: boolean;
  hitFlash: number; // Countdown for hit animation
  stasisFrozenRemaining: number;
  rallyBuffRemaining: number;
  projectileType?: 'none' | 'rock' | 'arrow' | 'bolt' | 'bullet' | 'plasma' | 'slash';
  isBoss?: boolean;
}

export interface Projectile {
  id: string;
  type: 'rock' | 'arrow' | 'bolt' | 'bullet' | 'plasma' | 'slash';
  startX: number;
  targetX: number;
  currentX: number;
  y: number; // Visual arc
  side: 'player' | 'enemy';
  damage: number;
  targetUid?: string;
  progress: number; // 0 to 1
}

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  isCrit?: boolean;
  opacity: number;
  life: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
}

export interface CardDef {
  id: string;
  name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  type: 'damage' | 'health' | 'food' | 'base_hp' | 'coin_bonus';
  valuePerLevel: number; // percentage
  pullWeight: number; // weight in loot table
  description: string;
  iconName: string;
}

export interface PlayerCardState {
  cardId: string;
  level: number;
  copies: number;
}

export interface SkillDef {
  id: 'stasis' | 'volley' | 'rally';
  name: string;
  cooldown: number; // seconds
  description: string;
  color: string;
  iconName: string;
}

export interface PlayerSkillState {
  skillId: 'stasis' | 'volley' | 'rally';
  level: number;
  copies: number;
  unlocked: boolean;
}

export interface HeroDef {
  id: string;
  name: string;
  title: string;
  ageRequired: AgeId;
  baseMultiplierHp: number;
  baseMultiplierDmg: number;
  description: string;
}

export interface RuneNode {
  id: string;
  name: string;
  parentId: string | null;
  maxRank: number;
  bonusType: 'damage' | 'health' | 'food' | 'base_hp' | 'coins';
  bonusPerRank: number; // percentage
  description: string;
}

export type DungeonType = 'rush' | 'legends' | 'bosses' | 'survival';

export interface LegendsChapter {
  id: number;
  title: string;
  year: string;
  description: string;
  isBoss: boolean;
  enemyCount: number;
  runeReward: number;
}

export interface PlayerProfile {
  timeline: number;
  gold: number;
  gems: number;
  keys: number;
  runePoints: number;
  lastDailyClaimDate: string | null;
  lastDailyKeyRefillDate: string | null;
  lastDailySpinDate: string | null;
  claimedMissionIds: string[];
  legendsClaimedChapterIds: number[];
  
  // Progression
  armyAge: AgeId;
  opponentStage: number; // 1 = Stone, 2 = Ancient, 3 = Crusader, 4 = Gunpowder, 5 = Industrial, 6 = Future
  clearedEnemyStages: number[]; // e.g. [1, 2] means Stone and Ancient base defeated in current timeline
  unlockedTroopIds: string[]; // Troops permanently unlocked with gold
  troopLoadout: string[]; // Up to 3 distinct equipped troop ids (current or previous Army Age, owned)
  
  // Local Age Upgrades (resets on Evolution)
  foodLevel: number;
  baseLevel: number;
  
  // Permanent Collections
  cards: Record<string, PlayerCardState>;
  skills: Record<string, PlayerSkillState>;
  equippedSkills: ('stasis' | 'volley' | 'rally' | null)[];
  runes: Record<string, number>; // nodeId -> rank
  
  // Hero
  heroesUnlocked: string[];
  equippedHeroId: string | null;
  heroRanks: Record<string, number>;
  
  // Dungeons Progression
  rushHighWins: number;
  legendsChapter: number; // Current chapter (1 to 4)
  bossStage: number;
  survivalBestStreak: number;
  
  // Settings
  soundEnabled: boolean;
}

export interface BattleSessionStats {
  battleType: 'campaign' | 'rush' | 'legends' | 'bosses' | 'survival' | 'hell';
  rushTimerRemaining: number;
  rushDurationTotal: number;
  legendsChapterId?: number;
  survivalWave: number;
  survivalCarriedBaseHp?: number;
  survivalPendingRewards: { gems: number; runePoints: number };
  
  // In-battle statistics
  goldEarnedInBattle: number;
  normalKills: number;
  tankKills: number;
  enemyBaseMaxHp: number;
  enemyBaseHpRemovedMilestone: number;
  heroUsed: boolean;
  skillCooldowns: {
    stasis: number;
    volley: number;
    rally: number;
  };
}
