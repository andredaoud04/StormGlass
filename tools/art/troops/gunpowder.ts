/** Gunpowder Age troops: morion helmets, plumed hats, pikes and muskets. */
import { Img, type Palette } from '../img';
import { INK, type Ramp } from '../palette';
import type { RigParts } from '../rig';
import { darkPal, medievalPal } from './crusader';
import { hex } from '../img';

const FELT = { hl: hex('#6a5a6e'), base: hex('#4a3e52'), shade: hex('#34283c'), deep: hex('#22182a') };

function pal(team: Ramp): Palette {
  return { ...medievalPal(team), f: FELT.base, F: FELT.hl, d: FELT.shade, a: hex('#f4ecd6') };
}

const g = (rows: string[], p: Palette) => Img.fromGrid(rows, p);

export function pikemanRig(team: Ramp): RigParts {
  const p = pal(team);
  const dk = darkPal(p);
  // Morion: crested steel helmet with a curved brim.
  const head = [
    '.....qq.......',
    '....qggp......',
    '...qqggggp....',
    '..qgggggggp...',
    '.qgggggggggp..',
    'Pqgggggggggggp',
    '.PPhhPPPPPPPP.',
    '..hhkSSSSSSSs.',
    '..hkksssssoess',
    '..hkkssssseess',
    '..hkksssssssk.',
    '...hkksssrmms.',
    '....kkkkkkk...',
  ];
  const hurt = head.slice();
  hurt[8] = '..hkksssssesss';
  hurt[9] = '..hkkssssssess';
  hurt[11] = '...hkkssrmmms.';
  const torso = ['..qgggp..', '.TqgggpT.', 'TUqggpptt', 'TTqgggptt', '.LLLMLLL.', '.TTUTTTt.', '.TUTTtTt.', '.T.t.T.t.'];
  const arm = ['TU.', 'Tt.', 'Tt.', 'SSs', 'kss'];
  const leg = ['TTt.', 'aaa.', 'LLl.', 'LLLL'];
  const pike = ['..q..', '.qgp.', '.qgp.', '..p..', '..B..', '..B..', '..B..', '..B..', '..B..', '..B..', '..B..', '..B..', '..B..', '..B..', '..B..', '..B..', '..B..', '..b..', '..b..', '..b..', '..b..'];
  return {
    frameW: 48,
    frameH: 40,
    hip: [20, 32],
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
    weapon: { img: g(pike, p), pivot: [2, 13] },
    outline: INK,
  };
}

export function musketeerRig(team: Ramp): RigParts {
  const p = pal(team);
  const dk = darkPal(p);
  // Wide-brimmed felt hat with a team plume.
  const head = [
    '..UUTt........',
    '.UTTTTt.......',
    '...tTfFFff....',
    '...fFFfffffd..',
    '..fFffffffffd.',
    'dfffffffffffffd',
    '.ddhhddddddddd.',
    '..hhkSSSSSSSs..',
    '..hkksssssoess.',
    '..hkkssssseess.',
    '..hkksssssssk..',
    '...hkhhssrmms..',
    '....hhhhkkk....',
  ];
  const hurt = head.slice();
  hurt[8] = '..hkksssssesss.';
  hurt[9] = '..hkkssssssess.';
  hurt[11] = '...hkhhsrmmms..';
  const torso = ['..TTTTt..', '.sTUTTts.', 'sSTUaTtsk', 'ssTTaTtsk', '.LLLMLLL.', '.TTUTTTt.', '.TUTTtTt.', '.T.t.T.t.'];
  const arm = ['TU.', 'Tt.', 'Tt.', 'SSs', 'kss'];
  const leg = ['fff.', 'aaa.', 'LLl.', 'LLLL'];
  // Musket points up at 0; the stock is at the bottom, the grip just above it.
  const musket = ['.P.', '.P.', '.p.', '.p.', '.p.', '.p.', '.p.', 'BpB', 'BBb', 'BBb', 'BBb', 'BLb', 'BBb', 'BBb', 'bBb', '.bb'];
  return {
    frameW: 44,
    frameH: 38,
    hip: [18, 30],
    torso: { img: g(torso, p), pivot: [4, 7] },
    neck: [1, -7],
    frontShoulder: [2, -6],
    backShoulder: [-2, -6],
    frontHip: [1, 0],
    backHip: [-2, 0],
    heads: { normal: { img: g(head, p), pivot: [7, 12] }, hurt: { img: g(hurt, p), pivot: [7, 12] } },
    frontArm: { img: g(arm, p), pivot: [0, 0], tip: [1, 4] },
    backArm: { img: g(arm, dk), pivot: [0, 0], tip: [1, 4] },
    frontLeg: { img: g(leg, p), pivot: [1, 0] },
    backLeg: { img: g(leg, dk), pivot: [1, 0] },
    weapon: { img: g(musket, p), pivot: [1, 11] },
    outline: INK,
  };
}
