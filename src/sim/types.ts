import type { Rng } from './rng';

export type Side = 0 | 1; // 0 = player (left), 1 = enemy (right)
export type TroopKind = 'melee' | 'ranged' | 'tank';
export type StatusKind = 'poison' | 'burn' | 'cold';

/** Fully resolved combat stats for one troop type, after upgrades and Timeline scaling. */
export interface TroopStats {
  id: string;
  kind: TroopKind;
  cost: number;
  hp: number;
  dmg: number;
  /** Seconds between attacks. */
  interval: number;
  /** Lane units. */
  range: number;
  /** Lane units per second. */
  speed: number;
  tank: boolean;
  boss?: boolean;
  /** Status effects applied on every hit. */
  onHit?: StatusKind[];
  /** Boss behaviour; only set on boss units. */
  bossDef?: BossDef;
  /** Melee hits up to this many enemies in reach. */
  cleave?: number;
  /** Shots pass through up to this many enemies. */
  pierce?: number;
  /** Area hit radius (lane units) around the target. */
  splash?: number;
  /** Damage taken from ranged attacks (0.5 = half). */
  armor?: number;
  /** A fortress guard tower's shot (no class matchup). */
  tower?: boolean;
  /** Ticks before this card can be deployed again (player cards only). */
  redeployTicks?: number;
}

/** How traits and class matchups scale damage. */
export interface CombatRules {
  /** matchup[attacker kind][defender kind] damage multiplier (default 1). */
  matchup: Partial<Record<TroopKind, Partial<Record<TroopKind, number>>>>;
  splashShare: number;
  cleaveShare: number;
  pierceShare: number;
  /** Multiplies every hit on a unit (not fortresses). */
  damageScale?: number;
}

/**
 * A boss's move set. Bosses raid your army, then fall back to heal at their fortress.
 * They never attack your fortress: troops are what take it down.
 */
export type BossMove = 'slam' | 'charge' | 'lance' | 'barrage' | 'quake' | 'blink';

export interface BossDef {
  move: BossMove;
  /** Seconds of telegraph before a strike lands. */
  windup: number;
  /** Area radius of a strike, in lane units around the target. */
  radius: number;
  /** How far down the lane a raid may go, as a fraction of the lane from the enemy fortress. */
  reach: number;
  /** Battle second the boss first appears. */
  spawnSec: number;
  raidSec: number;
  restSec: number;
  /** Fraction of max HP healed per second while resting at home. */
  healPerSec: number;
  /** A raid ends early after losing this fraction of max HP. */
  retreatAt: number;
  gold: number;
  /** charge and lance: dash when an enemy is this close, at chargeSpeed x speed. */
  chargeRange?: number;
  chargeSpeed?: number;
  /** Damage multiplier of the dash hit. */
  chargeMul?: number;
  /** Lane units the dash pushes enemies back. */
  knockback?: number;
  /** blink: strikes per raid before blinking home. */
  strikes?: number;
}

export type BossPhase = 'raid' | 'retreat' | 'rest';

export interface BossState {
  phase: BossPhase;
  /** Ticks spent in the current phase. */
  timer: number;
  /** HP when the current raid started. */
  raidHp: number;
  /** Dash used this raid (charge and lance). */
  charged: boolean;
  dashing: boolean;
  /** Units already hit by the current lance dash. */
  pierced: number[];
  strikes: number;
  /** Where the telegraphed strike will land (lane x). */
  strikeX: number;
}

export interface WaveScript {
  /** [seconds, kind] pairs in time order. */
  spawns: [number, TroopKind][];
  loopFrom: number;
  loopPeriod: number;
  /** Spawn indices that open a new wave (for the WAVE banner). Each loop repeat is a new wave too. */
  waveStarts?: number[];
  /** Wave numbers (1-based) that are big waves: a surge well above the usual size. */
  bigWaves?: number[];
}

/**
 * Sorties: when the enemy fortress drops to each threshold (share of its HP left), its garrison
 * charges out. This is what pushes a siege back down the lane and makes camping the gate risky.
 */
export interface SortieConfig {
  thresholds: number[];
  /** Units released per sortie, by kind, in order. */
  units: TroopKind[][];
  /** Garrison troops (tougher than the stage's ordinary enemies). */
  troops: Record<TroopKind, TroopStats>;
  /** Ticks between two garrison units leaving the gate. */
  gapTicks: number;
  /**
   * How far the garrison will go, as a share of the lane from its own gate. Your rally holds the
   * middle and does not march on to win the battle for you; the enemy's sortie has no leash.
   */
  leash?: number;
}

