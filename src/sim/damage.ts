import type { BattleState, Side, Unit } from './types';

/** Deal damage to a unit. Kills pay campaign Gold exactly once, at the moment of death. */
export function damageUnit(s: BattleState, target: Unit, dmg: number, attackerSide: Side): void {
  if (!target.alive) return;
  target.hp -= dmg;
  if (target.hp <= 0) {
    target.hp = 0;
    target.alive = false;
    target.walking = false;
    target.windup = -1;
    s.events.push({ type: 'death', id: target.id, side: target.side, x: target.x, tank: target.def.tank });
    if (target.side === 1 && attackerSide === 0) {
      s.kills++;
      if (target.def.tank) s.tankKills++;
      if (s.config.goldEnabled) {
        const amount = target.def.tank ? s.config.goldPerTankKill : s.config.goldPerKill;
        if (target.def.tank) s.gold.tanks += amount;
        else s.gold.kills += amount;
        s.events.push({ type: 'gold', amount, reason: target.def.tank ? 'tank' : 'kill', x: target.x });
      }
    }
  }
}
