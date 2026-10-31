/**
 * Main menu. Five tab positions: Dungeons, Upgrades, Battle (centre, default), Cards, Shop.
 * Tabs appear one at a time as the player progresses; until then their position stays empty.
 */
import type { App, Scene } from '../app';
import { BALANCE, ageDef, type CampId } from '../game/balance';
import { bossBeaten, canEvolve, canPrestige, evolve, loadout, prestige, STAGES, stageNumber } from '../game/progress';
import { CAMP_IDS, affordableCount, buyUpgrade, canBuy, canUnlockSlot, hasSlot, level, maxLevel, slotCost, trackOpen, unlockSlot, upgradeCost, upgradeValue, type SlotId } from '../game/upgrades';
import { newSave } from '../game/save';
import { blocker, button, counter, dim, fmt, iconButton } from '../ui/widgets';
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
  if (t === 'dungeons') return s.prestige >= 1;
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
    const save = app.save;
    const enemyName = ageDef(save.enemyAge).name.toUpperCase() + ' AGE';
    const pw = Math.max(120, d.measure(enemyName, 'big') + 36);
    const py = Math.max(ly + logo.h + 8, Math.min(G - 150, Math.round(ly + logo.h + skyRoom * 0.3)));
    d.nine('ui.plaque', Math.round(w / 2 - pw / 2), py, pw, 42);
    const boss = save.stage === STAGES - 1;
    const sub = bossBeaten(save) ? 'BOSS DEFEATED' : boss ? 'BOSS: ' + BALANCE.bosses[ageDef(save.enemyAge).id].name.toUpperCase() : `STAGE ${save.stage + 1} OF ${STAGES}`;
    d.text(sub, w / 2, py + 7, { align: 'center', color: boss && !bossBeaten(save) ? '#7a1a20' : '#3a2a30', outline: null });
    d.text(enemyName, w / 2, py + 16, { font: 'big', align: 'center', color: '#fff1c0', shadow: true });
    this.drawPips(w / 2, py + 31);
    const line = `CAMPAIGN ${stageNumber(save)}${save.timeline > 1 ? `  TIMELINE ${save.timeline}` : ''}`;
    d.text(line, w / 2, py + 46, { align: 'center' });

    // Big button on the meadow: Battle, or Evolve / New Timeline once the boss is down.
    const bw = 128;
    const bh = 34;
    const bx = Math.round(w / 2 - bw / 2);
    const by = app.h - TAB_H - bh - 10;
    if (canPrestige(save)) {
      button(app, 'prestige', bx, by, bw, bh, 'NEW TIMELINE', () => {
        if (prestige(save)) {
          app.persist();
          app.sfx('evolve', { jitter: 0 });
          this.flash = 0.6;
          this.env = new EnvView(app, ageDef(save.enemyAge).id);
          this.say(`TIMELINE ${save.timeline} BEGINS!`);
        }
      }, { style: 'gold', sub: 'BACK TO STONE, STRONGER FOES' });
    } else if (canEvolve(save)) {
      const next = ageDef(save.armyAge + 1).name.toUpperCase();
      const pulse = Math.sin(app.time * 5) > 0 ? -1 : 0;
      button(app, 'evolve-go', bx, by + pulse, bw, bh, 'EVOLVE', () => this.doEvolve(), { style: 'gold', sub: `TO THE ${next} AGE` });
    } else {
      button(app, 'battle-go', bx, by, bw, bh, boss ? 'BOSS' : 'BATTLE', () => app.go('battle'), { style: boss ? 'red' : 'green', icon: boss ? 'skull' : 'sword' });
    }
  }

  private doEvolve(): void {
    const app = this.app;
    const s = app.save;
    if (!evolve(s)) return;
    app.persist();
    app.sfx('evolve', { jitter: 0 });
    this.flash = 0.6;
    this.env = new EnvView(app, ageDef(s.enemyAge).id);
    this.say(`WELCOME TO THE ${ageDef(s.armyAge).name.toUpperCase()} AGE!`);
  }

  /** Stage pips: one per stage, the last a skull for the boss. */
  private drawPips(cx: number, y: number): void {
    const d = this.app.draw;
    const s = this.app.save;
    const gap = 10;
    const x0 = Math.round(cx - ((STAGES - 1) * gap) / 2);
    for (let i = 0; i < STAGES; i++) {
      const x = x0 + i * gap;
      const done = i < s.stage || bossBeaten(s);
      const cur = i === s.stage && !bossBeaten(s);
      if (i === STAGES - 1) {
        d.image('icon.skull', x - 4, y - 2, { alpha: cur || done ? 1 : 0.55 });
        continue;
      }
      d.rect(x - 2, y, 5, 5, '#1e1526');
      d.rect(x - 1, y + 1, 3, 3, done ? '#a8e070' : cur ? '#ffd03c' : '#4a3a48');
    }
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
    const age = ageDef(s.armyAge);

    // Troop slots: bought once, kept forever. Each Age fills them with its own troops.
    let y = this.section(y0, 'ARMY SLOTS');
    const cw = 54;
    const gap = Math.max(4, Math.min(10, Math.floor((w - 16 - 3 * cw) / 2)));
    const x0 = Math.round((w - (3 * cw + 2 * gap)) / 2);
    age.troops.forEach((t, i) => {
      const x = x0 + i * (cw + gap);
      d.nine('ui.panel_wood', x, y, cw, 66);
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
        d.image('icon.food', rx - 1, y + 47);
        d.text(String(t.cost), rx + 11, y + 48);
      } else {
        const ok = canUnlockSlot(s, slot!);
        const needsRanged = slot === 'tank' && !hasSlot(s, 'ranged');
        if (needsRanged) d.text('RANGED FIRST', x + cw / 2, y + 52, { align: 'center', color: '#e8dcc8' });
        else
          button(app, 'slot-' + slot, x + 4, y + 46, cw - 8, 16, String(slotCost(slot!)), () => {
            if (unlockSlot(s, slot!)) {
              app.persist();
              app.sfx('unlock', { jitter: 0 });
              this.say(`${t.name.toUpperCase()} JOINS YOUR ARMY!`);
            }
          }, { style: ok ? 'gold' : 'grey', disabled: !ok, icon: 'gold', font: 'small' });
      }
    });
    y += 70;

    // Age Camp: five tracks, reset when you Evolve.
    y = this.section(y, `${age.name.toUpperCase()} CAMP`);
    const rowH = 21;
    const rw = Math.min(w - 16, 3 * cw + 2 * gap);
    const rx = Math.round((w - rw) / 2);
    const max = maxLevel(s);
    CAMP_IDS.forEach((id: CampId, i) => {
      const tr = BALANCE.camp.tracks[id];
      const ry = y + i * (rowH + 2);
      const open = trackOpen(s, id);
      const lv = level(s, id);
      d.nine('ui.panel', rx, ry, rw, rowH, open ? 1 : 0.6);
      const troop = id === 'melee' || id === 'ranged' || id === 'tank' ? age.troops.find((t) => t.kind === id) : null;
      const icon = 'icon.' + tr.icon;
      const ie = app.assets.image(icon);
      d.image(icon, Math.round(rx + 10 - ie.w / 2), Math.round(ry + rowH / 2 - ie.h / 2 - 1), { alpha: open ? 1 : 0.45 });
      const name = troop ? troop.name.toUpperCase() : tr.name.toUpperCase();
      d.text(name, rx + 20, ry + 4, { color: open ? '#fff8ec' : '#b8a8b0' });
      // Level pips.
      const pipW = Math.max(2, Math.min(4, Math.floor(56 / max) - 1));
      for (let k = 0; k < max; k++) d.rect(rx + 20 + k * (pipW + 1), ry + 13, pipW, 3, k < lv ? '#ffd03c' : '#3a2a30', open ? 1 : 0.5);
      d.text(upgradeValue(id, lv), rx + rw - 48, ry + 4, { align: 'right', color: '#a8e070' });
      const c = upgradeCost(s, id);
      const bx = rx + rw - 44;
      if (!open) d.text('LOCKED', bx + 21, ry + 8, { align: 'center', color: '#b8a8b0' });
      else if (c === null) d.text('MAX', bx + 21, ry + 8, { align: 'center', color: '#ffe68a' });
      else {
        const ok = canBuy(s, id);
        button(app, 'camp-' + id, bx, ry + 2, 42, rowH - 4, fmt(c), () => {
          if (buyUpgrade(s, id)) {
            app.persist();
            app.sfx('upgrade', { jitter: 0.02 });
            this.say(`${name} ${upgradeValue(id, level(s, id))}`);
          }
        }, { style: ok ? 'green' : 'grey', disabled: !ok, icon: 'gold', font: 'small' });
      }
    });
    y += CAMP_IDS.length * (rowH + 2) + 2;
    if (y + 8 < app.h - TAB_H - 4) d.text('CAMP RESETS ON EVOLVE. SLOTS STAY.', w / 2, y, { align: 'center', color: '#e8dcc8' });
    y += 12;

    // Evolution, once the boss is down.
    if (canEvolve(s) && y + 26 < app.h - TAB_H - 4) {
      button(app, 'evolve', Math.round(w / 2 - 60), y, 120, 24, `EVOLVE: ${ageDef(s.armyAge + 1).name.toUpperCase()}`, () => this.doEvolve(), { style: 'gold', font: 'small' });
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
      if (!tabRevealed(app, t)) return;
      const fresh = !app.save.seen.includes('tab_' + t) && t !== 'battle';
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
      // Badges: NEW on a freshly revealed tab, else what you can afford.
      const count = t === 'upgrades' ? affordableCount(app.save) + (canEvolve(app.save) ? 1 : 0) : 0;
      if (!sel && (fresh || count > 0)) {
        const label = fresh ? 'NEW' : String(count);
        const bwid = d.measure(label) + 6;
        const bx = x + bw - bwid - 2;
        const by = y + 2 + (fresh && Math.sin(app.time * 6) > 0 ? -1 : 0);
        d.rect(bx, by, bwid, 9, '#1e1526');
        d.rect(bx + 1, by + 1, bwid - 2, 7, '#e0383a');
        d.text(label, bx + bwid / 2, by + 2, { align: 'center', color: '#fff8ec' });
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
