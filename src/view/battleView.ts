/**
 * Draws the battle world from the sim state and turns sim events into feedback:
 * attack timing, flashes, knockback, sparks, damage numbers, deaths, base damage.
 * Reads the sim; never changes it.
 */
import type { App } from '../app';
import type { BattleState, SimEvent, Unit } from '../sim/types';
import { BASE_TARGET } from '../sim/types';
import { EnvView } from './environment';
import { FxSystem, Shake } from './fx';

export interface BattleLayout {
  groundY: number;
  /** Screen x of each fortress's lane-facing front. */
  laneL: number;
  laneR: number;
}

const WINDUP_FRACTION = 0.4;
const MAX_WINDUP_TICKS = 8;

interface VUnit {
  id: number;
  side: 0 | 1;
  sheet: string;
  troop: string;
  kind: string;
  anim: string;
  animT: number;
  windup: number;
  flash: number;
  knock: number;
  hitT: number;
  hpShow: number;
  hp: number;
  maxHp: number;
  depth: number;
  top: number;
  px: number;
  dying: boolean;
  deathT: number;
  poofed: boolean;
  stepT: number;
  status: number;
  statusColor: string;
}

interface VProj {
  id: number;
  side: 0 | 1;
  key: string;
  sx: number;
  sy: number;
  ty: number;
  t: number;
}

interface VBase {
  side: 0 | 1;
  state: number;
  shakeT: number;
  flashT: number;
  smokeT: number;
  destroyed: boolean;
}

export interface ViewHooks {
  onCoin?(x: number, y: number, amount: number): void;
  onImpact?(heavy: boolean, kill: boolean): void;
  onBaseHit?(side: 0 | 1): void;
}

export class BattleView {
  readonly env: EnvView;
  readonly fx: FxSystem;
  readonly shake = new Shake();
  private units = new Map<number, VUnit>();
  private projs = new Map<number, VProj>();
  readonly bases: [VBase, VBase] = [
    { side: 0, state: 0, shakeT: 0, flashT: 0, smokeT: 0, destroyed: false },
    { side: 1, state: 0, shakeT: 0, flashT: 0, smokeT: 0, destroyed: false },
  ];
  private t = 0;

  constructor(
    private app: App,
    private sim: BattleState,
    public layout: BattleLayout,
    private ageKey: string,
    private hooks: ViewHooks = {},
  ) {
    this.env = new EnvView(app, ageKey);
    this.fx = new FxSystem((k) => app.assets.strip(k).frames);
    this.shake.enabled = !app.reducedMotion;
  }

  laneToPx(x: number): number {
    const { laneL, laneR } = this.layout;
    return laneL + (x / this.sim.config.laneLength) * (laneR - laneL);
  }

  private unitScreen(u: Unit, alpha: number): number {
    return this.laneToPx(u.prevX + (u.x - u.prevX) * alpha);
  }

  /** Sprite sheet for a unit; falls back to the Stone troop of the same role until an Age has art. */
  private sheetFor(u: Unit): string {
    const team = u.side === 0 ? 'blue' : 'red';
    const key = `troop.${u.def.id}.${team}`;
    if (this.app.assets.has(key)) return key;
    const fallback = { melee: 'stone_clubber', ranged: 'stone_slinger', tank: 'stone_brute' }[u.def.kind];
    return `troop.${fallback}.${team}`;
  }

  private baseAge(): string {
    return this.app.assets.has(`base.${this.ageKey}.blue.0`) ? this.ageKey : 'stone';
  }

  private vunit(u: Unit): VUnit {
    let v = this.units.get(u.id);
    if (!v) {
      const sheet = this.sheetFor(u);
      const meta = this.app.assets.meta(`troop.${sheet.split('.')[1]}`);
      v = {
        id: u.id, side: u.side, sheet, troop: u.def.id, kind: u.def.kind, anim: 'walk', animT: Math.random(), windup: 0.4, flash: 0, knock: 0, hitT: 0, hpShow: 0,
        hp: u.hp, maxHp: u.maxHp, depth: u.depth, top: Number(meta.top ?? -26), px: this.laneToPx(u.x), dying: false, deathT: 0, poofed: false, stepT: 0, status: 0, statusColor: '#ffffff',
      };
      this.units.set(u.id, v);
    }
    return v;
  }

