/** Preview the blue-team sheets of several troops stacked. Usage: tsx blue.ts out.png id1,id2,... [scale] */
import { Img, hex } from '../img';
import { TEAM_BLUE } from '../palette';
import { ALL_TROOPS, makeTroop } from '../troops/catalog';
import { packSheet } from '../rig';
const ids = process.argv[3].split(',');
const sheets = ALL_TROOPS.filter((t) => ids.includes(t.id)).map((t) => { const m = makeTroop(t, TEAM_BLUE); return packSheet(m.anims, m.frameW, m.frameH).sheet; });
const W = Math.max(...sheets.map((s) => s.w));
const out = new Img(W, sheets.reduce((a, s) => a + s.h, 0)).fill(hex('#8fbf6a'));
let y = 0;
for (const s of sheets) { out.blit(s, 0, y); y += s.h; }
out.scaled(Number(process.argv[4] ?? 3)).save(process.argv[2]);
