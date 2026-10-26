/**
 * Vehicle-style tanks (Cannon, Steam Walker, Mech). Each frame is assembled from parts that are
 * outlined one by one, like the humanoid rig, so the style matches.
 */
import { Img, hex, mix, withAlpha, type Color } from '../img';
import { BRONZE, FIRE, INK, STEEL, WHITE, WOOD, type Ramp } from '../palette';
import { buildFrame, rotateFrame, type AnimSpec } from '../rig';
import { musketeerRig } from './gunpowder';

interface Part {
  img: Img;
  x: number;
  y: number;
  /** Skip the outline (glows, flashes). */
  raw?: boolean;
}

function compose(w: number, h: number, parts: Part[]): Img {
  const f = new Img(w, h);
  for (const p of parts) {
    if (p.raw) f.blit(p.img, Math.round(p.x), Math.round(p.y));
    else f.blit(p.img.outlined(INK), Math.round(p.x) - 1, Math.round(p.y) - 1);
  }
  return f;
}

/** Spoked wheel; `phase` rotates the spokes. */
function wheel(r: number, phase: number, rim = WOOD, hub = STEEL): Img {
  const d = r * 2 + 1;
  const img = new Img(d, d);
  const c = r + 0.5;
  img.ellipse(c, c, r + 0.5, r + 0.5, (_x, _y, nx, ny) => {
    const dist = Math.hypot(nx, ny);
    if (dist > 0.72) return nx + ny < -0.3 ? rim.hl : nx + ny > 0.5 ? rim.deep : rim.shade;
    return 0;
  });
  for (let k = 0; k < 4; k++) {
    const a = phase + (k * Math.PI) / 4;
    img.line(c - 0.5 + Math.cos(a) * (r - 1.5), c - 0.5 + Math.sin(a) * (r - 1.5), c - 0.5 - Math.cos(a) * (r - 1.5), c - 0.5 - Math.sin(a) * (r - 1.5), rim.base);
  }
  img.ellipse(c, c, 2, 2, (_x, _y, nx, ny) => (nx + ny < 0 ? hub.hl : hub.shade));
  return img;
}

function muzzleFlash(size: number, big: boolean): Img {
  const img = new Img(size * 2 + 1, size * 2 + 1);
  const c = size + 0.5;
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
    const dx = x + 0.5 - c;
    const dy = y + 0.5 - c;
    const a = Math.atan2(dy, dx);
    const spikes = (big ? 0.75 : 0.6) + 0.35 * Math.abs(Math.cos(a * 4));
    const d = Math.hypot(dx * 0.8, dy * 1.3) / size;
    if (d < spikes * 0.45) img.set(x, y, WHITE);
    else if (d < spikes * 0.75) img.set(x, y, FIRE.hl);
    else if (d < spikes) img.set(x, y, FIRE.base);
  }
  return img;
}

function smokePuff(r: number): Img {
  const img = new Img(r * 2 + 2, r * 2 + 2);
  img.ellipse(r + 1, r + 1, r, r, (_x, _y, nx, ny) => withAlpha(ny > 0.3 ? hex('#8e86a0') : nx + ny < -0.4 ? hex('#ece8f2') : hex('#c4bed0'), 220));
  return img;
}

function darken(img: Img, t = 0.45): Img {
  return img.clone().map((c) => (c >>> 0 ? mix(c, hex('#2a2030'), t) | 0xff : c) >>> 0);
}