  /** Feed one tick's events. */
  onEvents(events: readonly SimEvent[]): void {
    const s = this.sim;
    const G = this.layout.groundY;
    for (const e of events) {
      switch (e.type) {
        case 'spawn': {
          const u = s.units.find((q) => q.id === e.id);
          if (!u) break;
          const v = this.vunit(u);
          this.fx.add('fx.dust', v.px, G + v.depth, { behind: true });
          if (e.side === 0) this.app.sfx('deploy', { vol: 0.7 });
          break;
        }
        case 'swing': {
          const u = s.units.find((q) => q.id === e.id);
          if (!u) break;
          const v = this.vunit(u);
          v.anim = 'attack';
          v.animT = 0;
          const ticks = Math.min(MAX_WINDUP_TICKS, Math.max(1, Math.round(u.def.interval * s.config.tickRate * WINDUP_FRACTION)));
          v.windup = ticks / s.config.tickRate;
          if (u.def.kind !== 'ranged') this.app.sfx(u.def.kind === 'tank' ? 'swing_heavy' : 'swing', { vol: 0.35, minGapMs: 60 });
          break;
        }
        case 'shoot': {
          const u = s.units.find((q) => q.id === e.id);
          if (!u) break;
          const v = this.vunit(u);
          const sheet = this.app.assets.sheet(v.sheet);
          const m = sheet.muzzle ?? [6, -20];
          const dir = u.side === 0 ? 1 : -1;
          const p = s.projectiles.find((q) => q.id === e.projectile);
          const targetIsBase = p?.target === BASE_TARGET;
          this.projs.set(e.projectile, { id: e.projectile, side: u.side, key: 'proj.stone', sx: v.px + m[0] * dir, sy: G + v.depth + m[1], ty: targetIsBase ? G - 30 : G - 12, t: 0 });
          this.app.sfx('sling', { vol: 0.4, minGapMs: 50 });
          break;
        }
        case 'hit': {
          const v = this.units.get(e.target);
          if (!v) break;
          v.flash = 0.09;
          v.knock = 0.12;
          v.hpShow = 2.5;
          if (v.anim !== 'attack') v.hitT = 0.12;
          const dir = v.side === 0 ? -1 : 1;
          const hx = v.px + dir * 3;
          const hy = G + v.depth + Math.round(v.top * 0.45);
          this.fx.add('fx.spark', hx + (Math.random() * 4 - 2), hy + (Math.random() * 4 - 2));
          if (e.heavy) {
            this.fx.add('fx.ring', v.px, G + v.depth - 2);
            this.shake.add(2, 0.18);
            this.hooks.onImpact?.(true, false);
          }
          if (e.side === 1) this.fx.text(String(Math.round(e.dmg)), v.px + (Math.random() * 6 - 3), G + v.depth + v.top - 4, { color: e.heavy ? '#ffd03c' : '#fff8ec' });
          this.app.sfx(e.heavy ? 'hit_heavy' : e.ranged ? 'hit_ranged' : 'hit', { vol: e.heavy ? 0.8 : 0.5, minGapMs: 40 });
          break;
        }
        case 'dot': {
          const v = this.units.get(e.target);
          if (v) v.status = 0.3;
          break;
        }
        case 'status': {
          const v = this.units.get(e.target);
          if (v) {
            v.status = 0.6;
            v.statusColor = e.kind === 'poison' ? '#8fe05a' : e.kind === 'burn' ? '#ff9a3a' : '#9fdcff';
          }
          break;
        }
        case 'death': {
          const v = this.units.get(e.id);
          if (!v) break;
          v.dying = true;
          v.deathT = 0;
          v.anim = 'death';
          v.hpShow = 0;
          this.hooks.onImpact?.(e.tank, true);
          if (e.tank) this.shake.add(3, 0.25);
          this.app.sfx(e.side === 1 ? 'death' : 'death_ally', { vol: 0.6, minGapMs: 60 });
          break;
        }
        case 'gold': {
          if (e.reason === 'base') break;
          const v = [...this.units.values()].find((q) => q.dying && q.side === 1 && Math.abs(q.px - this.laneToPx(e.x)) < 1.5) ?? null;
          const x = v ? v.px : this.laneToPx(e.x);
          const y = G + (v?.top ?? -24);
          this.fx.text(`+${e.amount}`, x, y - 6, { color: '#ffd03c', font: e.amount >= 5 ? 'big' : 'small', life: 0.9, vy: -22 });
          this.hooks.onCoin?.(x, y, e.amount);
          break;
        }
        case 'baseHit': {
          const b = this.bases[e.side];
          b.shakeT = 0.12;
          b.flashT = 0.06;
          const fx = e.side === 1 ? this.layout.laneR : this.layout.laneL;
          const away = e.side === 1 ? 1 : -1;
          const hy = G - 14 - Math.random() * 30;
          this.fx.add('fx.spark', fx + away * 2, hy);
          for (let i = 0; i < (e.heavy ? 4 : 2); i++) {
            this.fx.add('fx.debris', fx, hy, { vx: away * (20 + Math.random() * 40) - away * 30, vy: -30 - Math.random() * 50, gravity: 260, life: 0.7, fps: 14 });
          }
          this.fx.text(String(Math.round(e.dmg)), fx + away * 10, hy - 6, { color: e.side === 1 ? '#ffd03c' : '#ff8a8a', font: 'big' });
          if (e.heavy) this.shake.add(2, 0.15);
          this.app.sfx('base_hit', { vol: 0.6, minGapMs: 70 });
          this.hooks.onBaseHit?.(e.side);
          break;
        }
        case 'fizzle': {
          const p = this.projs.get(e.projectile);
          if (p) this.fx.add('fx.dust', this.laneToPx(e.x), G);
          this.projs.delete(e.projectile);
          break;
        }
        default:
          break;
      }
    }
    // Projectiles that landed this tick.
    for (const id of [...this.projs.keys()]) if (!s.projectiles.some((p) => p.id === id)) this.projs.delete(id);
  }

