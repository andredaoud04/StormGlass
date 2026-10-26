/** Main menu with the five tabs: Dungeons, Upgrades, Battle (centre, default), Cards, Shop. */
import type { App, Scene } from '../app';
import { BALANCE, ageDef } from '../game/balance';
import { canEvolve, canUnlock, evolve, evolveCost, isOwned, loadout, unlockTroop } from '../game/progress';
import { UPGRADE_IDS, buyUpgrade, level, upgradeCost, upgradeValue } from '../game/upgrades';
import { newSave } from '../game/save';
import { blocker, button, counter, dim, fmt, iconButton } from '../ui/widgets';
import { EnvView } from '../view/environment';
import { FxSystem } from '../view/fx';

export type Tab = 'dungeons' | 'upgrades' | 'battle' | 'cards' | 'shop';
const TABS: Tab[] = ['dungeons', 'upgrades', 'battle', 'cards', 'shop'];
const TAB_LABEL: Record<Tab, string> = { dungeons: 'DUNGEONS', upgrades: 'UPGRADES', battle: 'BATTLE', cards: 'CARDS', shop: 'SHOP' };
const TAB_H = 34;

export class MenuScene implements Scene {
  private tab: Tab;
  private env: EnvView;
  private fx: FxSystem;
  private settings = false;
  private confirmReset = 0;
  private toast = '';
  private toastT = 0;
  private flash = 0;

  constructor(
    private app: App,
    tab: Tab = 'battle',
  ) {
    this.tab = tab;
    this.env = new EnvView(app, ageDef(app.save.enemyAge).id);
    this.fx = new FxSystem((k) => app.assets.strip(k).frames);
  }

  key(k: string): void {
    if (k === 'Enter' && this.tab === 'battle') this.app.go('battle');
  }

  private get groundY(): number {
    return this.app.h - TAB_H - 70;
  }

  update(dt: number): void {
    this.env.update(dt, this.groundY);
    this.fx.update(dt, (k) => this.app.assets.strip(k).fps);
    this.toastT = Math.max(0, this.toastT - dt);
    this.flash = Math.max(0, this.flash - dt);
  }

  private say(msg: string): void {
    this.toast = msg;
    this.toastT = 1.6;
  }

  draw(): void {
    if (this.tab === 'battle') this.drawHome();
    else this.drawPage();
    this.drawTabBar();
    if (this.toastT > 0) {
      const d = this.app.draw;
      const tw = d.measure(this.toast) + 16;
      const y = this.app.h - TAB_H - 30;
      d.nine('ui.small_plaque', Math.round(this.app.w / 2 - tw / 2), y, tw, 15, Math.min(1, this.toastT * 3));
      d.text(this.toast, this.app.w / 2, y + 5, { align: 'center', alpha: Math.min(1, this.toastT * 3) });
    }
    if (this.flash > 0) this.app.draw.rect(0, 0, this.app.w, this.app.h, '#fff8ec', this.flash * 1.5);
    if (this.settings) this.drawSettings();
  }

  // ---------- Battle (home) ----------

  private drawHome(): void {
    const app = this.app;
    const d = app.draw;
    const { w } = app;
    const G = this.groundY;
    this.env.draw(G);
    const armyAge = ageDef(app.save.armyAge).id;
    const enemyAge = ageDef(app.save.enemyAge).id;
    const baseKey = (age: string, team: string) => (app.assets.has(`base.${age}.${team}.0`) ? `base.${age}.${team}.0` : `base.stone.${team}.0`);
    d.image(baseKey(armyAge, 'blue'), 38, G);
    d.image(baseKey(enemyAge, 'red'), w - 39, G, { flip: true });
    // Your army idles in front of your fortress.
    const army = loadout(app.save);
    army.forEach((id, i) => {
      const key = `troop.${id}.blue`;
      if (!app.assets.has(key)) return;
      const a = app.assets.sheet(key).anims.idle;
      const f = Math.floor(app.time * a.fps + i * 1.7) % a.frames;
      d.rect(52 + i * 17 - 6, G + (i % 2) * 2, 12, 1, '#1e1526', 0.28);
      d.frame(key, 'idle', f, 52 + i * 17, G + (i % 2) * 2);
    });
    this.fx.drawFront(d);

    // Top bar.
    counter(app, 10, 5, 52, 'gold', fmt(app.save.gold), '#ffe68a');
    iconButton(app, 'settings', w - 24, 4, 20, 'gear', () => (this.settings = true));

    // Title logo in the sky, then the stage plaque just above the battlefield.
    const logo = app.assets.image('ui.logo');
    const skyRoom = G - 110;
    const ly = Math.max(26, Math.round(skyRoom * 0.28));
    d.image('ui.logo', Math.round(w / 2 - logo.w / 2), ly + Math.round(Math.sin(app.time * 1.5) * 1));
    const enemyName = ageDef(app.save.enemyAge).name.toUpperCase() + ' AGE';
    const pw = Math.max(110, d.measure(enemyName, 'big') + 36);
    const py = Math.max(ly + logo.h + 8, Math.min(G - 150, Math.round(ly + logo.h + skyRoom * 0.3)));
    d.nine('ui.plaque', Math.round(w / 2 - pw / 2), py, pw, 34);
    d.text('NEXT ENEMY', w / 2, py + 7, { align: 'center', color: '#3a2a30', outline: null });
    d.text(enemyName, w / 2, py + 16, { font: 'big', align: 'center', color: '#fff1c0', shadow: true });
    const armyLine = `ARMY: ${ageDef(app.save.armyAge).name.toUpperCase()}${app.save.timeline > 1 ? `  TIMELINE ${app.save.timeline}` : ''}`;
    d.text(armyLine, w / 2, py + 39, { align: 'center' });

    // Big Battle button on the meadow.
    const bw = 128;
    const bh = 34;
    button(app, 'battle-go', Math.round(w / 2 - bw / 2), app.h - TAB_H - bh - 10, bw, bh, 'BATTLE', () => app.go('battle'), { style: 'green', icon: 'sword' });
  }

