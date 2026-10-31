/** Contact sheet of every boss (all animation rows), for art review. Usage: tsx tools/art/preview/boss.ts out.png [id] [scale] */
import { Img, hex } from '../img';
import { TEAM_RED } from '../palette';
import { BOSS_TROOPS } from '../troops/bosses';
import { packSheet } from '../rig';

const out = process.argv[2] ?? '/tmp/boss.png';
const only = process.argv[3];
const rows: Img[] = [];
for (const t of BOSS_TROOPS) {
  if (only && only !== 'all' && t.id !== only) continue;
  const r = t.rig(TEAM_RED);
  const keep = process.env.ANIMS?.split(',');
  rows.push(packSheet(t.anims(r).filter((a) => !keep || keep.includes(a.name)), r.frameW, r.frameH).sheet);
}
const w = Math.max(...rows.map((r) => r.w));
const h = rows.reduce((a, r) => a + r.h, 0);
const bg = new Img(w, h).fill(hex('#8fbf6a'));
let y = 0;
for (const r of rows) {
  bg.blit(r, 0, y);
  y += r.h;
}
bg.scaled(Number(process.argv[4] ?? 2)).save(out);
