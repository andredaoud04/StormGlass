/**
 * Main menu. Five tab positions: Dungeons, Upgrades, Battle (centre, default), Cards, Shop.
 * Tabs appear one at a time as the player progresses; until then their position stays empty.
 */
import type { App, Scene } from '../app';
import { BALANCE, ageDef, type UpgradeId } from '../game/balance';
import { battleNumber, canEvolve, canPrestige, evolve, evolveCost, evolveUnlocked, frontier, loadout, pickBattle, prestige, selected, STAGES, toIndex } from '../game/progress';
import { UPGRADE_IDS, affordableCount, buyUpgrade, canBuy, canUnlockSlot, hasSlot, level, maxLevel, slotCost, unlockSlot, upgradeCost, upgradeValue, type SlotId } from '../game/upgrades';
import { CARD_KINDS, buyCard, cardCost, cardLevel, cardsAffordable, dailyLeft, keysLeft, survivalUnlocked, useKey } from '../game/meta';
import { newSave } from '../game/save';
import { today } from './battle';
import { blocker, button, counterBig, dim, fmt, iconButton } from '../ui/widgets';
import { EnvView } from '../view/environment';
import { FxSystem } from '../view/fx';

export type Tab = 'dungeons' | 'upgrades' | 'battle' | 'cards' | 'shop';
const TABS: Tab[] = ['dungeons', 'upgrades', 'battle', 'cards', 'shop'];
const TAB_LABEL: Record<Tab, string> = { dungeons: 'DUNGEONS', upgrades: 'UPGRADES', battle: 'BATTLE', cards: 'CARDS', shop: 'SHOP' };
const TAB_H = 34;

/** When each tab appears. Cards and Shop stay hidden until those features ship. */
function tabRevealed(app: App, t: Tab): boolean {
  const s = app.save;
  if (t === 'battle') return true;
  if (t === 'upgrades') return s.stats.battles >= 1;
  // Dungeons appear once Survival is playable; Cards once you have earned a Gem (D43).
  if (t === 'dungeons') return survivalUnlocked(s);
  if (t === 'cards') return s.gems > 0 || s.survivalBest > 0 || CARD_KINDS.some((k) => cardLevel(s, k) > 0);
  return false;
}

export class MenuScene implements Scene {
  private tab: Tab;
  private env: EnvView;
  private fx: FxSystem;
  private settings = false;
  private confirmReset = 0;
  private toast = '';
  private toastT = 0;
  private flash = 0;
  /** Evolution / new Timeline title card. */
  private ceremony = 0;
  private ceremonyText = '';

  constructor(
    private app: App,
    tab: Tab = 'battle',
  ) {
    this.tab = tab;
    this.env = new EnvView(app, ageDef(selected(app.save).age).id);
    this.fx = new FxSystem((k) => app.assets.strip(k).frames);
    app.audio.music.play('menu');
  }

  key(k: string): void {
    if (k === 'Enter' && this.tab === 'battle') this.app.go('battle');
  }

  /** The meadow lane sits two thirds of the way down, above the Battle button. */
  private get groundY(): number {
    return Math.round(this.app.safeTop + (this.tabY - this.app.safeTop) * 0.62);
  }

  update(dt: number): void {
    this.env.update(dt, Math.floor(this.groundY / this.app.worldToUi));
    this.fx.update(dt, (k) => this.app.assets.strip(k).fps);
    this.toastT = Math.max(0, this.toastT - dt);
    this.flash = Math.max(0, this.flash - dt);
    this.ceremony = Math.max(0, this.ceremony - dt);
  }

  /** Top of the tab bar: it sits above the home indicator, its wood runs down under it. */
  private get tabY(): number {
    return this.app.h - TAB_H - this.app.safeBottom;
  }

  private say(msg: string): void {
    this.toast = msg;
    this.toastT = 1.6;
  }

  draw(): void {
    if (this.tab === 'battle') this.drawHome();
    else this.drawPage();
    this.drawTabBar();
    if (this.ceremony > 0) this.drawCeremony();
    if (this.toastT > 0) {
      const d = this.app.draw;
      const tw = d.measure(this.toast) + 16;
      // Toasts sit under the top bar, never over the Battle button.
      const y = this.app.safeTop + 24;
      d.nine('ui.small_plaque', Math.round(this.app.w / 2 - tw / 2), y, tw, 15, Math.min(1, this.toastT * 3));
      d.text(this.toast, this.app.w / 2, y + 5, { align: 'center', alpha: Math.min(1, this.toastT * 3) });
    }
    if (this.flash > 0) this.app.draw.rect(0, 0, this.app.w, this.app.h, '#fff8ec', this.flash * 1.5);
    if (this.settings) this.drawSettings();
  }

