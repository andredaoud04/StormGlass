# Stormglass Living Game Bible

Owner: Andre. Repo: github.com/andredaoud04/StormGlass. Live build: storm-glass-opal.vercel.app (deploys from `main`).
This file is the single source of truth. If code and Bible disagree, fix one of them in the same change.

---

## 1. Start Here

### Read order
1. This section.
2. Locked Rules (section 2). Never break them without Andre.
3. Current Build Status (section 3). Know what exists before you change it.
4. The section for your task (Battle, Progression, Art, Tech).
5. Open Decisions (section 9) and the Decision Log (section 10).
6. `docs/WAW_PARITY.md` for where every number comes from.
7. `docs/art-specs/README.md` before you touch any image.

### Status labels
- **LOCKED**: Andre decided. Do not change without Andre.
- **PROVISIONAL**: we chose it. It works. Andre may change it.
- **MODEL**: a tuning number. Change it freely, but run the tests and the simulator.
- **OPEN**: needs a decision. Do not build on it until decided.

### How to work
- Small commits with clear messages.
- Every rule gets a test. Run `npm run check` (typecheck, tests, build) before every push.
- Balance numbers live in `src/data/balance.json`. Never put a balance number in code.
- Art lives in `tools/art`. Run `npm run art` to rebuild every image and sound. Never hand-edit `public/assets/manifest.json` unless you replaced a PNG with a different size.
- After any balance change, run `npm run sim` and record the new pacing in section 5.
- After any visual change, run the screenshot tool (section 7) at 390x844 and 375x667 and look at every screen.
- Decide routine details yourself. Write them in the Decision Log.
- Stop and ask Andre only to: change a LOCKED rule, add a currency or a feature that is not listed, or approve art.

### Report format (end of every session)
1. What changed (short list).
2. Files touched (folders are fine).
3. Checks, each marked PASS / FAIL / NOT RUN: typecheck, tests, build, simulator, screenshots, deploy.
4. Screenshots (paths in `docs/screenshots/`).
5. What is next.
6. Questions for Andre (exactly what is needed).

---

## 2. Locked Rules

1. One horizontal lane. Your fortress is on the left, the enemy fortress on the right. Food rises every second. Spend Food to send troops. Troops walk and fight on their own. Destroy the enemy fortress to win. A battle lasts about one minute.
2. Six Ages, in order: Stone, Ancient, Crusader, Gunpowder, Industrial, Future. There is no seventh Age.
3. Every battle starts at 0 Food. Stone income is 1 Food per second. Stone costs: Clubber 5, Slinger 8, Brute 12. Later-Age costs are MODEL: Ancient 6/9/14, Crusader 7/11/16, Gunpowder 8/12/18, Industrial 9/14/20, Future 10/16/23.
4. In battle: at most 3 troop cards, 3 Skill buttons, 1 Hero button. A new player owns only the Clubber. The first Hero unlocks after the first Prestige.
5. Gold comes only from main campaign battles: 1 per normal kill, 5 per tank kill, plus Gold for damaging the enemy fortress. Gold is kept after a loss or retreat. Dungeons, events, daily rewards and chests never give Gold. Starting Gold is 18 (MODEL).
6. The enemy stage and your army's Age are separate. Beating an enemy fortress moves the next enemy up one Age. Your troops change only when you choose Evolution. Evolution costs Gold until you have beaten that Age's fortress; then it is free.
7. Prestige needs a Future army and a beaten Future fortress. It costs nothing. It restarts you at Stone on a harder Timeline. You keep permanent collections (Cards, Skills, Runes, Heroes). Bought troop unlocks stay. You may deploy only troops of your current and previous Age.
8. Five main tabs only: Dungeons, Upgrades, Battle (centre, default), Cards, Shop. Battle, Upgrades and Dungeons never scroll.
9. Dungeons: Rush, Legends, Bosses, Survival on one screen. Rush unlocks after Prestige 1, Legends after 2, Bosses after 3. Keys appear only in Dungeons.
10. Battle HUD: Hero circle raised on the left. Three Skill circles in a row on the right. Food and rate lower left. Troop cards lower centre and right. A control wall built from the battle's environment (stone and wood, sandstone, ice, volcanic rock).
11. No ads and no purchases by default. Rewarded ads only after a Rune tree unlock, with a real ad callback. Never fake a purchase or an ad reward.
12. No new currency, no sixth tab, no fourth troop slot without Andre. Currencies: Gold (upgrades, Evolution), Gems (Cards, Skills), Keys (Dungeons), Rune Points (Rune tree).
13. Status effects (design LOCKED, numbers MODEL): Poison 8% of attacker damage per second per stack, 4 s, max 5 stacks. Burn 20% per second, 3 s, no stacking (a stronger burn replaces a weaker one). Cold 15% slower move and attack per stack, 2.5 s, max 3 stacks. Bosses take half strength. Never applies to fortresses. Every effect refreshes on hit. No permanent stun or full-uptime buff at any level.
14. Art: crisp, detailed, original pixel art (D1). Never copy We Are Warriors art, audio, names, text or code (D3).

