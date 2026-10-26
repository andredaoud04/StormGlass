/** Layered Age battlefield background with ambient life (clouds, volcano smoke). */
import type { App } from '../app';
import { FxSystem } from './fx';

interface Cloud {
  i: number;
  x: number;
  y: number;
  speed: number;
}

export const ENV_W = 256;

export class EnvView {
  private clouds: Cloud[] = [];
  private smoke: FxSystem;
  private smokeTimer = 0;
  readonly age: string;

  constructor(
    private app: App,
    age = 'stone',
  ) {
    this.age = app.assets.has(`env.${age}.sky`) ? age : 'stone';
    const n = Number(app.assets.meta(`env.${this.age}`).clouds ?? 0);
    const seeds = [
      [20, 40, 2.2],
      [150, 70, 3.1],
      [90, 18, 1.6],
      [210, 95, 2.6],
    ];
    for (let i = 0; i < n; i++) {
      const s = seeds[i % seeds.length];
      this.clouds.push({ i, x: s[0], y: s[1], speed: s[2] });
    }
    this.smoke = new FxSystem((k) => app.assets.strip(k).frames);
  }

  /** Left edge of the 256-wide art relative to the screen. */
  get offsetX(): number {
    return Math.floor((this.app.w - ENV_W) / 2);
  }

  update(dt: number, groundY: number): void {
    for (const c of this.clouds) {
      c.x += c.speed * dt;
      if (c.x > ENV_W + 10) c.x = -70;
    }
    const meta = this.app.assets.meta(`env.${this.age}`);
    if (meta.volcanoX !== undefined) {
      this.smokeTimer -= dt;
      if (this.smokeTimer <= 0) {
        this.smokeTimer = 0.9;
        const far = this.app.assets.image(`env.${this.age}.far`);
        const vx = this.offsetX + Number(meta.volcanoX);
        const vy = groundY - (far.anchor?.[1] ?? 0) + 50;
        this.smoke.add('fx.smoke', vx, vy, { fps: 3, vx: 3, vy: -3, alpha: 0.75 });
      }
    }
    this.smoke.update(dt, (k) => this.app.assets.strip(k).fps);
  }

  /** Draw from the top of the screen down to `bottom`, with the ground line at groundY. */
  draw(groundY: number, ox = 0, oy = 0): void {
    const d = this.app.draw;
    const meta = this.app.assets.meta(`env.${this.age}`);
    const x0 = this.offsetX + ox;
    const sky = this.app.assets.image(`env.${this.age}.sky`);
    const skyTop = groundY - (sky.anchor?.[1] ?? 0) + oy;
    if (skyTop > 0) d.rect(0, 0, this.app.w, skyTop + 1, String(meta.skyTop ?? '#2f6cc4'));
    d.image(`env.${this.age}.sky`, x0, groundY + oy);
    for (const c of this.clouds) {
      const y = skyTop + c.y;
      d.image(`env.${this.age}.cloud${c.i}`, x0 + Math.round(c.x), y);
    }
    d.image(`env.${this.age}.far`, x0, groundY + oy);
    this.smoke.drawFront(d, ox, oy);
    d.image(`env.${this.age}.mid`, x0, groundY + oy);
    d.image(`env.${this.age}.ground`, x0, groundY + oy);
  }
}
