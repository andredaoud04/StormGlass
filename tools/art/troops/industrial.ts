/** Industrial Age troops: steel helmets, puttees and rifles, and a riveted Steam Walker. */
import { hex, type Img } from '../img';
import { BRONZE, DRAB, IRON, KHAKI, WHITE, type Ramp } from '../palette';
import type { RigParts } from '../rig';
import { darkOf, grid, groups, hurtHead, palOf } from './kit';
import { bipedAnims, bipedFrame, type BipedRig } from './machines';

const over = { extra: DRAB, extra2: KHAKI };

const BRODIE = ['....FFGGG.....', '...FGGGGGGf...', '..FGGGGGGGGf..', 'fGGGGGGGGGGGGf', '.EEEEEEEEEEEE.'];

function soldierHead(): { head: string[]; hurt: string[] } {
  const head = [...BRODIE, 'jhhkSSSSSSSSs.', 'jhkkSssssswess', 'jhkksssssseess', 'jhkkfksssssssk', '.jhkfssssrsmms', '..jkfkssssssk.', '....kkkkkkk...'];
  const hurt = hurtHead(head, { 6: 'jhkkSsssssesss', 7: 'jhkksssssssess', 9: '.jhkfssssrmmms' });
  return { head, hurt };
}

function base(team: Ramp, weapon: { img: Img; pivot: [number, number] }, back?: { img: Img; pivot: [number, number] }): RigParts {
  const gs = groups(team, over);
  const p = palOf(gs);
  const dk = darkOf(gs);
  const { head, hurt } = soldierHead();
  const torso = ['..UTTTt..', '.TTiTTTt.', 'TUTiTTttt', 'TTTiTTttt', '.iiIziiu.', '.iIiiiiu.', '.iIiuiiu.', '.i.u.i.u.'];
  const arm = ['UT.', 'Tt.', 'Tt.', 'SSs', 'kss'];
  const leg = ['iiu.', 'IiJ.', 'iuJ.', 'LLLL'];
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
    heads: { normal: { img: grid(head, p), pivot: [6, 11] }, hurt: { img: grid(hurt, p), pivot: [6, 11] } },
    frontArm: { img: grid(arm, p), pivot: [0, 0], tip: [1, 4] },
    backArm: { img: grid(arm, dk), pivot: [0, 0], tip: [1, 4] },
    frontLeg: { img: grid(leg, p), pivot: [1, 0] },
    backLeg: { img: grid(leg, dk), pivot: [1, 0] },
    weapon,
    ...(back ? { back } : {}),
  };
}

export function trencherRig(team: Ramp): RigParts {
  const p = palOf(groups(team, over));
  const club = ['.q.q.', 'qgggp', '.ggp.', 'qgggp', '.ggp.', '..B..', '..B..', '..B..', '..b..', '..L..', '..L..'];
  return base(team, { img: grid(club, p), pivot: [2, 9] });
}

export function riflemanRig(team: Ramp): RigParts {
  const p = palOf(groups(team, over));
  const rifle = ['.q..', '.p..', '.p..', '.p..', '.pB.', '.pB.', '.pB.', '.pB.', '.pB.', '.pBb', 'qpBb', '.zBb', '..Bb', '.CBb', 'CBBb', 'CBBb', 'BBbb', 'bbD.'];
  const pack = ['.uu.', 'iIiu', 'iIiu', 'iiuu', '.uu.'];
  return base(team, { img: grid(rifle, p), pivot: [1, 11] }, { img: grid(pack, p), pivot: [5, 1] });
}

// ---------- Steam Walker ----------

