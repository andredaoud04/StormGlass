/** Builds the battle a save is about to fight: the one place that turns a save into a BattleConfig. */
import { buildBattleConfig } from './battleSetup';
import { kitchenUnlocked, loadout, stormcallUnlocked, type StageRef } from './progress';
import { cardMuls } from './meta';
import type { SaveData } from './save';
import { foodRateMilli, fortressMul, starGold, starPower } from './upgrades';
import type { BattleConfig } from '../sim/types';

export function battleFor(s: SaveData, ref: StageRef, seed: number, goldBonus = 1): BattleConfig {
  return buildBattleConfig({
    seed,
    loadout: loadout(s),
    enemyAge: ref.age,
    stage: ref.stage,
    armyAge: s.armyAge,
    timeline: s.timeline,
    foodRateMilli: foodRateMilli(s),
    fortressMul: fortressMul(s),
    powerMul: starPower(s),
    kindMul: cardMuls(s),
    goldBonus: starGold(s) * goldBonus,
    campaign: true,
    stormcall: stormcallUnlocked(s),
    kitchen: kitchenUnlocked(s),
  });
}