  // ---------- Other tabs ----------

  private drawBackdrop(title: string): number {
    const app = this.app;
    const d = app.draw;
    // Themed stone wall background under a lashed beam.
    const bg = app.assets.image('ui.wall_bg');
    const bx = Math.floor((app.w - bg.w) / 2);
    for (let y = 22; y < app.h; y += bg.h) d.image('ui.wall_bg', bx, y);
    d.image('ui.wall_stone', Math.floor(app.w / 2), 18);
    d.rect(0, 0, app.w, 18, '#2a1f2e');
    d.rect(0, 0, app.w, app.h, '#1e1526', 0.25);
    const tw = d.measure(title, 'big') + 34;
    d.nine('ui.plaque', Math.round(app.w / 2 - tw / 2), 22, tw, 24);
    d.text(title, app.w / 2, 29, { font: 'big', align: 'center', color: '#fff1c0', shadow: true });
    counter(app, 10, 5, 52, 'gold', fmt(app.save.gold), '#ffe68a');
    return 54;
  }

  private drawPage(): void {
    const y = this.drawBackdrop(TAB_LABEL[this.tab]);
    if (this.tab === 'upgrades') this.drawUpgrades(y);
    else if (this.tab === 'dungeons') this.drawDungeons(y);
    else this.drawSoon(y, this.tab === 'cards' ? 'tab_cards' : 'tab_shop', this.tab === 'cards' ? ['CARDS AND SKILLS', 'ARRIVE IN A LATER UPDATE'] : ['NO ADS. NO PURCHASES.', 'GEM SHOP ARRIVES LATER']);
  }

