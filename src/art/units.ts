/**
 * Original chibi pixel-art units for every Stormglass troop, hero and boss.
 *
 * Every unit is assembled from one shared body template (big head, compact torso, short
 * legs, top-left light, thick outline) plus era/role parts: headgear, armour, cape,
 * weapon and shield. Faction is a recolour of the accent slot (player blue, enemy
 * red-orange), so both sides share an identical silhouette. Each sheet holds six frames:
 * walk ×4 then attack wind-up and strike. Units face right; the renderer mirrors enemies.
 */
import { PixelCanvas, shade, sheet } from './pixel';

export type Side = 'player' | 'enemy';

// Accent placeholders, swapped per faction after drawing.
const A = '#a10001';
const A_D = '#a10002';
const A_L = '#a10003';
const FACTION: Record<Side, Record<string, string>> = {
  player: { [A]: '#3b7de0', [A_D]: '#214f9e', [A_L]: '#9cc8ff' },
  enemy: { [A]: '#de4a2c', [A_D]: '#8f2414', [A_L]: '#ffa477' },
};

const INK = '#1b1424';
const SKIN = { light: '#f2c39b', tan: '#d99a6c', dark: '#a8693f', grey: '#b8b1a8' };
const STEEL = '#aab4c2';
const BRONZE = '#c98a3a';
const GOLD = '#f2c14a';
const WOOD = '#8a5a34';
const LEATHER = '#7b4a2a';
const IRON = '#565c6b';

export const WALK_FRAMES = 4;
export const ATTACK_FRAMES = 2;
export const FRAME_COUNT = WALK_FRAMES + ATTACK_FRAMES;

type Act = 'rest' | 'wind' | 'strike';
interface Pose { leg: -1 | 0 | 1; bob: 0 | 1; act: Act }

const POSES: Pose[] = [
  { leg: 0, bob: 0, act: 'rest' },
  { leg: 1, bob: 1, act: 'rest' },
  { leg: 0, bob: 0, act: 'rest' },
  { leg: -1, bob: 1, act: 'rest' },
  { leg: 0, bob: 0, act: 'wind' },
  { leg: 1, bob: 1, act: 'strike' },
];

type Bulk = 'normal' | 'tank' | 'hero';
interface Geo { w: number; h: number; cx: number; ground: number; legW: number; legH: number; torsoW: number; torsoH: number; headRx: number; headRy: number }
const GEO: Record<Bulk, Geo> = {
  normal: { w: 34, h: 32, cx: 15, ground: 30, legW: 3, legH: 5, torsoW: 9, torsoH: 7, headRx: 6.5, headRy: 6 },
  tank: { w: 38, h: 34, cx: 17, ground: 32, legW: 4, legH: 5, torsoW: 13, torsoH: 9, headRx: 6, headRy: 5.5 },
  hero: { w: 38, h: 38, cx: 17, ground: 35, legW: 3, legH: 6, torsoW: 10, torsoH: 8, headRx: 6.5, headRy: 6 },
};

type Weapon =
  | 'club' | 'bigclub' | 'sling' | 'spear' | 'bow' | 'shortsword' | 'sword' | 'greatsword'
  | 'crossbow' | 'musket' | 'rifle' | 'grenade' | 'mg' | 'pulseblade' | 'arcstaff' | 'saber' | 'lance';
type Head =
  | 'wild' | 'headband' | 'bald' | 'corinthian' | 'bronzecap' | 'nasal' | 'kettle' | 'greathelm'
  | 'tricorn' | 'shako' | 'mitre' | 'brodie' | 'gogglehelm' | 'visor' | 'techhood' | 'crownhelm' | 'peakcap' | 'halovisor';
type Shield = 'round' | 'tower' | 'kite' | 'buckler';

interface Look {
  bulk: Bulk;
  skin: string;
  hair?: string;
  beard?: string;
  head: Head;
  tunic: string;
  armour?: string; // chest plate colour
  pants: string;
  boots: string;
  belt?: string;
  sash?: boolean; // faction sash across the chest
  cape?: string;
  weapon: Weapon;
  shield?: Shield;
  aura?: string; // heroes: rendered as a CSS glow
  trim?: string; // hero gold trim on armour
}