function walkerBody(team: Ramp, hurt: boolean): Img {
  const gs = groups(team, { ...over, metal: IRON });
  const p = palOf(gs);
  const rows = [
    '..PP................',
    '.qgpP...............',
    '..gp......FGGGf.....',
    '..gp.....FGGGGGf....',
    hurt ? '..gp.....fZoZZmk....' : '..gp.....fZoZZsk....',
    '..gp....qqsssssskq..',
    '.qqqqqqqgTTTTTTTtgp.',
    'qgggggggzTUUTTTTtxpP',
    'qgzzzzzggTUTTTTttgpP',
    'qggggggggTTTTTTttgpP',
    'qgZZZgggggggggggggpP',
    'qgZoZgggzzzzzzzzxxpP',
    'qgZZZggggggggggggppP',
    'qgzzzzzzzzzzzzzzzxxP',
    'qgggggggggggggggggpP',
    '.ppppppppppppppppPP.',
    '..PPPPPPPPPPPPPPPP..',
  ];
  p.G = DRAB.base;
  p.F = DRAB.hl;
  p.f = DRAB.shade;
  return grid(rows, p);
}

export function walkerRig(team: Ramp): BipedRig {
  const p = palOf(groups(team, { metal: IRON }));
  const arm = ['.qgp.', 'qggpP', '.zxx.', '.zx..', '.zx..', '.gp..', 'qggpP', 'qgggP', 'gggpP', '.PPP.'];
  const foot = ['.qggp..', 'qggggpP', 'PPPPPPP'];
  return {
    frameW: 56,
    frameH: 50,
    hip: [26, 42],
    body: walkerBody(team, false),
    hurtBody: walkerBody(team, true),
    bodyPivot: [10, 16],
    pelvisH: 13,
    frontHip: 3,
    backHip: -3,
    thigh: 6,
    shin: 7,
    legW: [5, 4],
    legRamp: { hl: IRON.hl, base: IRON.base, shade: IRON.shade, deep: IRON.deep },
    shinRamp: { hl: BRONZE.hl, base: BRONZE.base, shade: BRONZE.shade, deep: BRONZE.deep },
    foot: grid(foot, p),
    ankle: [3, 0],
    knee: 1,
    arm: { img: grid(arm, p), pivot: [2, 1] },
    shoulder: [8, -8],
    stride: 3,
  };
}

const STEAM = [hex('#ffffff'), hex('#e8eef4'), hex('#c4ccd8')];
function puff(f: Img, x: number, y: number, r: number): void {
  f.ellipse(x, y, r, r * 0.85, (_x, _y, nx, ny) => (ny > 0.35 ? STEAM[2] : nx + ny < -0.4 ? STEAM[0] : STEAM[1]));
}

export function walkerAnims(rig: BipedRig): ReturnType<typeof bipedAnims> {
  // Stack top sits at body (3..4, 0); relative to the pelvis that is (-8, -14).
  const stack = (r: number, rise = 0) => (f: Img, pv: [number, number]) => puff(f, pv[0] - 7 - rise / 2, pv[1] - 19 - rise, r);
  const vent = (f: Img, pv: [number, number]) => {
    puff(f, pv[0] - 12, pv[1] - 2, 2.5);
    puff(f, pv[0] + 12, pv[1] - 4, 2);
  };
  const slam = (f: Img, pv: [number, number]) => {
    puff(f, pv[0] + 18, pv[1] + 8, 3.5);
    puff(f, pv[0] + 23, pv[1] + 5, 2.6);
    puff(f, pv[0] + 13, pv[1] + 10, 2.2);
    f.set(pv[0] + 22, pv[1] + 9, WHITE);
    f.set(pv[0] + 14, pv[1] + 10, WHITE);
    stack(3, 1)(f, pv);
  };
  const attack = [
    { body: [-1, 0] as [number, number], arm: -120 },
    { body: [-2, -1] as [number, number], arm: -170, fx: stack(2.5) },
    { body: [-2, -1] as [number, number], arm: -190, fx: stack(3, 2) },
    { body: [2, 1] as [number, number], arm: -70, front: [2, 0] as [number, number], fx: slam },
    { body: [1, 1] as [number, number], arm: -60, front: [2, 0] as [number, number], fx: stack(3.5, 5) },
    { body: [0, 0] as [number, number], arm: -40 },
  ];
  const hurt = { body: [-2, 0] as [number, number], arm: 10, bodyImg: rig.hurtBody, fx: vent };
  return bipedAnims(rig, -25, attack, hurt, (f, pv) => {
    stack(2.2, 0)(f, pv);
  });
}

void bipedFrame;
void KHAKI;
