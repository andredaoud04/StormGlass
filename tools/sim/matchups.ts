/** Matchup grid: each army Age (no upgrades, all troops) vs enemy Ages, with a few bot patterns. */
import { BALANCE, ageDef } from '../../src/game/balance';
import { buildBattleConfig } from '../../src/game/battleSetup';
import { cyclePolicy, runBattle } from '../../src/game/bots';

const pats: Record<string, number[]> = { m: [0], mr: [0, 1], mrmt: [0, 1, 0, 2], mmt: [0, 0, 2] };
for (let army = 0; army < BALANCE.ages.length; army++) {
  for (const enemy of [army, army + 1]) {
    if (enemy >= BALANCE.ages.length) continue;
    const row: string[] = [];
    for (const [name, p] of Object.entries(pats)) {
      const r = runBattle(buildBattleConfig({ seed: 1, loadout: ageDef(army).troops.map((t) => t.id), enemyAge: enemy, armyAge: army, timeline: 1 }), cyclePolicy(p), 240);
      row.push(`${name}:${r.result?.[0]}${r.seconds.toFixed(0)}s/${r.gold}g/${Math.round(100 - (100 * r.state.enemyBaseHp) / r.state.config.enemyBaseHp)}%`);
    }
    console.log(`${ageDef(army).name.padEnd(10)} vs ${ageDef(enemy).name.padEnd(10)} ${row.join('  ')}`);
  }
}
