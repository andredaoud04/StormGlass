/** Stable portrait artboard: scale the whole interface together on phones and tablets.
 * The artwork, combat lane, bases and HUD must NEVER scale independently.
 */
export const GAME_STAGE_WIDTH = 420;
export const GAME_STAGE_HEIGHT = 900;

export function getGameScale(viewportWidth: number, viewportHeight: number): number {
  if (!Number.isFinite(viewportWidth) || !Number.isFinite(viewportHeight) ||
      viewportWidth <= 0 || viewportHeight <= 0) return 1;
  return Math.min(viewportWidth / GAME_STAGE_WIDTH, viewportHeight / GAME_STAGE_HEIGHT);
}