const LOOKS: Record<string, Look> = {
  // Stone Age
  stone_clubber: { bulk: 'normal', skin: SKIN.light, hair: '#3a2214', head: 'headband', tunic: '#8c7a5e', pants: '#6a4a2c', boots: '#5a3a22', belt: A, weapon: 'club' },
  stone_slinger: { bulk: 'normal', skin: SKIN.light, hair: '#3d2414', head: 'wild', tunic: '#b88a55', pants: '#8a5f36', boots: '#5a3a22', sash: true, weapon: 'sling' },
  stone_brute: { bulk: 'tank', skin: SKIN.tan, beard: '#4a2c18', head: 'bald', tunic: '#7d5634', armour: '#c9b9a0', pants: '#6b4428', boots: '#4a2e1a', belt: A, weapon: 'bigclub' },
  // Ancient Age
  ancient_hoplite: { bulk: 'normal', skin: SKIN.tan, head: 'corinthian', tunic: A, armour: BRONZE, pants: '#e8dcc0', boots: '#7a4f2e', weapon: 'spear', shield: 'round' },
  ancient_archer: { bulk: 'normal', skin: SKIN.light, hair: '#3a2416', head: 'headband', tunic: '#efe4c8', pants: '#d8c69e', boots: '#7a4f2e', belt: A, sash: true, weapon: 'bow' },
  ancient_guardian: { bulk: 'tank', skin: SKIN.tan, head: 'bronzecap', tunic: A, armour: BRONZE, pants: '#e8dcc0', boots: '#6a4428', weapon: 'shortsword', shield: 'tower' },
  // Crusader Age
  crusader_swordsman: { bulk: 'normal', skin: SKIN.light, hair: '#6b4a2c', head: 'nasal', tunic: A, armour: '#8b95a6', pants: '#5c5f6a', boots: '#3f3a40', belt: LEATHER, weapon: 'sword' },
  crusader_crossbow: { bulk: 'normal', skin: SKIN.light, hair: '#8a5a2c', head: 'kettle', tunic: '#c9b48a', pants: '#6b5a44', boots: '#3f3a40', sash: true, weapon: 'crossbow' },
  crusader_knight: { bulk: 'tank', skin: SKIN.light, head: 'greathelm', tunic: A, armour: STEEL, pants: STEEL, boots: '#6d7686', weapon: 'sword', shield: 'kite' },
  // Gunpowder Age
  gunpowder_bayonet: { bulk: 'normal', skin: SKIN.light, hair: '#e8e2d6', head: 'tricorn', tunic: A, pants: '#ebe4d2', boots: '#2b2630', belt: '#f2ece0', sash: false, weapon: 'musket' },
  gunpowder_rifleman: { bulk: 'normal', skin: SKIN.tan, head: 'shako', tunic: '#3d5a3a', pants: '#d9d0bc', boots: '#2b2630', belt: '#f2ece0', sash: true, weapon: 'rifle' },
  gunpowder_grenadier: { bulk: 'tank', skin: SKIN.light, beard: '#5a3b24', head: 'mitre', tunic: A, armour: '#e9e2d0', pants: '#ebe4d2', boots: '#2b2630', weapon: 'grenade' },
  // Industrial Age
  industrial_infantry: { bulk: 'normal', skin: SKIN.light, head: 'brodie', tunic: '#7a7a4e', pants: '#6b6b45', boots: '#3e3426', belt: LEATHER, sash: true, weapon: 'rifle' },
  industrial_gunner: { bulk: 'normal', skin: SKIN.tan, head: 'gogglehelm', tunic: '#6e6a52', pants: '#5d5a45', boots: '#3e3426', belt: A, weapon: 'mg' },
  // Future Age
  future_pulseblade: { bulk: 'normal', skin: SKIN.light, head: 'visor', tunic: '#e6ecf2', armour: '#b9c6d4', pants: '#4a5466', boots: '#2f3644', belt: A, weapon: 'pulseblade' },
  future_arccaster: { bulk: 'normal', skin: SKIN.light, head: 'techhood', tunic: '#4a557a', armour: '#d9e2ef', trim: A_L, pants: '#343c58', boots: '#1f2433', belt: A, weapon: 'arcstaff' },
  // Heroes
  crusader_champion: { bulk: 'hero', skin: SKIN.light, hair: '#f2d58a', head: 'crownhelm', tunic: '#f4f1ea', armour: '#dfe5ee', trim: GOLD, pants: '#d7dde6', boots: '#9aa4b5', cape: A, weapon: 'greatsword', aura: GOLD },
  iron_marshal: { bulk: 'hero', skin: SKIN.light, beard: '#8a6a4a', head: 'peakcap', tunic: '#3b4a5e', trim: GOLD, pants: '#2c3646', boots: '#1e1a20', belt: '#2a1c14', cape: A, weapon: 'saber', aura: '#ffd77a' },
  nova_vanguard: { bulk: 'hero', skin: SKIN.light, head: 'halovisor', tunic: '#f3f6fb', armour: '#ffffff', trim: GOLD, pants: '#cfd8e6', boots: '#8f9bb0', cape: A, weapon: 'lance', aura: '#8ff0ff' },
};

const lit = (c: string) => shade(c, 0.28);
const dim = (c: string) => shade(c, -0.3);

/** Rectangle with top-left light and bottom-right shade. */
function block(pc: PixelCanvas, x: number, y: number, w: number, h: number, c: string) {
  pc.rect(x, y, w, h, c);
  pc.hline(x, x + w - 1, y, lit(c));
  pc.vline(x, y, y + h - 1, lit(c));
  pc.hline(x, x + w - 1, y + h - 1, dim(c));
  pc.vline(x + w - 1, y + 1, y + h - 1, dim(c));
}

/** Thick stroke from (x, y) along (dx, dy) for len pixels. */
function stroke(pc: PixelCanvas, x: number, y: number, dx: number, dy: number, len: number, c: string, thick = 1) {
  const m = Math.hypot(dx, dy) || 1;
  const ux = dx / m, uy = dy / m;
  for (let i = 0; i <= len; i++) {
    const px = x + ux * i, py = y + uy * i;
    pc.set(px, py, c);
    if (thick > 1) pc.set(px + (Math.abs(uy) > Math.abs(ux) ? 1 : 0), py + (Math.abs(uy) > Math.abs(ux) ? 0 : 1), c);
  }
  return { x: x + ux * len, y: y + uy * len, ux, uy };
}

interface Body { g: Geo; dy: number; torsoL: number; torsoR: number; torsoT: number; legsT: number; headCx: number; headCy: number; hand: { x: number; y: number }; aim: boolean }

function handFor(g: Geo, act: Act, torsoR: number, torsoT: number, aim: boolean) {
  if (aim) return { x: torsoR + 3, y: torsoT + 3 };
  if (act === 'wind') return { x: g.cx + 1, y: torsoT - 3 };
  if (act === 'strike') return { x: torsoR + 4, y: torsoT + 3 };
  return { x: torsoR + 1, y: torsoT + 5 };
}