---

## 3. Current Build Status

Date: 2026-10-30. Branch `rebuild` merged to `main` when M1 passed its checks. Later-Age art on branch `claude/sg-era-art` (awaiting Andre's art approval).

| Milestone | Status | Notes |
|-----------|--------|-------|
| M1 Core battle, Stone Age | DONE | Lane battle, Food, three Stone troops, authored waves, base-damage Gold, victory, defeat, retreat, Battle home screen, juice (hit flash, sparks, damage numbers, hitstop, shake, slow-motion fortress destruction, coins flying to the counter), sound effects |
| M2 Progression and economy | DONE (first pass) | Upgrades tab (troop unlocks, Food, Base, Power, Evolution), versioned balance table, headless simulator (`npm run sim`), pacing tests. Prestige rules and tests done; Prestige button arrives with M4 |
| M3 All six Ages | IN PROGRESS | Art done for all six Ages: troops (both teams, full animation set), fortress (four damage states), layered battlefield, HUD wall, projectiles and muzzle effects. Tests prove every Age and troop has its assets. Still to do: authored waves and bosses per later Age |
| M4 Meta | NOT STARTED | Status effects already in the sim with tests. Skill and Hero sockets shown locked. Dungeons tab shows the four modes with their unlock rules |
| M5 Live features | NOT STARTED | |
| M6 Release | NOT STARTED | |

Known gaps:
- Ranged troops of every Age share the one `sling` shot sound and tanks the swing sound (no musket bang, cannon boom or energy zap yet); sound was left unchanged on purpose.
- The Stone-art fallback in `battleView.ts` stays as a safety net only; no Age uses it now.
- Stone and Ancient death falls can clip at the frame edge (later Ages use the padded `roomyDeath` fall); left as is so Stone and Ancient look unchanged.
- Cards and Shop tabs show "arrives in a later update". Shop says "No ads. No purchases."
- The `legacy-2026-10-25` git tag could not be pushed (the session proxy refused tag pushes). The branch `legacy` holds the same commit. Andre: please create the tag on GitHub (Releases, then "Create tag" on branch `legacy`).

---

## 4. Battle Systems

All battle logic is in `src/sim`. It is pure and deterministic: the same seed and the same commands always give the same battle. It never reads the clock, the screen or `Math.random`.

- **Tick**: 20 ticks per second (`sim.tickRate`). The renderer interpolates between ticks, so motion is smooth at 60 fps.
- **Lane**: 1000 lane units from your fortress front (0) to the enemy fortress front (1000). Troops spawn 40 units in front of their fortress.
- **Food**: stored in milli-Food (1000 = 1 Food) so there is no rounding drift. A deploy spends Food once, at the start of the next tick. A failed deploy (not enough Food, bad slot, full lane) never spends Food.
- **Troops**: walk until an enemy unit or the enemy fortress is in range, then attack. The attack lands after a wind-up of 40% of the attack interval (at most 0.4 s); the animation is timed to it. Ranged troops fire a projectile that homes on its target. Allies do not block each other.
- **Lane cap**: at most 24 living units per side (engineering limit). A full lane holds enemy spawns instead of banking them.
- **Waves**: each enemy Age has an authored spawn list. After the list ends, a looping segment repeats so stalling eventually loses. Tests prove spawn times never go backwards and match the script exactly.
- **End**: the battle ends when a fortress reaches 0 HP. If both fall on the same tick, it is a victory. Retreat ends at once and keeps Gold.
- **Gold**: paid at the moment of each kill (1, or 5 for a tank) and for each tenth of enemy fortress HP removed. Every payment happens exactly once (tested).
- **Status effects**: `src/sim/status.ts`. Bounded by design and proven by tests (cap stacks, expiry, Cold never stops a unit, bosses at half strength).
- **Commands**: `deploy(slot)` and `retreat`. Skills and Hero commands come with M4.

---

## 5. Progression and Economy

Data: `src/data/balance.json` (version 1). Logic: `src/game/progress.ts`, `src/game/upgrades.ts`. Save: `src/game/save.ts`.

### Loop
1. Fight the current enemy fortress. Earn Gold from kills and fortress damage, win or lose.
2. Spend Gold: unlock this Age's troops, buy upgrades, or Evolve.
3. Beat the fortress: the next enemy is one Age higher. Evolution into the Age you just beat becomes free.
4. Beat the Future fortress with a Future army: Prestige to the next Timeline.

### Numbers (all MODEL unless marked)
- Base Food income by army Age: 1.0 (LOCKED for Stone), 1.2, 1.4, 1.6, 1.8, 2.0 Food/s. Later Ages cost more, so income rises to keep troop counts similar.
- Troop stats: each Age is 1.6x the Age before (HP and damage). Same-Age troops cost 5/8/12 Food relative to income.
- Enemy power on Timeline 1, by enemy Age: 0.85, 0.72, 0.78, 0.80, 0.92, 0.98 x troop stats.
- Fortress HP: 400 x 1.6^Age (enemy). Your fortress has 0.75x that, times the Base upgrade.
- Fortress Gold (paid in 10 steps): 30, 55, 95, 165, 285, 490.
- Evolution cost: Ancient 35, Crusader 80, Gunpowder 140, Industrial 220, Future 330. Free after that Age's fortress is beaten (LOCKED rule).
- Troop unlocks (ranged / tank): Stone 20/45, Ancient 30/60, Crusader 45/90, Gunpowder 70/140, Industrial 130/260, Future 200/400.
- Upgrades: Food +0.1 Food/s per level (cost 6 x 1.25^level, max 30). Base +6% fortress HP per level (5 x 1.25^level, max 40). Power +8% troop HP and damage per level (8 x 1.25^level, max 40).
- Timeline scaling: +60% enemy stats and fortress HP per Timeline; waves 8% faster.

### Predicted pacing (`npm run sim`, 2026-10-26)
| Moment | Smart player | Simple player |
|--------|-------------|---------------|
| First win | 0.9 min | 0.9 min |
| Evolve to Ancient | 14 min | |
| Evolve to Crusader | 26 min | |
| Evolve to Gunpowder | 38 min | |
| Evolve to Industrial | 42 min | |
| Evolve to Future | 44 min | |
| First Prestige | 44 min | 81 min |
| Average battle | 82 s | 69 s |

Target: first Prestige about 1 hour without ads. The two bots bracket it. Tests fail if the smart bot leaves 30 to 100 minutes.

### Save
- Saved to `localStorage` key `stormglass.save` after every battle and purchase.
- Schema version 2. `MIGRATIONS` upgrades older saves one step at a time; `repair` clamps every field so a damaged save never crashes (tested).
- Prestige keeps Gold, upgrades and troop unlocks; it resets army Age, enemy Age and beaten fortresses (PROVISIONAL, see Open Decisions).

---

## 6. Art and UI

### Look
- Original pixel art, chunky chibi troops with big heads and a bold 1 px dark outline (#1e1526) on every part.
- Troops are 23 to 29 art pixels tall, which is 46 to 58 CSS pixels on a 390-wide phone.
- Each Age has a layered battlefield (sky, far, mid, ground), a fortress with four damage states, and its own HUD wall.
- UI: carved stone panels, timber, gold trim, ornate header plaques, glowing round sockets, square troop cards, big buttons, few words. No glassy panels, no generic dashboards, no parchment.

### Pixel rules
- The game draws to a low-resolution canvas (1 unit = 1 art pixel) and scales it by a whole number to the screen. Sprites are never blurry.
- The art screen is 180 to 256 pixels wide and 330 to 560 tall, chosen per device. On a 390x844 phone at 3x it is 195x422.
- Text uses our own pixel fonts (5 px and 7 px caps) with a 1 px outline.

### Asset pipeline
- Every runtime image is its own transparent PNG in `public/assets`, listed in `public/assets/manifest.json`. Code loads images only through the manifest.
- To swap any sprite, replace the PNG with one of the same size and frame grid. Specs per asset (size, frames, anchor, palette) are in `docs/art-specs/`.
- Images are generated by code in `tools/art` (hand-authored pixel grids, a paper-doll rig with RotSprite rotation, procedural painting for environments). Sounds are synthesized in `tools/sfx`. Both are original.

### Juice
- Hit: white flash, knockback, spark, damage number. Heavy hits: shock ring, screen shake, short hitstop.
- Death: fall animation, blink, smoke poof, coins fly to the Gold counter.
- Fortress: shakes, chips fly, smoke at 66% and 33% HP; destruction plays explosions in slow motion, then rubble.
- Reduced motion (Settings and Pause): turns off shake, hitstop and slow motion.

### HUD walls by Age
Stone: stone and wood. Ancient: sandstone. Crusader: pale ashlar hung with heraldic pennants. Gunpowder: timber planking with riveted iron straps. Industrial: red brick under a riveted steel girder. Future: alloy panels under a glowing trim (D24).

### Later Ages (Crusader to Future)
- Troops: same chibi paper-doll rig, frame sizes, anchors, frame counts and timing as Stone and Ancient (idle 4 @ 5 fps, walk 4 @ 8, attack 6 @ 10 with the hit on frame 3, hit 1, death 4 @ 10). Humanoid parts are letter grids in `tools/art/troops/<age>.ts` using `troops/kit.ts` (ramp letter groups, darker back limbs).
- Non-humanoid tanks have their own rigs: the Cannon (`troops/gunpowder.ts`: wheels turn, gunner pushes, touches off the vent, gun recoils with flash and smoke) and the biped machine rig (`troops/machines.ts`: two-bone legs solved per frame) used by the Steam Walker and the Mech.
- Gun troops: the muzzle point is computed from the rig on the firing frame. Muzzle effects (`fx.muzzle`, `fx.gunsmoke`, `fx.zap`) and the projectile are named in the troop's manifest meta. Bolts and bullets fly almost flat (projectile meta `arc`).
- Fortress torch effect is per Age (`base.<age>` meta `torchFx`; the Future citadel uses a blinking beacon). Gunpowder and Industrial battlefields reuse the volcano plume for a burning town and a factory chimney.
- Review sheets: `npx tsx tools/art/preview/age.ts <dir>` writes troop contact sheets, fortress states and an all-Ages lineup.

---

## 7. Tech Stack

- **TypeScript + Vite**: fast builds, tiny output, deploys to Vercel as static files.
- **Custom Canvas 2D renderer (no Pixi or Phaser)**: the whole game is a low-resolution pixel canvas scaled by a whole number. Canvas 2D gives exact pixel control, a 60 KB bundle and no engine to fight. Our sprite count (under 100) is far below what Canvas 2D handles at 60 fps on mid-range phones. Revisit only if profiling shows a problem.
- **Vitest** for rules and simulator tests. **Playwright** (pre-installed) for phone screenshots.
- **Native apps later**: wrap the same web build with Capacitor (M6).

Commands:
- `npm run dev`: local dev server.
- `npm run check`: typecheck, tests, production build. Must pass before any push.
- `npm run art`: rebuild all images, the manifest, art specs and sounds.
- `npm run sim`: pacing report (`-- --cycle` for the simple bot).
- `npx tsx tools/sim/matchups.ts`: win/loss grid for every army Age against every enemy Age.
- Screenshots: `npm run build && npx vite preview --port 4173 &` then `node tools/shots.mjs docs/screenshots/<date> http://127.0.0.1:4173/`. Includes `home-<age>`, `battle-<age>-start`, `battle-<age>` (a crowd: Food is topped up so every troop type deploys) and `battle-<age>-late` for every later Age. `ONLY=a,b` limits the run.

Folders:
- `src/sim`: pure battle simulation. `src/game`: balance access, progression, upgrades, save, bots.
- `src/engine`: screen, assets, drawing, input, audio. `src/view`: battle and environment renderers, effects.
- `src/scenes`: battle and menu. `src/ui`: widgets. `src/data/balance.json`: all balance numbers.
- `tools/art`, `tools/sfx`, `tools/sim`, `tools/shots.mjs`. `tests`: Vitest.

---

## 8. Roadmap

- **M1 Core battle, Stone Age** (DONE).
- **M2 Progression and economy** (DONE, first pass): keep tuning with real play.
- **M3 All six Ages** (next): Crusader, Gunpowder, Industrial, Future troops, fortresses, battlefields, HUD walls; authored waves per Age; bosses.
- **M4 Meta**: Cards, Skills, Runes, Heroes, status-effect upgrade lines, the four Dungeon modes, Prestige screen and Timelines.
- **M5 Live**: 72-hour Events with their own troops, wallet and Shop; Home Base with wandering Heroes; Legends story map (Richard the Lionheart, ending with the 1192 truce); optional Hell Siege (Broker) with disclosed, capped risk.
- **M6 Release**: Capacitor wrapper, store builds, Rune-gated rewarded ads, analytics, save backup.

---

## 9. Open Decisions (need Andre)

1. **Campaign shape.** We read rule 6 literally: one enemy fortress per Age, six per Timeline. "Battles 1 to 5" in M1 is read as a new player's first five battles (Stone fortress, then the Ancient fortress). If you wanted several battles per Age, say how many; it is one number in the data.
2. **Survival unlock.** Rules give unlocks for Rush, Legends and Bosses, not Survival. Proposal: Survival unlocks after the first Prestige with Rush.
3. **HUD wall material per Age.** Built per D24 (Crusader stone and banners, Gunpowder timber and iron, Industrial brick and steel, Future alloy). Rule 10 still names ice and volcanic rock; if you want those, say for which Age.
4. **What Prestige keeps.** We keep Gold and Gold upgrades through Prestige (rule 7 lists only collections and unlocks). Should Gold or upgrades reset?
5. **Art approval.** Please look at `docs/screenshots/2026-10-30/` (every later Age: home, battle start, crowd, late fight; `art/` has troop contact sheets, fortress states and an all-Ages lineup) and approve, or say what to change.
6. **Legacy tag.** Please create tag `legacy-2026-10-25` on branch `legacy` (our session could not push tags).

---

## 10. Decision Log

| ID | Date | Decision | Status | By |
|----|------|----------|--------|----|
| D1 | 2026-10-25 | "Pixel art. Crisp, detailed, original pixel art, Soda Dungeon-level craftsmanship. The repo andredaoud04/WeareStorm (clean-cartoon) is reference only; you may borrow its design ideas and tooling (e.g. headless balance harness), never its art style." | LOCKED | Andre |
| D2 | 2026-10-25 | "Functionality target = everything We Are Warriors does, plus Stormglass extras listed below." | LOCKED | Andre |
| D3 | 2026-10-25 | "We Are Warriors' core formulas and numbers may be used as the starting baseline for stats, costs and pacing. Never copy its art, audio, character names, text or code. Get numbers by measurement or public sources, and record the source of every number in docs/WAW_PARITY.md." | LOCKED | Andre |
| D4 | 2026-10-25 | "Rebuild from scratch is approved." | LOCKED | Andre |
| D5 | 2026-10-25 | Stack: TypeScript, Vite, custom Canvas 2D low-res renderer, Vitest, Playwright. Reason in section 7. | PROVISIONAL | Claude |
| D6 | 2026-10-25 | Art scale: 1 art pixel = 2 CSS pixels on a 390-wide phone; screen 180-256 x 330-560 art pixels; whole-number scaling only. | PROVISIONAL | Claude |
| D7 | 2026-10-25 | Campaign: one fortress per Age (rule 6 read literally). See Open Decision 1. | PROVISIONAL | Claude |
| D8 | 2026-10-25 | Fortress damage Gold is paid in 10 equal steps of enemy fortress HP; totals per Age in section 5. | MODEL | Claude |
| D9 | 2026-10-25 | Enemy troops use the same troop types as their Age with a per-Age power factor (0.85 on Stone) so Battle 1 is winnable with Clubbers only (49 s). | MODEL | Claude |
| D10 | 2026-10-25 | Burn: a weaker burn does nothing (no refresh); a stronger or equal burn replaces it and resets its timer. | PROVISIONAL | Claude |
| D11 | 2026-10-25 | If both fortresses fall on the same tick, it counts as a victory. | PROVISIONAL | Claude |
| D12 | 2026-10-25 | Lane cap of 24 living units per side. A failed deploy never spends Food. | PROVISIONAL | Claude |
| D13 | 2026-10-26 | Base Food income rises with the army's Age (1.0 to 2.0 Food/s) because later troops cost more. Stone stays 1.0. | MODEL | Claude |
| D14 | 2026-10-26 | Army upgrades: Food, Base (fortress HP) and Power (troop HP and damage), bought with Gold, kept through Prestige. | PROVISIONAL | Claude |
| D15 | 2026-10-26 | Enemy power grows a little each stage so a single upgrade burst cannot cascade through every Age. | MODEL | Claude |
| D16 | 2026-10-26 | Ancient art made during M1 because a new player's second battle is the Ancient fortress. | PROVISIONAL | Claude |
| D17 | 2026-10-26 | Skill and Hero sockets show in battle as locked sockets until M4 (rule 10 layout). | PROVISIONAL | Claude |
| D18 | 2026-10-26 | Unbuilt tabs say so plainly ("arrives in a later update"). Nothing pretends to work. | PROVISIONAL | Claude |
| D19 | 2026-10-26 | Sounds are synthesized by our own code (chiptune style) and listed in the manifest like images. | PROVISIONAL | Claude |
| D20 | 2026-10-26 | Hitstop, slow motion and screen shake are visual only; the sim's fixed ticks are never skipped or changed. | PROVISIONAL | Claude |
| D21 | 2026-10-30 | Later-Age looks: Crusader = mail, team tabards with a pale cross, kite shields, limestone keep; Gunpowder = morions, tricornes, a crewed bronze cannon, bastion fort; Industrial = steel helmets and puttees, a riveted Steam Walker, brick works; Future = alloy over dark suits, team-glow energy weapons, a Mech, alloy citadel. | PROVISIONAL | Claude |
| D22 | 2026-10-30 | Non-humanoid tanks get their own rigs (Cannon; biped machine rig for Steam Walker and Mech) but keep the standard animation names, frame counts and timing so the renderer treats them like any troop. | PROVISIONAL | Claude |
| D23 | 2026-10-30 | Gun effects and per-Age torch are data (manifest meta `muzzleFx`, projectile `arc`, base `torchFx`); the renderer defaults keep Stone and Ancient exactly as before. | PROVISIONAL | Claude |
| D24 | 2026-10-30 | HUD walls: Crusader stone with heraldic pennants, Gunpowder timber and iron, Industrial red brick and steel girder, Future alloy panels (owner brief for this pass; replaces the Open Decision 3 proposal). | PROVISIONAL | Andre (brief) |
