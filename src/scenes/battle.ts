/** Campaign battle: fixed-step sim, world view, HUD, ending sequence, result panel. */
import type { App, Scene } from '../app';
import { ageDef } from '../game/balance';
import { buildBattleConfig } from '../game/battleSetup';
import { applyOutcome, loadout, type BattleOutcome } from '../game/progress';
import { foodRateMilli, fortressMul, powerMul } from '../game/upgrades';
import { createBattle, food, stepBattle, totalGold } from '../sim/battle';
import type { BattleState, Command } from '../sim/types';
import { blocker, button, counter, dim, fmt, iconButton } from '../ui/widgets';
import { BattleView } from '../view/battleView';

const MAX_STEPS_PER_FRAME = 6;
const BASE_INSET = 38;

interface Coin {
  x: number;
  y: number;
  sx: number;
  sy: number;
  t: number;
  delay: number;
  amount: number;
}

type Phase = 'play' | 'ending' | 'result';

export class BattleScene implements Scene {
  private sim: BattleState;
  private view: BattleView;
  private acc = 0;
  private pending: Command[] = [];
  private phase: Phase = 'play';
  private paused = false;
  private freeze = 0;
  private slowmo = 0;
  private endT = 0;
  private endSide: 0 | 1 = 1;
  private booms = 0;
  private result: BattleState['result'] = null;
  private outcome: BattleOutcome | null = null;
  private resultT = 0;
  private coins: Coin[] = [];
  private goldShown = 0;
  private goldBump = 0;
  private foodBump = 0;
  private lastFood = 0;
  private cardShake = [0, 0, 0];
  private cardReady = [false, false, false];
  private introT = 0;
  private readonly troops: string[];
  private readonly enemyAge: number;
  private readonly battleNo: number;
  private hudTop = 0;
  private deployedOnce = false;
  private prevEnemyAge: number;

  constructor(private app: App) {
    const s = app.save;
    this.troops = loadout(s);
    this.enemyAge = s.enemyAge;
    this.prevEnemyAge = s.enemyAge;
    this.battleNo = s.battleNo + 1;
    const config = buildBattleConfig({
      seed: (s.createdAt + s.battleNo * 7919) | 0,
      loadout: this.troops,
      enemyAge: s.enemyAge,
      armyAge: s.armyAge,
      timeline: s.timeline,
      foodRateMilli: foodRateMilli(s),
      fortressMul: fortressMul(s),
      powerMul: powerMul(s),
      campaign: true,
    });
    this.sim = createBattle(config);
    this.view = new BattleView(app, this.sim, this.layout(), ageDef(this.enemyAge).id, {
      onCoin: (x, y, amount) => this.spawnCoins(x, y, amount),
      onImpact: (heavy, kill) => {
        if (app.reducedMotion) return;
        this.freeze = Math.max(this.freeze, heavy ? 0.06 : kill ? 0.035 : 0);
      },
    });
    this.deployedOnce = s.seen.includes('deploy');
    app.sfx('fight', { vol: 0.8, jitter: 0 });
  }

  private layout() {
    const { w, h } = this.app;
    const hudH = Math.max(98, Math.min(112, Math.round(h * 0.24)));
    this.hudTop = h - hudH;
    return { groundY: this.hudTop - 24, laneL: BASE_INSET, laneR: w - 1 - BASE_INSET };
  }

  resize(): void {
    this.view.layout = this.layout();
  }

  key(k: string): void {
    if (k === '1' || k === '2' || k === '3') this.deploy(Number(k) - 1);
    if (k === 'Escape' || k === 'p') this.paused = !this.paused;
    if (k === 'blur' && this.phase === 'play') this.paused = true;
  }

  private deploy(slot: number): void {
    if (this.phase !== 'play' || this.paused) return;
    const t = this.sim.config.playerTroops[slot];
    if (!t) return;
    const pendingCost = this.pending.reduce((a, c) => a + (c.type === 'deploy' ? this.sim.config.playerTroops[c.slot].cost * 1000 : 0), 0);
    if (this.sim.foodMilli - pendingCost < t.cost * 1000) {
      this.cardShake[slot] = 0.25;
      this.app.sfx('nope', { vol: 0.5 });
      return;
    }
    this.pending.push({ type: 'deploy', slot });
    if (!this.deployedOnce) {
      this.deployedOnce = true;
      this.app.save.seen.push('deploy');
    }
  }

