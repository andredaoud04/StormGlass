/** Crusader Age troops: steel, mail and heraldic surcoats. */
import { Img, type Palette } from '../img';
import { BRONZE, HAIR, INK, LEATHER, LINEN, MOUTH, ROSE, SKIN, STEEL, WHITE, WOOD, BONE, type Ramp } from '../palette';
import type { RigParts } from '../rig';

export function medievalPal(team: Ramp): Palette {
  return {
    s: SKIN.base, S: SKIN.hl, k: SKIN.shade, K: SKIN.deep,
    h: HAIR.base, H: HAIR.hl, j: HAIR.shade,
    q: STEEL.hl, g: STEEL.base, p: STEEL.shade, P: STEEL.deep,
    c: STEEL.shade, C: STEEL.base,
    Z: BRONZE.hl, z: BRONZE.base, x: BRONZE.shade,
    T: team.base, U: team.hl, t: team.shade, Y: team.deep,
    W: LINEN.hl, w: LINEN.base, v: LINEN.shade,
    L: LEATHER.base, l: LEATHER.shade, M: LEATHER.hl,
    B: WOOD.base, b: WOOD.shade, D: WOOD.deep,
    n: BONE.shade,
    e: INK, o: WHITE, r: ROSE, m: MOUTH,
  };
}

export function darkPal(p: Palette): Palette {
  return { ...p, s: SKIN.shade, S: SKIN.base, k: SKIN.deep, g: STEEL.shade, q: STEEL.base, p: STEEL.deep, C: STEEL.shade, c: STEEL.deep, T: p.t, U: p.T, w: LINEN.shade, W: LINEN.base };
}

const g = (rows: string[], p: Palette) => Img.fromGrid(rows, p);

/** Kite shield: rounded top, pointed bottom, team field with a white band, steel rim. */
export function kiteShield(team: Ramp, w = 8, h = 12): Img {
  const img = new Img(w, h);
  for (let y = 0; y < h; y++) {
    const t = y / (h - 1);
    const half = t < 0.55 ? w / 2 : (w / 2) * (1 - (t - 0.55) / 0.45) + 0.5;
    for (let x = 0; x < w; x++) {
      const dx = Math.abs(x + 0.5 - w / 2);
      if (dx > half) continue;
      const edge = dx > half - 1 || y === 0;
      let c = edge ? (x < w / 2 ? STEEL.hl : STEEL.shade) : x < w / 2 - 1 ? team.hl : x > w / 2 ? team.shade : team.base;
      if (!edge && (y === Math.round(h * 0.4) || y === Math.round(h * 0.4) + 1)) c = WHITE;
      img.set(x, y, c);
    }
  }
  return img;
}

export function footmanRig(team: Ramp): RigParts {
  const p = medievalPal(team);
  const dk = darkPal(p);
  const head = [
    '....qqqg......',
    '...qqgggggp...',
    '..qggggggggp..',
    '..qggggggggp..',
    'PqggggggggggpP',
    '.PPPPPPPPPPPP.',
    '.cCckSSSSSSSs.',
    '.Cckksssssoess',
    '.cCksssssseess',
    '.Cckksssssssk.',
    '.cCcksssrsmms.',
    '..CcCkkkkssk..',
    '....cCcCcC....',
  ];
  const hurt = head.slice();
  hurt[7] = '.Cckksssssesss';
  hurt[8] = '.cCkssssssesss';
  hurt[10] = '.cCcksssrmmms.';
  const torso = ['..cCcCc..', '.CTTTTTc.', 'cTUTTTTtc', 'cTTooTTtc', '.LLLMLLL.', '.TTTUTTt.', '.TUTTtTt.', '.c.C.c.C.'];
  const arm = ['Cc.', 'cC.', 'Cc.', 'SSs', 'kss'];
  const leg = ['cCc.', 'CcC.', 'LLl.', 'LLLL'];
  const sword = ['..q..', '.qgp.', '.qgp.', '.qgp.', '.qgp.', '.qgp.', '.qgp.', '.qgp.', 'ZZzZZ', '..L..', '..L..', '..Z..'];
  return {
    frameW: 42,
    frameH: 38,
    hip: [19, 30],
    torso: { img: g(torso, p), pivot: [4, 7] },
    neck: [1, -7],
    frontShoulder: [2, -6],
    backShoulder: [-1, -6],
    frontHip: [1, 0],
    backHip: [-2, 0],
    heads: { normal: { img: g(head, p), pivot: [6, 12] }, hurt: { img: g(hurt, p), pivot: [6, 12] } },
    frontArm: { img: g(arm, p), pivot: [0, 0], tip: [1, 4] },
    backArm: { img: g(arm, dk), pivot: [0, 0], tip: [1, 4] },
    frontLeg: { img: g(leg, p), pivot: [1, 0] },
    backLeg: { img: g(leg, dk), pivot: [1, 0] },
    weapon: { img: g(sword, p), pivot: [2, 9] },
    offhand: { img: kiteShield(team), pivot: [4, 5] },
    offhandInFront: true,
    outline: INK,
  };
}