export interface StatusRules {
  poison: { perStackPctOfAttackerDmgPerSec: number; durationSec: number; maxStacks: number };
  burn: { pctOfAttackerDmgPerSec: number; durationSec: number };
  cold: { slowPerStack: number; durationSec: number; maxStacks: number };
  bossMultiplier: number;
}

/** How units spread across the width of the path. Positions are -1 (far edge) to 1 (near edge). */
export interface BandRules {
  /** Spawn positions are picked in [-spawnSpread, spawnSpread]. */
  spawnSpread: number;
  /** Allies closer than sepX lane units (left-right) and sepLane (across) push apart. */
  sepX: number;
  sepLane: number;
  /** Across-the-path push per tick at full overlap. */
  push: number;
  /** Across-the-path shove from a heavy hit, and from a boss strike or charge. */
  hitShove: number;
  bossShove: number;
}

export interface BattleConfig {
  seed: number;
  tickRate: number;
  laneLength: number;
  spawnOffset: number;
  maxUnitsPerSide: number;
  projectileSpeed: number;
  band: BandRules;
  combat: CombatRules;
  /** Player Food income in milli-Food per second (1000 = 1 Food/s). */
  foodRateMilli: number;
  playerBaseHp: number;
  enemyBaseHp: number;
  /** Up to 3 troop types the player can deploy, by slot. */
  playerTroops: TroopStats[];
  /** Enemy troop types by kind. */
  enemyTroops: Record<TroopKind, TroopStats>;
  wave: WaveScript;
  /** Divides wave times (1 = authored pace). */
  waveSpeed: number;
  /** Campaign battles pay Gold; dungeons and events do not. */
  goldEnabled: boolean;
  goldPerKill: number;
  goldPerTankKill: number;
  /** Total Gold paid for taking the enemy base from full to zero. */
  baseGoldTotal: number;
  baseGoldSteps: number;
  status: StatusRules;
  /** Boss stage: the boss troop, and a ward that keeps the enemy fortress safe until it falls. */
  boss?: TroopStats;
  /** Stormcall, once unlocked: a lightning strike on the enemy nearest your fortress. */
  skill?: SkillConfig;
  /** Food you start the battle with (milli-Food). */
  startFoodMilli?: number;
  /** In-battle Food upgrade, once unlocked. */
  kitchen?: KitchenConfig;
  /** The enemy garrison's counterattacks as its fortress is worn down. */
  sortie?: SortieConfig;
  /** Your own garrison: it rallies out when your fortress is worn down, the same way. */
  rally?: SortieConfig;
  /** Survival: the enemy fortress can never be hurt; the run ends when yours falls. */
  endless?: boolean;
  /** Late in a long battle the enemy's troops themselves grow stronger, so no battle can stall. */
  enrage?: { fromWave: number; perWave: number };
  /** Guard towers: each fortress shoots the nearest attacker in range ([player, enemy]). */
  towers?: [TowerConfig, TowerConfig];
}

/** A fortress guard tower. It gives the defender an edge at its own gate, so sieges can be thrown back. */
export interface TowerConfig {
  dmg: number;
  range: number;
  intervalTicks: number;
}

/** The in-battle Food upgrade: spend Food to raise Food income for the rest of the battle. */
export interface KitchenConfig {
  baseCostMilli: number;
  growth: number;
  /** Income added per level, as a fraction of the starting rate. */
  perLevel: number;
  maxLevel: number;
}

export interface SkillConfig {
  dmg: number;
  radius: number;
  cooldownTicks: number;
  /** Ticks after the battle starts before the first use. */
  firstTicks: number;
  /** Damage multiplier against bosses. */
  bossMul: number;
}

export interface PoisonState { stacks: number; ticks: number; dpsPerStack: number }
export interface BurnState { ticks: number; dps: number }
export interface ColdState { stacks: number; ticks: number }

export interface Unit {
  id: number;
  side: Side;
  def: TroopStats;
  x: number;
  prevX: number;
  /** Position across the width of the path, -1 (far edge) to 1 (near edge). Does not affect combat. */
  lane: number;
  hp: number;
  maxHp: number;
  /** Ticks until the next attack may start. */
  cooldown: number;
  /** Ticks until the current swing lands; -1 when not swinging. */
  windup: number;
  /** Unit id, BASE_TARGET, or NO_TARGET. */
  target: number;
  alive: boolean;
  /** Ticks since death (bodies stay one second for the death animation). */
  deadTicks: number;
  walking: boolean;
  poison: PoisonState;
  burn: BurnState;
  cold: ColdState;
  boss?: BossState;
  /** Garrison units stop advancing at this lane x and hold there. */
  leashX?: number;
}