  private spawnCoins(x: number, y: number, amount: number): void {
    const n = Math.min(5, amount);
    for (let i = 0; i < n; i++) {
      this.coins.push({ x, y, sx: x, sy: y, t: 0, delay: i * 0.06, amount: i === n - 1 ? amount - (n - 1) : 1 });
    }
  }

  private startEnding(result: Exclude<BattleState['result'], null>): void {
    this.result = result;
    if (result === 'retreat') {
      this.finish();
      return;
    }
    this.phase = 'ending';
    this.endT = 0;
    this.booms = 0;
    this.endSide = result === 'victory' ? 1 : 0;
    this.slowmo = this.app.reducedMotion ? 0 : 1.3;
    this.app.sfx(result === 'victory' ? 'victory' : 'defeat', { jitter: 0, vol: 0.9 });
  }

  private finish(): void {
    this.phase = 'result';
    this.resultT = 0;
    if (this.outcome) return;
    const s = this.sim;
    this.outcome = { result: this.result as BattleOutcome['result'], gold: totalGold(s), kills: s.kills, enemyAge: this.enemyAge, campaign: true };
    applyOutcome(this.app.save, this.outcome);
    this.app.persist();
    // Any coins still in the air count now.
    this.goldShown = totalGold(s);
    this.coins = [];
  }

  update(dt: number): void {
    dt = Math.min(dt, 0.1);
    this.introT += dt;
    this.goldBump = Math.max(0, this.goldBump - dt);
    this.foodBump = Math.max(0, this.foodBump - dt);
    for (let i = 0; i < 3; i++) this.cardShake[i] = Math.max(0, this.cardShake[i] - dt);
    if (this.phase === 'result') this.resultT += dt;
    if (this.paused) return;

    let simDt = dt;
    if (this.freeze > 0) {
      this.freeze -= dt;
      simDt = 0;
    }
    if (this.slowmo > 0) {
      this.slowmo -= dt;
      simDt *= 0.35;
    }

    if (this.phase === 'play') {
      const tick = 1 / this.sim.config.tickRate;
      this.acc += simDt;
      let steps = 0;
      while (this.acc >= tick && steps < MAX_STEPS_PER_FRAME) {
        const events = stepBattle(this.sim, this.pending.splice(0));
        this.view.onEvents(events);
        for (const e of events) {
          if (e.type === 'gold' && e.reason === 'base') {
            const x = this.view.layout.laneR + 4;
            this.spawnCoins(x, this.view.layout.groundY - 20 - Math.random() * 30, e.amount);
          }
          if (e.type === 'end') this.startEnding(e.result);
        }
        this.acc -= tick;
        steps++;
        if (this.phase !== 'play') break;
      }
      if (steps === MAX_STEPS_PER_FRAME) this.acc = 0;
    } else if (this.phase === 'ending') {
      this.endT += dt;
      const times = [0, 0.22, 0.45, 0.7, 0.95, 1.2];
      while (this.booms < times.length && this.endT >= times[this.booms]) {
        this.view.explodeAt(this.endSide, this.booms);
        if (this.booms === 3) this.view.destroyBase(this.endSide);
        this.booms++;
      }
      if (this.endT > 2.3) this.finish();
    }

    const tick = 1 / this.sim.config.tickRate;
    this.view.update(dt, Math.min(1, this.acc / tick), simDt / Math.max(dt, 1e-6));

    // Food counter pop and "card ready" pings.
    const f = food(this.sim);
    if (f > this.lastFood) this.foodBump = 0.12;
    this.lastFood = f;
    this.sim.config.playerTroops.forEach((t, i) => {
      const ready = f >= t.cost;
      if (ready && !this.cardReady[i] && this.phase === 'play') this.app.sfx('ready', { vol: 0.35, minGapMs: 120 });
      this.cardReady[i] = ready;
    });

    // Coins fly to the gold counter.
    for (const c of this.coins) {
      c.t += dt;
      if (c.t >= c.delay + 0.65) {
        this.goldShown += c.amount;
        this.goldBump = 0.15;
        this.app.sfx('coin', { vol: 0.45, minGapMs: 35 });
      }
    }
    this.coins = this.coins.filter((c) => c.t < c.delay + 0.65);
  }

