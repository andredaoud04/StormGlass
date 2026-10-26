/**
 * Headless pacing simulator. Plays a new save with a simple player policy and reports
 * time to first win, each Evolution and the first Prestige. Usage: npm run sim [-- --json]
 */
import { BALANCE, ageDef } from '../../src/game/balance';
import { buildBattleConfig } from '../../src/game/battleSetup';
import { cyclePolicy, runBattle, smartPolicy } from '../../src/game/bots';
import { applyOutcome, canEvolve, canPrestige, canUnlock, evolve, loadout, unlockTroop } from '../../src/game/progress';
import { newSave, type SaveData } from '../../src/game/save';
import { UPGRADE_IDS, buyUpgrade, foodRateMilli, fortressMul, powerMul, upgradeCost } from '../../src/game/upgrades';

/** Seconds a player spends in menus between battles. */
const MENU_SECONDS = 12;
const MAX_BATTLES = 600;

export interface PacingReport {
  firstWinMin: number | null;
  evolutionsMin: (number | null)[];
  prestigeMin: number | null;
  battles: number;
  wins: number;
  losses: number;
  avgBattleSec: number;
  log: string[];
}

function shop(s: SaveData): void {
  for (const t of ageDef(s.armyAge).troops) if (canUnlock(s, t.id)) unlockTroop(s, t.id);
  // Evolve as soon as the army is behind the enemy and it is affordable.
  if (s.armyAge < s.enemyAge && canEvolve(s)) evolve(s);
  // Spend the rest on the cheapest upgrade, keeping a reserve when saving for Evolution.
  for (let guard = 0; guard < 50; guard++) {
    const next = s.armyAge < BALANCE.ages.length - 1 ? ageDef(s.armyAge + 1).evolveGold : 0;
    const saving = s.armyAge < s.enemyAge && !s.beaten.includes(s.armyAge + 1) ? next : 0;
    let best: (typeof UPGRADE_IDS)[number] | null = null;
    let bestCost = Infinity;
    for (const id of UPGRADE_IDS) {
      const c = upgradeCost(s, id);
      if (c !== null && c < bestCost) {
        best = id;
        bestCost = c;
      }
    }
    if (!best || s.gold - bestCost < saving * 0.5) break;
    if (!buyUpgrade(s, best)) break;
  }
}

export function simulatePacing(policy: 'cycle' | 'smart' = 'smart'): PacingReport {
  const s = newSave(1);
  let t = 0;
  let firstWin: number | null = null;
  const evo: (number | null)[] = [null, null, null, null, null];
  let prestige: number | null = null;
  let battleSec = 0;
  const log: string[] = [];
  let battles = 0;
  while (battles < MAX_BATTLES) {
    shop(s);
    if (s.armyAge > 0 && evo[s.armyAge - 1] === null) evo[s.armyAge - 1] = t;
    if (canPrestige(s)) {
      prestige = t;
      break;
    }
    const l = loadout(s);
    const pattern = l.length === 1 ? [0] : l.length === 2 ? [0, 0, 1] : [0, 1, 0, 2];
    const config = buildBattleConfig({ seed: battles + 1, loadout: l, enemyAge: s.enemyAge, armyAge: s.armyAge, timeline: s.timeline, foodRateMilli: foodRateMilli(s), fortressMul: fortressMul(s), powerMul: powerMul(s), campaign: true });
    const r = runBattle(config, policy === 'smart' ? smartPolicy() : cyclePolicy(pattern), 240);
    const result = r.result === 'victory' ? 'victory' : 'defeat';
    const enemyAge = s.enemyAge;
    applyOutcome(s, { result, gold: r.gold, kills: r.state.kills, enemyAge, campaign: true });
    battles++;
    battleSec += r.seconds;
    t += r.seconds + MENU_SECONDS;
    if (result === 'victory' && firstWin === null) firstWin = t;
    if (result === 'victory' || battles % 10 === 0) {
      log.push(`${(t / 60).toFixed(1).padStart(5)} min  #${String(battles).padStart(3)} army ${ageDef(s.armyAge).name.padEnd(10)} vs ${ageDef(enemyAge).name.padEnd(10)} ${result.padEnd(7)} ${r.seconds.toFixed(0).padStart(3)}s +${r.gold}g  gold ${s.gold}  up ${JSON.stringify(s.upgrades)}`);
    }
  }
  return {
    firstWinMin: firstWin === null ? null : firstWin / 60,
    evolutionsMin: evo.map((v) => (v === null ? null : v / 60)),
    prestigeMin: prestige === null ? null : prestige / 60,
    battles,
    wins: s.stats.wins,
    losses: s.stats.losses,
    avgBattleSec: battleSec / Math.max(1, battles),
    log,
  };
}

if (process.argv[1]?.endsWith('pacing.ts')) {
  const r = simulatePacing(process.argv.includes('--cycle') ? 'cycle' : 'smart');
  if (process.argv.includes('--json')) console.log(JSON.stringify(r, null, 2));
  else {
    for (const line of r.log) console.log(line);
    const f = (v: number | null) => (v === null ? 'never' : `${v.toFixed(1)} min`);
    console.log('\nFirst win:      ', f(r.firstWinMin));
    r.evolutionsMin.forEach((v, i) => console.log(`Evolve to ${ageDef(i + 1).name.padEnd(10)}`, f(v)));
    console.log('First Prestige: ', f(r.prestigeMin));
    console.log(`Battles ${r.battles}, wins ${r.wins}, losses ${r.losses}, average battle ${r.avgBattleSec.toFixed(0)} s`);
  }
}
