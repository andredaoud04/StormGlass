/** Ancient Age troops: bronze, linen and crested helmets. */
import { Img, type Palette } from '../img';
import { BRONZE, HAIR, INK, LEATHER, LINEN, MOUTH, ROSE, SKIN, STEEL, WHITE, WOOD, BONE, type Ramp } from '../palette';
import type { RigParts } from '../rig';

function pal(team: Ramp): Palette {
  return {
    s: SKIN.base, S: SKIN.hl, k: SKIN.shade, K: SKIN.deep,
    h: HAIR.base, H: HAIR.hl, j: HAIR.shade,
    Z: BRONZE.hl, z: BRONZE.base, x: BRONZE.shade, X: BRONZE.deep,
    T: team.base, U: team.hl, t: team.shade, Y: team.deep,
    W: LINEN.hl, w: LINEN.base, v: LINEN.shade,
    L: LEATHER.base, l: LEATHER.shade, M: LEATHER.hl,
    B: WOOD.base, C: WOOD.hl, b: WOOD.shade, D: WOOD.deep,
    q: STEEL.hl, g: STEEL.base, p: STEEL.shade, P: STEEL.deep,
    n: BONE.shade,
    e: INK, o: WHITE, r: ROSE, m: MOUTH,
  };
}

function dark(p: Palette): Palette {
  return { ...p, s: SKIN.shade, S: SKIN.base, k: SKIN.deep, z: BRONZE.shade, Z: BRONZE.base, x: BRONZE.deep, T: p.t, U: p.T, w: LINEN.shade, W: LINEN.base };
}

const g = (rows: string[], p: Palette) => Img.fromGrid(rows, p);

function roundShield(team: Ramp, r: number): Img {
  const d = r * 2 + 1;
  const img = new Img(d, d);
  img.ellipse(r + 0.5, r + 0.5, r + 0.5, r + 0.5, (_x, _y, nx, ny) => {
    const dist = Math.hypot(nx, ny);
    if (dist > 0.78) return nx + ny < -0.3 ? BRONZE.hl : nx + ny > 0.4 ? BRONZE.deep : BRONZE.base;
    if (dist < 0.22) return BRONZE.hl;
    return nx + ny < -0.4 ? team.hl : nx + ny > 0.5 ? team.shade : team.base;
  });
  return img;
}

function towerShield(team: Ramp): Img {
  const W = 9, H = 17;
  const img = new Img(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const rim = x === 0 || x === W - 1 || y === 0 || y === H - 1;
    let c = rim ? (x === 0 || y === 0 ? BRONZE.hl : BRONZE.shade) : x < 3 ? team.hl : x > 6 ? team.shade : team.base;
    if (!rim && (y === 4 || y === 12)) c = BRONZE.base;
    img.set(x, y, c);
  }
  // Boss in the centre.
  img.rect(3, 7, 3, 3, BRONZE.base);
  img.set(3, 7, BRONZE.hl);
  img.set(5, 9, BRONZE.deep);
  // Rounded corners.
  for (const [x, y] of [[0, 0], [W - 1, 0], [0, H - 1], [W - 1, H - 1]]) img.set(x, y, 0);
  return img;
}

export function spearmanRig(team: Ramp): RigParts {
  const p = pal(team);
  const dk = dark(p);
  const head = [
    '...ttTTTTU....',
    '..tTTTTTTTU...',
    '...xZZZZZzx...',
    '..xZZZzzzzzx..',
    '.xZZzzzzzzzzx.',
    'xZzzzzzzzzzzzx',
    'xzzzXXXXXXXXXX',
    'xzzXkSSSSSSSs.',
    'xzzXksssssoess',
    'xzzXkssssseess',
    '.xzXkksssssssk',
    '..XXkkssrssmms',
    '...Xkkkkssssk.',
    '....kkkkkkk...',
  ];
  const hurt = head.slice();
  hurt[8] = 'xzzXksssssesss';
  hurt[9] = 'xzzXksssssseSs';
  hurt[11] = '..XXkkssrsmmms';
  const torso = ['..ZzzzZ..', '.sZZzzzs.', 'sSZzzzxsk', 'ssxzzzxsk', '.LLLMLLL.', '.TTUTTTt.', '.TUTTtTt.', '.T.t.T.t.'];
  const arm = ['Ss.', 'ss.', 'ks.', 'SSs', 'kss'];
  const leg = ['kss.', 'kss.', 'kLs.', 'LLLL'];
  const spear = ['.Z.', 'ZZx', 'ZZx', '.z.', '.C.', '.B.', '.B.', '.B.', '.B.', '.B.', '.B.', '.B.', '.B.', '.B.', '.B.', '.b.', '.b.'];
  return {
    frameW: 44,
    frameH: 38,
    hip: [19, 30],
    torso: { img: g(torso, p), pivot: [4, 7] },
    neck: [1, -7],
    frontShoulder: [2, -6],
    backShoulder: [-1, -6],
    frontHip: [1, 0],
    backHip: [-2, 0],
    heads: { normal: { img: g(head, p), pivot: [6, 13] }, hurt: { img: g(hurt, p), pivot: [6, 13] } },
    frontArm: { img: g(arm, p), pivot: [0, 0], tip: [1, 4] },
    backArm: { img: g(arm, dk), pivot: [0, 0], tip: [1, 4] },
    frontLeg: { img: g(leg, p), pivot: [1, 0] },
    backLeg: { img: g(leg, dk), pivot: [1, 0] },
    weapon: { img: g(spear, p), pivot: [1, 11] },
    offhand: { img: roundShield(team, 5), pivot: [5, 5] },
    offhandInFront: true,
    outline: INK,
  };
}

