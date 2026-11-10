/** Campaign battle: fixed-step sim, world view, HUD, ending sequence, result panel. */
import type { App, Scene } from '../app';
import { BALANCE, ageDef } from '../game/balance';
import { isBossStage } from '../game/battleSetup';
import { battleFor } from '../game/session';
import { applyOutcome, battleNumber, evolveCost, evolveUnlocked, frontier, loadout, selected, speedUnlocked, STAGES, toIndex, type BattleOutcome } from '../game/progress';
import { createBattle, food, foodRate, kitchenCost, stepBattle, totalGold, waveComposition } from '../sim/battle';
import type { BattleState, Command } from '../sim/types';
import { blocker, button, dim, fmt, iconButton } from '../ui/widgets';
import { BattleView } from '../view/battleView';

const MAX_STEPS_PER_FRAME = 6;
/** World pixels of each fortress left on screen in front of its anchor (the rest is off the edge). */
const BASE_INSET = 26;
/** UI heights: the thin top bar and the slim bottom bar that holds Food and the cards. */
const TOP_BAR = 24;
/** World pixels units spread above and below the path's centre line (the road is about 120 rows wide). */
const BAND_HALF = 50;
const BOTTOM_BAR = 46;

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
  /** WAVE banner: number, what it brings, and how long it has shown. */
  private wave = { n: 0, t: 9, text: '', big: false };
  /** Garrison callout: the enemy's COUNTERATTACK or your RALLY. */
  private sortie = { t: 9, side: 1 as 0 | 1 };
  private bossBarShown = 0;
  private hudTop = 0;
  private deployedOnce = false;
  private wallKey = 'ui.wall_stone';
  /** The battle's Age: every HUD piece is cut from its wall material (D39). */
  private hudAge = 'stone';
  private kitchenPop = 0;
  private stormPop = 0;
  private confirmRetreat = false;

  constructor(private app: App) {
    const s = app.save;
    this.troops = loadout(s);
    const sel = selected(s);
    this.enemyAge = sel.age;
    this.stage = sel.stage;
    this.replay = toIndex(sel) < frontier(s);
    this.bossName = BALANCE.bosses[ageDef(sel.age).id].name.toUpperCase();
    const config = battleFor(s, sel, (s.createdAt + s.battleNo * 7919) | 0);
    this.sim = createBattle(config);
    this.hudAge = app.assets.has(`ui.card_${ageDef(this.enemyAge).id}`) ? ageDef(this.enemyAge).id : 'stone';
    this.wallKey = `ui.wall_${this.hudAge}`;
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
    const topH = this.app.safeTop + TOP_BAR;
    const barTop = h - BOTTOM_BAR - this.app.safeBottom;
    // Skill sockets float over the meadow just above the bottom bar.
    this.hudTop = barTop - 46;
    const k = this.app.worldToUi;
    const ww = this.app.screen.size.ww;
    // The lane sits a little below the middle of the play area, as in We Are Warriors.
    const groundUi = Math.round(topH + (barTop - topH) * 0.56);
    return { groundY: Math.floor(groundUi / k), bandHalf: BAND_HALF, laneL: BASE_INSET, laneR: ww - 1 - BASE_INSET };
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
    if (k === '5' || k === 'w') this.buyKitchen();
    if (k === 'Escape' || k === 'p') {
      this.paused = !this.paused;
      this.confirmRetreat = false;
    }
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

  /** Kitchen: spend Food now to earn more Food for the rest of the battle (the WAW meat button). */
  private buyKitchen(): void {
    if (this.phase !== 'play' || this.paused) return;
    const c = kitchenCost(this.sim);
    if (c === null) return;
    if (this.sim.foodMilli < c) {
      this.app.sfx('nope', { vol: 0.5 });
      return;
    }
    if (!this.pending.some((p) => p.type === 'kitchen')) this.pending.push({ type: 'kitchen' });
  }

  private drawKitchen(cx: number, cy: number): void {
    const app = this.app;
    const d = app.draw;
    const c = kitchenCost(this.sim);
    const ok = c !== null && this.sim.foodMilli >= c && this.phase === 'play';
    const fi = app.assets.image('icon.food');
    d.image('icon.food', Math.round(cx - fi.w / 2) - 2, cy - 14, { alpha: ok || c === null ? 1 : 0.6 });
    d.image('icon.up', cx + 2, cy - 9, { alpha: ok ? 1 : 0.6 });
    // Price (in Food) inside the socket, level pips along its lower rim.
    if (c === null) d.text('MAX', cx, cy, { align: 'center', color: '#ffe68a' });
    else d.text(String(Math.ceil(c / 1000)), cx, cy, { font: 'big', align: 'center', color: ok ? '#fff8ec' : '#ff6a5a' });
    const max = this.sim.config.kitchen!.maxLevel;
    const px0 = Math.round(cx - (max * 5 - 1) / 2);
    for (let k = 0; k < max; k++) {
      d.rect(px0 + k * 5, cy + 10, 4, 4, '#1e1526');
      d.rect(px0 + k * 5 + 1, cy + 11, 2, 2, k < this.sim.kitchenLevel ? '#ffd03c' : '#4a3a48');
    }
    if (ok) this.ring(cx, cy - 4, 14, '#ffd03c', 0.35 + 0.35 * Math.sin(app.time * 6));
    // Just bought: a gold ring bursts out of the socket.
    if (this.kitchenPop > 0.5) this.ring(cx, cy - 4, 14 + (0.9 - this.kitchenPop) * 30, '#ffe68a', 1);
    if (this.phase === 'play' && !this.paused) app.input.region({ id: 'kitchen', x: cx - 15, y: cy - 19, w: 30, h: 34, onTap: () => this.buyKitchen(), onDown: true });
  }

  /** A dotted pixel ring (ready glows, bursts). */
  private ring(cx: number, cy: number, r: number, color: string, alpha: number, from = 0, to = 1): void {
    const d = this.app.draw;
    const n = Math.max(16, Math.round(r * 1.8));
    for (let a = 0; a < n; a++) {
      const f = a / n;
      if (f < from || f >= to) continue;
      const th = f * Math.PI * 2 - Math.PI / 2;
      d.rect(Math.round(cx + Math.cos(th) * r), Math.round(cy + Math.sin(th) * r), 1, 1, color, alpha);
    }
  }

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
    this.wave.t += dt;
    this.sortie.t += dt;
    if (this.sim.bossSpawned) this.bossBarShown = Math.min(1, this.bossBarShown + dt * 3);
    this.goldBump = Math.max(0, this.goldBump - dt);
    this.foodBump = Math.max(0, this.foodBump - dt);
    for (let i = 0; i < 3; i++) this.cardShake[i] = Math.max(0, this.cardShake[i] - dt);
    this.skillShake = Math.max(0, this.skillShake - dt);
    this.kitchenPop = Math.max(0, this.kitchenPop - dt);
    this.stormPop = Math.max(0, this.stormPop - dt);
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
          if (e.type === 'wave') {
            const c = waveComposition(this.sim.config, this.sim.waveIndex);
            const parts = [c.melee ? `${c.melee} MELEE` : '', c.ranged ? `${c.ranged} RANGED` : '', c.tank ? `${c.tank} TANK${c.tank > 1 ? 'S' : ''}` : ''].filter(Boolean);
            this.wave = { n: e.n, t: 0, text: parts.join('  '), big: !!e.big };
            if (e.n >= 2) this.app.sfx('fight', { vol: e.big ? 0.7 : 0.35, jitter: 0 });
          }
          if (e.type === 'kitchen') this.kitchenPop = 0.9;
          if (e.type === 'sortie') this.sortie = { t: 0, side: e.side };
          if (e.type === 'deployFail' && e.reason === 'cooldown') {
            this.cardShake[e.slot] = 0.2;
            this.app.sfx('nope', { vol: 0.4 });
          }
          if (e.type === 'skill') this.stormPop = 0.5;
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
      if (ready && !this.cardReady[i] && this.phase === 'play' && t.cost >= 12) this.app.sfx('ready', { vol: 0.3, minGapMs: 1500 });
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
    if (this.phase === 'play') this.drawWave();
    this.drawCoins();
    if (this.phase === 'play' && this.introT < 1.3) this.drawIntro();
    else if (this.phase === 'play' && this.bossIntroT >= 0 && this.bossIntroT < 2.2) this.drawBossIntro();
    else if (this.phase === 'play' && this.sortie.t < 2) this.drawSortieCall();
    else if (this.phase === 'play' && this.wave.n >= 2 && this.wave.t < 1.8) this.drawWaveCall();
    if (this.phase === 'result') this.drawResult();
    else if (this.paused) this.drawPause();
    void d;
    void w;
    void h;
  }

  /** The one place for transient callouts, just under the wave plaque (never over the HP bars). */
  private get eventY(): number {
    return this.app.safeTop + TOP_BAR + 32;
  }

  private drawIntro(): void {
    const d = this.app.draw;
    const t = this.introT;
    const y = this.eventY + (t < 0.15 ? Math.round((0.15 - t) * -60) : 0);
    const a = t > 1 ? (1.3 - t) / 0.3 : 1;
    const boss = isBossStage(this.stage);
    d.text(boss ? 'BOSS BATTLE!' : 'FIGHT!', this.app.w / 2, y, { font: 'big', color: boss ? '#ff7a5a' : '#ffd03c', shadow: true, align: 'center', alpha: a });
  }

  /** The garrison charges out: the enemy's COUNTERATTACK (red) or your own RALLY (green). */
  private drawSortieCall(): void {
    const d = this.app.draw;
    const t = this.sortie.t;
    const a = t > 1.6 ? (2 - t) / 0.4 : 1;
    const mine = this.sortie.side === 0;
    const label = mine ? 'RALLY!' : 'COUNTERATTACK!';
    const y = this.eventY - 4 + (t < 0.12 ? -2 : 0);
    const bw = Math.min(this.app.w - 8, d.measure(label, 'big') + 40);
    d.nine(mine ? 'ui.ribbon_gold' : 'ui.ribbon_grey', Math.round(this.app.w / 2 - bw / 2), y, bw, 22, a);
    d.text(label, this.app.w / 2, y + 7, { font: 'big', align: 'center', color: mine ? '#fff8ec' : '#ff9a7a', shadow: true, alpha: a });
  }

  /** A new wave: what it brings, as unit icons (melee, ranged, tanks) rather than words. */
  private drawWaveCall(): void {
    const d = this.app.draw;
    const t = this.wave.t;
    const a = t > 1.4 ? (1.8 - t) / 0.4 : 1;
    const c = waveComposition(this.sim.config, this.sim.waveIndex);
    const parts: [string, number][] = ([['sword', c.melee], ['bow', c.ranged], ['shield', c.tank]] as [string, number][]).filter(([, n]) => n > 0);
    const widths = parts.map(([, n]) => 12 + d.measure('X' + n, 'big'));
    const total = widths.reduce((x, y) => x + y, 0) + (parts.length - 1) * 8;
    let x = Math.round(this.app.w / 2 - total / 2);
    const y = this.eventY + (t < 0.12 ? -2 : 0) + (this.wave.big ? 10 : 0);
    if (this.wave.big) d.text('BIG WAVE!', this.app.w / 2, y - 11, { font: 'big', align: 'center', color: '#ff7a5a', shadow: true, alpha: a });
    parts.forEach(([icon, n], i) => {
      d.image('icon.' + icon, x, y, { alpha: a });
      d.text('X' + n, x + 11, y + 1, { font: 'big', color: '#fff8ec', shadow: true, alpha: a });
      x += widths[i] + 8;
    });
  }

  /**
   * The wave plaque under the top band: an opaque recess in the Age material with WAVE N, the stage
   * pips and a countdown to the next wave. On a boss stage it widens into the boss bar.
   */
  private drawWave(): void {
    const app = this.app;
    const d = app.draw;
    const t = this.wave.t;
    const n = Math.max(1, this.wave.n);
    const fresh = this.wave.n > 0 && t < 1.2;
    const pop = t < 0.15 && this.wave.n > 0 ? -1 : 0;
    const boss = this.sim.bossSpawned && this.bossBarShown > 0;
    const pw = boss ? Math.min(app.w - 70, 150) : 64;
    const ph = 24;
    const x = Math.round(app.w / 2 - pw / 2);
    const y = app.safeTop + TOP_BAR + 3 + pop;
    d.nine(`ui.food_${this.hudAge}`, x, y, pw, ph);
    if (boss) {
      const s = this.sim;
      const u = s.units.find((q) => q.id === s.bossId);
      const hp = u?.alive ? u.hp : 0;
      const max = u?.maxHp ?? 1;
      d.image('icon.skull', x + 5, y + 4);
      // The name fits beside the wave tag; on narrow screens it drops "THE" and then the tag.
      const tag = `W${n}`;
      let name = this.bossName;
      const room = (withTag: boolean) => pw - 22 - (withTag ? d.measure(tag) + 6 : 0);
      if (d.measure(name) > room(true)) name = name.replace(/^THE /, '');
      const showTag = d.measure(name) <= room(true);
      d.text(name, x + 16, y + 5, { color: u?.alive ? '#ff9a7a' : '#a8e070' });
      if (showTag) d.text(tag, x + pw - 6, y + 5, { align: 'right', color: fresh ? '#ffd03c' : '#fff8ec' });
      const bw = pw - 12;
      d.rect(x + 5, y + 12, bw + 2, 6, '#120c18');
      const fill = Math.ceil((hp / max) * bw);
      if (fill > 0) {
        d.rect(x + 6, y + 13, fill, 4, '#c0304a');
        d.rect(x + 6, y + 13, fill, 1, '#ff7a6a');
      }
    } else {
      d.text(`WAVE ${n}`, app.w / 2, y + 4, { font: 'big', align: 'center', color: fresh ? '#ffd03c' : '#fff8ec', shadow: true });
      this.drawPips(app.w / 2, y + 14);
    }
    // Countdown to the next wave along the plaque's lip.
    const period = BALANCE.waves.stream.period;
    const since = this.sim.tick / this.sim.config.tickRate - BALANCE.waves.stream.firstAt;
    const frac = since < 0 ? 0 : (since % period) / period;
    // A big wave is next: the countdown runs red and a warning mark blinks beside the plaque.
    const bigNext = !!this.sim.config.wave.bigWaves?.includes(this.wave.n + 1) && this.wave.n > 0;
    d.rect(x + 4, y + ph - 4, pw - 8, 1, '#120c18');
    d.rect(x + 4, y + ph - 4, Math.round((pw - 8) * frac), 1, bigNext || frac > 0.8 ? '#ff5a4f' : '#cfe0a0');
    if (bigNext && (frac < 0.6 || Math.floor(app.time * 5) % 2 === 0)) {
      d.image('icon.skull', x + pw + 3, y + 7);
      d.text('!', x + pw + 14, y + 8, { font: 'big', color: '#ff5a4f', shadow: true });
    }
  }

  /** Banner when the boss walks out: its name on a ribbon in the callout slot. */
  private drawBossIntro(): void {
    const app = this.app;
    const d = app.draw;
    const t = this.bossIntroT;
    const a = t < 0.2 ? t / 0.2 : t > 1.8 ? (2.2 - t) / 0.4 : 1;
    const y = this.eventY - 4;
    const slide = t < 0.2 ? (0.2 - t) * 200 : 0;
    const label = this.bossName;
    const bw = Math.min(app.w - 8, d.measure(label, 'big') + 40);
    d.nine('ui.ribbon_grey', Math.round(app.w / 2 - bw / 2 + slide), y, bw, 22, a);
    d.text(label, app.w / 2 + slide, y + 7, { font: 'big', align: 'center', color: '#ff9a7a', shadow: true, alpha: a });
  }

  /**
   * Thin top band cut from the Age wall (darkened, the coping as its trim): Gold, the battle number
   * and pause. Its body runs up under the status bar; nothing tappable or written goes there.
   */
  private drawHeader(): void {
    const app = this.app;
    const d = app.draw;
    const top0 = app.safeTop;
    d.image(`ui.beam_${this.hudAge}`, Math.floor(app.w / 2), top0 + TOP_BAR);
    const bump = this.goldBump > 0 ? -1 : 0;
    d.image('icon.gold', 6, top0 + 6 + bump);
    d.text(fmt(this.goldShown), 18, top0 + 6 + bump, { font: 'big', color: '#ffe68a', shadow: true });
    const n = battleNumber({ age: this.enemyAge, stage: this.stage });
    d.text(`BATTLE ${n}`, app.w / 2, top0 + 6, { font: 'big', align: 'center', color: '#fff8ec', shadow: true });
    if (this.phase === 'play') {
      iconButton(app, 'pause', app.w - 25, top0 + 1, 22, 'pause', () => {
        this.paused = true;
        this.confirmRetreat = false;
      });
      const sy = top0 + TOP_BAR + 3;
      if (this.replay) d.text('REPLAY', app.w - 6, sy + 9, { align: 'right', color: '#cfe0a0' });
      if (speedUnlocked(app.save)) {
        // Double speed: a round socket, lit gold while on.
        const on = app.save.settings.fast;
        const cx = 20;
        const cy = sy + 11;
        d.image(`ui.socket_${this.hudAge}`, cx, cy);
        d.text('>>', cx + 1, cy - 3, { font: 'big', align: 'center', color: on ? '#ffd03c' : '#9a8a96', shadow: on });
        app.input.region({
          id: 'speed',
          x: cx - 15,
          y: cy - 15,
          w: 30,
          h: 30,
          onTap: () => {
            app.save.settings.fast = !app.save.settings.fast;
            app.sfx('click', { vol: 0.6 });
            app.persist();
          },
        });
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
      d.rect(x - 2, y, 5, 5, '#120c18');
      const boss = i === STAGES - 1;
      d.rect(x - 1, y + 1, 3, 3, done ? '#a8e070' : cur ? (boss ? '#ff5a4f' : '#ffd03c') : boss ? '#6a2a33' : '#4a3a48');
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
    const age = this.hudAge;
    // Bottom bar: the Age's own wall, running down under the home indicator.
    const barTop = h - BOTTOM_BAR - app.safeBottom;
    d.image(this.wallKey, Math.floor(w / 2), barTop);

    // Hero niche, raised on the left: a carved, empty niche until the first Hero exists.
    const heroUnlocked = app.save.prestige > 0;
    d.image(heroUnlocked ? 'ui.hero_socket' : `ui.hero_niche_${age}`, 24, top + 8);

    // Three Skill sockets in a row on the right: Stormcall (left), Kitchen (middle), one empty niche.
    const cy = top + 20;
    for (let i = 0; i < 3; i++) {
      const cx = w - 18 - i * 30;
      const storm = i === 2 && !!this.sim.config.skill;
      const kitchen = i === 1 && !!this.sim.config.kitchen;
      const sh = storm && this.skillShake > 0 ? Math.round(Math.sin(this.skillShake * 80) * 2) : 0;
      if (!storm && !kitchen) {
        d.image(`ui.niche_${age}`, cx, cy);
        continue;
      }
      d.image(`ui.socket_${age}`, cx + sh, cy);
      if (kitchen) {
        this.drawKitchen(cx, cy);
        continue;
      }
      const sk = this.sim.config.skill!;
      const total = this.sim.skillsUsed === 0 ? sk.firstTicks : sk.cooldownTicks;
      const frac = total > 0 ? this.sim.skillCooldown / total : 0;
      const ready = frac <= 0 && this.phase === 'play';
      const ie = app.assets.image('icon.storm');
      d.image('icon.storm', Math.round(cx - ie.w / 2) + sh, Math.round(cy - ie.h / 2) - (ready ? 0 : 4), { alpha: ready ? 1 : 0.5 });
      if (!ready) {
        // Cooldown: the rim fills clockwise as the charge returns.
        for (const r of [11, 12]) {
          this.ring(cx + sh, cy, r, '#9fe8ff', 1, 0, 1 - frac);
          this.ring(cx + sh, cy, r, '#1e1526', 1, 1 - frac, 1);
        }
        d.text(String(Math.ceil(this.sim.skillCooldown / this.sim.config.tickRate)), cx + sh, cy + 2, { font: 'big', align: 'center', color: '#e8dcc8' });
      } else {
        this.ring(cx + sh, cy, 12, '#9fe8ff', 0.5 + 0.4 * Math.sin(app.time * 6));
        this.ring(cx + sh, cy, 15, '#9fe8ff', 0.25 + 0.25 * Math.sin(app.time * 6));
      }
      // Just cast: the socket flares as the bolt leaves it.
      if (this.stormPop > 0) {
        const p = 1 - this.stormPop / 0.5;
        this.ring(cx, cy, 14 + p * 26, '#c4fbff', 1);
        this.ring(cx, cy, 10 + p * 18, '#5ce6ff', 1);
      }
      if (this.phase === 'play' && !this.paused) app.input.region({ id: 'skill', x: cx - 15, y: cy - 15, w: 30, h: 32, onTap: () => this.cast(), onDown: true });
    }

    // Food and rate, lower left, in a recess cut into the wall.
    const fx = 5;
    const fy = barTop + 1;
    const fw = 48;
    d.nine(`ui.food_${age}`, fx, fy, fw, 45);
    const f = food(this.sim);
    const bump = this.foodBump > 0 ? -1 : 0;
    d.image('icon.food', fx + Math.round(fw / 2 - 6), fy + 4 + bump);
    d.text(fmt(f), fx + fw / 2, fy + 17 + bump, { font: 'big', align: 'center', color: '#fff8ec', shadow: true });
    const frac = (this.sim.foodMilli % 1000) / 1000;
    d.rect(fx + 6, fy + 28, fw - 12, 3, '#120c18');
    d.rect(fx + 6, fy + 28, Math.round((fw - 12) * frac), 3, '#e8a020');
    d.rect(fx + 6, fy + 28, Math.round((fw - 12) * frac), 1, '#ffd03c');
    const rate = foodRate(this.sim) / 1000;
    d.text(`+${rate % 1 ? rate.toFixed(1) : rate}/S`, fx + fw / 2, fy + 35, { align: 'center', color: '#a8e070' });
    // Kitchen bought: the rate gain pops out of the Food recess.
    if (this.kitchenPop > 0) {
      const p = 1 - this.kitchenPop / 0.9;
      d.text('+20%', fx + fw / 2, Math.round(fy - 6 - p * 14), { font: 'big', align: 'center', color: '#a8e070', shadow: true, alpha: Math.min(1, this.kitchenPop * 3) });
    }

    // Troop cards, lower right, seated in the wall: dark until affordable, then the well lights up.
    const cw = 38;
    const gap = 3;
    const x0 = w - 5 - (3 * cw + 2 * gap) - 2;
    const cardY = barTop - 8;
    for (let i = 0; i < 3; i++) {
      const x = x0 + i * (cw + gap);
      const id = this.troops[i];
      if (!id) {
        d.image('ui.card_locked', x, cardY);
        d.image('icon.lock', x + 16, cardY + 13);
        continue;
      }
      const t = this.sim.config.playerTroops[i];
      const wait = this.sim.cardWait[i] ?? 0;
      const ready = f >= t.cost && wait <= 0 && this.phase === 'play';
      const regionId = 'card' + i;
      const pressed = app.input.isPressed(regionId);
      const sh = this.cardShake[i] > 0 ? Math.round(Math.sin(this.cardShake[i] * 80) * 2) : 0;
      const yy = cardY + (pressed ? 1 : 0);
      const xx = x + sh;
      d.image(ready ? `ui.card_${age}_lit` : `ui.card_${age}`, xx, yy);
      d.image(`portrait.${id}`, xx + 4, yy + 4, { alpha: ready ? 1 : 0.55 });
      if (!ready) {
        // How close the card is: a bar along the bottom of the well.
        const have = Math.max(0, Math.min(1, this.sim.foodMilli / 1000 / t.cost));
        d.rect(xx + 4, yy + 29, 32, 2, '#120c18');
        d.rect(xx + 4, yy + 29, Math.round(32 * have), 2, '#e8a020');
      } else {
        const pulse = 0.5 + 0.4 * Math.sin(app.time * 6);
        d.rect(xx + 1, yy + 1, 38, 1, '#ffe68a', pulse);
        d.rect(xx + 1, yy + 46, 38, 1, '#ffe68a', pulse);
        d.rect(xx + 1, yy + 1, 1, 46, '#ffe68a', pulse);
        d.rect(xx + 38, yy + 1, 1, 46, '#ffe68a', pulse);
      }
      if (wait > 0) {
        // Reloading: a dark shutter lifts off the portrait as the card comes back.
        const total = Math.max(1, t.redeployTicks ?? 1);
        const hgt = Math.max(1, Math.round(28 * (wait / total)));
        for (let yy2 = 0; yy2 < hgt; yy2++) d.rect(xx + 4 + (yy2 % 2), yy + 4 + yy2, 32 - (yy2 % 2), 1, '#1e1526', yy2 % 2 ? 1 : 0.75);
      }
      // What this card beats (the counter triangle), top-right of the portrait.
      const beats = t.kind === 'melee' ? 'bow' : t.kind === 'ranged' ? 'shield' : 'sword';
      d.rect(xx + 26, yy + 3, 10, 10, '#1e1526');
      d.image('icon.' + beats, xx + 27, yy + 4);
      d.image('icon.food', xx + 5, yy + 35);
      d.text(String(t.cost), xx + 34, yy + 36, { font: 'big', align: 'right', color: f >= t.cost ? '#fff8ec' : '#ff6a5a' });
      if (this.phase === 'play' && !this.paused) app.input.region({ id: regionId, x: x, y: cardY, w: cw + 2, h: 48, onTap: () => this.deploy(i), onDown: true });
    }

    // First battle: a bobbing arrow over the first card shows where to tap.
    if (!this.deployedOnce && this.phase === 'play' && this.introT > 1.2) {
      const bob = Math.round(Math.sin(app.time * 8) * 2);
      const ax = x0 + 20;
      const ay = cardY - 12 + bob;
      for (let i = 0; i < 5; i++) {
        d.rect(ax - 5 + i, ay + i, 11 - i * 2, 1, '#1e1526');
        if (i < 4) d.rect(ax - 4 + i, ay + i, 9 - i * 2, 1, '#ffd03c');
      }
      d.rect(ax - 2, ay - 6, 5, 6, '#1e1526');
      d.rect(ax - 1, ay - 6, 3, 6, '#ffd03c');
    }
  }

  private drawCoins(): void {
    const d = this.app.draw;
    const tx = 10;
    const ty = this.app.safeTop + 9;
    for (const c of this.coins) {
      if (c.t < c.delay) continue;
      const p = Math.min(1, (c.t - c.delay) / 0.65);
      const e = p * p;
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
    const pw = 150;
    const ph = 132;
    const x = Math.round(app.w / 2 - pw / 2);
    const y = Math.round(app.h / 2 - ph / 2);
    d.nine(`ui.food_${this.hudAge}`, x, y, pw, ph);
    if (this.confirmRetreat) {
      d.text('RETREAT?', app.w / 2, y + 14, { font: 'big', align: 'center', color: '#fff1c0', shadow: true });
      d.text('GOLD EARNED SO FAR IS KEPT', app.w / 2, y + 32, { align: 'center', color: '#cfe0a0' });
      button(app, 'retreat-yes', x + 12, y + 52, pw - 24, 28, 'RETREAT', () => {
        this.paused = false;
        this.confirmRetreat = false;
        this.pending.push({ type: 'retreat' });
        const ev = stepBattle(this.sim, this.pending.splice(0));
        for (const e of ev) if (e.type === 'end') this.startEnding(e.result);
      }, { style: 'red', icon: 'flag' });
      button(app, 'retreat-no', x + 12, y + 90, pw - 24, 28, 'KEEP FIGHTING', () => (this.confirmRetreat = false), { style: 'green', font: 'small' });
      return;
    }
    d.text('PAUSED', app.w / 2, y + 10, { font: 'big', align: 'center', color: '#fff1c0', shadow: true });
    button(app, 'resume', x + 12, y + 26, pw - 24, 30, 'RESUME', () => (this.paused = false), { style: 'green', icon: 'play' });
    const s = app.save.settings;
    button(app, 'snd', x + 12, y + 64, 61, 24, s.sound ? 'SOUND' : 'MUTED', () => {
      s.sound = !s.sound;
      app.audio.muted = !s.sound;
      app.persist();
    }, { style: 'wood', icon: s.sound ? 'sound' : 'mute', font: 'small' });
    button(app, 'motion', x + pw - 73, y + 64, 61, 24, s.reducedMotion ? 'CALM' : 'SHAKE', () => {
      s.reducedMotion = !s.reducedMotion;
      this.view.shake.enabled = !s.reducedMotion;
      app.persist();
    }, { style: 'wood', font: 'small' });
    // Retreat: smaller, set apart, and it asks first.
    button(app, 'retreat', x + 36, y + ph - 32, pw - 72, 22, 'RETREAT', () => (this.confirmRetreat = true), { style: 'wood', icon: 'flag', font: 'small', textColor: '#ffb08c' });
  }

  private drawResult(): void {
    const app = this.app;
    const d = app.draw;
    const o = this.outcome!;
    const s = this.sim;
    dim(app, Math.min(0.6, this.resultT * 2));
    blocker(app, 'result-block');
    const win = o.result === 'victory';
    // Only rows that earned something.
    const rows: [string, string, number][] = (
      [
        ['skull', `KILLS X${s.kills - s.tankKills}`, s.gold.kills],
        ['shield', `TANKS X${s.tankKills}`, s.gold.tanks],
        ['hp', 'FORTRESS', s.gold.base],
        ...(s.config.boss ? [['star', 'BOSS', s.gold.boss]] : []),
      ] as [string, string, number][]
    ).filter(([, , g]) => g > 0);
    const pw = 160;
    const ph = 92 + rows.length * 19;
    const x = Math.round(app.w / 2 - pw / 2);
    const slide = Math.max(0, 1 - this.resultT / 0.25);
    const y = Math.round(app.h / 2 - ph / 2 + 10 + slide * 40);
    d.nine(`ui.food_${this.hudAge}`, x, y, pw, ph);
    const title = win ? 'VICTORY!' : o.result === 'defeat' ? 'DEFEAT' : 'RETREAT';
    const rw = d.measure(title, 'big') + 40;
    d.nine(win ? 'ui.ribbon_gold' : 'ui.ribbon_grey', Math.round(app.w / 2 - rw / 2), y - 12, rw, 24);
    d.text(title, app.w / 2, y - 4, { font: 'big', align: 'center', color: win ? '#fff8ec' : '#f0ece6', shadow: true });

    let ry = y + 20;
    rows.forEach(([icon, label, g], i) => {
      const a = Math.min(1, Math.max(0, (this.resultT - 0.25 - i * 0.15) / 0.15));
      if (a <= 0) return;
      d.image('icon.' + icon, x + 10, ry + 3, { alpha: a });
      d.text(label, x + 23, ry + 5, { alpha: a });
      d.text('+' + fmt(g), x + pw - 22, ry + 5, { align: 'right', color: '#ffe68a', alpha: a });
      d.image('icon.gold', x + pw - 19, ry + 3, { alpha: a });
      ry += 19;
    });
    const total = totalGold(s);
    const ta = Math.min(1, Math.max(0, (this.resultT - 0.75) / 0.2));
    const shown = Math.round(total * Math.min(1, Math.max(0, (this.resultT - 0.75) / 0.6)));
    if (ta > 0) {
      d.rect(x + 8, ry + 1, pw - 16, 1, '#4a3a48', ta);
      d.text('TOTAL', x + 10, ry + 6, { font: 'big', color: '#fff1c0', shadow: true, alpha: ta });
      d.text('+' + fmt(shown), x + pw - 22, ry + 6, { font: 'big', align: 'right', color: '#ffd03c', shadow: true, alpha: ta });
      d.image('icon.gold', x + pw - 19, ry + 5, { alpha: ta });
    }
    let note = '';
    const sv = app.save;
    if (win && isBossStage(this.stage) && this.enemyAge === sv.armyAge && evolveUnlocked(sv)) note = `EVOLVE: ${fmt(evolveCost(sv) ?? 0)} GOLD`;
    else if (win && isBossStage(this.stage) && this.enemyAge === BALANCE.ages.length - 1 && sv.armyAge === this.enemyAge) note = 'NEW TIMELINE UNLOCKED!';
    else if (win && !this.replay) note = `NEXT: BATTLE ${battleNumber(selected(sv))}`;
    if (note && this.resultT > 1.1) d.text(note, app.w / 2, ry + 22, { align: 'center', color: '#cfe0a0' });
    if (this.resultT > 0.9) {
      const by = y + ph - 34;
      if (win) button(app, 'continue', x + 14, by, pw - 28, 28, 'CONTINUE', () => app.go('menu'), { style: 'green' });
      else {
        // A loss routes straight to what fixes it.
        const half = Math.floor((pw - 34) / 2);
        button(app, 'upgrades', x + 12, by, half, 28, 'UPGRADE', () => app.go('menu', 'upgrades'), { style: 'gold', font: 'small' });
        button(app, 'continue', x + pw - 12 - half, by, half, 28, 'HOME', () => app.go('menu'), { style: 'wood', font: 'small' });
      }
    }
  }
}
