/** Crusader Age troops: mail, team tabards with a pale cross, kite shields, great helms. */
import { LINEN, type Ramp } from '../palette';
import type { RigParts } from '../rig';
import { darkOf, grid, groups, hurtHead, kiteShield, palOf } from './kit';

export function footmanRig(team: Ramp): RigParts {
  const gs = groups(team);
  const p = palOf(gs);
  const dk = darkOf(gs);
  // Kettle hat over a mail coif.
  const head = [
    '....qqqqq.....',
    '...qgggggp....',
    '..qgqggggpp...',
    '..qggggggggp..',
    'qqgggggggggppP',
    '.PPPPPPPPPPPP.',
    'gpgkSSSSSSSSs.',
    'gpgkSssssswess',
    'pgpksssssseess',
    'gpgpksssrssmms',
    '.gpgpkksssssk.',
    '..gpgpgkkkkk..',
    '...ppgpg......',
  ];
  const hurt = hurtHead(head, { 7: 'gpgkSsssssesss', 8: 'pgpksssssssess', 9: 'gpgpksssrsmmms' });
  const torso = ['..gqggp..', '.gTTWTTp.', 'gqTWWWTpp', 'ggTTWTtpp', '.LLMZLLl.', '.TTTWTTt.', '.TUTWTtt.', '.g.p.g.p.'];
  const arm = ['qg.', 'gp.', 'gp.', 'SSs', 'kss'];
  const leg = ['ggp.', 'gpp.', 'LMl.', 'LLLL'];
  const sword = ['..q..', '.qgp.', '.qgp.', '.qgp.', '.qgp.', '.qgp.', '.qgp.', 'zZZzx', '..L..', '..L..', '..z..'];
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
    weapon: { img: grid(sword, p), pivot: [2, 9] },
    offhand: { img: kiteShield(team, 8, 12), pivot: [4, 4] },
    offhandInFront: true,
  };
}

export function crossbowRig(team: Ramp): RigParts {
  const gs = groups(team);
  const p = palOf(gs);
  const dk = darkOf(gs);
  // Team hood (chaperon) over a padded cap.
  const head = [
    '....tTTTU.....',
    '..tTTTTTTU....',
    '.tTTTTTTTTU...',
    'tTTTTTTTTTTU..',
    'tTTTTTttttUU..',
    'tTTTtkSSSSSSs.',
    'tTTTtkssssweSs',
    'tTTTtksssseess',
    'YtTTtkssssssk.',
    '.YtTtksssrsmms',
    '.YttTtkkssssk.',
    '..YYttTkkkk...',
    '...YYttt......',
  ];
  const hurt = hurtHead(head, { 6: 'tTTTtksssssesS', 7: 'tTTTtksssssses', 9: '.YtTtksssrmmms' });
  const torso = ['..TTTTt..', '.wWTTtwv.', 'wWwvwvwvv', 'wwvwvwvvv', '.LLMZLLl.', '.wWwvwwv.', '.wWvwvwv.', '.w.v.w.v.'];
  const arm = ['Ww.', 'wv.', 'wv.', 'SSs', 'kss'];
  const leg = ['wwv.', 'wvv.', 'LMl.', 'LLLL'];
  // Crossbow pointing up at 0: stirrup, steel prod, string to the nut, tiller and trigger.
  const xbow = ['...g...', '..gPg..', 'pggBggp', 'p..B..p', 'l..C..l', '.l.B.l.', '..lBl..', '...B...', '...BD..', '...Bb..', '..BBb..'];
  const case_ = ['.qq.', 'LMLl', 'LMLl', 'LMLl', 'LLll', '.ll.'];
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
    weapon: { img: grid(xbow, p), pivot: [3, 8] },
    back: { img: grid(case_, p), pivot: [5, 1] },
  };
}

export function knightRig(team: Ramp): RigParts {
  const gs = groups(team);
  const p = palOf(gs);
  const dk = darkOf(gs);
  // Great helm with a team crest, eye slit and a gold cross.
  const head = [
    '.....tTU........',
    '....tTTTU.......',
    '...tTTTTTU......',
    '..qqqqqqqqqqp...',
    '..qgggggggggpP..',
    '..qgggggggggggP.',
    '..qggggggggggggP',
    '..qggggPeeeeeeeP',
    '..qgggggggggzggP',
    '..qggggggggzzzgP',
    '..qgggggggggzgPP',
    '..pggggggggpzpP.',
    '..ppgggggggppP..',
    '...PPPPPPPPPP...',
  ];
  const hurt = hurtHead(head, { 5: '..qgggggggPgggP.', 6: '..qggggggPPggggP' });
  const torso = [
    '...gqqqgp....',
    '.gqgggggggp..',
    'gqgTTTWTTTpp.',
    'ggTTTTWTTTtpp',
    'gqTWWWWWWWtpp',
    '.gTTTTWTTTtp.',
    '..LLLMZLLLLl.',
    '..TTTTWTTTTt.',
    '..TUTTWTTTtt.',
    '..TUTTWTTttt.',
    '..g.p.g.p.g..',
  ];
  const arm = ['qgp.', 'gggp', 'ggpp', 'gppp', '.gpp', 'qggp', 'pggp'];
  const leg = ['gggp.', 'gqgp.', 'ggpp.', 'gggpp', 'PPPPP'];
  const sword = ['..q..', '.qgp.', '.qgp.', '.qgp.', '.qgp.', '.qgp.', '.qgp.', '.qgp.', '.qgp.', 'zZZzx', '..L..', '..L..', '..L..', '..z..'];
  return {
    frameW: 52,
    frameH: 46,
    hip: [24, 37],
    torso: { img: grid(torso, p), pivot: [6, 10] },
    neck: [1, -10],
    frontShoulder: [4, -9],
    backShoulder: [-2, -9],
    frontHip: [2, 0],
    backHip: [-3, 0],
    heads: { normal: { img: grid(head, p), pivot: [7, 13] }, hurt: { img: grid(hurt, p), pivot: [7, 13] } },
    frontArm: { img: grid(arm, p), pivot: [1, 0], tip: [1, 6] },
    backArm: { img: grid(arm, dk), pivot: [1, 0], tip: [1, 6] },
    frontLeg: { img: grid(leg, p), pivot: [1, 0] },
    backLeg: { img: grid(leg, dk), pivot: [1, 0] },
    weapon: { img: grid(sword, p), pivot: [2, 11] },
    offhand: { img: kiteShield(team, 10, 16, undefined, LINEN.hl), pivot: [5, 6] },
    offhandInFront: true,
  };
}
