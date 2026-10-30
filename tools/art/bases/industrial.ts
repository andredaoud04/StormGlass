/** Industrial Age fortress: brick works with a sawtooth roof and chimney, steel blast door, sandbags. */
import { Img, bayer, hex } from '../img';
import { BRICK, GOLD, INK, IRON, KHAKI, type Ramp } from '../palette';
import { rand } from '../env/paint';
import { BASE_GROUND, BASE_H, BASE_W } from './stone';
import { jagged } from './crusader';

const CONCRETE = { hl: hex('#d2ccc2'), base: hex('#aaa498'), shade: hex('#837d74'), deep: hex('#5c5750'), dark: hex('#34302e') };
const GLASS = { lit: hex('#ffd98a'), dark: hex('#2e3040'), frame: hex('#4a505e') };

function bricks(img: Img, x0: number, y0: number, x1: number, y1: number): void {
  for (let y = y0; y <= y1; y++) {
    const row = Math.floor((y - y0) / 3);
    for (let x = x0; x <= x1; x++) {
      const bx = (x - x0 + (row % 2 ? 3 : 0)) % 6;
      const by = (y - y0) % 3;
      let c = (x * 5 + row * 3) % 7 === 0 ? BRICK.shade : BRICK.base;
      if (by === 2) c = hex('#7a6a64');
      else if (bx === 5) c = hex('#8a7a72');
      else if (by === 0 && bx < 4) c = BRICK.hl;
      if (x === x1) c = BRICK.deep;
      img.set(x, y, c);
    }
  }
}

function sandbags(img: Img, x0: number, x1: number, y: number, rows: number): void {
  for (let r = 0; r < rows; r++) {
    for (let x = x0 + (r % 2 ? 3 : 0); x + 5 <= x1; x += 6) {
      img.ellipse(x + 3, y - r * 3, 3.2, 1.8, (_x, _y, nx, ny) => (ny < -0.3 ? KHAKI.hl : nx > 0.5 || ny > 0.4 ? KHAKI.shade : KHAKI.base));
    }
  }
}

