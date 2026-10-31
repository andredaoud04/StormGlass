import type { BattleState, Side, Unit } from './types';

/** Deal damage to a unit. Kills pay campaign Gold exactly once, at the moment of death. */
export function damageUnit(s: BattleState, target: Unit, dmg: number, attackerSide: Side): void {
  if (!target.alive) return;
  target.hp -= dmg;
  if (target.def.bossDef && attackerSide === 0) payBossGold(s, target);
  if (target.hp <= 0) {
    target.hp = 0;
    target.alive = false;
    target.walking = false;
    target.windup = -1;
    s.events.push({ type: 'death', id: target.id, side: target.side, x: target.x, tank: target.def.tank });
    if (target.side === 1 && attackerSide === 0) {
      s.kills++;
      if (target.def.tank) s.tankKills++;
      if (target.def.bossDef) {
        // Paid through payBossGold above.
      } else if (s.config.goldEnabled) {
        const amount = target.def.tank ? s.config.goldPerTankKill : s.config.goldPerKill;
        if (target.def.tank) s.gold.tanks += amount;
        else s.gold.kills += amount;
        s.events.push({ type: 'gold', amount, reason: target.def.tank ? 'tank' : 'kill', x: target.x });
      }
    }
  }
}

const BOSS_GOLD_STEPS = 10;

/** Boss Gold: one tenth for each tenth of its HP worn down, so even a lost boss fight pays. */
function payBossGold(s: BattleState, boss: Unit): void {
  if (!s.config.goldEnabled) return;
  const total = boss.def.bossDef!.gold;
  const lost = boss.maxHp - Math.max(0, boss.hp);
  const reached = Math.min(BOSS_GOLD_STEPS, Math.floor((lost * BOSS_GOLD_STEPS) / boss.maxHp + 1e-9));
  while (s.bossMilestonesPaid < reached) {
    const i = s.bossMilestonesPaid++;
    const amount = Math.floor((total * (i + 1)) / BOSS_GOLD_STEPS) - Math.floor((total * i) / BOSS_GOLD_STEPS);
    if (amount > 0) {
      s.gold.boss += amount;
      s.events.push({ type: 'gold', amount, reason: 'boss', x: boss.x });
    }
  }
}