  /** Update base damage states from HP. */
  private baseState(side: 0 | 1): number {
    const s = this.sim;
    const hp = side === 0 ? s.playerBaseHp : s.enemyBaseHp;
    const max = side === 0 ? s.config.playerBaseHp : s.config.enemyBaseHp;
    if (this.bases[side].destroyed) return 3;
    const r = hp / max;
    return r > 0.66 ? 0 : r > 0.33 ? 1 : 2;
  }

  destroyBase(side: 0 | 1): void {
    this.bases[side].destroyed = true;
    this.bases[side].state = 3;
  }

  /** Big explosion at a fortress (for the destruction sequence). */
  explodeAt(side: 0 | 1, i: number): void {
    const G = this.layout.groundY;
    const front = side === 1 ? this.layout.laneR : this.layout.laneL;
    const away = side === 1 ? 1 : -1;
    const x = front + away * (6 + ((i * 13) % 34));
    const y = G - 10 - ((i * 23) % 50);
    this.fx.add('fx.boom', x, y);
    for (let k = 0; k < 5; k++) this.fx.add('fx.debris', x, y, { vx: (Math.random() - 0.5) * 140, vy: -60 - Math.random() * 90, gravity: 300, life: 1.1, fps: 16 });
    this.shake.add(i === 0 ? 5 : 3, 0.35);
    this.app.sfx('boom', { vol: 0.9, minGapMs: 90 });
  }

  update(dt: number, alpha: number, animScale = 1): void {
    this.t += dt;
    const adt = dt * animScale;
    const G = this.layout.groundY;
    this.shake.update(dt);
    this.env.update(dt, G);
    this.fx.update(adt, (k) => this.app.assets.strip(k).fps);
    for (const b of this.bases) {
      b.shakeT = Math.max(0, b.shakeT - dt);
      b.flashT = Math.max(0, b.flashT - dt);
      b.state = this.baseState(b.side);
      if (b.state >= 1 && b.state < 3) {
        b.smokeT -= dt;
        if (b.smokeT <= 0) {
          b.smokeT = b.state === 2 ? 0.25 : 0.55;
          const m = this.app.assets.meta(`base.${this.baseAge()}`);
          const e = this.app.assets.image(`base.${this.baseAge()}.blue.0`);
          const sx = Number(m.smokeX ?? 26) - (e.anchor?.[0] ?? 0);
          const x = b.side === 0 ? this.layout.laneL + sx : this.layout.laneR - sx;
          this.fx.add('fx.smoke', x + (Math.random() * 10 - 5), G - (e.anchor?.[1] ?? 0) + Number(m.smokeY ?? 30), { fps: 6, vx: 4, behind: true, alpha: 0.85 });
        }
      }
    }
    const alive = new Set<number>();
    for (const u of this.sim.units) {
      const v = this.vunit(u);
      alive.add(u.id);
      if (!v.dying) {
        v.px = this.unitScreen(u, alpha);
        v.hp = u.hp;
      }
      this.animate(v, u, adt);
    }
    // Corpses the sim already removed keep animating until their poof.
    for (const v of this.units.values()) {
      if (!alive.has(v.id)) {
        if (!v.dying) {
          this.units.delete(v.id);
          continue;
        }
        this.animate(v, null, adt);
      }
      if (v.dying && v.deathT > 0.95) this.units.delete(v.id);
    }
    for (const p of this.projs.values()) p.t += adt;
    void G;
  }