  draw(): void {
    const app = this.app;
    const d = app.draw;
    const { w, h } = app;
    this.view.draw();
    this.drawBaseBars();
    this.drawHeader();
    this.drawHud();
    this.drawCoins();
    if (this.phase === 'play' && this.introT < 1.3) this.drawIntro();
    if (this.phase === 'result') this.drawResult();
    else if (this.paused) this.drawPause();
    void d;
    void w;
    void h;
  }

  private drawIntro(): void {
    const d = this.app.draw;
    const t = this.introT;
    const y = Math.round(this.view.layout.groundY - 80 + (t < 0.15 ? (0.15 - t) * -60 : 0));
    const a = t > 1 ? (1.3 - t) / 0.3 : 1;
    d.text('FIGHT!', this.app.w / 2, y, { font: 'big', color: '#ffd03c', shadow: true, align: 'center', alpha: a });
  }

  private drawHeader(): void {
    const app = this.app;
    const d = app.draw;
    const bump = this.goldBump > 0 ? -1 : 0;
    counter(app, 10, 5 + bump, 40, 'gold', '+' + fmt(this.goldShown), '#ffe68a');
    const title = ageDef(this.enemyAge).name.toUpperCase() + ' AGE';
    const tw = d.measure(title, 'big');
    const pw = Math.min(app.w - 110, Math.max(72, tw + 28));
    d.nine('ui.plaque', Math.round(app.w / 2 - pw / 2), 3, pw, 24);
    d.text(title, app.w / 2, 10, { font: 'big', align: 'center', color: '#fff1c0', shadow: true });
    d.text(`BATTLE ${this.battleNo}`, app.w / 2, 29, { align: 'center', color: '#fff8ec' });
    if (this.phase === 'play') iconButton(app, 'pause', app.w - 24, 4, 20, 'pause', () => (this.paused = true));
  }

  private drawBaseBars(): void {
    const d = this.app.draw;
    const s = this.sim;
    const top = this.view.baseTop() - 6;
    const bars: [number, number, number, string, string][] = [
      [this.view.layout.laneL - 16, s.playerBaseHp, s.config.playerBaseHp, '#6fd36a', '#b6f08a'],
      [this.view.layout.laneR + 16, s.enemyBaseHp, s.config.enemyBaseHp, '#ff5a4f', '#ff9a7a'],
    ];
    for (const [cx, hp, max, c1, c2] of bars) {
      const bw = 34;
      const x = Math.round(cx - bw / 2);
      d.rect(x - 1, top - 1, bw + 2, 6, '#1e1526');
      d.rect(x, top, bw, 4, '#4a2a33');
      const fill = Math.ceil((hp / max) * bw);
      if (fill > 0) {
        d.rect(x, top, fill, 4, c1);
        d.rect(x, top, fill, 1, c2);
      }
      d.text(fmt(Math.ceil(hp)), cx, top - 8, { align: 'center' });
    }
  }

