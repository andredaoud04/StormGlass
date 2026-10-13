import test from 'node:test';
import assert from 'node:assert/strict';
import { AGES, HEROES } from '../src/data/gameData';
import { FRAME_COUNT, KNOWN_UNIT_IDS, unitFrames, unitFrameSize } from '../src/art/units';

const ALL_IDS = [...AGES.flatMap((a) => a.units.map((u) => u.id)), ...HEROES.map((h) => h.id), 'gate_colossus'];

test('every troop, hero and the boss has bespoke art', () => {
  for (const id of ALL_IDS) assert.ok(KNOWN_UNIT_IDS.includes(id), `${id} has no sprite`);
});

test('each unit has six same-sized, non-empty frames that actually animate', () => {
  for (const id of ALL_IDS) {
    const frames = unitFrames(id, 'player');
    assert.equal(frames.length, FRAME_COUNT, id);
    const { w, h } = unitFrameSize(id);
    for (const f of frames) {
      assert.equal(f.w, w, id);
      assert.equal(f.h, h, id);
      assert.ok(f.opaqueCount() > 120, `${id} frame is nearly empty`);
    }
    const sig = frames.map((f) => f.px.join('|'));
    assert.ok(new Set(sig.slice(0, 4)).size > 1, `${id} walk cycle has no motion`);
    assert.notEqual(sig[4], sig[5], `${id} attack has no wind-up/strike difference`);
  }
});

test('faction recolour keeps the exact silhouette and only changes accents', () => {
  for (const id of ALL_IDS) {
    const p = unitFrames(id, 'player')[0], e = unitFrames(id, 'enemy')[0];
    let differing = 0;
    for (let i = 0; i < p.px.length; i++) {
      assert.equal(!!p.px[i], !!e.px[i], `${id} silhouette differs at ${i}`);
      if (p.px[i] !== e.px[i]) differing++;
    }
    assert.ok(differing > 0, `${id} has no faction accent`);
    assert.ok(differing < p.opaqueCount() * 0.6, `${id} recolours too much of the body`);
  }
});
