import { Img, hex } from '../img';
import { GOLD, MOSS, TEAM_BLUE, TEAM_RED, WOOD } from '../palette';
import { icons } from '../ui/icons';
import * as ui from '../ui/ui';
import * as fx from '../fx';
import { bigFont, smallFont } from '../ui/font';

const sheet = new Img(300, 330).fill(hex('#5a7a8a'));
let x = 2, y = 2, rowH = 0;
const add = (img: Img) => {
  if (x + img.w > 298) { x = 2; y += rowH + 3; rowH = 0; }
  sheet.blit(img, x, y); x += img.w + 3; rowH = Math.max(rowH, img.h);
};
for (const p of [ui.stonePanel(), ui.woodPanel(), ui.insetPanel(), ui.plaque(), ui.smallPlaque(), ui.button(MOSS, false, ''), ui.button(MOSS, true, ''), ui.button(GOLD, false, ''), ui.button(TEAM_RED, false, ''), ui.button(WOOD, false, ''), ui.card(TEAM_BLUE, false), ui.card(TEAM_BLUE, true), ui.socket(28, false), ui.socket(38, true), ui.glowRing(40, GOLD.hl), ui.tabButton(false), ui.tabButton(true), ui.tabBar(), ui.ribbon(GOLD)]) add(p.img);
for (const img of Object.values(icons())) add(img);
for (const s of [fx.spark(), fx.ring(), fx.dust(), fx.poof(), fx.coin(), fx.smoke(), fx.flame(), fx.boom(), fx.smear(), fx.stoneProjectile(), fx.debris()]) for (const f of s.frames) add(f);
add(smallFont().img); add(bigFont().img);
x = 2; y += rowH + 3;
sheet.blit(ui.stoneWall().img.crop(0, 0, 296, 80), 2, y);
sheet.scaled(3).save(process.argv[2]);
void TEAM_RED;