  /** The new Age's title card after an Evolution or a new Timeline. */
  private drawCeremony(): void {
    const app = this.app;
    const d = app.draw;
    const t = 2.6 - this.ceremony;
    const a = t < 0.25 ? t / 0.25 : this.ceremony < 0.4 ? this.ceremony / 0.4 : 1;
    const y = Math.round(this.groundY - 120 + (t < 0.25 ? (0.25 - t) * -40 : 0));
    const rw = Math.min(app.w - 6, d.measure(this.ceremonyText, 'big') + 48);
    d.nine('ui.ribbon_gold', Math.round(app.w / 2 - rw / 2), y, rw, 26, a);
    d.text(this.ceremonyText, app.w / 2, y + 8, { font: 'big', align: 'center', color: '#fff8ec', shadow: true, alpha: a });
  }

  // ---------- Battle (home) ----------

  private drawHome(): void {
    const app = this.app;
    const d = app.draw;
    const { w } = app;
    const G = this.groundY;
    // The meadow is drawn on the world layer, at the same scale as battles.
    app.inWorld(() => {
      const k = app.worldToUi;
      const gw = Math.floor(G / k);
      const ww = app.w;
      this.env.draw(gw);
      const armyAge = ageDef(app.save.armyAge).id;
      const enemyAge = ageDef(selected(app.save).age).id;
      const baseKey = (age: string, team: string) => (app.assets.has(`base.${age}.${team}.0`) ? `base.${age}.${team}.0` : `base.stone.${team}.0`);
      d.image(baseKey(armyAge, 'blue'), 30, gw);
      d.image(baseKey(enemyAge, 'red'), ww - 31, gw, { flip: true });
      // Your army idles in front of your fortress.
      const army = loadout(app.save);
      army.forEach((id, i) => {
        const key = `troop.${id}.blue`;
        if (!app.assets.has(key)) return;
        const a = app.assets.sheet(key).anims.idle;
        const f = Math.floor(app.time * a.fps + i * 1.7) % a.frames;
        const sh = String(app.assets.meta(`env.${enemyAge}`).shadow ?? '#3a2a2e');
        d.rect(44 + i * 18 - 3, gw + (i % 2) * 2 - 1, 8, 1, sh);
        d.rect(44 + i * 18 - 5, gw + (i % 2) * 2, 12, 1, sh);
        d.rect(44 + i * 18 - 3, gw + (i % 2) * 2 + 1, 8, 1, sh);
        d.frame(key, 'idle', f, 44 + i * 18, gw + (i % 2) * 2);
      });
      this.fx.drawFront(d);
    });

    // Top bar (below the status bar).
    const top0 = app.safeTop;
    this.goldCounter(top0 + 5);
    iconButton(app, 'settings', w - 26, top0 + 3, 22, 'gear', () => (this.settings = true));
    // Prestige Stars: permanent power and Gold, one per Prestige.
    if (app.save.prestige > 0) {
      const sx = 18 + Math.max(40, d.measure(fmt(app.save.gold), 'big') + 20);
      d.image('icon.star', sx, top0 + 9);
      d.text(`X${app.save.prestige}`, sx + 11, top0 + 10, { font: 'big', color: '#ffe68a', shadow: true });
    }

    // Title logo in the sky, then the stage plaque just above the battlefield.
    const logo = app.assets.image('ui.logo');
    const skyRoom = G - 110;
    const ly = Math.max(top0 + 26, Math.round(top0 + skyRoom * 0.24));
    d.image('ui.logo', Math.round(w / 2 - logo.w / 2), ly + Math.round(Math.sin(app.time * 1.5) * 1));
    const save = app.save;
    const sel = selected(save);
    const front = frontier(save);
    const idx = toIndex(sel);
    const enemyName = ageDef(sel.age).name.toUpperCase() + ' AGE';
    const boss = sel.stage === STAGES - 1;
    const sub = boss ? BALANCE.bosses[ageDef(sel.age).id].name.toUpperCase() : `BATTLE ${battleNumber(sel)}`;
    // The plaque fits its widest line inside the gold end-caps.
    const pw = Math.max(126, d.measure(enemyName, 'big') + 40, d.measure(sub) + 36);
    const py = Math.max(ly + logo.h + 8, Math.min(G - 150, Math.round(ly + logo.h + skyRoom * 0.3)));
    const px = Math.round(w / 2 - pw / 2);
    d.nine('ui.plaque', px, py, pw, 42);
    d.text(sub, w / 2, py + 7, { align: 'center', color: boss ? '#7a1a20' : '#3a2a30', outline: null });
    d.text(enemyName, w / 2, py + 16, { font: 'big', align: 'center', color: '#fff1c0', shadow: true });
    this.drawPips(w / 2, py + 31, sel.stage, idx < front);
    // Arrows: pick any battle already unlocked (replay earlier ones for Gold).
    const ax = Math.max(0, px - 24);
    if (idx > 0) button(app, 'pick-prev', ax, py + 9, 22, 24, '<', () => this.pick(-1), { style: 'wood' });
    if (idx < front) button(app, 'pick-next', Math.min(w - 22, px + pw + 2), py + 9, 22, 24, '>', () => this.pick(1), { style: 'wood' });
    const warn = sel.age > save.armyAge && idx >= front;
    const line = idx < front ? 'REPLAY' : warn ? 'EVOLVE FIRST' : save.timeline > 1 ? `TIMELINE ${save.timeline}` : '';
    if (line) {
      const lw = d.measure(line) + 12;
      d.nine('ui.small_plaque', Math.round(w / 2 - lw / 2), py + 43, lw, 13);
      d.text(line, w / 2, py + 47, { align: 'center', color: warn ? '#ff9a7a' : idx < front ? '#cfe0a0' : '#fff8ec' });
    }

    // The call to action stands on the Age's wall, not on the grass. One hero button: Evolve or a
    // new Timeline when they are ready, otherwise Battle.
    const bw = 132;
    const bh = 36;
    const bx = Math.round(w / 2 - bw / 2);
    const by = this.tabY - bh - 8;
    const armyAgeId = ageDef(save.armyAge).id;
    const wallTop = by - (canPrestige(save) || canEvolve(save) ? 40 : evolveUnlocked(save) ? 24 : 10);
    d.image(app.assets.has(`ui.wall_${armyAgeId}`) ? `ui.wall_${armyAgeId}` : 'ui.wall_stone', Math.floor(w / 2), wallTop);
    const battleGo = () => app.go('battle');
    if (canPrestige(save)) {
      button(app, 'battle-go', bx + 16, wallTop + 10, bw - 32, 26, boss ? 'BOSS' : 'BATTLE', battleGo, { style: 'wood', font: 'small', icon: boss ? 'skull' : 'sword' });
      button(app, 'prestige', bx, by, bw, bh, 'NEW TIMELINE', () => {
        if (prestige(save)) {
          app.persist();
          app.sfx('evolve', { jitter: 0 });
          this.flash = 0.6;
          this.env = new EnvView(app, ageDef(selected(save).age).id);
          this.ceremonyText = `TIMELINE ${save.timeline}`;
          this.ceremony = 2.6;
        }
      }, { style: 'gold', sub: '+1 STAR: POWER AND GOLD' });
    } else if (canEvolve(save)) {
      const cost = evolveCost(save) ?? 0;
      button(app, 'battle-go', bx + 16, wallTop + 10, bw - 32, 26, boss ? 'BOSS' : 'BATTLE', battleGo, { style: 'wood', font: 'small', icon: boss ? 'skull' : 'sword' });
      const pulse = Math.sin(app.time * 5) > 0 ? -1 : 0;
      button(app, 'evolve-go', bx, by + pulse, bw, bh, 'EVOLVE', () => this.doEvolve(), { style: 'gold', sub: cost > 0 ? fmt(cost) : 'FREE', subIcon: cost > 0 ? 'gold' : undefined });
    } else {
      if (evolveUnlocked(save)) {
        // Progress toward the next Evolution, so saving Gold has a visible goal.
        const cost = evolveCost(save) ?? 0;
        const label = `EVOLVE ${fmt(save.gold)}/${fmt(cost)}`;
        const lw = Math.max(bw - 20, d.measure(label) + 30);
        const lx = Math.round(w / 2 - lw / 2);
        d.nine('ui.small_plaque', lx, wallTop + 6, lw, 13);
        d.image('icon.gold', lx + 4, wallTop + 9);
        d.text(label, w / 2 + 5, wallTop + 10, { align: 'center', color: '#ffe68a' });
      }
      const left = dailyLeft(save, today());
      button(app, 'battle-go', bx, by, bw, bh, boss ? 'BOSS' : 'BATTLE', battleGo, { style: boss ? 'red' : 'green', icon: boss ? 'skull' : 'sword', ...(left > 0 ? { sub: `DAILY GOLD X2: ${left} LEFT` } : {}) });
    }
  }

