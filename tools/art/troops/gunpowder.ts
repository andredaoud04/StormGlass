/** Gunpowder Age troops: morions and pikes, tricornes and muskets, and a crewed field cannon. */
import { Img, hex, mix, rotSprite } from '../img';
import { BRONZE, FELT, FIRE, INK, IRON, WHITE, WOOD, type Ramp } from '../palette';
import { buildFrame, rotateFrame, type AnimSpec, type Pose, type RigParts } from '../rig';
import { darkOf, grid, groups, hurtHead, palOf } from './kit';
import { toGround } from './anims';

const over = { extra: FELT };

export function pikemanRig(team: Ramp): RigParts {
  const gs = groups(team, over);
  const p = palOf(gs);
  const dk = darkOf(gs);
  // Steel morion with a comb, cavalier moustache.
  const head = [
    '.UU..qp.......',
    'UTTUqqgp......',
    '.tTqgggggp....',
    '..qgggggggpp..',
    '..qgggggggggp.',
    'q.qgggggggggpp',
    'qqpppppppppppP',
    '.PPPPPPPPPPPP.',
    'jhhkSSSSSSSSs.',
    'jhkkSssssswess',
    'jhkksssssseess',
    '.jhkksssrshhhs',
    '..jkkkssssshk.',
    '....kkkkkkk...',
  ];
  const hurt = hurtHead(head, { 9: 'jhkkSsssssesss', 10: 'jhkksssssssess', 11: '.jhkksssrshmmh' });
  const torso = ['..qggpp..', '.TqgggpTt', 'TUqggppTt', 'TTpgppPTt', '.WWwWWWv.', '.TTUTTTt.', '.TUTTTtt.', '.T.t.T.t.'];
  const arm = ['UT.', 'Tt.', 'Wv.', 'SSs', 'kss'];
  const leg = ['TTt.', 'Wwv.', 'Wwv.', 'fEEE'];
  const pike = ['.q.', 'qgp', 'qgp', 'qgp', '.g.', '.p.', '.C.', '.B.', '.B.', '.B.', '.B.', '.B.', '.B.', '.B.', '.B.', '.B.', '.B.', '.B.', '.B.', '.b.', '.b.', '.b.'];
  return {
    frameW: 48,
    frameH: 38,
    hip: [19, 30],
    torso: { img: grid(torso, p), pivot: [4, 7] },
    neck: [1, -7],
    frontShoulder: [2, -6],
    backShoulder: [-1, -6],
    frontHip: [1, 0],
    backHip: [-2, 0],
    heads: { normal: { img: grid(head, p), pivot: [6, 13] }, hurt: { img: grid(hurt, p), pivot: [6, 13] } },
    frontArm: { img: grid(arm, p), pivot: [0, 0], tip: [1, 4] },
    backArm: { img: grid(arm, dk), pivot: [0, 0], tip: [1, 4] },
    frontLeg: { img: grid(leg, p), pivot: [1, 0] },
    backLeg: { img: grid(leg, dk), pivot: [1, 0] },
    weapon: { img: grid(pike, p), pivot: [1, 14] },
  };
}

const TRICORNE = [
  '....FGGGf.....',
  'F..FGGGGGf..Ff',
  'GF.GGGGGGGf.Gf',
  'GFGGGGGGGGGGGf',
  'ZzzzGGGGGGzzzX',
  '..ffffffffff..',
];

