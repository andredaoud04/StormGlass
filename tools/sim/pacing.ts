/**
 * Headless pacing simulator for the We Are Warriors format. A bot plays a new save: it pushes the
 * frontier, buys Food and Base upgrades, replays battles it can win to farm Gold when stuck or
 * when saving for Evolution, and evolves as soon as it can pay.
 * Usage: npm run sim [-- --quiet] [-- --cycle] [-- --timelines=N]
 */
import { ageDef } from '../../src/game/balance';
import { buildBattleConfig, isBossStage } from '../../src/game/battleSetup';
import { cyclePolicy, runBattle, smartPolicy } from '../../src/game/bots';
import { applyOutcome, canEvolve, canPrestige, evolve, evolveCost, evolveUnlocked, FINAL_AGE, frontier, fromIndex, loadout, prestige, stormcallUnlocked, toIndex } from '../../src/game/progress';
import { newSave, type SaveData } from '../../src/game/save';
import { UPGRADE_IDS, buyUpgrade, canBuy, canUnlockSlot, fortressMul, foodRateMilli, unlockSlot, upgradeCost } from '../../src/game/upgrades';

/** Seconds a player spends in menus between battles. */
const MENU_SECONDS = 10;
const MAX_BATTLES = 4000;

export interface PacingReport {
  firstWinMin: number | null;
  /** Minutes until each Age's boss first falls (Timeline 1). */
  bossesMin: (number | null)[];
  /** Minutes until each Evolution (into Ancient ... Future). */
  evolutionsMin: (number | null)[];
  prestigeMin: number | null;
  timelinesMin: (number | null)[];
  battles: number;
  wins: number;
  losses: number;
  avgBattleSec: number;
  /** Share of battles that were replays of an earlier battle (farming). */
  replayShare: number;
  log: string[];
}

function shop(s: SaveData): void {
  if (canUnlockSlot(s, 'ranged')) unlockSlot(s, 'ranged');
  if (canUnlockSlot(s, 'tank')) unlockSlot(s, 'tank');
  if (canEvolve(s)) evolve(s);
  // Once the boss is down, every coin goes to Evolution (upgrades are lost when you evolve).
  if (evolveUnlocked(s)) return;
  for (let guard = 0; guard < 200; guard++) {
    const reserve = !s.slots.includes('ranged') ? 30 : !s.slots.includes('tank') ? 70 : 0;
    let best: (typeof UPGRADE_IDS)[number] | null = null;
    let bestCost = Infinity;
    for (const id of UPGRADE_IDS) {
      const c = upgradeCost(s, id);
      if (c !== null && canBuy(s, id) && c < bestCost) {
        best = id;
        bestCost = c;
      }
    }
    if (!best || s.gold - bestCost < reserve * 0.6) break;
    if (!buyUpgrade(s, best)) break;
  }
}

