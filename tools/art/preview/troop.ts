import { Img, hex } from '../img';
import { TEAM_BLUE, TEAM_RED } from '../palette';
import { STONE_TROOPS } from '../troops/catalog';
import { packSheet } from '../rig';

const out = process.argv[2] ?? '/tmp/troop.png';
const only = process.argv[3];
const rows: Img[] = [];
for (const t of STONE_TROOPS) {
  if (only && t.id !== only) continue;
  for (const team of [TEAM_BLUE, TEAM_RED]) {
    const r = t.rig(team);
    rows.push(packSheet(t.anims(r), r.frameW, r.frameH).sheet);
  }
}
const w = Math.max(...rows.map((r) => r.w));
const h = rows.reduce((a, r) => a + r.h, 0);
const bg = new Img(w, h).fill(hex('#8fbf6a'));
let y = 0;
for (const r of rows) { bg.blit(r, 0, y); y += r.h; }
bg.scaled(Number(process.argv[4] ?? 4)).save(out);
