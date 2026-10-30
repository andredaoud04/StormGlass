/** Gunpowder Age fortress: battered bastion wall on a glacis, sentry turret, slate-roofed barracks. */
import { Img, bayer, hex } from '../img';
import { BRONZE, INK, IRON, MOSS, WOOD, type Ramp } from '../palette';
import { rand } from '../env/paint';
import { BASE_GROUND, BASE_H, BASE_W } from './stone';
import { ashlar, jagged } from './crusader';

const FORT = { hl: hex('#d8d2c2'), base: hex('#a8a090'), shade: hex('#7c7568'), deep: hex('#575148'), dark: hex('#332c30') };
const PLASTER = { hl: hex('#f4ead2'), base: hex('#ddcfae'), shade: hex('#b4a484'), deep: hex('#86765c'), dark: hex('#3a2d2e') };
const SLATE = { hl: hex('#8a92a8'), base: hex('#646c84'), shade: hex('#4a5068'), deep: hex('#333850') };

function hole(img: Img, x: number, y: number): void {
  img.ellipse(x, y, 2.5, 2, FORT.dark);
  img.set(x - 1, y - 1, FORT.deep);
  img.set(x + 2, y + 2, FORT.deep);
}

export function gunpowderFortress(team: Ramp, damage: 0 | 1 | 2 | 3): Img {
  const r = rand(1648 + damage);
  const img = new Img(BASE_W - 2, BASE_H - 2);
  const G = BASE_GROUND - 1;

  // Grass glacis sloping up to the wall foot.
  img.poly([[-2, G + 5], [-2, G - 6], [52, G - 6], [66, G + 5]], (x, y) => (y < G - 4 ? MOSS.hl : x > 54 ? MOSS.deep : bayer(x, y) < 0.2 ? MOSS.shade : MOSS.base));

  if (damage === 3) {
    for (let i = 0; i < 15; i++) {
      const x = 1 + Math.floor(r() * 52);
      const y = G - 9 - Math.floor(r() * 8);
      ashlar(img, x, y, x + 5, y + 3, FORT, 6, 4);
    }
    ashlar(img, 6, G - 20, 16, G - 7, FORT);
    jagged(img, 6, 16, G - 20, 6, r);
    // A dismounted gun barrel and a scorched beam.
    img.rect(28, G - 10, 14, 3, IRON.base);
    img.hline(28, 41, G - 10, IRON.hl);
    img.rect(26, G - 11, 3, 5, IRON.shade);
    img.line(40, G - 7, 54, G - 13, WOOD.deep);
    return img.outlined(INK);
  }

  // Barracks behind the wall: plaster and timber under a slate roof.
  const bl = 6, br = 34;
  const roofY = damage === 2 ? 30 : 24;
  for (let y = roofY; y < G - 6; y++) for (let x = bl; x <= br; x++) {
    let c = x === bl ? PLASTER.hl : x === br ? PLASTER.shade : PLASTER.base;
    if (x % 7 === 0 || y % 9 === 0) c = WOOD.shade; // timber framing
    img.set(x, y, c);
  }
  for (const wx of [10, 19, 28]) {
    img.rect(wx, roofY + 6, 3, 4, PLASTER.dark);
    img.set(wx, roofY + 6, SLATE.hl);
  }
  if (damage < 2) {
    for (let y = roofY - 12; y < roofY; y++) {
      const t = (y - (roofY - 12)) / 11;
      const x0 = Math.round(bl + 6 - t * 8), x1 = Math.round(br - 6 + t * 8);
      for (let x = x0; x <= x1; x++) {
        let c = (y + (x >> 1)) % 3 === 0 ? SLATE.shade : x < (x0 + x1) / 2 ? SLATE.hl : SLATE.base;
        if (y === roofY - 1) c = SLATE.deep;
        img.set(x, y, c);
      }
    }
    // Chimney.
    img.rect(13, roofY - 16, 3, 6, FORT.base);
    img.set(13, roofY - 16, FORT.hl);
    if (damage === 1) {
      img.ellipse(26, roofY - 6, 2.5, 2, INK);
      img.set(24, roofY - 4, SLATE.deep);
    }
  } else jagged(img, bl, br, roofY, 5, r);

  // Battered (sloped) bastion wall with a rounded cordon.
  const wallTop = 48;
  for (let y = wallTop; y < G - 4; y++) {
    const right = 54 + Math.round(((y - wallTop) / (G - 4 - wallTop)) * 5);
    for (let x = 0; x <= right; x++) {
      const row = Math.floor((y - wallTop) / 5);
      const bx = (x + (row % 2 ? 4 : 0)) % 8, by = (y - wallTop) % 5;
      let c = FORT.base;
      if (by === 4 || bx === 7) c = FORT.shade;
      else if (by === 0 || bx === 0) c = FORT.hl;
      if (x >= right - 1) c = FORT.deep;
      img.set(x, y, c);
    }
  }
  // Cordon moulding and parapet with embrasures.
  img.hline(0, 55, wallTop, FORT.hl);
  img.hline(0, 55, wallTop + 1, FORT.shade);
  const parTop = wallTop - 6;
  for (let x = 0; x <= 54; x++) {
    const emb = x % 14 >= 10;
    if (emb && damage === 0) continue;
    const broken = damage >= 1 && (x * 7) % 23 < (damage === 1 ? 4 : 10);
    for (let y = parTop + (broken ? 3 : 0); y < wallTop; y++) img.set(x, y, y === parTop ? FORT.hl : x % 14 === 9 ? FORT.shade : FORT.base);
  }
  // Gun in an embrasure.
  img.rect(24, parTop + 1, 9, 3, IRON.base);
  img.hline(24, 32, parTop + 1, IRON.hl);
  img.rect(32, parTop, 2, 5, IRON.shade);

  // Sentry turret (guerite) on the salient with a team dome.
  const gx = 48;
  const gTop = damage === 2 ? 40 : 34;
  for (let y = gTop; y < wallTop + 4; y++) for (let x = gx; x < gx + 9; x++) img.set(x, y, x === gx ? FORT.hl : x > gx + 6 ? FORT.shade : FORT.base);
  img.rect(gx + 4, gTop + 3, 1, 4, FORT.dark);
  for (let y = wallTop + 4; y < wallTop + 8; y++) {
    const w = 9 - (y - wallTop - 4) * 2;
    for (let i = 0; i < w; i++) img.set(gx + (9 - w) / 2 + i, y, FORT.shade);
  }
  if (damage < 2) {
    img.ellipse(gx + 4.5, gTop, 5, 4.5, (_x, _y, nx, ny) => (ny > 0.2 ? 0 : nx < -0.3 ? team.hl : nx < 0.35 ? team.base : team.shade));
    img.hline(gx - 1, gx + 9, gTop, team.deep);
    img.vline(gx + 4, gTop - 7, gTop - 5, BRONZE.base);
  } else jagged(img, gx, gx + 8, gTop, 4, r);

  // Gate: timber doors with iron straps under an arch.
  const dx = 36;
  img.rect(dx, G - 17, 10, 13, WOOD.base);
  img.poly([[dx, G - 17], [dx + 5, G - 20], [dx + 10, G - 17]], WOOD.base);
  img.vline(dx + 5, G - 19, G - 5, WOOD.deep);
  for (const y of [G - 15, G - 9]) {
    img.hline(dx, dx + 9, y, IRON.base);
    img.set(dx + 2, y, IRON.hl);
    img.set(dx + 7, y, IRON.hl);
  }
  img.set(dx + 4, G - 11, BRONZE.base);
  img.set(dx + 6, G - 11, BRONZE.base);
  // Keystone and team cartouche above the gate.
  img.rect(dx + 2, G - 26, 6, 5, team.base);
  img.hline(dx + 2, dx + 7, G - 26, team.hl);
  img.hline(dx + 2, dx + 7, G - 22, team.deep);
  img.set(dx + 4, G - 24, BRONZE.hl);
  img.set(dx + 5, G - 24, BRONZE.base);

  // Team drapes hung from the cordon, with a gold stripe.
  for (const bx of [13, 25]) {
    if (damage === 2 && bx === 25) continue;
    for (let y = wallTop + 2; y < wallTop + 15; y++) {
      const w = y > wallTop + 12 ? 6 - (y - (wallTop + 12)) * 2 : 6;
      for (let i = 0; i < w; i++) {
        let c = i === 0 ? team.hl : i === w - 1 ? team.shade : team.base;
        if (y === wallTop + 5) c = BRONZE.base;
        img.set(bx + (6 - w) / 2 + i, y, c);
      }
    }
  }

  // Lantern bracket (flame is an FX sprite).
  img.rect(5, wallTop + 6, 2, 4, IRON.deep);
  img.rect(4, wallTop + 5, 4, 1, IRON.shade);

  if (damage >= 1) {
    for (let i = 0; i < (damage === 1 ? 4 : 9); i++) hole(img, 3 + Math.floor(r() * 48), wallTop + 5 + Math.floor(r() * 24));
    for (let i = 0; i < 36 * damage; i++) {
      const x = Math.floor(r() * 58);
      const y = roofY + Math.floor(r() * (G - roofY));
      if (img.opaque(x, y) && bayer(x, y) < 0.3) img.set(x, y, FORT.deep);
    }
  }
  return img.outlined(INK);
}