  private section(y: number, label: string): number {
    const d = this.app.draw;
    d.rect(10, y + 3, this.app.w - 20, 1, '#1e1526', 0.6);
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
    const cw = 54;
    const gap = Math.max(4, Math.min(10, Math.floor((w - 16 - 3 * cw) / 2)));
    const x0 = Math.round((w - (3 * cw + 2 * gap)) / 2);

    // Troops of your current Age: buy once, kept forever.
    let y = this.section(y0, 'TROOPS');
    const age = ageDef(s.armyAge);
    age.troops.forEach((t, i) => {
      const x = x0 + i * (cw + gap);
      d.nine('ui.panel_wood', x, y, cw, 74);
      const owned = isOwned(s, t.id);
      const key = `troop.${t.id}.blue`;
      if (app.assets.has(key)) {
        const a = app.assets.sheet(key).anims.idle;
        d.frame(key, 'idle', owned ? Math.floor(app.time * a.fps + i) % a.frames : 0, x + cw / 2, y + 36);
      }
      d.text(t.name.toUpperCase(), x + cw / 2, y + 40, { align: 'center' });
      const role = t.kind === 'tank' ? 'TANK' : t.kind === 'ranged' ? 'RANGE' : 'MELEE';
      const rowW = 11 + d.measure(String(t.cost)) + 4 + d.measure(role);
      const rx = Math.round(x + cw / 2 - rowW / 2);
      d.image('icon.food', rx - 1, y + 47);
      d.text(String(t.cost), rx + 11, y + 48);
      d.text(role, rx + rowW, y + 48, { align: 'right', color: '#cfe0a0' });
      if (owned) d.image('icon.check', x + cw / 2 - 4, y + 59);
      else {
        const ok = canUnlock(s, t.id);
        button(app, 'unlock' + i, x + 4, y + 56, cw - 8, 16, String(t.unlockGold), () => {
          if (unlockTroop(s, t.id)) {
            app.persist();
            app.sfx('unlock', { jitter: 0 });
            this.say(`${t.name.toUpperCase()} JOINS YOUR ARMY!`);
          }
        }, { style: ok ? 'gold' : 'grey', disabled: !ok, icon: 'gold', font: 'small' });
      }
    });
    y += 78;

    // Army upgrades.
    y = this.section(y, 'ARMY');
    UPGRADE_IDS.forEach((id, i) => {
      const u = BALANCE.upgrades[id];
      const x = x0 + i * (cw + gap);
      const lv = level(s, id);
      d.nine('ui.panel', x, y, cw, 58);
      const ie = app.assets.image('icon.' + u.icon);
      d.image('icon.' + u.icon, x + 6, y + 6);
      d.text(u.name.toUpperCase(), x + 8 + ie.w, y + 7);
      d.text(`LV ${lv}`, x + cw / 2, y + 19, { align: 'center', color: '#3a2a30', outline: null });
      d.text(upgradeValue(id, lv), x + cw / 2, y + 28, { align: 'center', color: '#fff8ec' });
      const c = upgradeCost(s, id);
      if (c === null) d.text('MAX', x + cw / 2, y + 44, { align: 'center', color: '#ffe68a' });
      else {
        const ok = s.gold >= c;
        button(app, 'up-' + id, x + 4, y + 38, cw - 8, 17, fmt(c), () => {
          if (buyUpgrade(s, id)) {
            app.persist();
            app.sfx('upgrade', { jitter: 0.02 });
            this.say(`${u.name.toUpperCase()} ${upgradeValue(id, level(s, id))}`);
          }
        }, { style: ok ? 'green' : 'grey', disabled: !ok, icon: 'gold', font: 'small' });
      }
    });
    y += 62;

    // Evolution.
    y = this.section(y, 'EVOLVE');
    const cost = evolveCost(s);
    const next = s.armyAge < BALANCE.ages.length - 1 ? ageDef(s.armyAge + 1) : null;
    const pw = 3 * cw + 2 * gap;
    d.nine('ui.panel', x0, y, pw, 44);
    if (!next) {
      d.text('FUTURE ARMY', w / 2, y + 9, { font: 'big', align: 'center', color: '#fff1c0', shadow: true });
      d.text('BEAT THE FUTURE FORTRESS', w / 2, y + 26, { align: 'center', color: '#3a2a30', outline: null });
    } else {
      d.text(`${age.name.toUpperCase()} > ${next.name.toUpperCase()}`, w / 2, y + 7, { font: 'big', align: 'center', color: '#fff1c0', shadow: true });
      const ok = canEvolve(s);
      const label = cost === 0 ? 'EVOLVE FREE' : `EVOLVE ${fmt(cost ?? 0)}`;
      button(app, 'evolve', Math.round(w / 2 - 52), y + 18, 104, 22, label, () => {
        if (evolve(s)) {
          app.persist();
          app.sfx('evolve', { jitter: 0 });
          this.flash = 0.5;
          this.env = new EnvView(app, ageDef(s.enemyAge).id);
          this.say(`WELCOME TO THE ${next.name.toUpperCase()} AGE!`);
        }
      }, { style: ok ? 'green' : 'grey', disabled: !ok, icon: cost === 0 ? undefined : 'gold', font: 'small' });
    }
    y += 48;
    if (next && y + 8 < app.h - TAB_H - 4) {
      d.text(cost === 0 ? 'FREE: YOU BEAT THAT FORTRESS' : 'FREE AFTER YOU BEAT ITS FORTRESS', w / 2, y, { align: 'center', color: '#e8dcc8' });
    }
  }

  private drawDungeons(y0: number): void {
    const app = this.app;
    const d = app.draw;
    const s = app.save;
    counter(app, app.w - 58, 5, 48, 'key', fmt(s.keys));
    const modes: [string, string, number][] = [
      ['RUSH', 'tab_battle', 1],
      ['LEGENDS', 'tab_cards', 2],
      ['BOSSES', 'skull', 3],
      ['SURVIVAL', 'tab_dungeons', 0],
    ];
    const gap = 6;
    const tw = Math.floor((app.w - 20 - gap) / 2);
    const avail = app.h - TAB_H - y0 - 20;
    const th = Math.min(86, Math.floor((avail - gap) / 2));
    modes.forEach(([name, icon, need], i) => {
      const x = 10 + (i % 2) * (tw + gap);
      const y = y0 + 4 + Math.floor(i / 2) * (th + gap);
      d.nine('ui.panel', x, y, tw, th);
      const ie = app.assets.image('icon.' + icon);
      d.image('icon.' + icon, Math.round(x + tw / 2 - ie.w / 2), y + 12);
      d.text(name, x + tw / 2, y + 34, { font: 'big', align: 'center', color: '#fff1c0', shadow: true });
      const locked = need > 0 ? s.prestige < need : true;
      if (locked) {
        d.rect(x + 3, y + 3, tw - 6, th - 7, '#1e1526', 0.45);
        d.image('icon.lock', Math.round(x + tw / 2 - 4), y + th - 30);
        d.text(need > 0 ? `PRESTIGE ${need}` : 'SOON', x + tw / 2, y + th - 18, { align: 'center', color: '#e8dcc8' });
      }
    });
    d.text('KEYS DROP ONLY IN DUNGEONS', app.w / 2, y0 + 4 + 2 * (th + gap) + 2, { align: 'center', color: '#e8dcc8' });
  }