  private pick(step: number): void {
    const app = this.app;
    pickBattle(app.save, step);
    app.persist();
    app.sfx('tab', { vol: 0.5 });
    this.env = new EnvView(app, ageDef(selected(app.save).age).id);
  }

  private doEvolve(): void {
    const app = this.app;
    const s = app.save;
    if (!evolve(s)) return;
    app.persist();
    app.sfx('evolve', { jitter: 0 });
    this.flash = 0.6;
    this.env = new EnvView(app, ageDef(selected(s).age).id);
    this.ceremonyText = `${ageDef(s.armyAge).name.toUpperCase()} AGE`;
    this.ceremony = 2.6;
  }

  /** Stage pips for the picked battle's Age: one per stage, the last a skull for the boss. */
  private drawPips(cx: number, y: number, stage: number, replay: boolean): void {
    const d = this.app.draw;
    const gap = 10;
    const x0 = Math.round(cx - ((STAGES - 1) * gap) / 2);
    for (let i = 0; i < STAGES; i++) {
      const x = x0 + i * gap;
      const cur = i === stage;
      if (i === STAGES - 1) {
        d.image('icon.skull', x - 4, y - 2, { alpha: cur || i < stage ? 1 : 0.55 });
        continue;
      }
      d.rect(x - 2, y, 5, 5, '#1e1526');
      d.rect(x - 1, y + 1, 3, 3, i < stage ? '#a8e070' : cur ? (replay ? '#cfe0a0' : '#ffd03c') : '#4a3a48');
    }
  }


