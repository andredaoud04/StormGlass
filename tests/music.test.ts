import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/game/balance';
import { MUSIC_TRACKS } from '../src/engine/music';

describe('music tracks', () => {
  it('there is a menu theme and a battle theme for every Age', () => {
    expect(MUSIC_TRACKS.menu).toBeDefined();
    for (const a of BALANCE.ages) expect(MUSIC_TRACKS[a.id], a.id).toBeDefined();
  });

  it('every track is a well-formed 8-bar loop', () => {
    for (const [id, t] of Object.entries(MUSIC_TRACKS)) {
      expect(t.chords, id).toHaveLength(8);
      expect(t.lead, id).toHaveLength(8);
      for (const bar of t.lead) {
        expect(bar, id).toHaveLength(8);
        expect(bar, id).toMatch(/^[0-9a-e.\-]+$/);
        expect(bar[0], id).not.toBe('-');
      }
      expect(t.bass, id).toMatch(/^[xo5.]{8}$/);
      for (const row of [t.kick, t.snare, t.hat]) expect(row, id).toMatch(/^[x.]{16}$/);
      expect(t.bpm).toBeGreaterThan(60);
      expect(t.bpm).toBeLessThan(160);
      // The lead stays in a singable range: at most two octaves above the root.
      for (const bar of t.lead) for (const c of bar) if (c !== '.' && c !== '-') expect(parseInt(c, 36), id).toBeLessThanOrEqual(t.scale.length * 2 + 1);
    }
  });
});
