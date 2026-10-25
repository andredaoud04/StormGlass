import { buildBattleConfig } from '../../src/game/battleSetup';
import { cyclePolicy } from '../../src/game/bots';
import { createBattle, food, stepBattle } from '../../src/sim/battle';
const pat = (process.argv[2] ?? '0,1').split(',').map(Number);
const age = Number(process.argv[3] ?? 0);
const s = createBattle(buildBattleConfig({ seed: 1, loadout: ['stone_clubber', 'stone_slinger', 'stone_brute'], enemyAge: age, armyAge: 0, timeline: 1 }));
const pol = cyclePolicy(pat);
while (!s.result && s.tick < 20 * 200) {
  stepBattle(s, pol(s));
  if (s.tick % 40 === 0) {
    const us = s.units.filter((u) => u.alive).map((u) => `${u.side ? 'E' : 'P'}${u.def.kind[0]}${Math.round(u.x)}:${Math.round(u.hp)}`).join(' ');
    console.log(`${(s.tick / 20).toFixed(0).padStart(3)}s f${food(s)} pb${s.playerBaseHp} eb${s.enemyBaseHp} | ${us}`);
  }
}
console.log(s.result, s.tick / 20);
