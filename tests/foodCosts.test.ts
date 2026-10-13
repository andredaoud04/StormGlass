import test from 'node:test';
import assert from 'node:assert/strict';
import { AGES } from '../src/data/gameData';

// WDC balance ledger (October 8 documented balance): Stone 5/8/12 is LOCKED; later Ages use the
// documented 6/9/14 … 10/16/23 table (owner open decision #6 — change both together if it moves).
const DOCUMENTED: Record<string, [number, number, number]> = {
  stone: [5, 8, 12],
  ancient: [6, 9, 14],
  crusader: [7, 11, 16],
  gunpowder: [8, 12, 18],
  industrial: [9, 14, 20],
  future: [10, 16, 23],
};

test('troop Food costs match the documented melee/ranged/tank table for every Age', () => {
  for (const age of AGES) {
    const byRole = ['melee', 'ranged', 'tank'].map((r) => age.units.find((u) => u.role === r)!.cost);
    assert.deepEqual(byRole, DOCUMENTED[age.id], age.id);
  }
});
