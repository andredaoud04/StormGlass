import test from 'node:test';
import assert from 'node:assert/strict';
import { PixelCanvas, sheet, shade } from '../src/art/pixel';

test('stamp, outline and flip build the expected pixels', () => {
  const pc = new PixelCanvas(5, 5).stamp(['.a.', 'aaa'], { a: '#ff0000' }, 1, 1);
  assert.equal(pc.opaqueCount(), 4);
  pc.outline('#000000');
  assert.equal(pc.get(2, 0), '#000000');
  assert.equal(pc.get(2, 1), '#ff0000');
  assert.equal(pc.get(0, 2), '#000000');
  const flipped = new PixelCanvas(3, 1).set(0, 0, '#111111').flipX();
  assert.equal(flipped.get(2, 0), '#111111');
  assert.equal(flipped.get(0, 0), null);
});

test('sheet lays frames side by side and shade clamps', () => {
  const a = new PixelCanvas(2, 2).set(0, 0, '#ffffff');
  const b = new PixelCanvas(2, 2).set(1, 1, '#000000');
  const s = sheet([a, b]);
  assert.equal(s.w, 4);
  assert.equal(s.get(3, 1), '#000000');
  assert.equal(shade('#808080', 1), '#ffffff');
  assert.equal(shade('#808080', -1), '#000000');
});
