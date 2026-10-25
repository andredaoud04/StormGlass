import { Img, type Palette } from '../img';
import { BONE, FUR, HAIR, HAIR_RED, INK, LEATHER, MOUTH, ROSE, SKIN, STONE, WHITE, WOOD, type Ramp } from '../palette';
import type { RigParts } from '../rig';

function basePal(team: Ramp): Palette {
  return {
    h: HAIR.base, H: HAIR.hl, j: HAIR.shade, J: HAIR.deep,
    s: SKIN.base, S: SKIN.hl, k: SKIN.shade, K: SKIN.deep,
    F: FUR.base, G: FUR.hl, f: FUR.shade, d: FUR.deep,
    T: team.base, U: team.hl, t: team.shade, Y: team.deep,
    B: WOOD.base, C: WOOD.hl, b: WOOD.shade, D: WOOD.deep,
    L: LEATHER.base, l: LEATHER.shade, M: LEATHER.hl,
    g: STONE.base, q: STONE.hl, p: STONE.shade, P: STONE.deep,
    o: BONE.base, O: BONE.hl, n: BONE.shade,
    e: INK, w: WHITE, r: ROSE, m: MOUTH,
  };
}

/** Back limbs use a darker version of the same grid. */
function shadePal(p: Palette): Palette {
  return {
    ...p,
    s: SKIN.shade, S: SKIN.base, k: SKIN.deep,
    F: FUR.shade, G: FUR.base, f: FUR.deep,
    B: WOOD.shade, C: WOOD.base, b: WOOD.deep,
    T: p.t, U: p.T,
  };
}

const g = (rows: string[], pal: Palette) => Img.fromGrid(rows, pal);

export function clubberRig(team: Ramp): RigParts {
  const pal = basePal(team);
  const dark = shadePal(pal);
  const head = [
    '....jhhhhj....',
    '..jhhHHHHhhj..',
    '.jhHHhhhhhhhj.',
    '.jhhhhhhhhhhhj',
    'jhhTUUUTTTTTTt',
    'jhhtSSSSSSSSSs',
    'jhkkSssssswess',
    'jhkksssssseess',
    'jhkksssssssssk',
    '.jhkkssssrsmms',
    '..jkkkssssssk.',
    '....kkkkkkk...',
  ];
  const hurt = head.slice();
  hurt[6] = 'jhkkSsssssesss';
  hurt[7] = 'jhkksssssssess';
  hurt[8] = 'jhkksssssesssk';
  hurt[9] = '.jhkkssssrmmms';
  const torso = [
    '..kSFGFG.',
    '.ssSGFFfs',
    'sSsGFFdfk',
    'sssFFdFfk',
    '.tTUTTTt.',
    '.FFdFFFf.',
    '.GFFfFdf.',
    '.F.f.F.f.',
  ];
  const arm = ['Ss.', 'ss.', 'ks.', 'SSs', 'kss'];
  const leg = ['kss.', 'kss.', 'FGF.', 'fFFF'];
  const club = [
    '.CBB.',
    'CBBBb',
    'CBDBb',
    'BBBbb',
    '.BBb.',
    '.Bb..',
    '.Bb..',
    '.Bb..',
    '.Bb..',
    '.UT..',
    '.Tt..',
    '.bD..',
  ];
  return {
    frameW: 40,
    frameH: 36,
    hip: [18, 28],
    torso: { img: g(torso, pal), pivot: [4, 7] },
    neck: [1, -7],
    frontShoulder: [2, -6],
    backShoulder: [-2, -6],
    frontHip: [1, 0],
    backHip: [-2, 0],
    heads: { normal: { img: g(head, pal), pivot: [6, 11] }, hurt: { img: g(hurt, pal), pivot: [6, 11] } },
    frontArm: { img: g(arm, pal), pivot: [0, 0], tip: [1, 4] },
    backArm: { img: g(arm, dark), pivot: [0, 0], tip: [1, 4] },
    frontLeg: { img: g(leg, pal), pivot: [1, 0] },
    backLeg: { img: g(leg, dark), pivot: [1, 0] },
    weapon: { img: g(club, pal), pivot: [1, 10] },
    outline: INK,
  };
}

