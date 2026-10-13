/**
 * Headless campaign pacing check (run: npx tsx scripts/campaignPacing.ts).
 *
 * Plays a full Timeline 1 campaign with a simple greedy player through the same
 * pure battle simulation and price/reward functions the game uses. It is an
 * analytical study, not a substitute for real-player playtests (see WDC SG-BAL).
 *
 * Player policy: evolve whenever affordable (free once the current Age's enemy is cleared);
 * otherwise unlock ranged, then tank, then buy the cheaper of Food/Base upgrades
 * while affordable. In battle, cycle melee → ranged → melee → tank, deploying
 * the next troop as soon as Food allows.
 */
import { createBattleState, createRng, deployPlayerUnit, stepBattle } from '../src/logic/battleSim';
import { campaignEnemyWave } from '../src/logic/campaignWaves';
import { campaignGoldPayout } from '../src/logic/rules';
import { AGES, getBaseFoodRate, getBaseUpgradeCost, getFoodUpgradeCost } from '../src/data/gameData';
import type { UnitDef } from '../src/types/game';

const CARD_DMG = 0.035; // starter Iron Wolf card, level 1
const MAX_BATTLES = 400;

interface P { gold: number; age: number; stage: number; cleared: Set<number>; food: number; base: number; owned: Set<string> }

export function battle(p: P, seed: number, active = true) {
  const age = AGES[p.age];
  const enemy = AGES[p.stage - 1];
  const eligible = [...age.units, ...(p.age > 0 ? AGES[p.age - 1].units : [])].filter((u) => p.owned.has(u.id));
  const pick = (role: string) => eligible.find((u) => u.role === role);
  const cycle = ['melee', 'ranged', 'melee', 'tank'].map(pick).filter(Boolean) as UnitDef[];
  const baseHp = Math.round(age.baseHp * (1 + (p.base - 1) * 0.12));
  let s = createBattleState({
    seed, battleType: 'campaign', foodRate: getBaseFoodRate(p.food), playerBaseHp: baseHp, playerBaseMaxHp: baseHp,
    enemyBaseMaxHp: enemy.baseHp, enemyRoster: enemy.units, enemyWave: campaignEnemyWave(enemy, 1), timeline: 1,
  });
  const rng = createRng(seed);
  let i = 0;
  while (!s.result && s.tick < 6000) {
    const u = cycle[i % cycle.length];
    if (active && u && s.food >= u.cost) {
      s = deployPlayerUnit(s, {
        ...u, unitDefId: u.id,
        damage: Math.round(u.damage * (1 + CARD_DMG)),
        hp: Math.round(u.hp * (1 + (p.base - 1) * 0.05)),
      }, u.cost);
      i++;
    }
    s = stepBattle(s, rng).state;
  }
  const won = s.result === 'victory';
  return { won, time: s.time, gold: campaignGoldPayout(s.goldEarnedInBattle, 0, won), result: s.result ?? 'timeout' };
}

function shop(p: P) {
  const age = AGES[p.age];
  const evolveCost = p.cleared.has(age.eraNumber) ? 0 : age.evolveCostGold;
  if (p.age < AGES.length - 1 && p.gold >= evolveCost) {
    p.gold -= evolveCost;
    p.age += 1; p.food = 1; p.base = 1; p.stage = Math.max(p.stage, AGES[p.age].eraNumber);
    p.owned.add(AGES[p.age].units[0].id);
    return;
  }
  for (const role of ['ranged', 'tank']) {
    const u = age.units.find((x) => x.role === role)!;
    if (!p.owned.has(u.id) && p.gold >= u.unlockCostGold) { p.gold -= u.unlockCostGold; p.owned.add(u.id); }
  }
  for (;;) {
    const f = getFoodUpgradeCost(p.food), b = getBaseUpgradeCost(p.base);
    if (f <= b && p.gold >= f) { p.gold -= f; p.food++; }
    else if (b < f && p.gold >= b) { p.gold -= b; p.base++; }
    else break;
  }
}

export function runCampaign(startGold = 18) {
  const p: P = { gold: startGold, age: 0, stage: 1, cleared: new Set(), food: 1, base: 1, owned: new Set(['stone_clubber']) };
  const perStage: { stage: number; battles: number; wins: number; seconds: number }[] = [];
  let total = 0, seconds = 0;
  while (total < MAX_BATTLES && !(p.age === 5 && p.cleared.has(6))) {
    shop(p);
    const r = battle(p, total + 1);
    total++; seconds += r.time;
    p.gold += r.gold;
    let row = perStage.find((x) => x.stage === p.stage);
    if (!row) perStage.push(row = { stage: p.stage, battles: 0, wins: 0, seconds: 0 });
    row.battles++; row.seconds += r.time;
    if (r.won) { row.wins++; p.cleared.add(p.stage); p.stage = Math.min(6, p.stage + 1); }
  }
  return { completed: p.age === 5 && p.cleared.has(6), battles: total, minutes: seconds / 60, perStage, final: p };
}

if (process.argv[1]?.endsWith('campaignPacing.ts')) {
  const fresh = battle({ gold: 18, age: 0, stage: 1, cleared: new Set(), food: 1, base: 1, owned: new Set(['stone_clubber']) }, 1);
  const idle = battle({ gold: 18, age: 0, stage: 1, cleared: new Set(), food: 1, base: 1, owned: new Set(['stone_clubber']) }, 1, false);
  console.log(`Fresh Battle 1, deploying Clubbers: ${fresh.result} at ${fresh.time.toFixed(1)}s, +${fresh.gold} Gold`);
  console.log(`Fresh Battle 1, no deploys:        ${idle.result} at ${idle.time.toFixed(1)}s`);
  const c = runCampaign();
  console.log(`Timeline 1 campaign completed: ${c.completed} in ${c.battles} battles, ~${c.minutes.toFixed(0)} min of battle time`);
  console.log('  final', JSON.stringify({ ...c.final, cleared: [...c.final.cleared], owned: [...c.final.owned] }));
  for (const r of c.perStage) console.log(`  Enemy stage ${r.stage} (${AGES[r.stage - 1].name}): ${r.wins}/${r.battles} wins, ${(r.seconds / 60).toFixed(1)} min`);
}
