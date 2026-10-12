import { AgeId } from '../../types/game';

import background0 from './battle_medieval_1791770661530.jpg';
import background1 from './battle_desert_1791770673415.jpg';
import background2 from './battle_ice_1791770685523.jpg';
import background3 from './battle_hell_1791770695689.jpg';

// Exporting generated 16-bit pixel art backgrounds matching user reference image (clean, zero characters)
export const BACKGROUNDS = {
  idleCampPath: background0,
  battleMedieval: background0,
  battleDesert: background1,
  battleIce: background2,
  battleHell: background3,
};

export const getBattleBackgroundImage = (ageId: AgeId = 'stone') => {
  switch (ageId) {
    case 'stone':
    case 'crusader':
      return BACKGROUNDS.battleMedieval;
    case 'ancient':
      return BACKGROUNDS.battleDesert;
    case 'gunpowder':
    case 'industrial':
      return BACKGROUNDS.battleIce;
    case 'future':
    default:
      return BACKGROUNDS.battleHell;
  }
};