  private animate(v: VUnit, u: Unit | null, dt: number): void {
    v.flash = Math.max(0, v.flash - dt);
    v.knock = Math.max(0, v.knock - dt);
    v.hitT = Math.max(0, v.hitT - dt);
    v.hpShow = Math.max(0, v.hpShow - dt);
    v.status = Math.max(0, v.status - dt);
    v.animT += dt;
    if (v.dying) {
      v.deathT += dt;
      if (!v.poofed && v.deathT > 0.75) {
        v.poofed = true;
        this.fx.add('fx.poof', v.px, this.layout.groundY + v.depth);
      }
      return;
    }
    if (v.anim === 'attack') {
      const sheet = this.app.assets.sheet(v.sheet).anims.attack;
      if (this.attackFrame(v, sheet.hitFrame ?? 3) < sheet.frames) return;
    }
    const walking = u?.walking ?? false;
    const next = walking ? 'walk' : 'idle';
    if (v.anim !== next) {
      v.anim = next;
      v.animT = 0;
    }
    if (walking && v.kind === 'tank') {
      v.stepT -= dt;
      if (v.stepT <= 0) {
        v.stepT = 0.5;
        this.fx.add('fx.dust', v.px - (v.side === 0 ? 6 : -6), this.layout.groundY + v.depth, { behind: true, alpha: 0.7 });
      }
    }
  }

  private attackFrame(v: VUnit, hitFrame: number): number {
    if (v.animT < v.windup) return Math.floor((v.animT / v.windup) * hitFrame);
    return hitFrame + Math.floor((v.animT - v.windup) * 12);
  }

  private frameIndex(v: VUnit): [string, number] {
    const sheet = this.app.assets.sheet(v.sheet);
    if (v.dying) return ['death', Math.min(sheet.anims.death.frames - 1, Math.floor(v.deathT * 10))];
    if (v.hitT > 0 && v.anim !== 'attack') return ['hit', 0];
    const a = sheet.anims[v.anim];
    if (v.anim === 'attack') return ['attack', Math.min(a.frames - 1, this.attackFrame(v, a.hitFrame ?? 3))];
    const speedMul = v.anim === 'walk' ? 1 : 1;
    return [v.anim, Math.floor(v.animT * a.fps * speedMul) % a.frames];
  }