export const BASE_TARGET = -2;
export const NO_TARGET = -1;

export interface Projectile {
  id: number;
  side: Side;
  x: number;
  prevX: number;
  target: number;
  targetX: number;
  dmg: number;
  attackerDmg: number;
  onHit?: StatusKind[];
  /** The shooter's stats (traits and matchups apply on impact). */
  src: TroopStats;
  done: boolean;
}

export type BattleResult = 'victory' | 'defeat' | 'retreat' | null;

export type Command =
  | { type: 'deploy'; slot: number }
  | { type: 'skill' }
  | { type: 'kitchen' }
  | { type: 'retreat' };

export type SimEvent =
  | { type: 'spawn'; id: number; side: Side }
  | { type: 'swing'; id: number }
  | { type: 'shoot'; id: number; projectile: number }
  | { type: 'hit'; target: number; side: Side; dmg: number; x: number; heavy: boolean; ranged: boolean; area?: 'splash' | 'pierce' | 'cleave'; kill?: boolean }
  | { type: 'splash'; x: number; radius: number; side: Side }
  | { type: 'wave'; n: number; big?: boolean }
  | { type: 'sortie'; n: number; size: number; side: Side }
  | { type: 'towerShot'; side: Side; projectile: number }
  | { type: 'baseHit'; side: Side; dmg: number; heavy: boolean }
  | { type: 'dot'; target: number; kind: 'poison' | 'burn'; dmg: number; x: number }
  | { type: 'status'; target: number; kind: StatusKind }
  | { type: 'death'; id: number; side: Side; x: number; tank: boolean }
  | { type: 'fizzle'; projectile: number; x: number }
  | { type: 'gold'; amount: number; reason: 'kill' | 'tank' | 'base' | 'boss'; x: number }
  | { type: 'bossSpawn'; id: number }
  | { type: 'bossPhase'; id: number; phase: BossPhase }
  | { type: 'bossWindup'; id: number; move: BossMove; x: number; ticks: number }
  | { type: 'bossStrike'; id: number; move: BossMove; x: number; radius: number }
  | { type: 'bossDash'; id: number }
  | { type: 'bossBlink'; id: number; from: number; to: number }
  | { type: 'skill'; x: number; radius: number }
  | { type: 'kitchen'; level: number }
  | { type: 'skillFail'; reason: 'locked' | 'cooldown' | 'target' }
  | { type: 'wardHit'; dmg: number }
  | { type: 'wardBreak' }
  | { type: 'deployFail'; slot: number; reason: 'food' | 'cap' | 'slot' | 'cooldown' }
  | { type: 'end'; result: Exclude<BattleResult, null> };

export interface BattleState {
  config: BattleConfig;
  rng: Rng;
  tick: number;
  foodMilli: number;
  foodRemainder: number;
  foodSpentMilli: number;
  playerBaseHp: number;
  enemyBaseHp: number;
  units: Unit[];
  projectiles: Projectile[];
  nextId: number;
  /** Index into the (looping) wave sequence of the next enemy spawn. */
  waveIndex: number;
  result: BattleResult;
  gold: { kills: number; tanks: number; base: number; boss: number };
  /** Boss stage only: the enemy fortress takes no damage while the ward is up. */
  wardUp: boolean;
  bossId: number;
  bossSpawned: boolean;
  /** Boss Gold is paid in steps as the boss is worn down (healing never pays twice). */
  bossMilestonesPaid: number;
  /** Ticks until Stormcall is ready. */
  skillCooldown: number;
  /** In-battle Food upgrade level bought this battle. */
  kitchenLevel: number;
  skillsUsed: number;
  baseMilestonesPaid: number;
  kills: number;
  tankKills: number;
  deployed: number;
  /** Sorties already triggered, the garrison units still to leave the gate, and ticks until the next. */
  sortiesDone: [number, number];
  sortieQueue: [TroopKind[], TroopKind[]];
  sortieWait: [number, number];
  /** The wave now on the lane (0 before the first). */
  waveNow: number;
  /** Ticks until each card slot can be deployed again. */
  cardWait: number[];
  /** Ticks until each fortress tower may shoot again ([player, enemy]). */
  towerWait: [number, number];
  events: SimEvent[];
}