export function archerRig(team: Ramp): RigParts {
  const p = pal(team);
  const dk = dark(p);
  const head = [
    '.....lL.......',
    '....lLLM......',
    '...lLLLMM.....',
    '..lLLLLLMM....',
    '.lLLLLLLLLMM..',
    'lLTTUUTTTTTTt.',
    'jhhkSSSSSSSSs.',
    'jhkkSssssssoes',
    'jhkksssssseess',
    'jhkksssssssssk',
    '.jhkkssssrsmms',
    '..jkkkssssssk.',
    '....kkkkkkk...',
  ];
  const hurt = head.slice();
  hurt[7] = 'jhkkSssssssess';
  hurt[8] = 'jhkkssssssesss';
  hurt[10] = '.jhkkssssrmmms';
  const torso = ['..wWWWv..', '.sWwTwvs.', 'sSwTTwvsk', 'sswwTTvsk', '.LLMLLLl.', '.wWwwwwv.', '.wWwvwwv.', '.w.v.w.v.'];
  const arm = ['Ss.', 'ss.', 'ks.', 'SSs', 'kss'];
  const leg = ['kss.', 'kss.', 'kLs.', 'LLLL'];
  const bow = ['nB...', 'n.B..', 'n..B.', 'n...B', 'n...B', 'n...B', 'n...b', 'n..Mb', 'n...b', 'n...B', 'n...B', 'n...B', 'n..B.', 'n.B..', 'nB...'];
  const quiver = ['.ZZ.', 'LMLl', 'LMLl', 'LMLl', 'LMLl', 'LLll', '.ll.'];
  return {
    frameW: 40,
    frameH: 36,
    hip: [18, 28],
    torso: { img: g(torso, p), pivot: [4, 7] },
    neck: [1, -7],
    frontShoulder: [2, -6],
    backShoulder: [-2, -6],
    frontHip: [1, 0],
    backHip: [-2, 0],
    heads: { normal: { img: g(head, p), pivot: [6, 12] }, hurt: { img: g(hurt, p), pivot: [6, 12] } },
    frontArm: { img: g(arm, p), pivot: [0, 0], tip: [1, 4] },
    backArm: { img: g(arm, dk), pivot: [0, 0], tip: [1, 4] },
    frontLeg: { img: g(leg, p), pivot: [1, 0] },
    backLeg: { img: g(leg, dk), pivot: [1, 0] },
    weapon: { img: g(bow, p), pivot: [3, 7] },
    back: { img: g(quiver, p), pivot: [5, 1] },
    outline: INK,
  };
}

export function shieldwallRig(team: Ramp): RigParts {
  const p = pal(team);
  const dk = dark(p);
  const head = [
    '....ttTTTTTTU...',
    '...tTTTTTTTTTU..',
    '....xZZZZZZZzx..',
    '...xZZZzzzzzzzx.',
    '..xZZzzzzzzzzzzx',
    '.xZzzzzzzzzzzzzx',
    '.xzzzzXXXXXXXXXX',
    'xzzzzXkSSSSSSSs.',
    'xzzzzXksssssoes.',
    'xzzzzXksssssees.',
    '.xzzzXkkssssssk.',
    '..xxXXkkssrsmms.',
    '....XXkkkkssss..',
    '......kkkkkk....',
  ];
  const hurt = head.slice();
  hurt[8] = 'xzzzzXkssssseSs.';
  hurt[9] = 'xzzzzXksssssses.';
  hurt[11] = '..xxXXkkssrmmms.';
  const torso = [
    '...zZZZZzx...',
    '.zZZZZzzzzzx.',
    'zZZzZZzzzzzxx',
    'zZzzzzzzzzxxx',
    'zZzzZzzzzzzxx',
    '.zzzzzzzzzxx.',
    '..LLLMLLLLLL.',
    '..ZTZTZTZTZt.',
    '..ZTZTZTZTZt.',
    '..ZTZTZTZTZt.',
    '..z.z.z.z.z..',
  ];
  const arm = ['zZz.', 'Ssss', 'ssss', 'ksss', '.kss', 'SSSs', 'ksss'];
  const leg = ['ksss.', 'zZzz.', 'zZzz.', 'xzzzL', 'LLLLL'];
  const sword = ['.q.', 'qgp', 'qgp', 'qgp', 'qgp', 'qgp', 'qgp', 'ZZZ', '.L.', '.L.'];
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
    heads: { normal: { img: g(head, p), pivot: [7, 13] }, hurt: { img: g(hurt, p), pivot: [7, 13] } },
    frontArm: { img: g(arm, p), pivot: [1, 0], tip: [1, 6] },
    backArm: { img: g(arm, dk), pivot: [1, 0], tip: [1, 6] },
    frontLeg: { img: g(leg, p), pivot: [1, 0] },
    backLeg: { img: g(leg, dk), pivot: [1, 0] },
    weapon: { img: g(sword, p), pivot: [1, 8] },
    offhand: { img: towerShield(team), pivot: [4, 8] },
    offhandInFront: true,
    outline: INK,
  };
}
