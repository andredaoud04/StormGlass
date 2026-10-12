import test from 'node:test';
import assert from 'node:assert/strict';
import { GAME_STAGE_HEIGHT, GAME_STAGE_WIDTH, getGameScale } from '../src/logic/viewport';

test('portrait stage always fits inside varied device viewports without scrolling', () => {
  const viewports = [
    [375, 667], [390, 844], [430, 932], // small, typical and large phones
    [768, 1024], [820, 1180], [1024, 1366], // portrait tablets
    [1180, 820], [1366, 1024], // landscape tablets
  ];
  for (const [width, height] of viewports) {
    const scale = getGameScale(width, height);
    assert.ok(scale > 0);
    assert.ok(GAME_STAGE_WIDTH * scale <= width + 0.01, `overflows width at ${width}x${height}`);
    assert.ok(GAME_STAGE_HEIGHT * scale <= height + 0.01, `overflows height at ${width}x${height}`);
    assert.ok(Math.abs((GAME_STAGE_WIDTH * scale) / (GAME_STAGE_HEIGHT * scale) - GAME_STAGE_WIDTH / GAME_STAGE_HEIGHT) < 0.001);
  }
});

test('nonpositive and missing viewport sizes fail safely', () => {
  assert.equal(getGameScale(0, 0), 1);
  assert.equal(getGameScale(NaN, 900), 1);
});
