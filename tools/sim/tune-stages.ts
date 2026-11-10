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
/** Stone is the first session: a gentler curve, fought with the troops a new player really has. */
const STONE_TARGET = [0, 1, 3, 5, 7];
const STONE_SLOTS: string[][] = [[], [], ['ranged'], ['ranged', 'tank'], ['ranged', 'tank']];
/** Battle 1 is won with Clubbers alone in about 45 s. */
const BATTLE_ONE = 0.8;
const SEEDS = [3, 17, 41, 77, 5, 9];

function wins(age: number, stage: number, lv: number): boolean {
  const s = newSave(1);
  s.armyAge = age;
  s.slots = age === 0 ? STONE_SLOTS[stage] : ['ranged', 'tank'];
  s.upgrades = { food: lv, fortress: lv };
  // Must win on most seeds.
  let w = 0;
  for (const seed of SEEDS) {
    const cfg = buildBattleConfig({ seed, loadout: loadout(s), enemyAge: age, stage, armyAge: age, timeline: 1, foodRateMilli: foodRateMilli(s), fortressMul: fortressMul(s), campaign: true, stormcall: true, kitchen: true });
    if (runBattle(cfg, smartPolicy(), 300).result === 'victory') w++;
  }
  return w >= SEEDS.length - 1;
}

for (let age = 0; age < BALANCE.ages.length; age++) {
  const a = BALANCE.ages[age];
  const sp = (a.stagePower ?? BALANCE.campaign.stagePower).slice();
  a.stagePower = sp;
  for (let stage = 0; stage < sp.length; stage++) {
    const want = age === 0 ? STONE_TARGET[stage] : TARGET[stage];
    // Strongest multiplier that is beatable at `want` but not at want-2 (for stage 0: beatable at 0).
    let lo = 0.3;
    let hi = 3;
    for (let it = 0; it < 9; it++) {
      const mid = (lo + hi) / 2;
      sp[stage] = mid;
      if (wins(age, stage, want)) lo = mid;
      else hi = mid;
    }
    // Stone is the first session: a wider margin.
    sp[stage] = Math.round(lo * (age === 0 ? 0.9 : 0.96) * 1000) / 1000;
    if (age === 0 && stage === 0) sp[stage] = BATTLE_ONE;
  }
  console.log(a.id, JSON.stringify(sp));
}