export function musketeerRig(team: Ramp): RigParts {
  const gs = groups(team, over);
  const p = palOf(gs);
  const dk = darkOf(gs);
  const head = [
    ...TRICORNE,
    'hhhkSSSSSSSSs.',
    'jhkkSssssswess',
    'jhkksssssseess',
    'jhkksssssssssk',
    '.jhkkssssrsmms',
    '.Tjkkkssssssk.',
    '.T..kkkkkkk...',
  ];
  const hurt = hurtHead(head, { 7: 'jhkkSsssssesss', 8: 'jhkksssssssess', 10: '.jhkkssssrmmms' });
  const torso = ['..UTTTt..', '.TWTTTWt.', 'TUTWTWTtt', 'TTTTWTTtt', '.TWTzTWt.', '.TTTzTTt.', '.TUTzTtt.', '.T.tYt.t.'];
  const arm = ['UT.', 'Tt.', 'WWv', 'SSs', 'kss'];
  const leg = ['wWv.', 'wvv.', 'GGf.', 'EEEE'];
  const musket = ['.q..', '.p..', '.p..', '.pB.', '.pB.', '.pB.', '.pB.', '.pB.', '.pB.', '.pBb', '.zBb', '.zBb', '..Bb', '.CBb', 'CBBb', 'CBBb', 'BBbb', 'bbD.'];
  const pouch = ['.zz.', 'LMLl', 'LMLl', 'LLll', '.ll.'];
  return {
    frameW: 40,
    frameH: 36,
    hip: [18, 28],
    torso: { img: grid(torso, p), pivot: [4, 7] },
    neck: [1, -7],
    frontShoulder: [2, -6],
    backShoulder: [-2, -6],
    frontHip: [1, 0],
    backHip: [-2, 0],
    heads: { normal: { img: grid(head, p), pivot: [6, 12] }, hurt: { img: grid(hurt, p), pivot: [6, 12] } },
    frontArm: { img: grid(arm, p), pivot: [0, 0], tip: [1, 4] },
    backArm: { img: grid(arm, dk), pivot: [0, 0], tip: [1, 4] },
    frontLeg: { img: grid(leg, p), pivot: [1, 0] },
    backLeg: { img: grid(leg, dk), pivot: [1, 0] },
    weapon: { img: grid(musket, p), pivot: [1, 11] },
    back: { img: grid(pouch, p), pivot: [5, 1] },
  };
}

/** Gun crew: a musketeer holding a linstock with a smouldering match. */
function gunnerRig(team: Ramp): RigParts {
  const r = musketeerRig(team);
  const p = palOf(groups(team, over));
  const linstock = ['F..', 'oF.', '.B.', '.B.', '.B.', '.B.', '.B.', '.B.', '.B.', '.b.', '.b.'];
  p.F = FIRE.base;
  p.o = FIRE.hl;
  return { ...r, weapon: { img: grid(linstock, p), pivot: [1, 7] }, back: undefined };
}

// ---------- Field cannon ----------

export interface CannonRig {
  frameW: number;
  frameH: number;
  hip: [number, number];
  crew: RigParts;
}

export function cannonRig(team: Ramp): CannonRig {
  return { frameW: 64, frameH: 46, hip: [30, 37], crew: gunnerRig(team) };
}

const GROUND = 41;
const AXLE: [number, number] = [37, 34];
const TRUNNION: [number, number] = [37, 29];

function wheel(angle: number, far: boolean): Img {
  const S = 15, c = 7.5;
  const img = new Img(S, S);
  const d = (col: number) => (far ? mix(col, INK, 0.35) : col);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = x + 0.5 - c, dy = y + 0.5 - c;
    const r = Math.hypot(dx, dy);
    if (r > 7.5) continue;
    if (r > 6.2) img.set(x, y, d(dx + dy < -2 ? IRON.hl : dx + dy > 2 ? IRON.deep : IRON.shade));
    else if (r > 5) img.set(x, y, d(dx + dy < 0 ? WOOD.hl : WOOD.shade));
  }
  for (let k = 0; k < 6; k++) {
    const a = ((angle + k * 60) * Math.PI) / 180;
    img.line(c - 0.5, c - 0.5, c - 0.5 + Math.cos(a) * 5, c - 0.5 + Math.sin(a) * 5, d(k % 2 ? WOOD.base : WOOD.shade));
  }
  img.ellipse(c, c, 1.8, 1.8, d(BRONZE.base));
  img.set(6, 6, d(BRONZE.hl));
  return img.outlined(INK);
}

function barrel(): Img {
  const L = 27, img = new Img(L, 7);
  for (let x = 0; x < L; x++) {
    let h0 = 1, h1 = 5; // top and bottom rows (inclusive)
    if (x < 3) [h0, h1] = [2, 4]; // cascabel knob
    else if (x < 11) [h0, h1] = [0, 6]; // breech
    else if (x < 24) [h0, h1] = [1, 5]; // chase
    else [h0, h1] = [0, 6]; // muzzle swell
    for (let y = h0; y <= h1; y++) {
      let c = y === h0 ? BRONZE.hl : y === h1 ? BRONZE.deep : y === h0 + 1 ? BRONZE.base : y === h1 - 1 ? BRONZE.shade : BRONZE.base;
      if (x === 2) c = BRONZE.deep;
      if (x === 10 || x === 17 || x === 23) c = y === h0 ? WHITE : BRONZE.shade;
      img.set(x, y, c);
    }
  }
  img.vline(L - 1, 2, 4, INK);
  img.set(6, 0, IRON.deep); // touch hole
  return img.outlined(INK);
}

