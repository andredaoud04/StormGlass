import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/game/balance';
import type { Manifest, SheetEntry, StripEntry } from '../src/engine/manifest';

const ROOT = join(import.meta.dirname, '..');
const manifest = JSON.parse(readFileSync(join(ROOT, 'public/assets/manifest.json'), 'utf8')) as Manifest;
const has = (k: string) => k in manifest.assets;

describe('asset manifest covers every Age', () => {
  it('lists only files that exist', () => {
    for (const [k, e] of Object.entries(manifest.assets)) expect(existsSync(join(ROOT, 'public/assets', e.file)), k).toBe(true);
  });

  for (const age of BALANCE.ages) {
    describe(age.id, () => {
      it('has its own battlefield layers, fortress states and HUD wall', () => {
        for (const layer of ['sky', 'far', 'mid', 'ground']) expect(has(`env.${age.id}.${layer}`), `env.${age.id}.${layer}`).toBe(true);
        expect(manifest.meta[`env.${age.id}`]?.skyTop).toBeTruthy();
        for (const team of ['blue', 'red']) for (const d of [0, 1, 2, 3]) expect(has(`base.${age.id}.${team}.${d}`), `base.${age.id}.${team}.${d}`).toBe(true);
        const m = manifest.meta[`base.${age.id}`];
        for (const k of ['flagX', 'flagY', 'torchX', 'torchY', 'smokeX', 'smokeY']) expect(m?.[k], `base.${age.id} ${k}`).toBeTypeOf('number');
        if (m?.torchFx) expect(has(String(m.torchFx))).toBe(true);
        expect(has(`ui.wall_${age.id}`), `ui.wall_${age.id}`).toBe(true);
      });

      for (const t of age.troops) {
        it(`${t.id} has both team sheets with the full animation set, a portrait and its projectile`, () => {
          for (const team of ['blue', 'red']) {
            const e = manifest.assets[`troop.${t.id}.${team}`] as SheetEntry | undefined;
            expect(e?.kind, `troop.${t.id}.${team}`).toBe('sheet');
            for (const a of ['idle', 'walk', 'attack', 'hit', 'death']) expect(e!.anims[a], `${t.id} ${a}`).toBeDefined();
            expect(e!.anims.attack.hitFrame).toBe(3);
            expect(e!.anims.attack.frames).toBeGreaterThan(3);
          }
          expect(has(`portrait.${t.id}`)).toBe(true);
          const meta = manifest.meta[`troop.${t.id}`];
          expect(meta?.top).toBeTypeOf('number');
          if (t.kind === 'ranged') {
            const e = manifest.assets[`troop.${t.id}.blue`] as SheetEntry;
            expect(e.muzzle, `${t.id} muzzle`).toBeDefined();
            expect(meta?.projectile, `${t.id} projectile`).toBeTruthy();
            expect((manifest.assets[String(meta!.projectile)] as StripEntry | undefined)?.kind).toBe('strip');
          }
          if (meta?.muzzleFx) for (const k of String(meta.muzzleFx).split(',')) expect(has(k), k).toBe(true);
        });
      }
    });
  }
});

describe('bosses', () => {
  for (const age of BALANCE.ages) {
    it(`${age.id} boss has an enemy sheet with the full animation set`, () => {
      const k = `troop.boss_${age.id}.red`;
      expect(has(k), k).toBe(true);
      const e = manifest.assets[k] as SheetEntry;
      for (const a of ['idle', 'walk', 'attack', 'hit', 'death']) expect(e.anims[a]?.frames, `${k} ${a}`).toBeGreaterThan(0);
      expect(BALANCE.bosses[age.id].name.length).toBeGreaterThan(0);
    });
  }
});
