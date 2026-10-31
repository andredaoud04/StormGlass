/**
 * Headless pacing simulator. Plays a new save with a simple player policy and reports time to
 * first win, each boss, each Evolution, the first Prestige and the second Timeline.
 * Usage: npm run sim [-- --json] [-- --cycle]
 */
import { ageDef } from '../../src/game/balance';
import { buildBattleConfig, isBossStage } from '../../src/game/battleSetup';
import { cyclePolicy, runBattle, smartPolicy } from '../../src/game/bots';
import { applyOutcome, canEvolve, canPrestige, evolve, FINAL_AGE, loadout, prestige, stageNumber } from '../../src/game/progress';
import { newSave, type SaveData } from '../../src/game/save';
import { CAMP_IDS, buyUpgrade, canBuy, canUnlockSlot, fortressMul, foodRateMilli, kindMul, unlockSlot, upgradeCost } from '../../src/game/upgrades';

/** Seconds a player spends in menus between battles. */
const MENU_SECONDS = 12;
const MAX_BATTLES = 900;

export interface PacingReport {
  firstWinMin: number | null;
  /** Minutes to beat each Age's boss on Timeline 1. */
  bossesMin: (number | null)[];
  evolutionsMin: (number | null)[];
  prestigeMin: number | null;
  /** Minutes to beat the Future boss on each Timeline (the campaign never ends). */
  timelinesMin: (number | null)[];
  battles: number;
  wins: number;
  losses: number;
  avgBattleSec: number;
  /** Losses per Age on Timeline 1 (how often a stage had to be replayed). */
  lossesByAge: number[];
  log: string[];
}

function shop(s: SaveData): void {
  if (canUnlockSlot(s, 'ranged')) unlockSlot(s, 'ranged');
  if (canUnlockSlot(s, 'tank')) unlockSlot(s, 'tank');
  if (canEvolve(s)) evolve(s);
  // Spend on the cheapest open track; keep some Gold back while a slot is in reach.
  for (let guard = 0; guard < 80; guard++) {
    const reserve = !s.slots.includes('ranged') ? 30 : !s.slots.includes('tank') ? 70 : 0;
    let best: (typeof CAMP_IDS)[number] | null = null;
    let bestCost = Infinity;
    for (const id of CAMP_IDS) {
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

export function simulatePacing(policy: 'cycle' | 'smart' = 'smart', timelines = 2): PacingReport {
  const s = newSave(1);
  let t = 0;
  let firstWin: number | null = null;
  const bosses: (number | null)[] = ageDefs().map(() => null);
  const evo: (number | null)[] = [null, null, null, null, null];
  const lossesByAge = ageDefs().map(() => 0);
  let prestigeAt: number | null = null;
  const timelineDone: (number | null)[] = Array.from({ length: timelines }, () => null);
  let battleSec = 0;
  const log: string[] = [];
  let battles = 0;
  while (battles < MAX_BATTLES) {
    shop(s);
    if (s.timeline === 1 && s.armyAge > 0 && evo[s.armyAge - 1] === null) evo[s.armyAge - 1] = t;
    if (canPrestige(s)) {
      timelineDone[s.timeline - 1] = t;
      if (s.timeline === 1) prestigeAt = t;
      if (s.timeline >= timelines) break;
      prestige(s);
      shop(s);
    }
    const l = loadout(s);
    const pattern = l.length === 1 ? [0] : l.length === 2 ? [0, 0, 1] : [0, 1, 0, 2];
    const stage = s.stage;
    const config = buildBattleConfig({ seed: battles + 1, loadout: l, enemyAge: s.enemyAge, stage, armyAge: s.armyAge, timeline: s.timeline, foodRateMilli: foodRateMilli(s), fortressMul: fortressMul(s), kindMul: kindMul(s), campaign: true });
    const r = runBattle(config, policy === 'smart' ? smartPolicy() : cyclePolicy(pattern), 300);
    const result = r.result === 'victory' ? 'victory' : 'defeat';
    const enemyAge = s.enemyAge;
    const no = stageNumber(s);
    applyOutcome(s, { result, gold: r.gold, kills: r.state.kills, enemyAge, stage, campaign: true });
    battles++;
    battleSec += r.seconds;
    t += r.seconds + MENU_SECONDS;
    if (result === 'victory' && firstWin === null) firstWin = t;
    if (s.timeline === 1 && result === 'defeat') lossesByAge[enemyAge]++;
    if (s.timeline === 1 && result === 'victory' && isBossStage(stage)) bosses[enemyAge] = t;
    log.push(`${(t / 60).toFixed(1).padStart(5)} min  T${s.timeline} ${ageDef(enemyAge).name.padEnd(10)} ${String(no).padStart(2)}${isBossStage(stage) ? ' BOSS' : '     '} ${result.padEnd(7)} ${r.seconds.toFixed(0).padStart(3)}s +${String(r.gold).padStart(4)}g  gold ${String(s.gold).padStart(5)}  slots ${s.slots.length} camp ${JSON.stringify(s.camp)}`);
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
    lossesByAge,
    log,
  };
}

function ageDefs() {
  return Array.from({ length: FINAL_AGE + 1 }, (_, i) => ageDef(i));
}

if (process.argv[1]?.endsWith('pacing.ts')) {
  const tl = process.argv.find((a) => a.startsWith('--timelines='));
  const r = simulatePacing(process.argv.includes('--cycle') ? 'cycle' : 'smart', tl ? Number(tl.split('=')[1]) : 2);
  if (process.argv.includes('--json')) console.log(JSON.stringify(r, null, 2));
  else {
    if (!process.argv.includes('--quiet')) for (const line of r.log) console.log(line);
    const f = (v: number | null) => (v === null ? 'never' : `${v.toFixed(1)} min`);
    console.log('\nFirst win:      ', f(r.firstWinMin));
    r.bossesMin.forEach((v, i) => console.log(`${ageDef(i).name.padEnd(10)} boss   `, f(v), ` losses ${r.lossesByAge[i]}`));
    console.log('First Prestige: ', f(r.prestigeMin));
    r.timelinesMin.forEach((v, i) => console.log(`Timeline ${i + 1} done:`, f(v)));
    console.log(`Battles ${r.battles}, wins ${r.wins}, losses ${r.losses}, average battle ${r.avgBattleSec.toFixed(0)} s`);
  }
}