function carriage(broken: boolean): Img {
  const img = new Img(64, 46);
  const pts: [number, number][] = broken
    ? [[24, 36], [40, 34], [41, 38], [22, 41], [14, 41], [14, 39]]
    : [[31, 27], [42, 27], [42, 32], [36, 36], [20, 41], [15, 41], [15, 39]];
  img.poly(pts, (x, y) => (y < 29 && !broken ? WOOD.hl : x > 38 ? WOOD.shade : (x + y) % 9 === 0 ? WOOD.shade : WOOD.base));
  // Iron fittings.
  if (!broken) {
    img.hline(32, 41, 27, IRON.base);
    img.set(39, 30, IRON.hl);
    img.set(28, 35, IRON.hl);
    img.set(20, 39, IRON.hl);
  }
  return img.outlined(INK, { pad: 0 });
}

const flashImg = (big: boolean): Img => {
  const s = big
    ? ['...hh......', '..hfh..h...', '.hfFFhhfh..', 'hfFWWFFFfh.', 'fFWWWWFFFfh', 'hfFWWFFFfh.', '.hfFFhhfh..', '..hfh..h...', '...hh......']
    : ['.........', '..h......', '.hfFh....', 'hfWWFfh..', '.hfFh....', '..h......', '.........'];
  return Img.fromGrid(s, { h: FIRE.deep, f: FIRE.base, F: FIRE.hl, W: WHITE });
};

function smokeCloud(img: Img, x: number, y: number, size: number, fade: number): void {
  const puffs: [number, number, number][] = [[0, 0, 3], [4, -2, 3.5], [8, 0, 3], [3, 2, 2.5], [7, -4, 2.2]];
  for (const [dx, dy, r] of puffs) {
    img.ellipse(x + dx * size, y + dy * size, r * size, r * size * 0.85, (px, py, nx, ny) => {
      if (fade > 0 && ((px * 3 + py * 5) % 7) < fade * 7) return 0;
      return ny > 0.35 ? hex('#a8a0b4') : nx + ny < -0.4 ? WHITE : hex('#dcd6e4');
    });
  }
}

interface CannonPose {
  dx?: number;
  recoil?: number;
  elev?: number;
  wheel?: number;
  crew: Pose;
  crewDx?: number;
  flash?: 0 | 1 | 2;
  smoke?: [number, number];
  spark?: boolean;
  broken?: boolean;
  /** Rotate the crew (for a fall), around their feet. */
  crewFall?: number;
}

function cannonFrame(c: CannonRig, q: CannonPose): Img {
  const f = new Img(c.frameW, c.frameH);
  const dx = q.dx ?? 0;
  // Crew stands behind the trail (anchor of the 40x36 crew frame is at hip + 4).
  let crew = buildFrame(c.crew, q.crew);
  if (q.crewFall) crew = toGround(rotateFrame(crew, q.crewFall, c.crew.hip[0] - 2, c.crew.frameH - 4), c.crew.hip[1] + 4);
  f.blit(crew, 10 + dx + (q.crewDx ?? 0) - c.crew.hip[0], GROUND - (c.crew.hip[1] + 4));
  // Far wheel peeks out behind the carriage.
  f.blit(wheel((q.wheel ?? 0) + 30, true), AXLE[0] - 10 + dx, AXLE[1] - 10);
  f.blit(carriage(!!q.broken), dx, 0);
  // Barrel on its trunnion.
  const b = barrel();
  const bx = TRUNNION[0] - 12 + dx + (q.recoil ?? 0);
  const by = TRUNNION[1] - 4;
  if (q.broken) f.blit(rotSprite(b, (12 * Math.PI) / 180, 12, 4, b.w + 6, b.h + 10, 15, 6), bx - 3, by + 6);
  else if (q.elev) f.blit(rotSprite(b, (q.elev * Math.PI) / 180, 12, 4, b.w + 6, b.h + 10, 15, 6), bx - 3, by - 2);
  else f.blit(b, bx, by);
  // Near wheel.
  if (q.broken) f.blit(rotSprite(wheel(q.wheel ?? 0, false), 0.5, 8, 8, 17, 17, 8, 8), AXLE[0] - 5 + dx, AXLE[1] - 5);
  else f.blit(wheel(q.wheel ?? 0, false), AXLE[0] - 8 + dx, AXLE[1] - 8);
  const mx = bx + 27, my = by + 4;
  if (q.spark) {
    f.set(bx + 7, by - 1, FIRE.hl);
    f.set(bx + 6, by - 2, FIRE.base);
    f.set(bx + 8, by - 2, WHITE);
  }
  if (q.smoke) smokeCloud(f, mx + 2, my - 1, q.smoke[0], q.smoke[1]);
  if (q.flash) f.blit(flashImg(q.flash === 2), mx, my - (q.flash === 2 ? 4 : 3));
  return f;
}

