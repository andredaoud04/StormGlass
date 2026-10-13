import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { eligibleTroops, normalizeLoadout, setLoadoutSlot, loadoutUnits, withNormalizedLoadout, loadoutAfterEvolution } from '../src/logic/loadout';
import { INITIAL_PROFILE, loadProfile } from '../src/services/storage';
import type { PlayerProfile } from '../src/types/game';

const values = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  },
});
beforeEach(() => values.clear());

const make = (overrides: Partial<PlayerProfile> = {}): PlayerProfile => ({ ...INITIAL_PROFILE, ...overrides });
const ids = (p: Parameters<typeof eligibleTroops>[0]) => eligibleTroops(p).map((u) => u.id);

const STONE_ALL = ['stone_clubber', 'stone_slinger', 'stone_brute'];
const ANCIENT_ALL = ['ancient_hoplite', 'ancient_archer', 'ancient_guardian'];

describe('Troop eligibility (current + immediately previous Army Age, owned)', () => {
  it('fresh account is melee-only', () => {
    assert.deepEqual(ids(make()), ['stone_clubber']);
  });
  it('accepts owned current and previous Age troops, current first', () => {
    const p = make({ armyAge: 'ancient', unlockedTroopIds: [...STONE_ALL, 'ancient_hoplite', 'ancient_archer'] });
    assert.deepEqual(ids(p), ['ancient_hoplite', 'ancient_archer', ...STONE_ALL]);
  });
  it('rejects troops two Ages old', () => {
    const p = make({ armyAge: 'crusader', unlockedTroopIds: [...STONE_ALL, 'ancient_hoplite', 'crusader_swordsman'] });
    const e = ids(p);
    for (const id of STONE_ALL) assert.ok(!e.includes(id), `${id} must be rejected`);
    assert.deepEqual(e, ['crusader_swordsman', 'ancient_hoplite']);
  });
  it('rejects future-Age troops even if listed as owned', () => {
    const p = make({ armyAge: 'stone', unlockedTroopIds: ['stone_clubber', 'future_titan', 'ancient_hoplite'] });
    assert.deepEqual(ids(p), ['stone_clubber']);
  });
  it('rejects unowned troops of eligible Ages', () => {
    const p = make({ armyAge: 'ancient', unlockedTroopIds: ['stone_clubber'] });
    assert.deepEqual(ids(p), ['ancient_hoplite', 'stone_clubber']);
  });
});

