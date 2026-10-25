import { Img, hex } from '../img';
import { TEAM_BLUE, TEAM_RED } from '../palette';
import { stoneFortress, flagFrames } from '../bases/stone';
const sheet = new Img(70 * 4 + 20, 100 * 2).fill(hex('#8fbf6a'));
([0, 1, 2, 3] as const).forEach((d, i) => {
  sheet.blit(stoneFortress(TEAM_BLUE, d), i * 70, 0);
  sheet.blit(stoneFortress(TEAM_RED, d).flipped(), i * 70, 100);
});
flagFrames(TEAM_BLUE).forEach((f, i) => sheet.blit(f, 280, i * 14));
sheet.scaled(3).save(process.argv[2]);
