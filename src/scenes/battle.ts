/** Campaign battle: fixed-step sim, world view, HUD, ending sequence, result panel. */
import type { App, Scene } from '../app';
import { BALANCE, ageDef } from '../game/balance';
import { buildBattleConfig, isBossStage } from '../game/battleSetup';
import { applyOutcome, battleNumber, evolveCost, evolveUnlocked, frontier, loadout, selected, speedUnlocked, STAGES, stormcallUnlocked, toIndex, type BattleOutcome } from '../game/progress';
import { foodRateMilli, fortressMul } from '../game/upgrades';
import { createBattle, food, stepBattle, totalGold } from '../sim/battle';
import type { BattleState, Command } from '../sim/types';
import { blocker, button, counter, dim, fmt, iconButton } from '../ui/widgets';
import { BattleView } from '../view/battleView';

const MAX_STEPS_PER_FRAME = 6;
/** World pixels of each fortress left on screen in front of its anchor (the rest is off the edge). */
const BASE_INSET = 30;

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
  private readonly stage: number;
  private readonly bossName: string;
  /** Replaying an earlier battle (no frontier progress, same Gold). */
  private readonly replay: boolean;
  private bossIntroT = -1;
  private bossBarShown = 0;
  private hudTop = 0;
  private deployedOnce = false;
  private wallKey = 'ui.wall_stone';

  constructor(private app: App) {
    const s = app.save;
    this.troops = loadout(s);
    const sel = selected(s);
    this.enemyAge = sel.age;
    this.stage = sel.stage;
    this.replay = toIndex(sel) < frontier(s);
    this.bossName = BALANCE.bosses[ageDef(sel.age).id].name.toUpperCase();
    const config = buildBattleConfig({
      seed: (s.createdAt + s.battleNo * 7919) | 0,
      loadout: this.troops,
      enemyAge: sel.age,
      stage: sel.stage,
      armyAge: s.armyAge,
      timeline: s.timeline,
      foodRateMilli: foodRateMilli(s),
      fortressMul: fortressMul(s),
      campaign: true,
      stormcall: stormcallUnlocked(s),
    });
    this.sim = createBattle(config);
    this.wallKey = app.assets.has(`ui.wall_${ageDef(this.enemyAge).id}`) ? `ui.wall_${ageDef(this.enemyAge).id}` : 'ui.wall_stone';
    this.view = new BattleView(app, this.sim, this.layout(), ageDef(this.enemyAge).id, {
      onCoin: (x, y, amount) => {
        const [ux, uy] = this.ui(x, y);
        this.spawnCoins(ux, uy, amount);
      },
      onImpact: (heavy, kill) => {
        if (app.reducedMotion) return;
        this.freeze = Math.max(this.freeze, heavy ? 0.06 : kill ? 0.035 : 0);
      },
    }, ageDef(s.armyAge).id);
    this.deployedOnce = s.seen.includes('deploy');
    app.sfx('fight', { vol: 0.8, jitter: 0 });
  }

  /** Layout in world pixels; the HUD (UI pixels) sits under the ground line. */
  private layout() {
    const { h } = this.app;
    const hudH = Math.max(98, Math.min(112, Math.round(h * 0.24)));
    this.hudTop = h - hudH;
    const k = this.app.worldToUi;
    const ww = this.app.screen.size.ww;
    return { groundY: Math.floor((this.hudTop - 22) / k), laneL: BASE_INSET, laneR: ww - 1 - BASE_INSET };
  }

  /** World x/y to UI x/y. */
  private ui(x: number, y: number): [number, number] {
    const k = this.app.worldToUi;
    return [Math.round(x * k), Math.round(y * k)];
  }

  resize(): void {
    this.view.layout = this.layout();
  }

  key(k: string): void {
    if (k === '1' || k === '2' || k === '3') this.deploy(Number(k) - 1);
    if (k === '4' || k === 'q') this.cast();
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

  private skillShake = 0;

  /** Stormcall: queue the cast; the sim decides if it fires (ready, a target in reach). */
  private cast(): void {
    if (this.phase !== 'play' || this.paused || !this.sim.config.skill) return;
    if (this.sim.skillCooldown > 0 || !this.sim.units.some((u) => u.alive && u.side === 1)) {
      this.skillShake = 0.25;
      this.app.sfx('nope', { vol: 0.5 });
      return;
    }
    if (!this.pending.some((c) => c.type === 'skill')) this.pending.push({ type: 'skill' });
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
    this.outcome = { result: this.result as BattleOutcome['result'], gold: totalGold(s), kills: s.kills, enemyAge: this.enemyAge, stage: this.stage, campaign: true };
    applyOutcome(this.app.save, this.outcome);
    this.app.persist();
    // Any coins still in the air count now.
    this.goldShown = totalGold(s);
    this.coins = [];
  }

  update(dt: number): void {
    dt = Math.min(dt, 0.1);
    this.introT += dt;
    if (this.bossIntroT >= 0) this.bossIntroT += dt;
    if (this.sim.bossSpawned) this.bossBarShown = Math.min(1, this.bossBarShown + dt * 3);
    this.goldBump = Math.max(0, this.goldBump - dt);
    this.foodBump = Math.max(0, this.foodBump - dt);
    for (let i = 0; i < 3; i++) this.cardShake[i] = Math.max(0, this.cardShake[i] - dt);
    this.skillShake = Math.max(0, this.skillShake - dt);
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
    // Double speed runs twice the ticks per second; the battle itself is identical.
    const fast = this.app.save.settings.fast && speedUnlocked(this.app.save) && this.phase === 'play';
    if (fast) simDt *= 2;

    if (this.phase === 'play') {
      const tick = 1 / this.sim.config.tickRate;
      this.acc += simDt;
      let steps = 0;
      while (this.acc >= tick && steps < MAX_STEPS_PER_FRAME * (fast ? 2 : 1)) {
        const events = stepBattle(this.sim, this.pending.splice(0));
        this.view.onEvents(events);
        for (const e of events) {
          if (e.type === 'bossSpawn') {
            this.bossIntroT = 0;
            if (!this.app.reducedMotion) this.slowmo = 0.6;
          }
          if (e.type === 'gold' && e.reason === 'base') {
            const [x, y] = this.ui(this.view.layout.laneR + 4, this.view.layout.groundY - 20 - Math.random() * 30);
            this.spawnCoins(x, y, e.amount);
          }
          if (e.type === 'end') this.startEnding(e.result);
        }
        this.acc -= tick;
        steps++;
        if (this.phase !== 'play') break;
      }
      if (steps === MAX_STEPS_PER_FRAME * (fast ? 2 : 1)) this.acc = 0;
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
    app.inWorld(() => this.view.draw());
    this.drawBaseBars();
    this.drawHeader();
    this.drawHud();
    this.drawCoins();
    this.drawBossBar();
    if (this.phase === 'play' && this.introT < 1.3) this.drawIntro();
    if (this.phase === 'play' && this.bossIntroT >= 0 && this.bossIntroT < 2.4) this.drawBossIntro();
    if (this.phase === 'result') this.drawResult();
    else if (this.paused) this.drawPause();
    void d;
    void w;
    void h;
  }

  private drawIntro(): void {
    const d = this.app.draw;
    const t = this.introT;
    const y = Math.round(this.ui(0, this.view.layout.groundY)[1] - 80 + (t < 0.15 ? (0.15 - t) * -60 : 0));
    const a = t > 1 ? (1.3 - t) / 0.3 : 1;
    const boss = isBossStage(this.stage);
    d.text(boss ? 'BOSS BATTLE!' : 'FIGHT!', this.app.w / 2, y, { font: 'big', color: boss ? '#ff7a5a' : '#ffd03c', shadow: true, align: 'center', alpha: a });
    if (boss) d.text('BREAK THE WARD: DEFEAT THE BOSS', this.app.w / 2, y + 13, { align: 'center', color: '#fff8ec', alpha: a });
  }

  /** Banner when the boss walks out. */
  private drawBossIntro(): void {
    const app = this.app;
    const d = app.draw;
    const t = this.bossIntroT;
    const a = t < 0.2 ? t / 0.2 : t > 2 ? (2.4 - t) / 0.4 : 1;
    const y = Math.round(this.ui(0, this.view.layout.groundY)[1] - 96);
    const slide = t < 0.2 ? (0.2 - t) * 200 : 0;
    const label = this.bossName;
    const bw = Math.min(app.w - 8, d.measure(label, 'big') + 40);
    d.rect(0, y - 4, app.w, 30, '#1e1526', 0.55 * a);
    d.nine('ui.ribbon_grey', Math.round(app.w / 2 - bw / 2 + slide), y, bw, 22, a);
    d.text(label, app.w / 2 + slide, y + 7, { font: 'big', align: 'center', color: '#ff9a7a', shadow: true, alpha: a });
    d.text('APPROACHES!', app.w / 2, y + 25, { align: 'center', color: '#fff1c0', alpha: a });
  }

  /** Boss HP bar under the header, with the ward state. */
  private drawBossBar(): void {
    const s = this.sim;
    if (!s.bossSpawned || this.bossBarShown <= 0) return;
    const app = this.app;
    const d = app.draw;
    const boss = s.units.find((u) => u.id === s.bossId);
    const hp = boss?.alive ? boss.hp : 0;
    const max = boss?.maxHp ?? 1;
    const bw = Math.min(150, app.w - 40);
    const x = Math.round(app.w / 2 - bw / 2);
    const y = 40 - Math.round((1 - this.bossBarShown) * 10);
    const a = this.bossBarShown;
    d.image('icon.skull', x - 11, y - 2, { alpha: a });
    d.rect(x - 1, y - 1, bw + 2, 7, '#1e1526', a);
    d.rect(x, y, bw, 5, '#4a2a33', a);
    const fill = Math.ceil((hp / max) * bw);
    if (fill > 0) {
      d.rect(x, y, fill, 5, '#c0304a', a);
      d.rect(x, y, fill, 1, '#ff7a6a', a);
    }
    const phase = boss?.alive ? boss.boss?.phase : null;
    const tag = !boss?.alive ? 'DEFEATED' : phase === 'rest' ? 'RECOVERING' : phase === 'retreat' ? 'FALLING BACK' : 'RAIDING';
    d.text(`${this.bossName}  ${tag}`, app.w / 2, y + 8, { align: 'center', color: boss?.alive ? '#fff8ec' : '#a8e070', alpha: a });
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
    this.drawPips(app.w / 2 + 14, 30);
    d.text(`BATTLE ${battleNumber({ age: this.enemyAge, stage: this.stage })}`, app.w / 2 - 10, 30, { align: 'right', color: this.replay ? '#cfe0a0' : '#fff8ec' });
    if (this.phase === 'play') {
      iconButton(app, 'pause', app.w - 24, 4, 20, 'pause', () => (this.paused = true));
      if (speedUnlocked(app.save)) {
        const on = app.save.settings.fast;
        button(app, 'speed', app.w - 48, 4, 22, 20, on ? 'X2' : 'X1', () => {
          app.save.settings.fast = !app.save.settings.fast;
          app.persist();
        }, { style: on ? 'gold' : 'wood', font: 'small' });
      }
    }
  }

  /** Stage pips: one per stage, the last one a skull for the boss. */
  private drawPips(cx: number, y: number): void {
    const d = this.app.draw;
    const gap = 9;
    const x0 = Math.round(cx - ((STAGES - 1) * gap) / 2);
    for (let i = 0; i < STAGES; i++) {
      const x = x0 + i * gap;
      const done = i < this.stage;
      const cur = i === this.stage;
      if (i === STAGES - 1) {
        d.image('icon.skull', x - 4, y - 2, { alpha: cur || done ? 1 : 0.5 });
        continue;
      }
      d.rect(x - 2, y, 5, 5, '#1e1526');
      d.rect(x - 1, y + 1, 3, 3, done ? '#a8e070' : cur ? '#ffd03c' : '#4a3a48');
      if (cur && Math.floor(this.app.time * 3) % 2 === 0) d.rect(x - 1, y + 1, 3, 1, '#fff8ec');
    }
  }

  private drawBaseBars(): void {
    const d = this.app.draw;
    const s = this.sim;
    const top = this.ui(0, this.view.baseTop())[1] - 6;
    const bars: [number, number, number, string, string][] = [
      [Math.max(19, this.ui(this.view.layout.laneL - 12, 0)[0]), s.playerBaseHp, s.config.playerBaseHp, '#6fd36a', '#b6f08a'],
      [Math.min(this.app.w - 19, this.ui(this.view.layout.laneR + 12, 0)[0]), s.enemyBaseHp, s.config.enemyBaseHp, '#ff5a4f', '#ff9a7a'],
    ];
    if (s.wardUp) {
      bars[1][3] = '#5ab0ff';
      bars[1][4] = '#bfe8ff';
    }
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
      const warded = s.wardUp && cx > this.app.w / 2;
      d.text(warded ? 'WARD' : fmt(Math.ceil(hp)), cx, top - 8, { align: 'center', color: warded ? '#bfe8ff' : undefined });
    }
  }

  private drawHud(): void {
    const app = this.app;
    const d = app.draw;
    const { w, h } = app;
    const top = this.hudTop;
    d.image(this.wallKey, Math.floor(w / 2), top);

    // Hero medallion, raised on the left (locked until the first Prestige).
    const heroUnlocked = app.save.prestige > 0;
    d.image('ui.hero_socket', 24, top + 4);
    d.image('icon.lock', 20, top + 1, { alpha: heroUnlocked ? 0 : 0.75 });

    // Three Skill sockets in a row on the right; the first (leftmost) holds Stormcall once unlocked.
    for (let i = 0; i < 3; i++) {
      const cx = w - 18 - i * 30;
      const storm = i === 2 && !!this.sim.config.skill;
      const sh = storm && this.skillShake > 0 ? Math.round(Math.sin(this.skillShake * 80) * 2) : 0;
      d.image('ui.skill_socket', cx + sh, top + 20);
      if (!storm) {
        d.image('icon.lock', cx - 4, top + 17, { alpha: 0.55 });
        continue;
      }
      const sk = this.sim.config.skill!;
      const total = this.sim.skillsUsed === 0 ? sk.firstTicks : sk.cooldownTicks;
      const frac = total > 0 ? this.sim.skillCooldown / total : 0;
      const ready = frac <= 0 && this.phase === 'play';
      const ie = app.assets.image('icon.storm');
      d.image('icon.storm', Math.round(cx - ie.w / 2) + sh, Math.round(top + 20 - ie.h / 2) - 4, { alpha: ready ? 1 : 0.55 });
      if (!ready) {
        // Cooldown: a dark curtain that lifts as the charge returns.
        const ch = Math.round(22 * frac);
        d.rect(cx - 11 + sh, top + 20 - 15, 22, ch, '#1e1526', 0.55);
        d.text(String(Math.ceil(this.sim.skillCooldown / this.sim.config.tickRate)), cx + sh, top + 22, { align: 'center', color: '#e8dcc8' });
      } else {
        const pulse = 0.4 + 0.4 * Math.sin(app.time * 6);
        for (let a = 0; a < 24; a++) {
          const th = (a / 24) * Math.PI * 2;
          d.rect(Math.round(cx + Math.cos(th) * 14) + sh, Math.round(top + 16 + Math.sin(th) * 14), 1, 1, '#9fe8ff', pulse);
        }
        d.text('STORM', cx, top + 34, { align: 'center', color: '#bfe8ff' });
      }
      if (this.phase === 'play' && !this.paused) app.input.region({ id: 'skill', x: cx - 14, y: top + 2, w: 28, h: 36, onTap: () => this.cast(), onDown: true });
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
    const ph = s.config.boss ? 170 : 150;
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
    if (s.config.boss) rows.push(['skull', 'BOSS DAMAGE', s.gold.boss]);
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
    const sv = app.save;
    if (win && isBossStage(this.stage) && this.enemyAge === sv.armyAge && evolveUnlocked(sv)) note = `EVOLVE FOR ${fmt(evolveCost(sv) ?? 0)} GOLD`;
    else if (win && isBossStage(this.stage) && this.enemyAge === BALANCE.ages.length - 1 && sv.armyAge === this.enemyAge) note = 'NEW TIMELINE UNLOCKED!';
    else if (win && this.replay) note = 'REPLAY: GOLD EARNED';
    else if (win) note = `NEXT: BATTLE ${battleNumber(selected(sv))}`;
    else note = 'UPGRADE, OR REPLAY FOR GOLD';
    if (note && this.resultT > 1.1) d.text(note, app.w / 2, ry + 22, { align: 'center', color: '#3a2a30', outline: null });
    if (this.resultT > 0.9) button(app, 'continue', x + 20, y + ph - 32, pw - 40, 26, 'CONTINUE', () => app.go('menu'), { style: 'green' });
  }
}