export function crossbowRig(team: Ramp): RigParts {
  const p = medievalPal(team);
  const dk = darkPal(p);
  const head = [
    '....tTTTt.....',
    '..tTTUUTTTt...',
    '.tTUUTTTTTTt..',
    'tTUTTTTTTTTTt.',
    'tTTTTTTTTTTTTt',
    'tTTtkSSSSSSSs.',
    'tTtkkSsssssoes',
    'tTtksssssseess',
    'tTtkkssssssssk',
    '.tTtksssrssmms',
    '..tTkkkssssk..',
    '...tTkkkkkk...',
  ];
  const hurt = head.slice();
  hurt[6] = 'tTtkkSssssssss';
  hurt[7] = 'tTtksssssesess';
  hurt[9] = '.tTtksssrsmmms';
  const torso = ['..wWWWv..', '.swvwwvs.', 'sSwTTwvsk', 'sswTTwvsk', '.LLMLLLl.', '.wvwwvwv.', '.wWwvwwv.', '.w.v.w.v.'];
  const arm = ['Ss.', 'ss.', 'ks.', 'SSs', 'kss'];
  const leg = ['wwv.', 'wvv.', 'LLl.', 'LLLL'];
  const crossbow = ['pp.....pp', '.pgggggp.', '...nBn...', '....B....', '...BBb...', '...BBb...', '...BBb...', '...LBb...', '...BBb...', '....b....'];
  return {
    frameW: 42,
    frameH: 36,
    hip: [18, 28],
    torso: { img: g(torso, p), pivot: [4, 7] },
    neck: [1, -7],
    frontShoulder: [2, -6],
    backShoulder: [-2, -6],
    frontHip: [1, 0],
    backHip: [-2, 0],
    heads: { normal: { img: g(head, p), pivot: [6, 11] }, hurt: { img: g(hurt, p), pivot: [6, 11] } },
    frontArm: { img: g(arm, p), pivot: [0, 0], tip: [1, 4] },
    backArm: { img: g(arm, dk), pivot: [0, 0], tip: [1, 4] },
    frontLeg: { img: g(leg, p), pivot: [1, 0] },
    backLeg: { img: g(leg, dk), pivot: [1, 0] },
    weapon: { img: g(crossbow, p), pivot: [4, 7] },
    outline: INK,
  };
}

export function knightRig(team: Ramp): RigParts {
  const p = medievalPal(team);
  const dk = darkPal(p);
  const head = [
    '...UTTt.........',
    '..UTTTTt........',
    '...tTTqqqqg.....',
    '.....qqgggggp...',
    '....qgggggggggp.',
    '...qggggggggggp.',
    '...qgggggggggggp',
    '...qggggPPPPPPPp',
    '...qgggggggPgPgp',
    '...qgggggggggggp',
    '...pgggggggggggp',
    '....ppgggggggpp.',
    '......pppppp....',
  ];
  const hurt = head.slice();
  hurt[7] = '...qggggPPgPPPPp';
  hurt[9] = '...qggggPggggggp';
  const torso = ['...qgggggp...', '.qqgTTTTTgpp.', 'qggTTUTTTTgpp', 'qgTTooTTTTtpp', 'qgTTTTTTTTtpp', '.ggTTTTTTTtp.', '..LLLMLLLLLL.', '..TTUTTTTTTt.', '..TUTTTtTTTt.', '..TTTTtTTTtt.', '..T.t.T.t.T..'];
  const arm = ['qgp.', 'qggp', 'qggp', 'pggp', '.qgp', 'qggp', 'pggp'];
  const leg = ['qggp.', 'qggp.', 'qggp.', 'pgggp', 'PPPPP'];
  const mace = ['.qgp.', 'qgggp', 'qgpgp', 'qgggp', '.pPp.', '..B..', '..B..', '..B..', '..B..', '..B..', '..L..', '..L..', '..b..'];
  return {
    frameW: 52,
    frameH: 46,
    hip: [24, 37],
    torso: { img: g(torso, p), pivot: [6, 10] },
    neck: [1, -10],
    frontShoulder: [4, -9],
    backShoulder: [-2, -9],
    frontHip: [2, 0],
    backHip: [-3, 0],
    heads: { normal: { img: g(head, p), pivot: [9, 12] }, hurt: { img: g(hurt, p), pivot: [9, 12] } },
    frontArm: { img: g(arm, p), pivot: [1, 0], tip: [1, 6] },
    backArm: { img: g(arm, dk), pivot: [1, 0], tip: [1, 6] },
    frontLeg: { img: g(leg, p), pivot: [1, 0] },
    backLeg: { img: g(leg, dk), pivot: [1, 0] },
    weapon: { img: g(mace, p), pivot: [2, 10] },
    offhand: { img: kiteShield(team, 10, 15), pivot: [5, 6] },
    offhandInFront: true,
    outline: INK,
  };
}