  // ---------- Other tabs ----------

  /** Gold counter: coin and number on a dark plaque sized to its content. */
  private goldCounter(y: number): void {
    const d = this.app.draw;
    const v = fmt(this.app.save.gold);
    const cw = Math.max(40, d.measure(v, 'big') + 20);
    counterBig(this.app, 10, y, cw, 'gold', v, '#ffe68a');
    void d;
  }

  private drawBackdrop(title: string): number {
    const app = this.app;
    const d = app.draw;
    // The current Age's wall, darkened so panels stand out, under a beam of the same material.
    const age = ageDef(app.save.armyAge).id;
    const bgKey = app.assets.has(`ui.backdrop_${age}`) ? `ui.backdrop_${age}` : 'ui.wall_bg';
    const bg = app.assets.image(bgKey);
    const bx = Math.floor((app.w - bg.w) / 2);
    for (let y = 0; y < app.h; y += bg.h) d.image(bgKey, bx, y);
    const top = app.safeTop + 22;
    d.image(app.assets.has(`ui.beam_${age}`) ? `ui.beam_${age}` : 'ui.wall_stone', Math.floor(app.w / 2), top);
    const tw = d.measure(title, 'big') + 34;
    d.nine('ui.plaque', Math.round(app.w / 2 - tw / 2), top + 4, tw, 24);
    d.text(title, app.w / 2, top + 11, { font: 'big', align: 'center', color: '#fff1c0', shadow: true });
    this.goldCounter(app.safeTop + 4);
    return top + 34;
  }

  private drawPage(): void {
    const y = this.drawBackdrop(TAB_LABEL[this.tab]);
    if (this.tab === 'upgrades') this.drawUpgrades(y);
    else if (this.tab === 'dungeons') this.drawDungeons(y);
    else if (this.tab === 'cards') this.drawCards(y);
    else this.drawSoon(y, 'tab_shop', ['NO ADS. NO PURCHASES.', 'GEM SHOP ARRIVES LATER']);
  }

  private section(y: number, label: string): number {
    const d = this.app.draw;
    d.rect(10, y + 3, this.app.w - 20, 1, '#120c18');
    const tw = d.measure(label) + 10;
    d.rect(Math.round(this.app.w / 2 - tw / 2), y, tw, 7, '#2a1f2e');
    d.text(label, this.app.w / 2, y + 1, { align: 'center', color: '#ffe68a' });
    return y + 11;
  }