const AIMED: Weapon[] = ['bow', 'crossbow', 'musket', 'rifle', 'mg', 'arcstaff'];

function drawLegs(pc: PixelCanvas, b: Body, look: Look, leg: number) {
  const { g } = b;
  const backX = g.cx - 2 - g.legW + 1 - leg;
  const frontX = g.cx + 1 + leg;
  for (const [x, front] of [[backX, false], [frontX, true]] as const) {
    const pants = front ? look.pants : dim(look.pants);
    const boots = front ? look.boots : dim(look.boots);
    pc.rect(x, b.legsT, g.legW, g.legH - 2, pants);
    pc.rect(x, g.ground - 1, g.legW + 1, 2, boots);
    pc.hline(x, x + g.legW, g.ground, dim(boots));
  }
}

function drawTorso(pc: PixelCanvas, b: Body, look: Look) {
  const { torsoL, torsoR, torsoT, legsT } = b;
  const w = torsoR - torsoL + 1;
  block(pc, torsoL, torsoT, w, legsT - torsoT + 1, look.tunic);
  if (look.armour) {
    block(pc, torsoL + 1, torsoT, w - 2, Math.max(3, legsT - torsoT - 1), look.armour);
    if (look.trim) { pc.hline(torsoL + 1, torsoR - 1, torsoT, look.trim); pc.vline(Math.round((torsoL + torsoR) / 2), torsoT + 1, legsT - 2, look.trim); }
  }
  if (look.sash) for (let i = 0; i < w; i++) pc.set(torsoL + i, torsoT + 1 + Math.floor((i * (legsT - torsoT - 2)) / w), A);
  if (look.belt) pc.hline(torsoL, torsoR, legsT - 1, look.belt);
  // Shoulder pads read as bulk on tanks.
  if (look.bulk === 'tank') {
    const pad = look.armour ?? look.tunic;
    block(pc, torsoL - 1, torsoT - 1, 4, 3, pad);
    block(pc, torsoR - 2, torsoT - 1, 4, 3, pad);
  }
}

function drawCape(pc: PixelCanvas, b: Body, look: Look, phase: number) {
  if (!look.cape) return;
  const x = b.torsoL - 2 - (phase ? 1 : 0);
  pc.rect(x, b.torsoT, 4, b.legsT - b.torsoT + 4, look.cape);
  pc.vline(x, b.torsoT + 1, b.legsT + 3, dim(look.cape));
  pc.hline(x, x + 3, b.legsT + 3, A_D);
  if (look.trim) pc.vline(x + 3, b.torsoT, b.legsT + 2, look.trim);
}

/** Pixels of the head ellipse, so hair/helmets can be painted as regions of it. */
function headPixels(cx: number, cy: number, rx: number, ry: number) {
  const out: [number, number][] = [];
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
      if (nx * nx + ny * ny <= 1) out.push([x, y]);
    }
  return out;
}

const FULL_HELMS: Head[] = ['greathelm', 'visor', 'techhood', 'halovisor'];

function drawHead(pc: PixelCanvas, b: Body, look: Look) {
  const { headCx: cx, headCy: cy, g } = b;
  const rx = g.headRx, ry = g.headRy;
  const px = headPixels(cx, cy, rx, ry);
  // Skin with soft top-left light and a jaw shadow.
  for (const [x, y] of px) {
    const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
    pc.set(x, y, nx + ny < -0.75 ? lit(look.skin) : ny > 0.62 || nx > 0.78 ? dim(look.skin) : look.skin);
  }
  // Hair: a cap over the crown, the back of the head and a short fringe; the face stays clear.
  if (look.hair && !FULL_HELMS.includes(look.head)) {
    for (const [x, y] of px) {
      const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
      const crown = ny < -0.35 + (nx > 0.2 ? -0.1 : 0);
      const back = nx < -0.38 && ny < 0.55;
      if (crown || back) pc.set(x, y, ny < -0.7 && nx < 0.3 ? lit(look.hair) : nx < -0.6 ? dim(look.hair) : look.hair);
    }
    pc.set(Math.round(cx + 1), Math.round(cy - ry * 0.35), look.hair).set(Math.round(cx + 3), Math.round(cy - ry * 0.35), look.hair);
  }
  // Ear on the back side.
  pc.set(Math.round(cx - rx * 0.35), Math.round(cy + 1), dim(look.skin));
  // Face: big friendly eyes, mouth, cheek.
  const ex = Math.round(cx + 1), ey = Math.round(cy);
  if (!FULL_HELMS.includes(look.head)) {
    pc.rect(ex, ey, 1, 2, INK).rect(ex + 3, ey, 1, 2, INK);
    pc.set(ex, ey, '#4a3a55').set(ex + 3, ey, '#4a3a55');
    pc.set(ex + 2, ey + 3, shade(look.skin, -0.45));
    pc.set(ex + 4, ey + 2, '#ea9a8a');
  }
  if (look.beard) {
    for (const [x, y] of px) {
      const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
      if (ny > 0.3 && nx > -0.5) pc.set(x, y, ny > 0.75 ? dim(look.beard) : look.beard);
    }
    pc.rect(Math.round(cx), Math.round(cy + ry), Math.round(rx) - 1, 1, look.beard);
    pc.set(ex + 2, ey + 3, shade(look.beard, -0.4)).set(ex + 3, ey + 3, shade(look.beard, -0.4));
    pc.hline(ex - 1, ex, ey - 1, look.beard).hline(ex + 3, ex + 4, ey - 1, look.beard);
  }
  drawHeadgear(pc, b, look, px);
}