export function cannonAnims(team: Ramp): AnimSpec[] {
  const W = 60, H = 44, GY = 40;
  const gunnerRig = musketeerRig(team);
  const gunner = (pose: Parameters<typeof buildFrame>[1]) => buildFrame(gunnerRig, { frontArm: -40, backArm: -30, ...pose });
  const carriage = (() => {
    const img = new Img(30, 12);
    img.poly([[0, 11], [3, 11], [28, 3], [28, 0], [24, 0]], (x, y) => (y < 4 ? WOOD.hl : (x + y) % 6 === 0 ? WOOD.shade : WOOD.base));
    img.rect(20, 0, 9, 5, WOOD.base);
    img.hline(20, 28, 0, WOOD.hl);
    img.rect(22, 1, 2, 2, STEEL.base);
    return img;
  })();
  const barrel = (() => {
    const img = new Img(26, 7);
    for (let x = 0; x < 26; x++) {
      const th = x < 6 ? 6 : x > 22 ? 6 : 5 - Math.floor(x / 14);
      const top = Math.round((7 - th) / 2);
      for (let y = top; y < top + th; y++) {
        const t = (y - top) / (th - 1);
        img.set(x, y, t < 0.25 ? BRONZE.hl : t < 0.6 ? BRONZE.base : t < 0.85 ? BRONZE.shade : BRONZE.deep);
      }
    }
    img.rect(0, 1, 3, 5, BRONZE.shade);
    img.vline(10, 1, 5, BRONZE.deep);
    img.vline(23, 0, 6, BRONZE.deep);
    img.set(25, 3, hex('#2a1a1a'));
    return img;
  })();
  // A small team pennant on the carriage.
  const pennant = (() => {
    const img = new Img(7, 11);
    img.vline(0, 0, 10, WOOD.deep);
    img.rect(1, 0, 5, 4, team.base);
    img.hline(1, 5, 0, team.hl);
    img.set(5, 3, 0);
    return img;
  })();
  const frame = (o: { recoil?: number; spin?: number; bob?: number; gunnerPose?: Parameters<typeof buildFrame>[1]; flash?: number; smoke?: number; hurt?: boolean }) => {
    const bob = o.bob ?? 0;
    const rc = o.recoil ?? 0;
    const gp = gunner({ ...(o.gunnerPose ?? {}), headVariant: o.hurt ? 'hurt' : 'normal' });
    const parts: Part[] = [
      { img: gp, x: -8 - rc * 0.3, y: GY - 34, raw: true },
      { img: pennant, x: 10 - rc, y: GY - 21 + bob },
      { img: carriage, x: 8 - rc, y: GY - 14 + bob },
      { img: barrel, x: 24 - rc, y: GY - 21 + bob },
      { img: wheel(8, o.spin ?? 0), x: 27 - rc, y: GY - 17 },
    ];
    if (o.flash) parts.push({ img: muzzleFlash(o.flash, o.flash > 6), x: 50 - rc - o.flash, y: GY - 18 - o.flash + bob, raw: true });
    if (o.smoke) parts.push({ img: smokePuff(o.smoke), x: 46 - rc, y: GY - 24 - o.smoke + bob, raw: true });
    return compose(W, H, parts);
  };
  const spin = (i: number) => (i * Math.PI) / 8;
  const idle = [0, 0, 1, 1].map((b, i) => frame({ bob: 0, gunnerPose: { body: [0, b] }, spin: 0 + i * 0 }));
  const walk = [0, 1, 2, 3].map((i) => frame({ spin: spin(i), bob: i % 2 ? -1 : 0, gunnerPose: { frontLeg: i % 2 ? [-2, 0] : [2, 0], backLeg: i % 2 ? [2, 0] : [-2, 0], body: [0, i % 2 ? -1 : 0] } }));
  const attack = [
    frame({ gunnerPose: { frontArm: -100, body: [1, 0] } }),
    frame({ gunnerPose: { frontArm: -110, body: [1, 1] } }),
    frame({ gunnerPose: { frontArm: -60, body: [-1, 0], head: [-1, 0] } }),
    frame({ recoil: 4, flash: 8, gunnerPose: { body: [-2, 0], head: [-1, 0] } }),
    frame({ recoil: 3, flash: 4, smoke: 5, gunnerPose: { body: [-1, 0] } }),
    frame({ recoil: 1, smoke: 7 }),
  ];
  const hit = [frame({ recoil: 2, hurt: true, gunnerPose: { body: [-2, 0] } })];
  const wreck = darken(frame({ hurt: true }));
  const death = [
    frame({ recoil: 3, hurt: true, smoke: 4 }),
    rotateFrame(wreck, -8, 30, GY),
    rotateFrame(wreck, -14, 30, GY + 1),
    compose(W, H, [{ img: rotateFrame(wreck, -16, 30, GY + 2), x: 0, y: 0, raw: true }, { img: smokePuff(6), x: 26, y: GY - 26, raw: true }]),
  ];
  return [
    { name: 'idle', frames: idle, fps: 4, loop: true },
    { name: 'walk', frames: walk, fps: 8, loop: true },
    { name: 'attack', frames: attack, fps: 10, loop: false, hitFrame: 3 },
    { name: 'hit', frames: hit, fps: 8, loop: false },
    { name: 'death', frames: death, fps: 8, loop: false },
  ];
}

export const CANNON_FRAME = { w: 60, h: 44, anchor: [30, 40] as [number, number] };

export { compose, wheel, muzzleFlash, smokePuff, darken, type Part };
export type { Color };