  private drawUpgrades(y0: number): void {
    const app = this.app;
    const d = app.draw;
    const s = app.save;
    const { w } = app;
    const age = ageDef(s.armyAge);

    // Troop slots: bought once, kept forever. Each Age fills them with its own troops.
    let y = this.section(y0, 'ARMY');
    const cw = 54;
    const gap = Math.max(4, Math.min(10, Math.floor((w - 16 - 3 * cw) / 2)));
    const x0 = Math.round((w - (3 * cw + 2 * gap)) / 2);
    age.troops.forEach((t, i) => {
      const x = x0 + i * (cw + gap);
      d.nine('ui.panel_wood', x, y, cw, 70);
      const slot: SlotId | null = t.kind === 'melee' ? null : (t.kind as SlotId);
      const owned = !slot || hasSlot(s, slot);
      const key = `troop.${t.id}.blue`;
      if (app.assets.has(key)) {
        const a = app.assets.sheet(key).anims.idle;
        d.frame(key, 'idle', owned ? Math.floor(app.time * a.fps + i) % a.frames : 0, x + cw / 2, y + 34, { alpha: owned ? 1 : 0.55 });
      }
      d.text(t.name.toUpperCase(), x + cw / 2, y + 38, { align: 'center' });
      if (owned) {
        const rowW = 11 + d.measure(String(t.cost));
        const rx = Math.round(x + cw / 2 - rowW / 2);
        d.image('icon.food', rx - 1, y + 46);
        d.text(String(t.cost), rx + 11, y + 47);
        // What makes this troop special (cleave, pierce, splash, armor, burn...).
        const tr = t.traits;
        const tags = tr ? [tr.splash ? 'SPLASH' : '', tr.pierce ? `PIERCE ${tr.pierce}` : '', tr.cleave ? `CLEAVE ${tr.cleave}` : '', tr.armor ? 'ARMOR' : '', ...(tr.onHit ?? []).map((k) => k.toUpperCase())].filter(Boolean) : [];
        // Only as many tags as fit inside the card.
        let tag = '';
        for (const t2 of tags) {
          const next = tag ? `${tag} ${t2}` : t2;
          if (d.measure(next) <= cw - 8) tag = next;
        }
        if (tag) d.text(tag, x + cw / 2, y + 57, { align: 'center', color: '#ffd03c' });
      } else {
        const ok = canUnlockSlot(s, slot!);
        const needsRanged = slot === 'tank' && !hasSlot(s, 'ranged');
        if (needsRanged) {
          d.image('icon.lock', Math.round(x + cw / 2 - 4), y + 47);
          d.image('icon.bow', Math.round(x + cw / 2 + 6), y + 47);
        } else
          button(app, 'slot-' + slot, x + 3, y + 46, cw - 6, 22, String(slotCost(slot!)), () => {
            if (unlockSlot(s, slot!)) {
              app.persist();
              app.sfx('unlock', { jitter: 0 });
              this.say(`${t.name.toUpperCase()} JOINS YOUR ARMY!`);
            } else this.short(slotCost(slot!));
          }, { style: ok ? 'gold' : 'wood', icon: 'gold', font: 'small', textColor: ok ? undefined : '#ff8a7a' });
      }
    });
    y += 76;

    // Gold upgrades: Food and Base. They reset when you Evolve (the new Age starts stronger).
    y = this.section(y, 'TRAINING');
    const rowH = 28;
    const rw = Math.min(w - 16, 3 * cw + 2 * gap);
    const rx = Math.round((w - rw) / 2);
    const max = maxLevel(s);
    UPGRADE_IDS.forEach((id: UpgradeId, i) => {
      const tr = BALANCE.upgrades.tracks[id];
      const ry = y + i * (rowH + 3);
      const lv = level(s, id);
      d.nine('ui.panel', rx, ry, rw, rowH);
      const icon = 'icon.' + tr.icon;
      const ie = app.assets.image(icon);
      d.image(icon, Math.round(rx + 10 - ie.w / 2), Math.round(ry + rowH / 2 - ie.h / 2 - 1));
      const name = id === 'food' ? 'FOOD RATE' : 'BASE + TOWER';
      d.text(`${name}  LV ${lv}`, rx + 20, ry + 6);
      // Now > next, so the purchase shows what it buys.
      const now = upgradeValue(s, id, lv);
      const c = upgradeCost(s, id);
      d.text(c === null ? now : `${now} > ${upgradeValue(s, id, lv + 1)}`, rx + 20, ry + 16, { color: '#3e7a2a', outline: null });
      const bx = rx + rw - 54;
      if (c === null) d.text('MAX', bx + 26, ry + 11, { align: 'center', color: '#ffe68a' });
      else {
        const ok = canBuy(s, id);
        button(app, 'up-' + id, bx, ry + 3, 52, rowH - 6, fmt(c), () => {
          if (buyUpgrade(s, id)) {
            app.persist();
            app.sfx('upgrade', { jitter: 0.02 });
            this.say(`${name} ${upgradeValue(s, id, level(s, id))}`);
          } else this.short(c);
        }, { style: ok ? 'green' : 'wood', icon: 'gold', font: 'small', textColor: ok ? undefined : '#ff8a7a' });
      }
      void max;
    });
    y += UPGRADE_IDS.length * (rowH + 3) + 4;

    // Evolution.
    y = this.section(y, 'EVOLVE');
    const next = s.armyAge < BALANCE.ages.length - 1 ? ageDef(s.armyAge + 1) : null;
    d.nine('ui.panel', rx, y, rw, 60);
    if (!next) {
      d.text('FUTURE ARMY', w / 2, y + 8, { font: 'big', align: 'center', color: '#fff1c0', shadow: true });
      d.text('BEAT OMEGA CORE FOR A NEW TIMELINE', w / 2, y + 26, { align: 'center', color: '#3a2a30', outline: null });
    } else {
      d.text(`${age.name.toUpperCase()} > ${next.name.toUpperCase()}`, w / 2, y + 6, { font: 'big', align: 'center', color: '#fff1c0', shadow: true });
      const cost = evolveCost(s) ?? 0;
      if (!evolveUnlocked(s)) d.text(`BEAT ${BALANCE.bosses[age.id].name.toUpperCase()} FIRST`, w / 2, y + 24, { align: 'center', color: '#3a2a30', outline: null });
      else {
        const ok = canEvolve(s);
        button(app, 'evolve', Math.round(w / 2 - 50), y + 19, 100, 22, cost > 0 ? fmt(cost) : 'FREE', () => (ok ? this.doEvolve() : this.short(cost)), { style: ok ? 'gold' : 'wood', icon: cost > 0 ? 'gold' : undefined, font: 'small', textColor: ok ? undefined : '#ff8a7a' });
      }
      d.text('GOLD AND TRAINING RESET', w / 2, y + 45, { align: 'center', color: '#3a2a30', outline: null });
    }
  }