  private drawSoon(y0: number, icon: string, lines: string[]): void {
    const app = this.app;
    const d = app.draw;
    const pw = app.w - 30;
    const ph = 92;
    const x = 15;
    const y = Math.round(y0 + (app.h - TAB_H - y0 - ph) / 2 - 10);
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
    const y = h - TAB_H;
    d.nine('ui.tabbar', 0, y, w, TAB_H);
    const tw = w / TABS.length;
    TABS.forEach((t, i) => {
      const sel = t === this.tab;
      const x = Math.round(i * tw);
      const bw = Math.round((i + 1) * tw) - x;
      const id = 'tab-' + t;
      if (sel) {
        d.nine('ui.tab_on', x, y - 6, bw, TAB_H + 6);
      }
      const ie = app.assets.image('icon.tab_' + t);
      const iy = sel ? y - 2 : y + 6;
      d.image('icon.tab_' + t, Math.round(x + bw / 2 - ie.w / 2), iy, { alpha: sel ? 1 : 0.8 });
      if (sel) {
        // Keep the label on screen even for the edge tabs.
        const lw = d.measure(TAB_LABEL[t]);
        const lx = Math.max(lw / 2 + 2, Math.min(w - lw / 2 - 2, x + bw / 2));
        d.text(TAB_LABEL[t], lx, y + 16, { align: 'center', color: '#fff1c0' });
      }
      const locked = t === 'dungeons' && app.save.prestige < 1;
      if (locked && !sel) d.image('icon.lock', x + bw - 12, y + 4, { alpha: 0.8 });
      app.input.region({
        id,
        x,
        y: y - (sel ? 6 : 0),
        w: bw,
        h: TAB_H + 6,
        onTap: () => {
          if (this.tab !== t) app.sfx('tab', { vol: 0.5 });
          this.tab = t;
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
    const ph = 146;
    const x = Math.round(app.w / 2 - pw / 2);
    const y = Math.round(app.h / 2 - ph / 2);
    d.nine('ui.panel', x, y, pw, ph);
    app.input.region({ id: 'settings-panel', x, y, w: pw, h: ph, onTap: () => {} });
    d.text('SETTINGS', app.w / 2, y + 10, { font: 'big', align: 'center', color: '#fff1c0', shadow: true });
    const s = app.save.settings;
    button(app, 'set-sound', x + 14, y + 26, pw - 28, 22, s.sound ? 'SOUND ON' : 'SOUND OFF', () => {
      s.sound = !s.sound;
      app.audio.muted = !s.sound;
      app.persist();
    }, { icon: s.sound ? 'sound' : 'mute', font: 'small' });
    button(app, 'set-motion', x + 14, y + 52, pw - 28, 22, s.reducedMotion ? 'SCREEN SHAKE OFF' : 'SCREEN SHAKE ON', () => {
      s.reducedMotion = !s.reducedMotion;
      app.persist();
    }, { font: 'small' });
    const resetLabel = this.confirmReset > 0 ? 'TAP AGAIN TO ERASE' : 'RESET PROGRESS';
    button(app, 'set-reset', x + 14, y + 78, pw - 28, 22, resetLabel, () => {
      if (this.confirmReset > 0) {
        app.save = newSave(Date.now());
        app.persist();
        this.confirmReset = 0;
        this.settings = false;
        this.tab = 'battle';
        this.env = new EnvView(app, 'stone');
        this.say('NEW GAME');
      } else this.confirmReset = 1;
    }, { style: 'red', font: 'small' });
    button(app, 'set-close', x + 14, y + 106, pw - 28, 24, 'CLOSE', () => {
      this.settings = false;
      this.confirmReset = 0;
    }, { style: 'green' });
    d.text(`V${__APP_VERSION__}  SAVE ${app.save.schema}`, app.w / 2, y + ph + 4, { align: 'center', color: '#a89ab0' });
  }
}

declare const __APP_VERSION__: string;
