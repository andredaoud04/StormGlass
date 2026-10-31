// Phone-size screenshots of every screen. Usage:
//   npm run build && npx vite preview --port 4173 &
//   node tools/shots.mjs <outDir> [url]
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? 'tmp-shots';
const url = process.argv[3] ?? 'http://localhost:4173/';
mkdirSync(out, { recursive: true });

const VIEWPORTS = [
  { name: '390x844', width: 390, height: 844, dpr: 3 },
  { name: '375x667', width: 375, height: 667, dpr: 2 },
];

/** Advance the current scene by `seconds` of game time, deploying troops like a player would. */
async function fastForward(page, seconds, deploy = true) {
  await page.evaluate(
    ({ seconds, deploy }) => {
      const { app } = window.__sg;
      const steps = Math.round(seconds * 60);
      let k = 0;
      for (let i = 0; i < steps; i++) {
        if (deploy && i % 30 === 0) {
          const order = ['1', '2', '1', '3'];
          app.scene.key?.(order[k++ % order.length]);
        }
        app.frame(1 / 60);
      }
    },
    { seconds, deploy },
  );
}

/** Like fastForward, but tops up Food so every troop type gets deployed (a full crowd for art review). */
async function crowd(page, seconds) {
  await page.evaluate((seconds) => {
    const { app } = window.__sg;
    const steps = Math.round(seconds * 60);
    let k = 0;
    for (let i = 0; i < steps; i++) {
      if (i % 70 === 0) {
        app.scene.sim.foodMilli = Math.max(app.scene.sim.foodMilli, 60000);
        app.scene.key?.(['3', '2', '1', '2'][k++ % 4]);
      }
      app.frame(1 / 60);
    }
  }, seconds);
}

async function setSave(page, patch) {
  await page.evaluate((patch) => {
    const { app } = window.__sg;
    Object.assign(app.save, patch);
  }, patch);
}

const SCENARIOS = [
  ['home-new', async () => {}],
  ['battle-start', async (p) => { await p.evaluate(() => window.__sg.app.go('battle')); await fastForward(p, 2.2, false); }],
  ['battle-mid', async (p) => {
    await setSave(p, { slots: ['ranged', 'tank'] });
    await p.evaluate(() => window.__sg.app.go('battle'));
    await fastForward(p, 24);
  }],
  ['battle-late', async (p) => {
    await setSave(p, { slots: ['ranged', 'tank'] });
    await p.evaluate(() => window.__sg.app.go('battle'));
    await fastForward(p, 46);
  }],
  ['battle-result', async (p) => {
    await setSave(p, { slots: ['ranged', 'tank'] });
    await p.evaluate(() => window.__sg.app.go('battle'));
    for (let i = 0; i < 20; i++) {
      await fastForward(p, 10);
      const done = await p.evaluate(() => window.__sg.app.scene.phase === 'result');
      if (done) break;
    }
    await fastForward(p, 2.5, false);
  }],
  ['battle-pause', async (p) => { await p.evaluate(() => window.__sg.app.go('battle')); await fastForward(p, 8); await p.evaluate(() => window.__sg.app.scene.key('p')); await fastForward(p, 0.1, false); }],
  ['battle-ancient', async (p) => {
    await setSave(p, { armyAge: 1, enemyAge: 1, beaten: [0], slots: ['ranged', 'tank'] });
    await p.evaluate(() => window.__sg.app.go('battle'));
    await fastForward(p, 26);
  }],
  ['home-ancient', async (p) => {
    await setSave(p, { armyAge: 1, enemyAge: 1, stage: 2, beaten: [0], gold: 340, slots: ['ranged'], stats: { battles: 8, wins: 7, losses: 1, retreats: 0, goldEarned: 0, kills: 0 } });
    await p.evaluate(() => window.__sg.app.go('menu'));
  }],
  ['battle-storm', async (p) => {
    await setSave(p, { stage: 3, slots: ['ranged', 'tank'] });
    await p.evaluate(() => window.__sg.app.go('battle'));
    await fastForward(p, 14);
    await p.evaluate(() => window.__sg.app.scene.key('q'));
    await fastForward(p, 0.12, false);
  }],
  ['battle-storm-cooldown', async (p) => {
    await setSave(p, { stage: 3, slots: ['ranged', 'tank'], settings: { sound: true, reducedMotion: false, fast: true } });
    await p.evaluate(() => window.__sg.app.go('battle'));
    await fastForward(p, 14);
    await p.evaluate(() => window.__sg.app.scene.key('q'));
    await fastForward(p, 3, false);
  }],
  ['home-after-battle1', async (p) => {
    await setSave(p, { stage: 1, gold: 54, stats: { battles: 1, wins: 1, losses: 0, retreats: 0, goldEarned: 36, kills: 9 } });
    await p.evaluate(() => window.__sg.app.go('menu'));
  }],
  ['home-boss', async (p) => {
    await setSave(p, { stage: 4, slots: ['ranged', 'tank'], stats: { battles: 4, wins: 4, losses: 0, retreats: 0, goldEarned: 0, kills: 0 } });
    await p.evaluate(() => window.__sg.app.go('menu'));
  }],
  ['home-evolve', async (p) => {
    await setSave(p, { stage: 4, beaten: [0], slots: ['ranged', 'tank'], stats: { battles: 5, wins: 5, losses: 0, retreats: 0, goldEarned: 0, kills: 0 } });
    await p.evaluate(() => window.__sg.app.go('menu'));
  }],
  ['upgrades', async (p) => { await setSave(p, { gold: 60, stats: { battles: 2, wins: 2, losses: 0, retreats: 0, goldEarned: 0, kills: 0 } }); await p.evaluate(() => window.__sg.app.go('menu', 'upgrades')); }],
  ['upgrades-camp', async (p) => { await setSave(p, { armyAge: 2, enemyAge: 2, gold: 400, slots: ['ranged', 'tank'], camp: { food: 3, melee: 2, fortress: 1 }, stats: { battles: 12, wins: 11, losses: 1, retreats: 0, goldEarned: 0, kills: 0 } }); await p.evaluate(() => window.__sg.app.go('menu', 'upgrades')); }],
  ['dungeons', async (p) => { await p.evaluate(() => window.__sg.app.go('menu', 'dungeons')); }],
  ['cards', async (p) => { await p.evaluate(() => window.__sg.app.go('menu', 'cards')); }],
  ['shop', async (p) => { await p.evaluate(() => window.__sg.app.go('menu', 'shop')); }],
  ['settings', async (p) => { await p.evaluate(() => { const s = window.__sg.app.scene; s.settings = true; }); }],
];