function paintRegion(pc: PixelCanvas, px: [number, number][], cx: number, cy: number, rx: number, ry: number, test: (nx: number, ny: number) => boolean, c: string) {
  for (const [x, y] of px) {
    const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
    if (test(nx, ny)) pc.set(x, y, ny < -0.65 && nx < 0.2 ? lit(c) : nx > 0.75 || ny > 0.75 ? dim(c) : c);
  }
}

function drawHeadgear(pc: PixelCanvas, b: Body, look: Look, px: [number, number][]) {
  const { headCx: cx, headCy: cy, g } = b;
  const rx = g.headRx, ry = g.headRy;
  const top = Math.round(cy - ry), L = Math.round(cx - rx), R = Math.round(cx + rx);
  const region = (t: (nx: number, ny: number) => boolean, c: string) => paintRegion(pc, px, cx, cy, rx, ry, t, c);
  const brim = Math.round(cy - ry * 0.3);
  switch (look.head) {
    case 'wild': {
      const h = look.hair!;
      for (let i = 0; i < 5; i++) pc.set(L + 2 + i * 2, top - 1 - (i % 2), h).set(L + 2 + i * 2, top, h);
      pc.set(L, top + 3, h).set(L - 1, top + 4, h);
      break;
    }
    case 'headband':
      pc.hline(L + 1, R - 1, brim, A).hline(L + 1, R - 1, brim + 1, A_D);
      pc.set(L, brim + 1, A).set(L - 1, brim + 2, A).set(L - 2, brim + 3, A_D).set(L - 1, brim + 3, A_D);
      break;
    case 'bald':
      pc.hline(Math.round(cx - 2), Math.round(cx + 1), top + 1, '#ffffff');
      pc.hline(L + 1, R - 1, brim, A).hline(L + 1, R - 1, brim + 1, A_D);
      break;
    case 'corinthian':
      region((nx, ny) => ny < -0.2 || nx < -0.25 || (nx > 0.75 && ny > -0.2 && ny < 0.5), BRONZE);
      pc.vline(Math.round(cx + 2.5), Math.round(cy - 1), Math.round(cy + 1), BRONZE); // nose guard
      for (let i = -6; i <= 4; i++) {
        const y = top - Math.round(Math.sqrt(Math.max(0, 30 - i * i)) * 0.75);
        pc.vline(Math.round(cx) + i, y, y + 1, i < -2 ? A_D : A);
        if (i > -3 && i < 3) pc.set(Math.round(cx) + i, y, A_L);
      }
      break;
    case 'bronzecap':
      region((nx, ny) => ny < -0.25 || (nx < -0.45 && ny < 0.5), BRONZE);
      pc.hline(L, R, brim, dim(BRONZE));
      for (let i = -4; i <= 3; i++) { const y = top - 1 - Math.round(Math.sqrt(Math.max(0, 16 - i * i)) * 0.6); pc.vline(Math.round(cx) + i, y, y + 1, i < -1 ? A_D : A); }
      break;
    case 'nasal':
      region((nx, ny) => ny < -0.25 || (nx < -0.5 && ny < 0.6), STEEL);
      pc.hline(L, R, brim, dim(STEEL));
      pc.vline(Math.round(cx + 2.5), brim, Math.round(cy + 1), STEEL);
      pc.set(Math.round(cx - 1), top, '#ffffff');
      break;
    case 'kettle':
      region((nx, ny) => ny < -0.3, STEEL);
      pc.hline(L - 2, R + 2, brim, dim(STEEL)).hline(L - 1, R + 1, brim - 1, STEEL);
      pc.set(Math.round(cx - 1), top, '#ffffff');
      break;
    case 'greathelm': {
      region(() => true, STEEL);
      pc.hline(Math.round(cx - 1), R, Math.round(cy), INK).hline(Math.round(cx), R - 1, Math.round(cy + 1), '#3a4150');
      pc.vline(Math.round(cx + 2), Math.round(cy + 2), Math.round(cy + ry - 1), dim(STEEL));
      for (let i = 0; i < 3; i++) pc.set(Math.round(cx + 3) + i, Math.round(cy + 3), '#3a4150');
      for (let i = -3; i <= 2; i++) pc.vline(Math.round(cx) + i, top - 3 + (Math.abs(i) > 1 ? 1 : 0), top - 1, A);
      pc.set(Math.round(cx - 2), top + 1, '#ffffff');
      break;
    }
    case 'tricorn':
      pc.rect(L - 1, top, R - L + 3, 3, '#2a2530').rect(L + 1, top - 2, R - L - 1, 2, '#2a2530');
      pc.hline(L - 1, R + 1, top + 2, A_L).set(R + 2, top + 1, A_L).set(L - 2, top + 1, A_L);
      pc.set(Math.round(cx + 2), top, GOLD);
      break;
    case 'shako':
      region((nx, ny) => ny < -0.35, '#1f2230');
      pc.rect(L + 1, top - 5, R - L - 1, 6, '#1f2230').hline(L + 1, R - 1, top - 5, lit('#1f2230'));
      pc.hline(L - 1, R + 2, brim, '#14161f');
      pc.rect(Math.round(cx + 1), top - 3, 2, 2, GOLD);
      pc.rect(Math.round(cx - 1), top - 9, 2, 4, A).set(Math.round(cx - 1), top - 10, A_L);
      break;
    case 'mitre':
      region((nx, ny) => ny < -0.35, A_D);
      for (let j = 0; j < 9; j++) {
        const half = Math.round(5 - j * 0.45);
        pc.hline(Math.round(cx) - half, Math.round(cx) + half, top - 8 + j, j < 2 ? A_D : A);
      }
      pc.rect(Math.round(cx), top - 6, 3, 5, GOLD).set(Math.round(cx + 1), top - 5, '#fff1b0');
      pc.hline(L, R, brim, '#2a2530');
      break;
    case 'brodie':
      region((nx, ny) => ny < -0.3, '#5e6a3e');
      pc.hline(L - 2, R + 2, brim, '#4b5531').hline(L - 1, R + 1, brim - 1, '#5e6a3e');
      pc.set(Math.round(cx - 1), top, lit('#5e6a3e'));
      break;
    case 'gogglehelm':
      region((nx, ny) => ny < -0.25 || (nx < -0.45 && ny < 0.5), '#4f4a3c');
      pc.hline(L, R, brim, A);
      pc.rect(Math.round(cx + 1), brim - 1, 2, 2, '#9fe3ff').rect(Math.round(cx + 4), brim - 1, 2, 2, '#9fe3ff');
      pc.set(Math.round(cx + 1), brim - 1, '#ffffff').set(Math.round(cx + 4), brim - 1, '#ffffff');
      break;
    case 'visor':
      region(() => true, '#e8eef5');
      region((nx, ny) => ny < -0.55 && nx < 0.3, '#ffffff');
      pc.rect(Math.round(cx), Math.round(cy - 1), Math.round(rx) + 1, 3, A);
      pc.hline(Math.round(cx + 1), R, Math.round(cy - 1), A_L);
      pc.vline(Math.round(cx - 2), Math.round(cy - 2), Math.round(cy + 2), '#9aa8ba');
      break;
    case 'techhood':
      region(() => true, '#2a3048');
      region((nx, ny) => nx > 0.05 && ny > -0.45 && ny < 0.7, '#121524');
      pc.set(Math.round(cx + 2), Math.round(cy), A_L).set(Math.round(cx + 4), Math.round(cy), A_L);
      pc.hline(L + 1, R - 2, top + 1, A);
      pc.set(L - 1, top + 2, '#2a3048').set(L - 2, top + 3, '#2a3048');
      break;
    case 'crownhelm':
      region((nx, ny) => ny < -0.3 || (nx < -0.5 && ny < 0.5), '#eef2f7');
      pc.hline(L, R, brim, GOLD);
      for (let i = 0; i < 4; i++) pc.vline(L + 2 + i * 3, top - 3 + (i % 2), top - 1, GOLD);
      pc.hline(L + 1, R - 1, top - 1, GOLD);
      pc.set(Math.round(cx), top - 3, '#ff6b6b').set(L + 5, top - 2, '#6be0ff');
      break;
    case 'peakcap':
      region((nx, ny) => ny < -0.35, '#2c3646');
      pc.rect(L, top - 2, R - L + 1, 3, '#2c3646').hline(L, R, top - 2, lit('#2c3646'));
      pc.hline(Math.round(cx), R + 3, brim, '#141820');
      pc.hline(L, R, brim - 1, A);
      pc.rect(Math.round(cx + 1), top - 1, 2, 2, GOLD);
      break;
    case 'halovisor':
      region(() => true, '#fbfcff');
      pc.rect(Math.round(cx), Math.round(cy - 1), Math.round(rx) + 1, 3, '#43e0ff');
      pc.hline(Math.round(cx + 1), R, Math.round(cy - 1), '#c8fbff');
      pc.vline(Math.round(cx - 2), Math.round(cy - 2), Math.round(cy + 2), GOLD);
      for (let i = -4; i <= 4; i++) pc.set(Math.round(cx) + i, top - 3 - (Math.abs(i) < 3 ? 1 : 0), GOLD);
      break;
  }
}

