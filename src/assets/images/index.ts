import { AgeId } from '../../types/game';

// Exporting generated 16-bit pixel art backgrounds matching user reference image (clean, zero characters)
export const BACKGROUNDS = {
  idleCampPath: '/src/assets/images/battle_medieval_1791770661530.jpg',
  battleMedieval: '/src/assets/images/battle_medieval_1791770661530.jpg',
  battleDesert: '/src/assets/images/battle_desert_1791770673415.jpg',
  battleIce: '/src/assets/images/battle_ice_1791770685523.jpg',
  battleHell: '/src/assets/images/battle_hell_1791770695689.jpg',
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
