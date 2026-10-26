/** Scratch tuner: mutates BALANCE in memory and reports pacing. Not part of the game. */
import { BALANCE } from '../../src/game/balance';
import { simulatePacing } from './pacing';

const mul = Number(process.env.MUL ?? 0);
const base = [80, 90, 100];
void base;
const baseHp = 400;
if (mul) BALANCE.ages.forEach((a, i) => {
  const m = Math.pow(mul, i);
  const stone = BALANCE.ages[0].troops;
  a.troops.forEach((t, k) => {
    if (i === 0) return;
    t.hp = Math.round(stone[k].hp * m);
    t.dmg = Math.round(stone[k].dmg * m);
  });
  a.fortressHp = Math.round(baseHp * m);
});
const bg = (process.env.BG ?? "").split(",").filter(Boolean).map(Number);
const ev = (process.env.EV ?? "").split(",").filter(Boolean).map(Number);
BALANCE.ages.forEach((a, i) => { if (bg.length) a.baseGold = bg[i]; if (ev.length) a.evolveGold = ev[i]; });
if (process.env.GROW) for (const u of Object.values(BALANCE.upgrades)) u.costGrowth = Number(process.env.GROW);
if (process.env.UPC) { const c = process.env.UPC.split(',').map(Number); BALANCE.upgrades.food.baseCost = c[0]; BALANCE.upgrades.fortress.baseCost = c[1]; BALANCE.upgrades.power.baseCost = c[2]; }
if (process.env.POW) BALANCE.timeline.enemyPower = Number(process.env.POW);
if (process.env.EP) { const [e0, g] = process.env.EP.split(',').map(Number); BALANCE.ages.forEach((a, i) => (a.enemyPower = e0 * Math.pow(g, i))); }
if (process.env.EPL) { const l = process.env.EPL.split(',').map(Number); BALANCE.ages.forEach((a, i) => (a.enemyPower = l[i])); }
if (process.env.FORT) BALANCE.upgrades.fortress.perLevel = Number(process.env.FORT);
const r = simulatePacing();
const f = (v: number | null) => (v === null ? '  -  ' : v.toFixed(0).padStart(4));
console.log(`win1 ${f(r.firstWinMin)} evo ${r.evolutionsMin.map(f).join(' ')} prestige ${f(r.prestigeMin)} battles ${r.battles} W${r.wins} L${r.losses} avg ${r.avgBattleSec.toFixed(0)}s`);
if (process.env.LOG) for (const l of r.log) console.log(l);
