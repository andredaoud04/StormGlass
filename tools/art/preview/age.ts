/**
 * Review sheets for every Age: troop animation contact sheets (both teams), fortress damage states,
 * and a lineup of every troop's first idle frame across all six Ages for side-by-side style checks.
 * Usage: npx tsx tools/art/preview/age.ts <outDir> [scale]
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { Img, hex } from '../img';
import { TEAM_BLUE, TEAM_RED } from '../palette';
import { packSheet } from '../rig';
import { ALL_TROOPS } from '../troops/catalog';
import { flagFrames, stoneFortress } from '../bases/stone';
import { ancientFortress } from '../bases/ancient';
import { crusaderFortress } from '../bases/crusader';
import { gunpowderFortress } from '../bases/gunpowder';
import { industrialFortress } from '../bases/industrial';
import { futureFortress } from '../bases/future';

const out = process.argv[2] ?? 'tmp-shots/art';
const k = Number(process.argv[3] ?? 3);
mkdirSync(out, { recursive: true });
const BG = hex('#8fbf6a');
const AGES: [string, typeof stoneFortress][] = [
  ['stone', stoneFortress],
  ['ancient', ancientFortress],
  ['crusader', crusaderFortress],
  ['gunpowder', gunpowderFortress],
  ['industrial', industrialFortress],
  ['future', futureFortress],
];

for (const [age, fort] of AGES) {
  // Troop contact sheet: one block per troop and team, one row per animation.
  const rows: Img[] = [];
  for (const t of ALL_TROOPS.filter((q) => q.id.startsWith(age + '_'))) {
    for (const team of [TEAM_BLUE, TEAM_RED]) {
      const r = t.rig(team);
      rows.push(packSheet(t.anims(r), r.frameW, r.frameH).sheet);
    }
  }
  const w = Math.max(...rows.map((r) => r.w));
  const sheet = new Img(w, rows.reduce((a, r) => a + r.h + 2, 0)).fill(BG);
  let y = 0;
  for (const r of rows) {
    sheet.blit(r, 0, y);
    y += r.h + 2;
  }
  sheet.scaled(k).save(join(out, `${age}-troops.png`));

  // Fortress states, both teams (red mirrored as in game), with the flag on states 0-1.
  const f = new Img(74 * 4, 98 * 2).fill(BG);
  ([0, 1, 2, 3] as const).forEach((d, i) => {
    f.blit(fort(TEAM_BLUE, d), i * 74, 0);
    f.blit(fort(TEAM_RED, d).flipped(), i * 74, 98);
  });
  f.blit(flagFrames(TEAM_BLUE)[0], 74 * 4 - 16, 2);
  f.scaled(k).save(join(out, `${age}-fortress.png`));
}

// Lineup: first idle frame of every troop, all Ages, blue over red.
const frames = ALL_TROOPS.map((t) => [TEAM_BLUE, TEAM_RED].map((team) => t.anims(t.rig(team))[0].frames[0]));
const cw = Math.max(...frames.map((p) => p[0].w));
const ch = Math.max(...frames.map((p) => p[0].h));
const lineup = new Img(cw * 3, ch * 2 * AGES.length).fill(BG);
frames.forEach(([b, r], i) => {
  const col = i % 3, row = Math.floor(i / 3);
  lineup.blit(b, col * cw + (cw - b.w) / 2, row * ch * 2 + ch - b.h);
  lineup.blit(r.flipped(), col * cw + (cw - r.w) / 2, row * ch * 2 + ch * 2 - r.h);
});
lineup.scaled(k).save(join(out, 'all-ages-lineup.png'));
console.log('age sheets ->', out);