function drawShield(pc: PixelCanvas, b: Body, kind: Shield) {
  const x = b.torsoR - 1, y = b.torsoT + 3;
  switch (kind) {
    case 'round':
      pc.ellipse(x, y, 4.5, 5, BRONZE);
      pc.ellipse(x, y, 3.5, 4, A);
      pc.ellipse(x - 1, y - 1, 1.5, 1.5, A_L);
      pc.set(x, y, GOLD);
      break;
    case 'buckler':
      pc.ellipse(x, y, 3, 3, STEEL).set(x, y, GOLD);
      break;
    case 'tower':
      block(pc, x - 2, y - 6, 7, 13, A);
      pc.rect(x - 1, y - 5, 5, 11, A);
      pc.vline(x + 1, y - 5, y + 5, BRONZE).hline(x - 1, x + 3, y, BRONZE);
      pc.hline(x - 2, x + 4, y - 6, BRONZE).hline(x - 2, x + 4, y + 6, dim(BRONZE));
      break;
    case 'kite':
      for (let j = 0; j < 12; j++) {
        const half = j < 5 ? 3 : Math.max(0, 3 - Math.ceil((j - 4) / 2));
        pc.hline(x + 1 - half, x + 1 + half, y - 5 + j, j === 0 ? lit(STEEL) : A);
      }
      pc.vline(x + 1, y - 4, y + 4, A_L).hline(x - 1, x + 3, y - 2, A_L);
      pc.vline(x - 2, y - 5, y - 1, STEEL);
      break;
  }
}

function weaponDir(act: Act): [number, number] {
  if (act === 'wind') return [-1, -1.3];
  if (act === 'strike') return [1.6, 0.7];
  return [0.8, -1.5];
}