export function cannonAnims(c: CannonRig): AnimSpec[] {
  const stand: Pose = { frontArm: -20, backArm: 10, weapon: 15 };
  const idle = [0, 0, 1, 1].map((b) => cannonFrame(c, { crew: { ...stand, body: [0, b], frontArm: -20 + b * 4, weapon: 15 + b * 3 } }));
  // Pushing the trail forward: arms out, legs striding, wheels turning.
  const push = (p: Pose): Pose => ({ frontArm: -75, backArm: -65, weapon: undefined, body: [1, 0], ...p });
  const walk = [
    cannonFrame(c, { wheel: 0, crew: push({ frontLeg: [2, 0], backLeg: [-2, 0] }) }),
    cannonFrame(c, { wheel: 15, crew: push({ body: [1, -1], frontLeg: [0, -1] }) }),
    cannonFrame(c, { wheel: 30, crew: push({ frontLeg: [-2, 0], backLeg: [2, 0] }) }),
    cannonFrame(c, { wheel: 45, crew: push({ body: [1, -1], backLeg: [0, -1] }) }),
  ];
  // Fire: raise the match, touch it to the vent, BOOM with recoil, smoke clears.
  const attack = [
    cannonFrame(c, { crew: { frontArm: -150, weapon: 40, backArm: 20, body: [0, -1] } }),
    cannonFrame(c, { crew: { frontArm: -100, weapon: 70, backArm: 10, body: [2, 0], frontLeg: [2, 0] }, crewDx: 2 }),
    cannonFrame(c, { crew: { frontArm: -85, weapon: 80, backArm: 0, body: [3, 0], frontLeg: [3, 0], backLeg: [-1, 0] }, crewDx: 2, spark: true }),
    cannonFrame(c, { dx: -2, recoil: -3, elev: -6, flash: 2, smoke: [1.1, 0], crew: { frontArm: -170, weapon: -10, backArm: -150, body: [-1, 0], headVariant: 'hurt' }, crewDx: -1 }),
    cannonFrame(c, { dx: -2, recoil: -1, elev: -3, flash: 1, smoke: [1.5, 0.1], crew: { frontArm: -60, weapon: 30, backArm: -20, body: [-1, 0] } }),
    cannonFrame(c, { dx: -1, smoke: [1.8, 0.45], crew: stand }),
  ];
  const hit = [cannonFrame(c, { dx: -2, elev: 4, crew: { ...stand, body: [-2, 0], head: [-1, 0], headVariant: 'hurt', frontArm: 5, backArm: 35 }, crewDx: -1 })];
  const death = [
    hit[0],
    cannonFrame(c, { dx: -2, elev: 10, crew: { ...stand, headVariant: 'hurt', frontArm: -120, backArm: -140 }, crewFall: -40, crewDx: 3, smoke: [1, 0.3] }),
    cannonFrame(c, { dx: -2, broken: true, crew: { ...stand, headVariant: 'hurt', frontArm: -120, backArm: -140 }, crewFall: -75, crewDx: 6, smoke: [1.3, 0.45] }),
    cannonFrame(c, { dx: -2, broken: true, crew: { ...stand, headVariant: 'hurt', frontArm: -120, backArm: -140 }, crewFall: -90, crewDx: 8 }),
  ];
  return [
    { name: 'idle', frames: idle, fps: 5, loop: true },
    { name: 'walk', frames: walk, fps: 8, loop: true },
    { name: 'attack', frames: attack, fps: 10, loop: false, hitFrame: 3 },
    { name: 'hit', frames: hit, fps: 8, loop: false },
    { name: 'death', frames: death, fps: 10, loop: false },
  ];
}
