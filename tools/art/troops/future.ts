/** Future Age troops: alloy plate over dark suits, team-glow energy weapons, and a battle Mech. */
import { hex, type Img } from '../img';
import { ALLOY, PLASMA, SUIT, WHITE, type Ramp } from '../palette';
import type { RigParts } from '../rig';
import { darkOf, grid, groups, hurtHead, palOf } from './kit';
import { bipedAnims, type BipedRig } from './machines';

const over = { metal: ALLOY, extra: SUIT, extra2: PLASMA };

function trooper(team: Ramp, head: string[], hurt: string[], weapon: { rows: string[]; pivot: [number, number] }, back?: { rows: string[]; pivot: [number, number] }): RigParts {
  const gs = groups(team, over);
  const p = palOf(gs);
  const dk = darkOf(gs);
  const torso = ['..qggpp..', '.GUTTTtG.', 'GFUTiTtGf', 'GGTTTttGf', '.ppPiPpP.', '.GGFGGGf.', '.GFGGfGf.', '.g.p.g.p.'];
  const arm = ['qg.', 'Gf.', 'Gf.', 'ggp', 'gpp'];
  const leg = ['GGf.', 'qgp.', 'gpp.', 'PPPP'];
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
    heads: { normal: { img: grid(head, p), pivot: [6, head.length - 1] }, hurt: { img: grid(hurt, p), pivot: [6, hurt.length - 1] } },
    frontArm: { img: grid(arm, p), pivot: [0, 0], tip: [1, 4] },
    backArm: { img: grid(arm, dk), pivot: [0, 0], tip: [1, 4] },
    frontLeg: { img: grid(leg, p), pivot: [1, 0] },
    backLeg: { img: grid(leg, dk), pivot: [1, 0] },
    weapon: { img: grid(weapon.rows, p), pivot: weapon.pivot },
    ...(back ? { back: { img: grid(back.rows, p), pivot: back.pivot } } : {}),
  };
}

export function ionBladeRig(team: Ramp): RigParts {
  // Finned alloy helmet with a team stripe and a glowing comm light.
  const head = [
    '....qUTTt.....',
    '..UUTTTTTTt...',
    '.UTTTTTTTTTt..',
    'UTTqqqqqqTTtt.',
    'UTTTTTTTTTTtt.',
    'TTtYSSSSSSSSs.',
    'TTtYSssssswess',
    'TTtksssssseess',
    'TItksssssssssk',
    '.TtYksssrssmms',
    '..tYkkssssssk.',
    '...YYkkkkkkk..',
  ];
  const hurt = hurtHead(head, { 6: 'TTtYSsssssesss', 7: 'TTtksssssssess', 9: '.TtYksssrsmmms' });
  const sword = ['.U.', 'UIT', 'UIT', 'UIT', 'UIT', 'UIT', 'UIT', 'UIT', 'qgp', '.P.', '.g.'];
  return trooper(team, head, hurt, { rows: sword, pivot: [1, 9] });
}

export function lancerRig(team: Ramp): RigParts {
  // Visor across the eyes glows in the team colour; a short team cape.
  const head = [
    '....qqqqq.....',
    '..qqggggggp...',
    '.qgggggggggp..',
    'qgggggggggggp.',
    'qggPPPPPPPPPp.',
    'qgpPSUUUUUUUU.',
    'qgpPSTTTTTTTTs',
    'qgpksssssssssk',
    'qIpksssrssmmms',
    '.qgpkkssssssk.',
    '..pPPkkkkkkk..',
  ];
  const hurt = hurtHead(head, { 5: 'qgpPSUoUUUoUU.', 8: 'qIpksssrsmmmms' });
  const rifle = ['.U..', '.q..', 'qgp.', '.gp.', '.gp.', '.gpU', '.gpT', '.gpp', 'qggp', '.Pgp', '..gp', '..PP'];
  const cape = ['TTt', 'TUt', 'TTt', 'TTt', 'Ttt', 'tY.'];
  return trooper(team, head, hurt, { rows: rifle, pivot: [1, 8] }, { rows: cape, pivot: [2, 0] });
}

// ---------- Mech ----------

function mechBody(team: Ramp, hurt: boolean): Img {
  const p = palOf(groups(team, over));
  const v = hurt ? 'r' : 'i';
  const rows = [
    '.....qqqqq........',
    '....qgggggp.......',
    `....qgP${v}${v}${v}Pp......`,
    '....pgggggpP......',
    '..qqqqqqqqqqqqqp..',
    '.qUUUUUUUUUUUUUtP.',
    'qUTTTTTTTgIIgTTttP',
    'qUTTTTTTTgIigTTttP',
    'qUTTTTTTTTggTTtttP',
    'qgTTTTTTTTTTTtttPP',
    '.qggggggggggggpPP.',
    '..ppppppppppppPP..',
    '....GGGGGGGGGf....',
    '.....FGGGGGGf.....',
  ];
  return grid(rows, p);
}