// Later Ages: a home screen, an early crowd and a late fight (fortress damage) per Age.
// Boss stage of every Age: the boss mid-raid with the ward up.
const ALL = [['stone', 0], ['ancient', 1], ['crusader', 2], ['gunpowder', 3], ['industrial', 4], ['future', 5]];
for (const [age, n] of ALL) {
  SCENARIOS.push([`boss-${age}`, async (p) => {
    await setSave(p, { armyAge: n, enemyAge: n, stage: 4, slots: ['ranged', 'tank'], camp: { melee: 3, ranged: 3, tank: 3, fortress: 3, food: 3 } });
    await p.evaluate(() => window.__sg.app.go('battle'));
    await crowd(p, 17);
  }]);
}

const LATER = [
  ['crusader', 2, ['crusader_footman', 'crusader_crossbow', 'crusader_knight']],
  ['gunpowder', 3, ['gunpowder_pikeman', 'gunpowder_musketeer', 'gunpowder_cannon']],
  ['industrial', 4, ['industrial_trencher', 'industrial_rifleman', 'industrial_walker']],
  ['future', 5, ['future_blade', 'future_gunner', 'future_mech']],
];
for (const [age, n, troops] of LATER) {
  const beaten = Array.from({ length: n }, (_, i) => i);
  const save = { armyAge: n, enemyAge: n, beaten, gold: 500, slots: ['ranged', 'tank'], stats: { battles: n * 5, wins: n * 5, losses: 0, retreats: 0, goldEarned: 0, kills: 0 } };
  void troops;
  SCENARIOS.push([`home-${age}`, async (p) => { await setSave(p, save); await p.evaluate(() => window.__sg.app.go('menu')); await fastForward(p, 0.5, false); }]);
  SCENARIOS.push([`battle-${age}-start`, async (p) => { await setSave(p, save); await p.evaluate(() => window.__sg.app.go('battle')); await fastForward(p, 2.2, false); }]);
  SCENARIOS.push([`battle-${age}`, async (p) => { await setSave(p, save); await p.evaluate(() => window.__sg.app.go('battle')); await crowd(p, 12); }]);
  SCENARIOS.push([`battle-${age}-late`, async (p) => { await setSave(p, save); await p.evaluate(() => window.__sg.app.go('battle')); await fastForward(p, 44); }]);
}

const only = process.env.ONLY?.split(',');
const browser = await chromium.launch();
for (const vp of VIEWPORTS) {
  for (const [name, run] of SCENARIOS) {
    if (only && !only.includes(name)) continue;
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.dpr, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.goto(url);
    await page.waitForFunction(() => window.__sg?.app);
    await page.evaluate(() => { localStorage.clear(); });
    await run(page);
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${out}/${name}-${vp.name}.png` });
    if (errors.length) console.log(`ERRORS ${name} ${vp.name}:`, errors.join('\n'));
    await ctx.close();
  }
}
await browser.close();
console.log('shots done ->', out);
