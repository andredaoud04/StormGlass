/**
 * Difficulty curve: for every stage, the lowest Food/Base upgrade level at which the smart bot
 * wins with its own Age's full army. A smooth curve means no walls. Usage: npx tsx tools/sim/calibrate.ts
 */
import { ageDef, BALANCE } from '../../src/game/balance';
import { buildBattleConfig } from '../../src/game/battleSetup';
import { runBattle, smartPolicy } from '../../src/game/bots';
import { loadout } from '../../src/game/progress';
import { newSave } from '../../src/game/save';
import { fortressMul, foodRateMilli } from '../../src/game/upgrades';

export function minLevels(timeline = 1): number[][] {
  const out: number[][] = [];
  for (let age = 0; age < BALANCE.ages.length; age++) {
    const row: number[] = [];
    for (let stage = 0; stage < BALANCE.campaign.stagesPerAge; stage++) {
      let need = -1;
      for (let lv = 0; lv <= 40; lv++) {
        const s = newSave(1);
        s.armyAge = age;
        s.timeline = timeline;
        s.slots = ['ranged', 'tank'];
        s.upgrades = { food: lv, fortress: lv };
        const cfg = buildBattleConfig({ seed: 11 + stage, loadout: loadout(s), enemyAge: age, stage, armyAge: age, timeline, foodRateMilli: foodRateMilli(s), fortressMul: fortressMul(s), campaign: true, stormcall: true });
        if (runBattle(cfg, smartPolicy(), 300).result === 'victory') {
          need = lv;
          break;
        }
      }
      row.push(need);
    }
    out.push(row);
  }
  return out;
}

if (process.argv[1]?.endsWith('calibrate.ts')) {
  const rows = minLevels();
  rows.forEach((r, i) => console.log(ageDef(i).name.padEnd(11), r.map((v) => String(v).padStart(3)).join(' ')));
}