  /** Tapping something you can't afford says how much is missing. */
  private short(cost: number): void {
    this.app.sfx('nope', { vol: 0.5 });
    this.say(`NEED ${fmt(Math.max(1, cost - this.app.save.gold))} MORE GOLD`);
  }

  private drawDungeons(y0: number): void {
    const app = this.app;
    const d = app.draw;
    const s = app.save;
    const day = today();
    const keys = keysLeft(s, day);
    counterBig(app, app.w - 50, app.safeTop + 4, 40, 'key', String(keys));
    const modes: [string, string, string][] = [
      ['SURVIVAL', 'skull', 'HOLD THE GATE'],
      ['RUSH', 'tab_battle', ''],
      ['LEGENDS', 'tab_cards', ''],
      ['BOSSES', 'star', ''],
    ];
    const gap = 6;
    const tw = Math.floor((app.w - 20 - gap) / 2);
    const avail = this.tabY - y0 - 30;
    const th = Math.min(96, Math.floor((avail - gap) / 2));
    modes.forEach(([name, icon, line], i) => {
      const x = 10 + (i % 2) * (tw + gap);
      const y = y0 + 4 + Math.floor(i / 2) * (th + gap);
      d.nine('ui.panel', x, y, tw, th);
      const ie = app.assets.image('icon.' + icon);
      d.image('icon.' + icon, Math.round(x + tw / 2 - ie.w / 2), y + 10);
      d.text(name, x + tw / 2, y + 24, { font: 'big', align: 'center', color: '#fff1c0', shadow: true });
      if (i === 0) {
        // Survival: endless waves of your own Age. Gems for every wave held. One Key per run.
        d.text(line, x + tw / 2, y + 36, { align: 'center', color: '#3a2a30', outline: null });
        d.text(`BEST ${s.survivalBest}`, x + tw / 2, y + 46, { align: 'center', color: '#3e7a2a', outline: null });
        button(app, 'survival-go', x + 6, y + th - 30, tw - 12, 24, keys > 0 ? 'ENTER' : 'NO KEYS', () => {
          if (useKey(s, day)) {
            app.persist();
            app.go('battle', 'survival');
          } else {
            app.sfx('nope', { vol: 0.5 });
            this.say('KEYS RETURN TOMORROW');
          }
        }, { style: keys > 0 ? 'green' : 'wood', icon: 'key', font: 'small', textColor: keys > 0 ? undefined : '#ff8a7a' });
      } else {
        d.image('icon.lock', Math.round(x + tw / 2 - 4), y + th - 32);
        d.text('LATER', x + tw / 2, y + th - 18, { align: 'center', color: '#3a2a30', outline: null });
      }
    });
    const ny = y0 + 4 + 2 * (th + gap) + 4;
    d.image('icon.gem', Math.round(app.w / 2 - 44), ny - 2);
    d.text('GEMS BUY CARDS', app.w / 2 + 6, ny, { align: 'center', color: '#e8dcc8' });
  }