export function industrialFortress(team: Ramp, damage: 0 | 1 | 2 | 3): Img {
  const r = rand(1916 + damage);
  const img = new Img(BASE_W - 2, BASE_H - 2);
  const G = BASE_GROUND - 1;

  // Concrete footing and cinder ground.
  img.rect(0, G - 4, 62, 4, CONCRETE.base);
  img.hline(0, 61, G - 4, CONCRETE.hl);
  img.hline(0, 61, G - 1, CONCRETE.shade);
  img.ellipse(31, G + 3, 34, 4, (_x, _y, _nx, ny) => (ny < 0 ? hex('#6a5e56') : hex('#4e4440')));

  if (damage === 3) {
    for (let i = 0; i < 18; i++) {
      const x = 1 + Math.floor(r() * 52);
      const y = G - 6 - Math.floor(r() * 8);
      bricks(img, x, y, x + 5, y + 2);
    }
    bricks(img, 8, G - 22, 16, G - 5);
    jagged(img, 8, 16, G - 22, 7, r);
    img.line(20, G - 6, 34, G - 16, IRON.base);
    img.line(21, G - 6, 35, G - 16, IRON.deep);
    img.line(30, G - 5, 46, G - 9, IRON.shade);
    sandbags(img, 46, 60, G - 6, 2);
    return img.outlined(INK);
  }

  // Works hall: brick with a sawtooth roof of iron and glass.
  const hl = 2, hr = 42;
  const top = damage === 2 ? 40 : 34;
  bricks(img, hl, top, hr, G - 5);
  // Tall arched windows.
  for (const wx of [6, 15, 24, 33]) {
    img.rect(wx, top + 6, 5, 9, GLASS.frame);
    img.rect(wx + 1, top + 7, 3, 8, damage >= 1 && wx % 2 ? GLASS.dark : GLASS.lit);
    img.hline(wx + 1, wx + 3, top + 11, GLASS.frame);
    img.hline(wx, wx + 4, top + 5, BRICK.deep);
  }
  if (damage < 2) {
    for (let k = 0; k < 4; k++) {
      const x0 = hl + k * 10;
      img.poly([[x0, top], [x0 + 7, top - 8], [x0 + 10, top - 8], [x0 + 10, top]], (x, y) => (x > x0 + 7 ? GLASS.lit : y < top - 6 ? IRON.hl : (x + y) % 3 === 0 ? IRON.shade : IRON.base));
    }
    if (damage === 1) {
      img.ellipse(28, top - 3, 2.5, 2, INK);
      img.set(26, top - 1, IRON.deep);
    }
  } else jagged(img, hl, hr, top, 5, r);

  // Chimney with iron bands.
  const cx = 9, cTop = damage === 2 ? 24 : damage === 1 ? 6 : 4;
  bricks(img, cx, cTop, cx + 6, top - 1);
  for (let y = cTop + 3; y < top; y += 8) img.hline(cx - 1, cx + 7, y, IRON.base);
  if (damage < 2) {
    img.rect(cx - 1, cTop - 2, 9, 2, IRON.shade);
    img.hline(cx - 1, cx + 7, cTop - 2, IRON.hl);
  } else jagged(img, cx, cx + 6, cTop, 4, r);
  // Flag mast on the roof.
  if (damage < 2) img.rect(31, top - 10, 3, 2, IRON.deep);

  // Front blockhouse: concrete with a riveted steel blast door, sandbags on top.
  const bl = 40, br = 59, bTop = 48;
  for (let y = bTop; y < G - 4; y++) for (let x = bl; x <= br; x++) {
    let c = x === bl ? CONCRETE.hl : x >= br - 1 ? CONCRETE.shade : CONCRETE.base;
    if ((y - bTop) % 8 === 7) c = CONCRETE.shade;
    if (bayer(x, y) < 0.06) c = CONCRETE.deep;
    img.set(x, y, c);
  }
  img.rect(bl + 3, bTop + 4, 12, 2, CONCRETE.dark); // firing slit
  img.hline(bl + 3, bl + 14, bTop + 3, CONCRETE.deep);
  sandbags(img, bl - 1, br + 2, bTop - 1, damage === 2 ? 1 : 2);
  const dx = 44;
  img.rect(dx, G - 18, 11, 14, IRON.base);
  img.vline(dx, G - 18, G - 5, IRON.hl);
  img.vline(dx + 10, G - 18, G - 5, IRON.shade);
  img.hline(dx, dx + 10, G - 18, IRON.hl);
  for (let y = G - 16; y < G - 5; y += 4) for (const x of [dx + 2, dx + 8]) img.set(x, y, IRON.hl);
  // Team stripe across the door and a hazard band.
  img.rect(dx + 1, G - 13, 9, 3, team.base);
  img.hline(dx + 1, dx + 9, G - 13, team.hl);
  img.hline(dx + 1, dx + 9, G - 11, team.shade);
  for (let i = 0; i < 11; i++) img.set(dx + i, G - 19, i % 4 < 2 ? GOLD.base : INK);

  // Team banner hung on the brick.
  for (let y = top + 18; y < top + 32; y++) {
    const w = y > top + 29 ? 6 - (y - (top + 29)) * 2 : 6;
    for (let i = 0; i < w; i++) img.set(19 + (6 - w) / 2 + i, y, i === 0 ? team.hl : i === w - 1 ? team.shade : team.base);
  }
  img.hline(18, 25, top + 17, IRON.shade);

  // Gas lamp bracket (flame is an FX sprite).
  img.rect(4, top + 18, 1, 5, IRON.deep);
  img.rect(3, top + 22, 3, 2, IRON.shade);

  if (damage >= 1) {
    for (let i = 0; i < (damage === 1 ? 5 : 10); i++) {
      const x = 3 + Math.floor(r() * 54), y = top + 4 + Math.floor(r() * (G - top - 10));
      img.ellipse(x, y, 2.5, 1.8, CONCRETE.dark);
      img.set(x - 1, y - 1, BRICK.deep);
    }
    for (let i = 0; i < 40 * damage; i++) {
      const x = Math.floor(r() * 60);
      const y = cTop + Math.floor(r() * (G - cTop));
      if (img.opaque(x, y) && bayer(x, y) < 0.3) img.set(x, y, hex('#2a2226'));
    }
  }
  return img.outlined(INK);
}