  private drawHud(): void {
    const app = this.app;
    const d = app.draw;
    const { w, h } = app;
    const top = this.hudTop;
    d.image('ui.wall_stone', Math.floor(w / 2), top);

    // Hero medallion, raised on the left (locked until the first Prestige).
    const heroUnlocked = app.save.prestige > 0;
    d.image('ui.hero_socket', 24, top + 4);
    d.image('icon.lock', 20, top + 1, { alpha: heroUnlocked ? 0 : 0.75 });

    // Three Skill sockets in a row on the right.
    for (let i = 0; i < 3; i++) {
      const cx = w - 18 - i * 30;
      d.image('ui.skill_socket', cx, top + 20);
      d.image('icon.lock', cx - 4, top + 17, { alpha: 0.55 });
    }

    // Food and rate, lower left.
    const fx = 5;
    const fy = h - 50;
    const fw = 48;
    d.nine('ui.small_plaque', fx, fy, fw, 45);
    const f = food(this.sim);
    const bump = this.foodBump > 0 ? -1 : 0;
    d.image('icon.food', fx + Math.round(fw / 2 - 6), fy + 3 + bump);
    d.text(fmt(f), fx + fw / 2, fy + 17 + bump, { font: 'big', align: 'center', color: '#fff8ec', shadow: true });
    // Progress to the next Food.
    const frac = (this.sim.foodMilli % 1000) / 1000;
    d.rect(fx + 6, fy + 29, fw - 12, 3, '#120c18');
    d.rect(fx + 6, fy + 29, Math.round((fw - 12) * frac), 3, '#e8a020');
    d.rect(fx + 6, fy + 29, Math.round((fw - 12) * frac), 1, '#ffd03c');
    const rate = this.sim.config.foodRateMilli / 1000;
    d.text(`+${rate % 1 ? rate.toFixed(1) : rate}/S`, fx + fw / 2, fy + 35, { align: 'center', color: '#a8e070' });

    // Troop cards, lower right.
    const cw = 38;
    const gap = 3;
    const x0 = w - 5 - (3 * cw + 2 * gap) - 2;
    const cy = h - 52;
    for (let i = 0; i < 3; i++) {
      const x = x0 + i * (cw + gap);
      const id = this.troops[i];
      if (!id) {
        d.image('ui.card_locked', x, cy);
        d.image('icon.lock', x + 16, cy + 13);
        continue;
      }
      const t = this.sim.config.playerTroops[i];
      const ready = f >= t.cost && this.phase === 'play';
      const regionId = 'card' + i;
      const pressed = app.input.isPressed(regionId);
      const sh = this.cardShake[i] > 0 ? Math.round(Math.sin(this.cardShake[i] * 80) * 2) : 0;
      const yy = cy + (pressed ? 1 : 0) - (ready && Math.floor(app.time * 2.5) % 2 === 0 ? 0 : 0);
      const xx = x + sh;
      d.image('ui.card', xx, yy);
      d.image(`portrait.${id}`, xx + 4, yy + 4);
      if (!ready) {
        const missing = Math.max(0, Math.min(1, 1 - (this.sim.foodMilli / 1000) / t.cost));
        const oh = Math.round(28 * missing);
        d.rect(xx + 4, yy + 4, 32, 28, '#1e1526', 0.35);
        d.rect(xx + 4, yy + 4, 32, oh, '#1e1526', 0.45);
      } else {
        const pulse = 0.35 + 0.35 * Math.sin(app.time * 6);
        d.rect(xx + 1, yy + 1, 38, 1, '#ffe68a', pulse);
        d.rect(xx + 1, yy + 46, 38, 1, '#ffe68a', pulse);
        d.rect(xx + 1, yy + 1, 1, 46, '#ffe68a', pulse);
        d.rect(xx + 38, yy + 1, 1, 46, '#ffe68a', pulse);
      }
      d.image('icon.food', xx + 5, yy + 35);
      d.text(String(t.cost), xx + 34, yy + 36, { font: 'big', align: 'right', color: ready ? '#fff8ec' : '#b8a8b0' });
      if (this.phase === 'play' && !this.paused) app.input.region({ id: regionId, x: x, y: cy, w: cw + 2, h: 48, onTap: () => this.deploy(i), onDown: true });
    }

    // First battle: show where to tap.
    if (!this.deployedOnce && this.phase === 'play' && this.introT > 1.2) {
      const bob = Math.round(Math.sin(app.time * 8) * 2);
      const ax = x0 + 20;
      const ay = cy - 12 + bob;
      d.text('TAP!', ax, ay - 9, { font: 'big', align: 'center', color: '#ffd03c', shadow: true });
      for (let i = 0; i < 4; i++) d.rect(ax - 3 + i, ay + i, 7 - i * 2, 1, '#ffd03c');
    }
  }

  private drawCoins(): void {
    const d = this.app.draw;
    for (const c of this.coins) {
      if (c.t < c.delay) continue;
      const p = Math.min(1, (c.t - c.delay) / 0.65);
      const e = p * p;
      const tx = 14;
      const ty = 12;
      const x = c.sx + (tx - c.sx) * e + Math.sin(p * Math.PI) * 6;
      const y = c.sy + (ty - c.sy) * e - Math.sin(p * Math.PI) * 26;
      d.strip('fx.coin', Math.floor(c.t * 14), x, y);
    }
  }

