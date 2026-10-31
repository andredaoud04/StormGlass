/**
 * Tunes each Age's stagePower so stage k needs about TARGET[k] Food/Base upgrade levels with the
 * smart bot (no walls, a steady climb). Prints the arrays; copy them into balance.json.
 */
import { BALANCE } from '../../src/game/balance';
import { buildBattleConfig } from '../../src/game/battleSetup';
import { runBattle, smartPolicy } from '../../src/game/bots';
import { loadout } from '../../src/game/progress';
import { newSave } from '../../src/game/save';
import { fortressMul, foodRateMilli } from '../../src/game/upgrades';

const TARGET = (process.env.TARGET ?? '0,3,6,9,12').split(',').map(Number);
const SEEDS = [11, 23, 37];

function wins(age: number, stage: number, lv: number): boolean {
  const s = newSave(1);
  s.armyAge = age;
  s.slots = ['ranged', 'tank'];
  s.upgrades = { food: lv, fortress: lv };
  // Must win on most seeds.
  let w = 0;
  for (const seed of SEEDS) {
    const cfg = buildBattleConfig({ seed: seed + stage, loadout: loadout(s), enemyAge: age, stage, armyAge: age, timeline: 1, foodRateMilli: foodRateMilli(s), fortressMul: fortressMul(s), campaign: true, stormcall: true });
    if (runBattle(cfg, smartPolicy(), 300).result === 'victory') w++;
  }
  return w >= 2;
}

for (let age = 0; age < BALANCE.ages.length; age++) {
  const a = BALANCE.ages[age];
  const sp = (a.stagePower ?? BALANCE.campaign.stagePower).slice();
  a.stagePower = sp;
  for (let stage = 0; stage < sp.length; stage++) {
    const want = TARGET[stage];
    // Strongest multiplier that is beatable at `want` but not at want-2 (for stage 0: beatable at 0).
    let lo = 0.3;
    let hi = 3;
    for (let it = 0; it < 18; it++) {
      const mid = (lo + hi) / 2;
      sp[stage] = mid;
      if (wins(age, stage, want)) lo = mid;
      else hi = mid;
    }
    sp[stage] = Math.round(lo * 0.97 * 1000) / 1000;
    if (age === 0 && stage === 0) sp[stage] = Math.min(sp[stage], 1.0);
  }
  console.log(a.id, JSON.stringify(sp));
}