export function simulatePacing(policy: 'cycle' | 'smart' = 'smart', timelines = 1): PacingReport {
  const s = newSave(1);
  let t = 0;
  let firstWin: number | null = null;
  const bosses: (number | null)[] = Array.from({ length: FINAL_AGE + 1 }, () => null);
  const evo: (number | null)[] = Array.from({ length: FINAL_AGE }, () => null);
  const timelineDone: (number | null)[] = Array.from({ length: timelines }, () => null);
  let prestigeAt: number | null = null;
  let battleSec = 0;
  let replays = 0;
  let lossStreak = 0;
  /** Highest battle won since the last Evolution: the safe place to farm. */
  let safe = 0;
  const log: string[] = [];
  let battles = 0;
  let farmRuns = 0;
  let lastArmy = 0;
  while (battles < MAX_BATTLES) {
    shop(s);
    if (s.armyAge !== lastArmy) {
      lastArmy = s.armyAge;
      safe = toIndex({ age: s.armyAge, stage: 0 });
      lossStreak = 0;
    }
    if (s.timeline === 1 && s.armyAge > 0 && evo[s.armyAge - 1] === null) evo[s.armyAge - 1] = t;
    if (canPrestige(s)) {
      timelineDone[s.timeline - 1] = t;
      if (s.timeline === 1) prestigeAt = t;
      if (s.timeline >= timelines) break;
      prestige(s);
      shop(s);
    }
    // Pick a battle: the frontier, unless it is ahead of our army or we keep losing; then farm the
    // furthest battle of our own Age (its boss pays the most once beaten).
    const f = frontier(s);
    const ownLast = toIndex({ age: s.armyAge, stage: 4 });
    let idx = f;
    if (fromIndex(f).age > s.armyAge) idx = lossStreak >= 2 ? safe : Math.min(ownLast, f);
    else if (lossStreak >= 2) idx = safe;
    const ref = fromIndex(idx);
    if (idx !== f) replays++;
    const l = loadout(s);
    const pattern = l.length === 1 ? [0] : l.length === 2 ? [0, 0, 1] : [0, 1, 0, 2];
    const config = buildBattleConfig({ seed: battles + 1, loadout: l, enemyAge: ref.age, stage: ref.stage, armyAge: s.armyAge, timeline: s.timeline, foodRateMilli: foodRateMilli(s), fortressMul: fortressMul(s), campaign: true, stormcall: stormcallUnlocked(s) });
    const r = runBattle(config, policy === 'smart' ? smartPolicy() : cyclePolicy(pattern), 300);
    const result = r.result === 'victory' ? 'victory' : 'defeat';
    applyOutcome(s, { result, gold: r.gold, kills: r.state.kills, enemyAge: ref.age, stage: ref.stage, campaign: true });
    battles++;
    battleSec += r.seconds;
    t += r.seconds + MENU_SECONDS;
    if (result === 'victory') safe = Math.max(safe, idx);
    // Every few farming runs, try the harder battle again.
    if (idx === f || idx === ownLast) lossStreak = result === 'victory' ? 0 : lossStreak + 1;
    else if (++farmRuns % 3 === 0) lossStreak = 0;
    if (result === 'victory' && firstWin === null) firstWin = t;
    if (s.timeline === 1 && result === 'victory' && isBossStage(ref.stage) && bosses[ref.age] === null) bosses[ref.age] = t;
    log.push(`${(t / 60).toFixed(1).padStart(6)} min  T${s.timeline} army ${ageDef(s.armyAge).name.padEnd(10)} battle ${String(idx + 1).padStart(2)}${idx !== f ? ' (replay)' : '         '} ${result.padEnd(7)} ${r.seconds.toFixed(0).padStart(3)}s +${String(r.gold).padStart(4)}g  gold ${String(s.gold).padStart(6)}  evolve ${evolveCost(s) ?? '-'}  up ${JSON.stringify(s.upgrades)}`);
  }
  return {
    firstWinMin: firstWin === null ? null : firstWin / 60,
    bossesMin: bosses.map((v) => (v === null ? null : v / 60)),
    evolutionsMin: evo.map((v) => (v === null ? null : v / 60)),
    prestigeMin: prestigeAt === null ? null : prestigeAt / 60,
    timelinesMin: timelineDone.map((v) => (v === null ? null : v / 60)),
    battles,
    wins: s.stats.wins,
    losses: s.stats.losses,
    avgBattleSec: battleSec / Math.max(1, battles),
    replayShare: replays / Math.max(1, battles),
    log,
  };
}

if (process.argv[1]?.endsWith('pacing.ts')) {
  const tl = process.argv.find((a) => a.startsWith('--timelines='));
  const r = simulatePacing(process.argv.includes('--cycle') ? 'cycle' : 'smart', tl ? Number(tl.split('=')[1]) : 1);
  if (process.argv.includes('--json')) console.log(JSON.stringify(r, null, 2));
  else {
    if (!process.argv.includes('--quiet')) for (const line of r.log) console.log(line);
    const f = (v: number | null) => (v === null ? 'never' : `${v.toFixed(0)} min`);
    console.log('\nFirst win:      ', f(r.firstWinMin));
    r.bossesMin.forEach((v, i) => console.log(`${ageDef(i).name.padEnd(10)} boss   `, f(v), i > 0 ? `  evolved into at ${f(r.evolutionsMin[i - 1])}` : ''));
    console.log('First Prestige: ', f(r.prestigeMin));
    r.timelinesMin.forEach((v, i) => console.log(`Timeline ${i + 1} done:`, f(v)));
    console.log(`Battles ${r.battles}, wins ${r.wins}, losses ${r.losses}, replays ${(r.replayShare * 100).toFixed(0)}%, average battle ${r.avgBattleSec.toFixed(0)} s`);
  }
}