  private drawPause(): void {
    const app = this.app;
    const d = app.draw;
    dim(app);
    blocker(app, 'pause-block');
    const pw = 140;
    const ph = 132;
    const x = Math.round(app.w / 2 - pw / 2);
    const y = Math.round(app.h / 2 - ph / 2);
    d.nine('ui.panel', x, y, pw, ph);
    d.text('PAUSED', app.w / 2, y + 10, { font: 'big', align: 'center', color: '#fff1c0', shadow: true });
    button(app, 'resume', x + 14, y + 26, pw - 28, 26, 'RESUME', () => (this.paused = false), { style: 'green', icon: 'play' });
    button(app, 'retreat', x + 14, y + 56, pw - 28, 24, 'RETREAT', () => {
      this.paused = false;
      this.pending.push({ type: 'retreat' });
      const ev = stepBattle(this.sim, this.pending.splice(0));
      for (const e of ev) if (e.type === 'end') this.startEnding(e.result);
    }, { style: 'red', icon: 'flag', font: 'small' });
    const s = app.save.settings;
    button(app, 'snd', x + 14, y + 86, 53, 22, s.sound ? 'ON' : 'OFF', () => {
      s.sound = !s.sound;
      app.audio.muted = !s.sound;
      app.persist();
    }, { style: 'wood', icon: s.sound ? 'sound' : 'mute', font: 'small' });
    button(app, 'motion', x + 73, y + 86, 53, 22, s.reducedMotion ? 'CALM' : 'SHAKE', () => {
      s.reducedMotion = !s.reducedMotion;
      this.view.shake.enabled = !s.reducedMotion;
      app.persist();
    }, { style: 'wood', font: 'small' });
    d.text('GOLD IS KEPT', app.w / 2, y + ph - 16, { align: 'center', color: '#3a2a30', outline: null });
  }

  private drawResult(): void {
    const app = this.app;
    const d = app.draw;
    const o = this.outcome!;
    const s = this.sim;
    dim(app, Math.min(0.6, this.resultT * 2));
    blocker(app, 'result-block');
    const pw = 156;
    const ph = 150;
    const x = Math.round(app.w / 2 - pw / 2);
    const slide = Math.max(0, 1 - this.resultT / 0.25);
    const y = Math.round(app.h / 2 - ph / 2 + 10 + slide * 40);
    d.nine('ui.panel', x, y, pw, ph);
    const win = o.result === 'victory';
    const title = win ? 'VICTORY!' : o.result === 'defeat' ? 'DEFEAT' : 'RETREAT';
    const rw = d.measure(title, 'big') + 40;
    d.nine(win ? 'ui.ribbon_gold' : 'ui.ribbon_grey', Math.round(app.w / 2 - rw / 2), y - 12, rw, 24);
    d.text(title, app.w / 2, y - 4, { font: 'big', align: 'center', color: win ? '#fff8ec' : '#f0ece6', shadow: true });

    const rows: [string, string, number][] = [
      ['skull', `KILLS x${s.kills - s.tankKills}`, s.gold.kills],
      ['skull', `TANKS x${s.tankKills}`, s.gold.tanks],
      ['hp', 'FORTRESS DAMAGE', s.gold.base],
    ];
    let ry = y + 22;
    rows.forEach(([icon, label, g], i) => {
      const a = Math.min(1, Math.max(0, (this.resultT - 0.25 - i * 0.15) / 0.15));
      if (a <= 0) return;
      d.nine('ui.inset', x + 10, ry, pw - 20, 16, a);
      d.image('icon.' + icon, x + 13, ry + 3, { alpha: a });
      d.text(label, x + 26, ry + 5, { alpha: a });
      d.text('+' + g, x + pw - 24, ry + 5, { align: 'right', color: '#ffe68a', alpha: a });
      d.image('icon.gold', x + pw - 22, ry + 3, { alpha: a });
      ry += 19;
    });
    const total = totalGold(s);
    const ta = Math.min(1, Math.max(0, (this.resultT - 0.75) / 0.2));
    const shown = Math.round(total * Math.min(1, Math.max(0, (this.resultT - 0.75) / 0.6)));
    if (ta > 0) {
      d.text('TOTAL', x + 14, ry + 6, { font: 'big', color: '#fff1c0', shadow: true, alpha: ta });
      d.text('+' + fmt(shown), x + pw - 26, ry + 6, { font: 'big', align: 'right', color: '#ffd03c', shadow: true, alpha: ta });
      d.image('icon.gold', x + pw - 23, ry + 5, { alpha: ta });
    }
    let note = '';
    if (win && this.prevEnemyAge < app.save.enemyAge) note = `NEXT: ${ageDef(app.save.enemyAge).name.toUpperCase()} AGE`;
    else if (!win) note = 'UPGRADE AND TRY AGAIN';
    if (note && this.resultT > 1.1) d.text(note, app.w / 2, ry + 22, { align: 'center', color: '#3a2a30', outline: null });
    if (this.resultT > 0.9) button(app, 'continue', x + 20, y + ph - 32, pw - 40, 26, 'CONTINUE', () => app.go('menu'), { style: 'green' });
  }
}