  /** Cards: permanent power for each troop kind, bought with Gems. Kept through Evolution and Prestige. */
  private drawCards(y0: number): void {
    const app = this.app;
    const d = app.draw;
    const s = app.save;
    const { w } = app;
    counterBig(app, w - 60, app.safeTop + 4, 50, 'gem', fmt(s.gems), '#9fe8ff');
    const age = ageDef(s.armyAge);
    const rw = Math.min(w - 16, 182);
    const rx = Math.round((w - rw) / 2);
    const rowH = 46;
    const per = Math.round(BALANCE.meta.cards.perLevel * 100);
    CARD_KINDS.forEach((kind, i) => {
      const y = y0 + 4 + i * (rowH + 5);
      d.nine('ui.panel', rx, y, rw, rowH);
      d.nine('ui.inset', rx + 5, y + 5, 36, 36);
      const t = age.troops.find((q) => q.kind === kind)!;
      const key = `troop.${t.id}.blue`;
      if (app.assets.has(key)) {
        const a = app.assets.sheet(key).anims.idle;
        d.frame(key, 'idle', Math.floor(app.time * a.fps + i) % a.frames, rx + 23, y + 38);
      }
      const lv = cardLevel(s, kind);
      const name = kind === 'tank' ? 'HEAVY' : kind.toUpperCase();
      d.text(`${name} CARD`, rx + 46, y + 7, { font: 'big', color: '#fff1c0', shadow: true });
      d.text(`LV ${lv}`, rx + 46, y + 19, { color: '#3a2a30', outline: null });
      const c = cardCost(s, kind);
      d.text(c === null ? `+${lv * per}% POWER` : `+${lv * per}% > +${(lv + 1) * per}% POWER`, rx + 46, y + 29, { color: '#3e7a2a', outline: null });
      if (c === null) d.text('MAX', rx + rw - 28, y + 18, { align: 'center', color: '#ffe68a' });
      else {
        const ok = s.gems >= c;
        button(app, 'card-' + kind, rx + rw - 52, y + 5, 46, 22, fmt(c), () => {
          if (buyCard(s, kind)) {
            app.persist();
            app.sfx('upgrade', { jitter: 0.02 });
            this.say(`${name} +${cardLevel(s, kind) * per}% POWER`);
          } else {
            app.sfx('nope', { vol: 0.5 });
            this.say(`NEED ${fmt(c - s.gems)} MORE GEMS`);
          }
        }, { style: ok ? 'green' : 'wood', icon: 'gem', font: 'small', textColor: ok ? undefined : '#ff8a7a' });
      }
    });
    const ny = y0 + 4 + 3 * (rowH + 5) + 4;
    d.text('CARDS ARE KEPT FOREVER', w / 2, ny, { align: 'center', color: '#e8dcc8' });
    d.text('EARN GEMS IN SURVIVAL', w / 2, ny + 10, { align: 'center', color: '#e8dcc8' });
  }

  private drawSoon(y0: number, icon: string, lines: string[]): void {
    const app = this.app;
    const d = app.draw;
    const pw = app.w - 30;
    const ph = 92;
    const x = 15;
    const y = Math.round(y0 + (this.tabY - y0 - ph) / 2 - 10);
    d.nine('ui.panel', x, y, pw, ph);
    const ie = app.assets.image('icon.' + icon);
    d.image('icon.' + icon, Math.round(app.w / 2 - ie.w / 2), y + 14);
    d.image('icon.lock', Math.round(app.w / 2 + 4), y + 22);
    lines.forEach((l, i) => d.text(l, app.w / 2, y + 44 + i * 12, { align: 'center', color: i === 0 ? '#fff8ec' : '#3a2a30', outline: i === 0 ? undefined : null }));
  }

  private drawTabBar(): void {
    const app = this.app;
    const d = app.draw;
    const { w, h } = app;
    const y = this.tabY;
    d.nine('ui.tabbar', 0, y, w, h - y);
    const tw = w / TABS.length;
    TABS.forEach((t, i) => {
      const sel = t === this.tab;
      const x = Math.round(i * tw);
      const bw = Math.round((i + 1) * tw) - x;
      const id = 'tab-' + t;
      if (!tabRevealed(app, t)) return;
      const fresh = !app.save.seen.includes('tab_' + t) && t !== 'battle';
      // The raised tab is wide enough for its label.
      const sw = Math.max(bw, d.measure(TAB_LABEL[t]) + 12);
      const sx = Math.max(0, Math.min(w - sw, Math.round(x + bw / 2 - sw / 2)));
      if (sel) d.nine('ui.tab_on', sx, y - 6, sw, TAB_H + 6);
      const ie = app.assets.image('icon.tab_' + t);
      const iy = sel ? y - 2 : y + 6;
      d.image('icon.tab_' + t, Math.round(x + bw / 2 - ie.w / 2), iy, { alpha: sel ? 1 : 0.8 });
      if (sel) {
        // Keep the label on screen even for the edge tabs.
        const lw = d.measure(TAB_LABEL[t]);
        const lx = Math.max(sx + lw / 2 + 6, Math.min(sx + sw - lw / 2 - 6, x + bw / 2));
        d.text(TAB_LABEL[t], lx, y + 16, { align: 'center', color: '#fff1c0' });
      }
      // Badges: NEW on a freshly revealed tab, else what you can afford.
      const count = t === 'upgrades' ? (evolveUnlocked(app.save) ? (canEvolve(app.save) ? 1 : 0) : affordableCount(app.save)) : t === 'cards' ? cardsAffordable(app.save) : t === 'dungeons' ? keysLeft(app.save, today()) : 0;
      if (!sel && (fresh || count > 0)) {
        const label = fresh ? 'NEW' : String(count);
        const bwid = d.measure(label) + 6;
        const bx = x + bw - bwid - 2;
        const by = y + 2 + (fresh && Math.sin(app.time * 6) > 0 ? -1 : 0);
        d.rect(bx, by, bwid, 9, '#1e1526');
        d.rect(bx + 1, by + 1, bwid - 2, 7, '#e0383a');
        d.rect(bx + 1, by + 1, bwid - 2, 1, '#ff7a6a');
        d.text(label, bx + bwid / 2, by + 2, { align: 'center', color: '#fff8ec', outline: null });
      }
      app.input.region({
        id,
        x,
        y: y - (sel ? 6 : 0),
        w: bw,
        h: TAB_H + 6,
        onTap: () => {
          if (this.tab !== t) app.sfx('tab', { vol: 0.5 });
          this.tab = t;
          if (!app.save.seen.includes('tab_' + t)) {
            app.save.seen.push('tab_' + t);
            app.persist();
          }
        },
      });
    });
  }