export function slingerRig(team: Ramp): RigParts {
  const pal = { ...basePal(team), h: HAIR_RED.base, H: HAIR_RED.hl, j: HAIR_RED.shade, J: HAIR_RED.deep };
  const dark = shadePal(pal);
  const head = [
    '......Ut......',
    '....jhUthj....',
    '..jhhHHHhhhj..',
    '.jhHHhhhhhhhj.',
    'jjhhhhhhhhhhhj',
    'jhhhhSSSSSSSs.',
    'jhhkSssssswess',
    'jhkksssssseess',
    'jjkksssrsrsssk',
    '.Jjkksssssmms.',
    '..jjkkksssssk.',
    '....kkkkkkk...',
  ];
  const hurt = head.slice();
  hurt[6] = 'jhhkSsssssesss';
  hurt[7] = 'jhkksssssssess';
  hurt[8] = 'jjkksssrsesssk';
  hurt[9] = '.Jjkksssssmmm.';
  const torso = [
    '..UTTTt..',
    '.sTTtTLs.',
    'sSLMLLLlk',
    'ssLMLlLlk',
    '.lLLLLLl.',
    '.DbDbDbD.',
    '.LLlLLlL.',
    '.L.l.L.l.',
  ];
  const arm = ['Ss.', 'ss.', 'ks.', 'SSs', 'kss'];
  const leg = ['LLl.', 'lLl.', 'MLl.', 'lLLL'];
  const sling = ['.l.', '.l.', '.l.', '.l.', '.l.', 'lgl', '.p.'];
  const slingEmpty = ['.l.', '.l.', '.l.', '.l.', '.l.', 'l.l'];
  return {
    frameW: 40,
    frameH: 36,
    hip: [18, 28],
    torso: { img: g(torso, pal), pivot: [4, 7] },
    neck: [1, -7],
    frontShoulder: [2, -6],
    backShoulder: [-2, -6],
    frontHip: [1, 0],
    backHip: [-2, 0],
    heads: { normal: { img: g(head, pal), pivot: [6, 11] }, hurt: { img: g(hurt, pal), pivot: [6, 11] } },
    frontArm: { img: g(arm, pal), pivot: [0, 0], tip: [1, 4] },
    backArm: { img: g(arm, dark), pivot: [0, 0], tip: [1, 4] },
    frontLeg: { img: g(leg, pal), pivot: [1, 0] },
    backLeg: { img: g(leg, dark), pivot: [1, 0] },
    weapon: { img: g(sling, pal), pivot: [1, 0] },
    weaponAlt: { img: g(slingEmpty, pal), pivot: [1, 0] },
    outline: INK,
  };
}

export function bruteRig(team: Ramp): RigParts {
  const pal = basePal(team);
  const dark = shadePal(pal);
  const head = [
    'On............O.',
    'nO...........On.',
    '.no.ooooooo.on..',
    '..nooOOOOOOoon..',
    '..noOOooooooon..',
    '..nnoooooooonn..',
    '.jhnnnnnnnnnnnj.',
    'jhhkSSSSSSSSSss.',
    'jhkksssssseesss.',
    'jhkksTTsssssssk.',
    'jhhkssssshhhhhs.',
    '.jhhhkhhhhmmhhh.',
    '..jjhhhhhhhhhj..',
    '....jjjjjjjj....',
  ];
  const hurt = head.slice();
  hurt[8] = 'jhkksssssesssss.';
  hurt[9] = 'jhkksTTsssssesk.';
  hurt[11] = '.jhhhkhhhmmmmhh.';
  const torso = [
    '...dfFGGFfd..',
    '.dfFGGFFFFfd.',
    'dfFFFsSSsFFfd',
    'dfFdsSSsssFfd',
    '.ddssSssssskd',
    '..sssssssssk.',
    '..tTUTTTTTTt.',
    '..FFdFFFdFFf.',
    '..GFFfFFFfFf.',
    '..FdFFdFFFdf.',
    '..F.f.F.f.F..',
  ];
  const arm = ['SSs.', 'Ssss', 'ssss', 'ksss', '.kss', 'SSSs', 'ksss'];
  const leg = ['ksss.', 'ksss.', 'FGFF.', 'fFFFF', 'ddddd'];
  const maul = [
    '.qqqg..',
    'qqgggp.',
    'qggggpP',
    'gggpppP',
    '.ppPPP.',
    '..CB...',
    '..Bb...',
    '..Bb...',
    '..Bb...',
    '..Bb...',
    '..Bb...',
    '..UT...',
    '..Tt...',
    '..Tt...',
    '..bD...',
  ];
  return {
    frameW: 52,
    frameH: 46,
    hip: [24, 37],
    torso: { img: g(torso, pal), pivot: [6, 10] },
    neck: [1, -10],
    frontShoulder: [4, -9],
    backShoulder: [-3, -9],
    frontHip: [2, 0],
    backHip: [-3, 0],
    heads: { normal: { img: g(head, pal), pivot: [7, 13] }, hurt: { img: g(hurt, pal), pivot: [7, 13] } },
    frontArm: { img: g(arm, pal), pivot: [1, 0], tip: [1, 6] },
    backArm: { img: g(arm, dark), pivot: [1, 0], tip: [1, 6] },
    frontLeg: { img: g(leg, pal), pivot: [1, 0] },
    backLeg: { img: g(leg, dark), pivot: [1, 0] },
    weapon: { img: g(maul, pal), pivot: [2, 12] },
    outline: INK,
  };
}