function drawWeapon(pc: PixelCanvas, b: Body, look: Look, act: Act) {
  const { hand } = b;
  const hx = hand.x, hy = hand.y;
  const [dx, dy] = weaponDir(act);
  switch (look.weapon) {
    case 'club': {
      const e = stroke(pc, hx, hy, dx, dy, 6, WOOD, 2);
      pc.ellipse(e.x + e.ux * 1.5, e.y + e.uy * 1.5, 2.8, 2.8, '#a06a3c');
      pc.set(e.x + e.ux * 1.5 - 1, e.y + e.uy * 1.5 - 1, '#c58a52');
      break;
    }
    case 'bigclub': {
      const e = stroke(pc, hx, hy, dx, dy, 6, '#e7dccb', 2);
      pc.ellipse(e.x + e.ux * 2, e.y + e.uy * 2, 3, 3, '#8d8a86');
      pc.ellipse(e.x + e.ux * 2 - 1, e.y + e.uy * 2 - 1, 1.5, 1.5, '#b9b5ae');
      break;
    }
    case 'shortsword':
    case 'sword':
    case 'greatsword':
    case 'saber': {
      const len = look.weapon === 'greatsword' ? 12 : look.weapon === 'shortsword' ? 6 : 9;
      const blade = look.weapon === 'saber' ? '#e2e8f0' : '#dfe6ee';
      pc.set(hx - Math.sign(dx), hy - Math.sign(dy), LEATHER);
      const g = stroke(pc, hx, hy, dx, dy, 1, look.trim ?? '#6b5a3e');
      // Cross-guard perpendicular to the blade.
      pc.set(g.x - g.uy * 2, g.y + g.ux * 2, look.trim ?? '#c9b27a').set(g.x + g.uy * 2, g.y - g.ux * 2, look.trim ?? '#c9b27a');
      pc.set(g.x - g.uy, g.y + g.ux, look.trim ?? '#c9b27a').set(g.x + g.uy, g.y - g.ux, look.trim ?? '#c9b27a');
      stroke(pc, g.x, g.y, dx, dy, len, blade, 2);
      stroke(pc, g.x, g.y, dx, dy, len - 1, '#ffffff');
      if (look.weapon === 'greatsword' && act === 'strike') stroke(pc, g.x + 1, g.y + 2, dx, dy, len, '#fff3b0');
      break;
    }
    case 'spear':
    case 'lance': {
      const ang: [number, number] = act === 'wind' ? [-1, -0.15] : act === 'strike' ? [1, 0.05] : [0.35, -1];
      const back = stroke(pc, hx, hy, -ang[0], -ang[1], act === 'rest' ? 3 : 5, WOOD);
      void back;
      const tip = stroke(pc, hx, hy, ang[0], ang[1], act === 'strike' ? 12 : 9, look.weapon === 'lance' ? '#f5f7fb' : WOOD);
      const head = look.weapon === 'lance' ? '#43e0ff' : STEEL;
      stroke(pc, tip.x, tip.y, ang[0], ang[1], 3, head, 2);
      if (look.weapon === 'lance') stroke(pc, tip.x, tip.y, ang[0], ang[1], 4, '#c8fbff');
      break;
    }
    case 'pulseblade': {
      pc.rect(hx - 1, hy - 1, 2, 2, '#4a5466');
      const e = stroke(pc, hx, hy, dx, dy, 8, A, 2);
      stroke(pc, hx, hy, dx, dy, 8, A_L);
      if (act === 'strike') pc.set(e.x + 1, e.y, '#ffffff');
      break;
    }
    case 'sling': {
      if (act === 'wind') {
        for (let a = 0; a < 12; a++) pc.set(hx + Math.cos(a / 2) * 3.5, hy - 4 + Math.sin(a / 2) * 2, '#c9a46a');
        pc.rect(hx + 3, hy - 5, 2, 2, '#8d8a86');
      } else if (act === 'strike') {
        stroke(pc, hx, hy, 1, 0.3, 5, '#c9a46a');
      } else {
        stroke(pc, hx, hy, 0.2, 1, 4, '#c9a46a');
        pc.rect(hx, hy + 4, 2, 2, '#8d8a86');
      }
      break;
    }
    case 'bow': {
      const x = hx + 1;
      for (let j = -6; j <= 6; j++) pc.set(x + Math.round(2.2 - (j * j) / 16), hy + j, j === 0 ? LEATHER : WOOD);
      const pull = act === 'wind' ? 4 : 0;
      pc.line(x, hy - 6, x - pull, hy, '#efe6d2').line(x - pull, hy, x, hy + 6, '#efe6d2');
      if (act !== 'strike') { pc.hline(x - pull - 1, x + 5, hy, '#d8c8a8'); pc.set(x + 6, hy, STEEL); }
      break;
    }
    case 'crossbow': {
      block(pc, hx - 4, hy - 1, 9, 2, WOOD);
      pc.vline(hx + 4, hy - 4, hy + 3, IRON);
      pc.line(hx + 4, hy - 4, hx + 1, hy - 1, '#d8d0c0').line(hx + 4, hy + 3, hx + 1, hy, '#d8d0c0');
      if (act !== 'strike') pc.hline(hx, hx + 6, hy - 2, STEEL);
      else pc.rect(hx + 6, hy - 2, 2, 1, '#fff7c2');
      break;
    }
    case 'musket':
    case 'rifle': {
      const recoil = act === 'strike' ? -1 : 0;
      const x = hx - 5 + recoil, y = hy;
      block(pc, x, y, 5, 2, WOOD);
      pc.hline(x + 4, x + 13, y, '#3a3a44').hline(x + 4, x + 12, y + 1, IRON);
      if (look.weapon === 'musket') stroke(pc, x + 13, y, 1, 0, 4, '#e8edf3');
      if (act === 'strike') { pc.rect(x + 14 + (look.weapon === 'musket' ? 4 : 0), y - 1, 2, 3, '#ffe27a'); pc.set(x + 16 + (look.weapon === 'musket' ? 4 : 0), y, '#fff7d6'); }
      break;
    }
    case 'mg': {
      block(pc, hx - 4, hy - 1, 9, 4, '#3d4148');
      pc.hline(hx + 5, hx + 11, hy, '#2a2d33').hline(hx + 5, hx + 11, hy + 1, IRON);
      for (let i = 0; i < 4; i++) pc.set(hx - 3 + i * 2, hy + 3, GOLD);
      pc.vline(hx - 5, hy + 2, hy + 5, '#2a2d33');
      if (act === 'strike') pc.rect(hx + 12, hy - 1, 3, 3, '#ffe27a').set(hx + 15, hy, '#fff7d6');
      break;
    }
    case 'grenade': {
      if (act === 'strike') {
        pc.rect(hx + 1, hy - 1, 2, 2, look.skin);
      } else {
        const gx = act === 'wind' ? hx - 1 : hx + 1, gy = act === 'wind' ? hy - 2 : hy + 1;
        pc.ellipse(gx, gy, 2.6, 2.6, '#2a2a30');
        pc.set(gx - 1, gy - 1, '#5a5a66');
        pc.set(gx + 1, gy - 3, '#c9a46a').set(gx + 2, gy - 4, '#ffcf5a');
      }
      break;
    }
    case 'arcstaff': {
      pc.vline(hx, hy - 8, hy + 6, '#8d97ad');
      pc.hline(hx - 2, hx + 2, hy - 7, '#8d97ad');
      pc.ellipse(hx, hy - 10, 3, 3, A);
      pc.ellipse(hx - 0.5, hy - 10.5, 1.4, 1.4, A_L);
      pc.set(hx - 1, hy - 11, '#ffffff');
      if (act === 'strike') { pc.line(hx + 3, hy - 10, hx + 6, hy - 8, A_L).line(hx + 6, hy - 8, hx + 9, hy - 11, '#ffffff').line(hx + 9, hy - 11, hx + 11, hy - 9, A_L); }
      if (act === 'wind') { pc.ellipse(hx, hy - 10, 4, 4, A_L); pc.ellipse(hx, hy - 10, 2, 2, '#ffffff'); }
      break;
    }
  }
}