describe('Loadout normalization', () => {
  it('drops ineligible and duplicate ids then fills empty slots in default order', () => {
    const p = make({
      armyAge: 'ancient',
      unlockedTroopIds: [...STONE_ALL, ...ANCIENT_ALL],
      troopLoadout: ['stone_brute', 'stone_brute', 'future_titan', 'bogus'],
    });
    assert.deepEqual(normalizeLoadout(p), ['stone_brute', 'ancient_hoplite', 'ancient_archer']);
  });
  it('caps at three and keeps a valid chosen order', () => {
    const p = make({
      armyAge: 'ancient',
      unlockedTroopIds: [...STONE_ALL, ...ANCIENT_ALL],
      troopLoadout: ['stone_slinger', 'ancient_guardian', 'stone_brute', 'ancient_hoplite'],
    });
    assert.deepEqual(normalizeLoadout(p), ['stone_slinger', 'ancient_guardian', 'stone_brute']);
  });
  it('matches the legacy default when no loadout is stored', () => {
    const p = { armyAge: 'ancient' as const, unlockedTroopIds: [...STONE_ALL, 'ancient_hoplite'] };
    assert.deepEqual(normalizeLoadout(p), ['ancient_hoplite', 'stone_clubber', 'stone_slinger']);
  });
  it('a newly unlocked troop fills an empty slot but never displaces a full loadout', () => {
    const before = make({ armyAge: 'stone', unlockedTroopIds: ['stone_clubber'], troopLoadout: ['stone_clubber'] });
    const after = withNormalizedLoadout({ ...before, unlockedTroopIds: ['stone_clubber', 'stone_slinger'] });
    assert.deepEqual(after.troopLoadout, ['stone_clubber', 'stone_slinger']);

    const full = make({
      armyAge: 'ancient',
      unlockedTroopIds: [...STONE_ALL, 'ancient_hoplite'],
      troopLoadout: ['stone_brute', 'stone_slinger', 'stone_clubber'],
    });
    const unlocked = withNormalizedLoadout({ ...full, unlockedTroopIds: [...full.unlockedTroopIds, 'ancient_archer'] });
    assert.deepEqual(unlocked.troopLoadout, ['stone_brute', 'stone_slinger', 'stone_clubber']);
  });
  it('Evolution leaves a valid current/previous loadout', () => {
    const atAncient = make({ armyAge: 'ancient', unlockedTroopIds: [...STONE_ALL, ...ANCIENT_ALL], troopLoadout: ['stone_brute', 'stone_slinger', 'ancient_guardian'] });
    const evolved = withNormalizedLoadout({ ...atAncient, armyAge: 'crusader', unlockedTroopIds: [...atAncient.unlockedTroopIds, 'crusader_swordsman'] });
    assert.deepEqual(evolved.troopLoadout, ['ancient_guardian', 'crusader_swordsman', 'ancient_hoplite']);
  });
  it('Prestige back to Stone yields a valid Stone loadout with no Future carryover', () => {
    const atFuture = make({
      armyAge: 'future',
      unlockedTroopIds: [...STONE_ALL, 'industrial_infantry', 'future_pulseblade', 'future_titan'],
      troopLoadout: ['future_titan', 'future_pulseblade', 'industrial_infantry'],
    });
    const prestiged = withNormalizedLoadout({ ...atFuture, armyAge: 'stone' });
    assert.deepEqual(prestiged.troopLoadout, STONE_ALL);
    assert.deepEqual(loadoutUnits(prestiged).map((u) => u.ageId), ['stone', 'stone', 'stone']);

    const meleeOnly = withNormalizedLoadout({ ...atFuture, armyAge: 'stone', unlockedTroopIds: ['future_titan'] });
    assert.deepEqual(meleeOnly.troopLoadout, ['stone_clubber']);
  });
});

describe('setLoadoutSlot', () => {
  const p = make({
    armyAge: 'ancient',
    unlockedTroopIds: [...STONE_ALL, ...ANCIENT_ALL],
    troopLoadout: ['ancient_hoplite', 'ancient_archer', 'ancient_guardian'],
  });
  it('equips a reserve troop into the chosen slot', () => {
    assert.deepEqual(setLoadoutSlot(p, 2, 'stone_brute'), ['ancient_hoplite', 'ancient_archer', 'stone_brute']);
  });
  it('swaps when the troop is already equipped elsewhere (no duplicates)', () => {
    assert.deepEqual(setLoadoutSlot(p, 0, 'ancient_guardian'), ['ancient_guardian', 'ancient_archer', 'ancient_hoplite']);
  });
  it('ignores ineligible troops and invalid slots', () => {
    assert.deepEqual(setLoadoutSlot(p, 0, 'crusader_knight'), p.troopLoadout);
    assert.deepEqual(setLoadoutSlot(p, 5, 'stone_brute'), p.troopLoadout);
    assert.deepEqual(setLoadoutSlot({ ...p, unlockedTroopIds: ['stone_clubber'] }, 1, 'stone_brute'), ['ancient_hoplite', 'stone_clubber']);
  });
});