  draw(): void {
    const d = this.app.draw;
    const [sx, sy] = this.shake.offset(this.t);
    const G = this.layout.groundY;
    this.env.draw(G, sx, sy);
    this.drawBase(0, sx, sy);
    this.drawBase(1, sx, sy);
    this.fx.drawBack(d, sx, sy);

    // Shadows first, then units sorted by depth.
    const list = [...this.units.values()].sort((a, b) => a.depth - b.depth || a.id - b.id);
    for (const v of list) {
      const w = v.kind === 'tank' ? 9 : 6;
      d.rect(v.px - w + sx, G + v.depth + sy, w * 2, 1, '#1e1526', v.dying ? 0.15 : 0.28);
      d.rect(v.px - w + 1 + sx, G + v.depth + 1 + sy, w * 2 - 2, 1, '#1e1526', v.dying ? 0.08 : 0.16);
    }
    for (const v of list) {
      const [anim, idx] = this.frameIndex(v);
      const knockDir = v.side === 0 ? -1 : 1;
      const kx = v.knock > 0 ? knockDir * (v.knock > 0.06 ? 2 : 1) : 0;
      const x = Math.round(v.px + kx + sx);
      const y = G + v.depth + sy;
      let alpha = 1;
      if (v.dying && v.deathT > 0.5) alpha = Math.floor(v.deathT * 20) % 2 ? 0.35 : 0.9;
      if (v.dying && v.deathT > 0.75) alpha = 0;
      d.frame(v.sheet, anim, idx, x, y, { flip: v.side === 1, alpha });
      if (v.flash > 0) d.frame(v.sheet, anim, idx, x, y, { flip: v.side === 1, white: true, alpha: 0.85 });
      if (v.status > 0 && !v.dying) d.frame(v.sheet, anim, idx, x, y, { flip: v.side === 1, white: true, alpha: 0 });
      // HP bar when hurt.
      if (v.hpShow > 0 && !v.dying && v.hp < v.maxHp) {
        const bw = v.kind === 'tank' ? 16 : 12;
        const bx = Math.round(v.px - bw / 2 + sx);
        const by = y + v.top - 4;
        d.rect(bx - 1, by - 1, bw + 2, 4, '#1e1526', 0.9);
        d.rect(bx, by, bw, 2, '#4a2a33');
        const fill = Math.max(1, Math.round((v.hp / v.maxHp) * bw));
        d.rect(bx, by, fill, 2, v.side === 0 ? '#6fd36a' : '#ff5a4f');
        d.rect(bx, by, fill, 1, v.side === 0 ? '#b6f08a' : '#ff9a7a');
      }
      if (v.status > 0 && !v.dying) {
        for (let i = 0; i < 2; i++) d.rect(v.px + sx - 4 + ((this.t * 37 + i * 5) % 9), y + v.top + 6 + ((this.t * 23 + i * 7) % 10), 1, 1, v.statusColor);
      }
    }
    // Projectiles on a shallow arc.
    for (const p of this.projs.values()) {
      const sp = this.sim.projectiles.find((q) => q.id === p.id);
      if (!sp) continue;
      const cur = this.laneToPx(sp.x);
      const tgt = this.laneToPx(sp.targetX);
      const total = Math.max(1, Math.abs(tgt - p.sx));
      const prog = Math.min(1, Math.abs(cur - p.sx) / total);
      const arc = Math.min(16, total * 0.22);
      const y = p.sy + (p.ty - p.sy) * prog - Math.sin(prog * Math.PI) * arc;
      d.strip(p.key, Math.floor(p.t * 12), cur + sx, y + sy);
    }
    this.fx.drawFront(d, sx, sy);
  }

  private drawBase(side: 0 | 1, sx: number, sy: number): void {
    const d = this.app.draw;
    const b = this.bases[side];
    const G = this.layout.groundY;
    const team = side === 0 ? 'blue' : 'red';
    const age = this.baseAge();
    const key = `base.${age}.${team}.${b.state}`;
    const jitter = b.shakeT > 0 ? (Math.floor(this.t * 60) % 2 ? 1 : -1) : 0;
    const x = (side === 0 ? this.layout.laneL : this.layout.laneR) + jitter + sx;
    const y = G + sy;
    d.image(key, x, y, { flip: side === 1 });
    if (b.flashT > 0) d.image(key, x, y, { flip: side === 1, white: true, alpha: 0.55 });
    if (b.state >= 2) return;
    // Flag on the tower and the wall torch.
    const e = this.app.assets.image(key);
    const m = this.app.assets.meta(`base.${age}`);
    const ax = e.anchor?.[0] ?? 0;
    const ay = e.anchor?.[1] ?? 0;
    const flip = side === 1;
    const fx = Number(m.flagX) - ax;
    const fy = Number(m.flagY) - ay;
    const flagX = flip ? x - fx : x + fx;
    d.rect(flagX, y + fy - 1, 1, 9, '#52291b');
    d.strip(`fx.flag.${team}`, Math.floor(this.t * 8 + side * 2), flagX + (flip ? 0 : 1), y + fy, { flip });
    const tx = Number(m.torchX) - ax;
    const ty = Number(m.torchY) - ay;
    d.strip('fx.flame', Math.floor(this.t * 10 + side), flip ? x - tx : x + tx, y + ty, { flip });
  }

  /** Screen y of the top of a fortress (for HP bars). */
  baseTop(): number {
    const e = this.app.assets.image(`base.${this.baseAge()}.blue.0`);
    return this.layout.groundY - (e.anchor?.[1] ?? 80);
  }
}
