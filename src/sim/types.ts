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
}

export interface StatusRules {
  poison: { perStackPctOfAttackerDmgPerSec: number; durationSec: number; maxStacks: number };
  burn: { pctOfAttackerDmgPerSec: number; durationSec: number };
  cold: { slowPerStack: number; durationSec: number; maxStacks: number };
  bossMultiplier: number;
}

export interface BattleConfig {
  seed: number;
  tickRate: number;
  laneLength: number;
  spawnOffset: number;
  maxUnitsPerSide: number;
  projectileSpeed: number;
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
  /** Visual depth jitter in art pixels, picked from the seeded RNG. */
  depth: number;
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
  done: boolean;
}

export type BattleResult = 'victory' | 'defeat' | 'retreat' | null;

export type Command =
  | { type: 'deploy'; slot: number }
  | { type: 'retreat' };

export type SimEvent =
  | { type: 'spawn'; id: number; side: Side }
  | { type: 'swing'; id: number }
  | { type: 'shoot'; id: number; projectile: number }
  | { type: 'hit'; target: number; side: Side; dmg: number; x: number; heavy: boolean; ranged: boolean }
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
  | { type: 'wardHit'; dmg: number }
  | { type: 'wardBreak' }
  | { type: 'deployFail'; slot: number; reason: 'food' | 'cap' | 'slot' }
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
  baseMilestonesPaid: number;
  kills: number;
  tankKills: number;
  deployed: number;
  events: SimEvent[];
}