function drawArms(pc: PixelCanvas, b: Body, look: Look, front: boolean) {
  const sleeve = look.armour && look.bulk !== 'normal' ? look.armour : look.tunic;
  if (!front) {
    const x = b.torsoL - 1;
    pc.rect(x, b.torsoT + 1, 2, 4, dim(sleeve));
    pc.rect(x, b.torsoT + 5, 2, 2, dim(look.skin));
    return;
  }
  const sx = b.torsoR - 1, sy = b.torsoT + 1;
  const { x: hx, y: hy } = b.hand;
  pc.line(sx, sy, hx, hy, sleeve).line(sx + 1, sy, hx + 1, hy, sleeve).line(sx, sy + 1, hx, hy + 1, dim(sleeve));
  pc.rect(hx, hy, 2, 2, look.skin).set(hx + 1, hy + 1, dim(look.skin));
}

function drawHumanoid(look: Look, pose: Pose): PixelCanvas {
  const g = GEO[look.bulk];
  const pc = new PixelCanvas(g.w, g.h);
  const dy = pose.bob;
  const legsT = g.ground - g.legH + 1;
  const torsoT = legsT - g.torsoH + dy;
  const torsoL = g.cx - Math.floor(g.torsoW / 2);
  const torsoR = torsoL + g.torsoW - 1;
  const aim = AIMED.includes(look.weapon);
  const b: Body = {
    g, dy, torsoL, torsoR, torsoT, legsT: legsT + dy - 0,
    headCx: g.cx + 0.5, headCy: torsoT - g.headRy + 1.5,
    hand: handFor(g, pose.act, torsoR, torsoT, aim), aim,
  };
  b.legsT = legsT;
  drawCape(pc, b, look, pose.leg);
  drawArms(pc, b, look, false);
  drawLegs(pc, b, look, pose.leg);
  drawTorso(pc, { ...b, legsT: legsT + 1 }, look);
  drawHead(pc, b, look);
  if (look.shield) drawShield(pc, b, look.shield);
  if (look.weapon === 'bow' || look.weapon === 'crossbow' || look.weapon === 'musket' || look.weapon === 'rifle' || look.weapon === 'mg') {
    drawWeapon(pc, b, look, pose.act);
    drawArms(pc, b, look, true);
  } else {
    drawArms(pc, b, look, true);
    drawWeapon(pc, b, look, pose.act);
  }
  return pc;
}

// --- Machines and the boss ---------------------------------------------------------

