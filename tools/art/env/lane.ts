/** Shared lane painter for the later Ages: same lane geometry as Stone and Ancient (ground row 22). */
import { Img, bayer, type Color } from '../img';

export type R4 = { hl: Color; base: Color; shade: Color; deep: Color };
export const LANE_GY = 22;

/**
 * Back verge (rows 0..~10), the lane (~10..~34) and the foreground (below ~34).
 * `road` paints the lane, `verge` the strips either side; both get the classic dithered hand-offs.
 */
export function paintLane(ground: Img, road: R4, verge: R4, opts: { roadTex?: (x: number, y: number, d: number) => Color | null } = {}): void {
  const W = ground.w;
  for (let x = 0; x < W; x++) {
    const backEdge = 10 + Math.round(Math.sin(x / 9) * 1.2 + Math.sin(x / 3.7) * 0.6);
    const frontEdge = 34 + Math.round(Math.sin(x / 11 + 1) * 1.4 + Math.sin(x / 4.3) * 0.7);
    for (let y = 0; y < ground.h; y++) {
      let c: Color;
      if (y < backEdge - 2) c = y < 3 ? verge.hl : bayer(x, y) < 0.25 ? verge.hl : verge.base;
      else if (y < backEdge) c = verge.deep;
      else if (y < frontEdge) {
        const d = y - backEdge;
        c = d < 2 ? road.shade : d < 4 && bayer(x, y) < 0.5 ? road.shade : road.base;
        if (d >= 6 && d <= 14 && bayer(x + 1, y) < 0.12) c = road.hl;
        const t = opts.roadTex?.(x, y, d);
        if (t) c = t;
        if (y >= frontEdge - 2) c = road.hl;
      } else if (y < frontEdge + 3) c = y === frontEdge ? verge.hl : verge.base;
      else {
        const d = y - frontEdge - 3;
        c = d < 14 ? verge.base : verge.shade;
        if (d >= 12 && d < 14 && bayer(x, y) < 0.5) c = verge.shade;
        if (d >= 34) c = d < 36 && bayer(x, y) < 0.5 ? verge.shade : verge.deep;
      }
      ground.set(x, y, c);
    }
  }
}

export function tufts(ground: Img, r: () => number, verge: R4): void {
  const tuft = (x: number, y: number, c1: Color, c2: Color) => {
    ground.set(x, y, c1);
    ground.set(x - 1, y - 1, c1);
    ground.set(x + 1, y - 1, c2);
    ground.set(x, y - 2, c2);
  };
  const W = ground.w;
  for (let x = 3; x < W; x += 5 + Math.floor(r() * 6)) tuft(x, 9 + Math.round(Math.sin(x / 9) * 1.2), verge.shade, verge.base);
  for (let x = 1; x < W; x += 4 + Math.floor(r() * 7)) tuft(x, 37 + Math.round(Math.sin(x / 11 + 1) * 1.4), verge.base, verge.hl);
  for (let i = 0; i < 30; i++) tuft(Math.floor(r() * W), 44 + Math.floor(r() * 30), verge.shade, verge.hl);
}

/** Fill under a ridge-height profile with a lit-left, dithered-down shading. */
export function fillRidge(img: Img, heights: number[], bottom: number, c: R4, deepFrom = 10): void {
  for (let x = 0; x < img.w; x++) {
    const top = bottom - Math.round(heights[x]);
    for (let y = top; y < bottom; y++) {
      const d = y - top;
      let col = d < 2 ? c.hl : c.base;
      if (d >= 2 && d < 4 && bayer(x, y) < 0.5) col = c.hl;
      if (d > deepFrom && bayer(x, y) < (d - deepFrom) / 22) col = c.shade;
      if (d > deepFrom * 2 && bayer(x, y) < (d - deepFrom * 2) / 16) col = c.deep;
      img.set(x, y, col);
    }
  }
}