describe('Loadout save migration', () => {
  it('old save without troopLoadout derives the legacy default and keeps other data', () => {
    const old: Record<string, unknown> = {
      ...INITIAL_PROFILE,
      armyAge: 'ancient',
      unlockedTroopIds: [...STONE_ALL, 'ancient_hoplite', 'ancient_archer'],
      gold: 321, gems: 77,
      cards: { iron_wolf: { cardId: 'iron_wolf', level: 3, copies: 2 } },
    };
    delete old.troopLoadout;
    values.set('stormglass-save-v1', JSON.stringify(old));
    const loaded = loadProfile();
    assert.deepEqual(loaded.troopLoadout, ['ancient_hoplite', 'ancient_archer', 'stone_clubber']);
    assert.equal(loaded.gold, 321);
    assert.equal(loaded.gems, 77);
    assert.deepEqual(loaded.unlockedTroopIds, old.unlockedTroopIds);
    assert.equal(loaded.cards.iron_wolf.level, 3);
  });
  it('invalid stored loadouts are repaired, valid ones round-trip', () => {
    values.set('stormglass-save-v1', JSON.stringify({ ...INITIAL_PROFILE, troopLoadout: 'nope' }));
    assert.deepEqual(loadProfile().troopLoadout, ['stone_clubber']);
    values.set('stormglass-save-v1', JSON.stringify({
      ...INITIAL_PROFILE, armyAge: 'ancient', unlockedTroopIds: [...STONE_ALL, ...ANCIENT_ALL],
      troopLoadout: ['stone_brute', 'ancient_guardian', 'stone_slinger'],
    }));
    assert.deepEqual(loadProfile().troopLoadout, ['stone_brute', 'ancient_guardian', 'stone_slinger']);
  });
});

describe('Loadout after Evolution', () => {
  it('replaces only the last slot with the new Age free melee when the loadout is full', () => {
    const evolved = make({
      armyAge: 'crusader',
      unlockedTroopIds: [...STONE_ALL, ...ANCIENT_ALL, 'crusader_swordsman'],
      troopLoadout: ['ancient_guardian', 'ancient_archer', 'ancient_hoplite'],
    });
    assert.deepEqual(loadoutAfterEvolution(evolved), ['ancient_guardian', 'ancient_archer', 'crusader_swordsman']);
  });
  it('keeps an already-equipped melee and fills an empty slot instead of replacing', () => {
    const equipped = make({ armyAge: 'crusader', unlockedTroopIds: [...ANCIENT_ALL, 'crusader_swordsman'], troopLoadout: ['ancient_guardian', 'crusader_swordsman', 'ancient_archer'] });
    assert.deepEqual(loadoutAfterEvolution(equipped), ['ancient_guardian', 'crusader_swordsman', 'ancient_archer']);
    const partial = make({ armyAge: 'ancient', unlockedTroopIds: ['stone_clubber', 'ancient_hoplite'], troopLoadout: ['stone_clubber'] });
    assert.deepEqual(loadoutAfterEvolution(partial), ['stone_clubber', 'ancient_hoplite']);
  });
  it('does not change plain normalization of a full previous-Age loadout', () => {
    const p = make({ armyAge: 'crusader', unlockedTroopIds: [...ANCIENT_ALL, 'crusader_swordsman'], troopLoadout: ['ancient_guardian', 'ancient_archer', 'ancient_hoplite'] });
    assert.deepEqual(normalizeLoadout(p), ['ancient_guardian', 'ancient_archer', 'ancient_hoplite']);
  });
});

describe('Army Age / troop id save repair', () => {
  it('repairs an unknown armyAge to stone and dedupes unlockedTroopIds without touching other fields', () => {
    values.set('stormglass-save-v1', JSON.stringify({
      ...INITIAL_PROFILE, armyAge: 'space_age', gold: 444, gems: 55, opponentStage: 3, clearedEnemyStages: [1, 2],
      unlockedTroopIds: ['stone_clubber', 'stone_slinger', 'stone_clubber', 'ancient_hoplite', 'stone_slinger'],
    }));
    const loaded = loadProfile();
    assert.equal(loaded.armyAge, 'stone');
    assert.deepEqual(loaded.unlockedTroopIds, ['stone_clubber', 'stone_slinger', 'ancient_hoplite']);
    assert.equal(loaded.gold, 444);
    assert.equal(loaded.gems, 55);
    assert.equal(loaded.opponentStage, 3);
    assert.deepEqual(loaded.clearedEnemyStages, [1, 2]);
    assert.deepEqual(loaded.troopLoadout, ['stone_clubber', 'stone_slinger']);
  });
  it('keeps a valid armyAge', () => {
    values.set('stormglass-save-v1', JSON.stringify({ ...INITIAL_PROFILE, armyAge: 'gunpowder' }));
    assert.equal(loadProfile().armyAge, 'gunpowder');
  });
});