function drawWalker(pose: Pose): PixelCanvas {
  const pc = new PixelCanvas(40, 36);
  const g = 34, dy = pose.bob;
  const hull = '#6f6a55', plate = '#8a8468';
  // Legs (piston style).
  for (const [x, ph] of [[10, -pose.leg], [22, pose.leg]] as const) {
    pc.rect(x + ph, g - 9, 4, 8, '#4a4a52').rect(x - 1 + ph, g - 2, 7, 3, '#34343c');
    pc.vline(x + 1 + ph, g - 9, g - 3, '#7a7a86');
  }
  // Hull.
  block(pc, 6, 11 + dy, 26, 14, hull);
  block(pc, 8, 13 + dy, 22, 5, plate);
  pc.hline(6, 31, 19 + dy, A).hline(6, 31, 20 + dy, A_D);
  for (let i = 0; i < 6; i++) pc.set(9 + i * 4, 23 + dy, '#3a3a40');
  // Cockpit + pilot.
  block(pc, 16, 4 + dy, 10, 8, '#59544a');
  pc.rect(18, 6 + dy, 6, 3, '#9fe3ff').hline(18, 23, 6 + dy, '#d9f6ff');
  // Smokestack.
  pc.rect(9, 3 + dy, 3, 9, '#3a3a40').rect(8, 2 + dy, 5, 2, '#2a2a30');
  if (pose.leg !== 0) pc.ellipse(10, 0 + dy, 2, 1.5, '#9a9aa0aa');
  // Cannon.
  const recoil = pose.act === 'strike' ? -2 : 0;
  block(pc, 28 + recoil, 14 + dy, 10, 4, '#3d4148');
  pc.hline(28 + recoil, 37 + recoil, 14 + dy, '#6a707a');
  if (pose.act === 'strike') pc.rect(37, 13 + dy, 3, 6, '#ffe27a').rect(39, 14 + dy, 1, 4, '#fff7d6');
  return pc;
}

function drawTitan(pose: Pose): PixelCanvas {
  const pc = new PixelCanvas(40, 38);
  const g = 36, dy = pose.bob;
  const shell = '#dfe6ef', dark = '#8e9bb0';
  for (const [x, ph] of [[12, -pose.leg], [21, pose.leg]] as const) {
    block(pc, x + ph, g - 10, 6, 9, dark);
    pc.rect(x - 1 + ph, g - 2, 8, 3, '#5b6478');
  }
  block(pc, 9, 12 + dy, 22, 15, shell);
  pc.rect(12, 15 + dy, 16, 6, '#c3cdda');
  pc.ellipse(20, 18 + dy, 3, 3, A).ellipse(20, 18 + dy, 1.5, 1.5, A_L);
  block(pc, 5, 11 + dy, 7, 7, shell);
  block(pc, 28, 11 + dy, 7, 7, shell);
  pc.ellipse(20, 8 + dy, 5.5, 5, shell);
  pc.rect(19, 7 + dy, 7, 3, A).hline(20, 25, 7 + dy, A_L);
  // Shoulder cannon.
  const recoil = pose.act === 'strike' ? -1 : 0;
  block(pc, 26 + recoil, 6 + dy, 11, 4, '#5b6478');
  pc.rect(35 + recoil, 7 + dy, 2, 2, A_L);
  if (pose.act === 'strike') pc.ellipse(38, 8 + dy, 2, 2.5, A_L);
  if (pose.act === 'wind') pc.ellipse(36, 8 + dy, 1.5, 1.5, A);
  return pc;
}

function drawColossus(pose: Pose): PixelCanvas {
  const pc = new PixelCanvas(52, 54);
  const g = 52, dy = pose.bob;
  const rock = '#6d6470', rockL = '#8f8594', rockD = '#4a4250';
  for (const [x, ph] of [[14, -pose.leg], [28, pose.leg]] as const) {
    block(pc, x + ph, g - 13, 9, 12, rockD);
    pc.rect(x - 1 + ph, g - 2, 11, 3, '#2f2a34');
  }
  block(pc, 9, 16 + dy, 32, 24, rock);
  for (let i = 0; i < 5; i++) pc.hline(11, 38, 20 + i * 4 + dy, rockD);
  for (let i = 0; i < 4; i++) pc.vline(14 + i * 7, 17 + dy, 38 + dy, rockD);
  pc.rect(22, 26 + dy, 8, 12, '#2a2026').rect(23, 27 + dy, 6, 11, A_D); // glowing gate core
  pc.vline(26, 27 + dy, 37 + dy, A);
  block(pc, 4, 14 + dy, 10, 9, rockL);
  block(pc, 36, 14 + dy, 10, 9, rockL);
  pc.ellipse(25, 10 + dy, 8, 7, rock);
  pc.ellipse(24, 9 + dy, 6, 5, rockL);
  pc.rect(25, 9 + dy, 3, 2, A_L).rect(30, 9 + dy, 3, 2, A_L);
  pc.hline(22, 33, 13 + dy, rockD);
  // Ram fist.
  const reach = pose.act === 'strike' ? 6 : pose.act === 'wind' ? -3 : 0;
  block(pc, 40 + reach, 22 + dy, 9, 8, rockL);
  pc.hline(40 + reach, 48 + reach, 25 + dy, rockD);
  return pc;
}

export interface UnitArtInfo { w: number; h: number }

function frameFor(unitId: string, pose: Pose): PixelCanvas {
  if (unitId === 'industrial_walker') return drawWalker(pose);
  if (unitId === 'future_titan') return drawTitan(pose);
  if (unitId === 'gate_colossus') return drawColossus(pose);
  return drawHumanoid(LOOKS[unitId] ?? LOOKS.stone_clubber, pose);
}

/** Size of one frame for this unit, in sprite pixels. */
export function unitFrameSize(unitId: string): UnitArtInfo {
  const f = frameFor(unitId, POSES[0]);
  return { w: f.w, h: f.h };
}

/** All six frames for a unit, outlined and recoloured for its side. */
export function unitFrames(unitId: string, side: Side): PixelCanvas[] {
  return POSES.map((pose) => frameFor(unitId, pose).recolour(FACTION[side]).outline(INK));
}

/** Horizontal sprite sheet: walk ×4 then wind-up and strike. */
export function unitSheet(unitId: string, side: Side): PixelCanvas {
  return sheet(unitFrames(unitId, side));
}

export const KNOWN_UNIT_IDS = [...Object.keys(LOOKS), 'industrial_walker', 'future_titan', 'gate_colossus'];