export function mechRig(team: Ramp): BipedRig {
  const p = palOf(groups(team, over));
  const cannon = ['.qgp..', 'qgggp.', 'qgTgp.', 'qgggp.', '.FGf..', 'qgggpP', 'qgggpP', 'qgggpP', 'qgggpP', '.PPPP.', '.iIi..'];
  const pod = ['qggp', 'qTTp', 'qIIp', 'PPPP'];
  const foot = ['..qgp..', '.qgggp.', 'qggggpq', 'PPPPPPP'];
  return {
    frameW: 56,
    frameH: 50,
    hip: [26, 42],
    body: mechBody(team, false),
    hurtBody: mechBody(team, true),
    bodyPivot: [9, 13],
    pelvisH: 14,
    frontHip: 3,
    backHip: -3,
    thigh: 7,
    shin: 7,
    legW: [5, 4],
    legRamp: { hl: ALLOY.hl, base: ALLOY.base, shade: ALLOY.shade, deep: ALLOY.deep },
    shinRamp: { hl: SUIT.hl, base: SUIT.base, shade: SUIT.shade, deep: SUIT.deep },
    foot: grid(foot, p),
    ankle: [3, 0],
    knee: 1,
    arm: { img: grid(cannon, p), pivot: [2, 1] },
    shoulder: [6, -9],
    backArm: { img: grid(pod, p), pivot: [2, 3] },
    backShoulder: [-6, -12],
    stride: 3,
  };
}

const GLOW = [WHITE, PLASMA.base, PLASMA.shade, PLASMA.deep];

function glow(f: Img, x: number, y: number, r: number): void {
  f.ellipse(x, y, r, r, (_x, _y, nx, ny) => {
    const d = Math.hypot(nx, ny);
    return d < 0.35 ? GLOW[0] : d < 0.6 ? GLOW[1] : d < 0.85 ? GLOW[2] : GLOW[3];
  });
}

export function mechAnims(rig: BipedRig): ReturnType<typeof bipedAnims> {
  // Cannon muzzle: shoulder + 10 px along the arm (arm at -90 points forward).
  const muzzle = (pv: [number, number], deg: number): [number, number] => {
    const a = ((deg + 90) * Math.PI) / 180;
    return [pv[0] + rig.shoulder[0] + Math.cos(a) * 11, pv[1] + rig.shoulder[1] + 1 + Math.sin(a) * 11];
  };
  const charge = (r: number, deg: number) => (f: Img, pv: [number, number]) => {
    const [x, y] = muzzle(pv, deg);
    glow(f, x, y, r);
  };
  const blast = (f: Img, pv: [number, number]) => {
    const [x, y] = muzzle(pv, -88);
    glow(f, x + 2, y, 4.5);
    for (let i = 0; i < 9; i++) f.set(x + 6 + i, y, i < 6 ? WHITE : PLASMA.base);
    f.hline(x + 5, x + 12, y - 1, PLASMA.shade);
    f.hline(x + 5, x + 12, y + 1, PLASMA.shade);
    for (const [dx, dy] of [[3, -5], [4, 5], [7, -3], [7, 3]]) f.set(x + dx, y + dy, PLASMA.base);
  };
  const attack = [
    { body: [0, 0] as [number, number], arm: -60, backArm: -10 },
    { body: [-1, 0] as [number, number], arm: -90, fx: charge(1.5, -90) },
    { body: [-1, 0] as [number, number], arm: -90, fx: charge(2.5, -90) },
    { body: [-3, 0] as [number, number], arm: -88, back: [-1, 0] as [number, number], fx: blast },
    { body: [-2, 0] as [number, number], arm: -80, fx: charge(2, -80) },
    { body: [0, 0] as [number, number], arm: -45 },
  ];
  const sparks = (f: Img, pv: [number, number]) => {
    for (const [dx, dy] of [[8, -6], [10, -2], [-7, -8], [5, 2]]) f.set(pv[0] + dx, pv[1] + dy, hex('#ffe68a'));
  };
  const hurt = { body: [-2, 0] as [number, number], arm: -10, bodyImg: rig.hurtBody, fx: sparks };
  return bipedAnims(rig, -30, attack, hurt);
}
