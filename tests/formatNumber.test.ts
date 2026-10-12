import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCompactNumber } from '../src/logic/formatNumber';

test('currency labels stay compact from first battle to late-game billions', () => {
  assert.equal(formatCompactNumber(18), '18');
  assert.equal(formatCompactNumber(160), '160');
  assert.equal(formatCompactNumber(1200), '1.2k');
  assert.equal(formatCompactNumber(12345), '12.3k');
  assert.equal(formatCompactNumber(2350000000), '2.35b');
  assert.equal(formatCompactNumber(0), '0');
});