  private drawSettings(): void {
    const app = this.app;
    const d = app.draw;
    dim(app);
    blocker(app, 'settings-block', () => (this.settings = false));
    const pw = 150;
    const ph = 162;
    const x = Math.round(app.w / 2 - pw / 2);
    const y = Math.round(app.h / 2 - ph / 2);
    d.nine('ui.panel', x, y, pw, ph);
    app.input.region({ id: 'settings-panel', x, y, w: pw, h: ph, onTap: () => {} });
    d.text('SETTINGS', app.w / 2, y + 10, { font: 'big', align: 'center', color: '#fff1c0', shadow: true });
    const s = app.save.settings;
    button(app, 'set-sound', x + 14, y + 26, pw - 28, 22, s.sound ? 'SOUND: ON' : 'SOUND: OFF', () => {
      s.sound = !s.sound;
      app.audio.muted = !s.sound;
      app.persist();
    }, { icon: s.sound ? 'sound' : 'mute', font: 'small' });
    button(app, 'set-music', x + 14, y + 52, pw - 28, 22, s.music ? 'MUSIC: ON' : 'MUSIC: OFF', () => {
      s.music = !s.music;
      app.audio.music.enabled = s.music;
      app.persist();
    }, { font: 'small' });
    button(app, 'set-motion', x + 14, y + 78, pw - 28, 22, s.reducedMotion ? 'SHAKE: OFF' : 'SHAKE: ON', () => {
      s.reducedMotion = !s.reducedMotion;
      app.persist();
    }, { font: 'small' });
    button(app, 'set-close', x + 14, y + 106, pw - 28, 26, 'CLOSE', () => {
      this.settings = false;
      this.confirmReset = 0;
    }, { style: 'green' });
    // Reset sits apart, small, and asks in its own dialog.
    button(app, 'set-reset', x + 34, y + ph - 30, pw - 68, 20, 'RESET', () => (this.confirmReset = 1), { style: 'wood', font: 'small', textColor: '#ffb08c' });
    if (this.confirmReset > 0) {
      dim(app, 0.4);
      blocker(app, 'reset-block');
      const cw2 = 150;
      const ch = 96;
      const cx = Math.round(app.w / 2 - cw2 / 2);
      const cy = Math.round(app.h / 2 - ch / 2);
      d.nine('ui.panel', cx, cy, cw2, ch);
      d.text('ERASE EVERYTHING?', app.w / 2, cy + 12, { font: 'big', align: 'center', color: '#fff1c0', shadow: true });
      d.text('THIS CANNOT BE UNDONE', app.w / 2, cy + 26, { align: 'center', color: '#7a1a20', outline: null });
      button(app, 'reset-no', cx + 10, cy + 40, cw2 - 20, 24, 'KEEP MY GAME', () => (this.confirmReset = 0), { style: 'green', font: 'small' });
      button(app, 'reset-yes', cx + 30, cy + 70, cw2 - 60, 18, 'ERASE', () => {
        app.save = newSave(Date.now());
        app.persist();
        this.confirmReset = 0;
        this.settings = false;
        this.tab = 'battle';
        this.env = new EnvView(app, 'stone');
        this.say('NEW GAME');
      }, { style: 'red', font: 'small' });
      return;
    }
    d.text(`V${__APP_VERSION__}  SAVE ${app.save.schema}`, app.w / 2, y + ph + 4, { align: 'center', color: '#a89ab0' });
  }
}

declare const __APP_VERSION__: string;
