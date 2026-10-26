/** STORMGLASS title: chunky gold lettering with an extruded shadow and a storm crystal. */
import { Img, hex, mix } from '../img';
import { GEM, GOLD, INK } from '../palette';
import { BIG } from './font';

export function logo(): Img {
  const text = 'STORMGLASS';
  const S = 2;
  const widths = [...text].map((c) => BIG[c][0].length);
  const w = widths.reduce((a, b) => a + b * S + 2, 0) - 2;
  const h = 7 * S;
  const face = new Img(w, h);
  let x = 0;
  [...text].forEach((c, i) => {
    BIG[c].forEach((row, ry) => {
      for (let rx = 0; rx < row.length; rx++) {
        if (row[rx] !== '#') continue;
        for (let dy = 0; dy < S; dy++) for (let dx = 0; dx < S; dx++) {
          const yy = ry * S + dy;
          const t = yy / (h - 1);
          const col = yy <= 1 ? GOLD.hl : t < 0.45 ? GOLD.base : t < 0.8 ? GOLD.shade : GOLD.deep;
          face.set(x + rx * S + dx, yy, col);
        }
      }
    });
    x += widths[i] * S + 2;
  });
  // Extruded depth below, then a bold outline around everything.
  const pad = 4;
  const out = new Img(w + pad * 2 + 18, h + pad * 2 + 4);
  const ex = pad + 18;
  for (let d = 3; d >= 1; d--) out.blit(face, ex, pad + d, { tint: () => mix(hex('#6a2a1c'), INK, d / 4) });
  out.blit(face, ex, pad);
  // Storm crystal to the left: a cut gem with a bolt.
  const cx = 9, cy = pad + h / 2 + 1;
  out.poly([[cx, cy - 10], [cx + 6, cy - 3], [cx + 3, cy + 9], [cx - 3, cy + 9], [cx - 6, cy - 3]], (px, py) => (px < cx - 1 ? GEM.hl : px < cx + 2 ? (py < cy ? GEM.base : GEM.shade) : GEM.deep));
  for (const [bx, by] of [[cx + 1, cy - 6], [cx, cy - 4], [cx - 1, cy - 2], [cx + 1, cy - 2], [cx, cy], [cx - 1, cy + 2]]) out.set(bx, by, hex('#fff6b0'));
  return out.outlined(INK).outlined(hex('#3b2a40'));
}
