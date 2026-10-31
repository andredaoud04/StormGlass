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
6. Campaign (D25): every Age has 5 stages, 4 battles then a boss. Winning moves you one stage on; you never evolve after a normal battle. Beating the boss unlocks Evolution, which is free and moves your army and the enemy to the next Age together.
7. The main campaign never ends (D26). Prestige needs a Future army and a beaten Future boss. It costs nothing. It restarts you at Stone on the next, harder Timeline, forever. You keep slots and permanent collections (Cards, Skills, Runes, Heroes). The main campaign is paced to be enjoyed; real difficulty belongs to events and dungeons.
8. Five tab positions: Dungeons, Upgrades, Battle (centre, default), Cards, Shop. Tabs appear one at a time as the player progresses (D28); an unrevealed tab's position stays empty. Battle, Upgrades and Dungeons never scroll.
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
| M3 All six Ages | DONE (first pass) | Art for all six Ages: troops (both teams, full animation set), fortress (four damage states), layered battlefield, HUD wall, projectiles and muzzle effects. Campaign of 5 stages per Age with a boss per Age (own art at twice troop scale, own move set, raid and retreat, ward). Age Camp upgrades, slots, gradual tab reveal, endless Timelines. World layer at 1.33x scale (D29, first pass) and era sounds (D30) done. Still to do: confirm scaling against a WAW screenshot |
| M4 Meta | NOT STARTED | Status effects already in the sim with tests. Skill and Hero sockets shown locked. Dungeons tab shows the four modes with their unlock rules |
| M5 Live features | NOT STARTED | |
| M6 Release | NOT STARTED | |

Known gaps:
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

Data: `src/data/balance.json` (version 2). Logic: `src/game/progress.ts`, `src/game/upgrades.ts` (Age Camp and slots), `src/game/battleSetup.ts` (stages and bosses). Save: `src/game/save.ts`.

### Loop
1. Fight the current stage. Earn Gold from kills, fortress damage and boss damage, win or lose. A loss or retreat replays the same stage and keeps the Gold.
2. Spend Gold: buy the Ranged and Tank slots (once, forever), or train the Age Camp.
3. Win stages 1 to 4, then beat the boss on stage 5.
4. Evolve (free). Army and enemy move to the next Age, stage 1. The Camp resets; slots stay.
5. Beat the Future boss: start the next Timeline (Prestige). Timelines never end.

### Bosses (D27)
- One per Age, stage 5: Ograk the Mountain (slam), The Bronze Bull (charge with knockback), Baron Ironveil (lance: pierces a line), Admiral Blackpowder (barrage from range), The Iron Juggernaut (quake: wide area that chills), OMEGA Core (blink: teleports to your front, strikes twice, blinks home).
- Behaviour: appears at about 14 s, raids down the lane, telegraphs every strike with a red ground marker, then falls back to heal at its fortress (after its raid time or after losing 35% HP) and raids again. It never walks past its reach and never attacks your fortress: only troops take your fortress down.
- Ward: the enemy fortress takes no damage while the boss lives. Killing the boss shatters the ward.
- Gold: each boss pays its Gold in tenths as it is worn down (so a lost boss fight still pays; healing never pays twice).
- Art: each boss is its Age's heavy troop redrawn at twice the pixel scale (Scale2x per part, own 1 px outlines, real rig frames) with its own regalia (`tools/art/troops/bosses.ts`).

### Numbers (all MODEL unless marked)
- Base Food income by army Age: 1.0 (LOCKED for Stone), 1.2, 1.4, 1.6, 1.8, 2.0 Food/s.
- Troop stats: each Age is 1.6x the Age before (HP and damage).
- Enemy power by Age: 0.85, 0.85, 0.9, 0.92, 0.98, 1.0 x troop stats; by stage 1.0, 1.14, 1.28, 1.42, 1.15 (boss stage).
- Enemy fortress HP: 400 x 1.6^Age, by stage x1.0, 1.12, 1.24, 1.36, 1.5. Your fortress has 0.75x the Age value, times the Camp Base track.
- Fortress Gold (paid in 10 steps): 30, 55, 95, 165, 285, 490. Boss Gold: 30, 45, 70, 110, 170, 260.
- Slots: Ranged 30 Gold, Tank 70 Gold (Ranged first). Kept forever.
- Age Camp: Food +10% rate, Base +12% HP, Melee/Ranged/Tank +12% HP and damage per level. Max level 10, plus 4 per Timeline after the first. Cost = base (8, 6, 6, 8, 10) x 1.5^Age x 1.35^level. Resets on Evolution.
- Timeline scaling: +45% enemy stats and fortress HP per Timeline (linear), waves 5% faster, fortress and boss Gold x2.8 per Timeline.

### Predicted pacing (`npm run sim`, 2026-10-31)
| Moment | Smart player | Simple player |
|--------|-------------|---------------|
| First win | 0.9 min | 1.0 min |
| Stone boss | 6.5 min | 8.4 min |
| Ancient boss | 13.5 min | 15.2 min |
| Crusader boss | 19.4 min | 21.2 min |
| Gunpowder boss | 26.5 min | 27.0 min |
| Industrial boss | 32.8 min | 33.1 min |
| Future boss (first Prestige) | 39.2 min | 47.4 min |
| Timeline 2 done | 114 min | 111 min |

Tests: first Prestige 30 to 100 minutes; every boss beaten; battles average 40 to 100 s; Timeline 3 is finishable (the campaign stays endless).

### Save
- Saved to `localStorage` key `stormglass.save` after every battle and purchase.
- Schema version 3. `MIGRATIONS` upgrades older saves one step at a time; `repair` clamps every field so a damaged save never crashes (tested). v2 to v3: owned troops become slots, old upgrade levels are refunded as Gold, the enemy rejoins your army's Age at stage 1.
- Prestige keeps Gold and slots; it resets Ages, stage, Camp and beaten bosses.

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
| D25 | 2026-10-31 | "4 battles plus boss is good." No Evolution after every battle: a chronological sequence of stages leading to the boss; beating the boss unlocks Evolution. Replaces Locked Rule 6. | LOCKED | Andre |
| D26 | 2026-10-31 | "I want the main timeline to be unlimited, and a way to enjoy the pacing of the game. The We Are Warriors progression tips to making the progression difficult in events and dungeons." Replaces Locked Rule 7's single Prestige with endless Timelines. | LOCKED | Andre |
| D27 | 2026-10-31 | Boss "raid, retreat, ward, but it will also be boss dependent, different move sets affect how the boss behaves. But a consistent attack on the base doesn't make sense." Bosses never attack your fortress. | LOCKED | Andre |
| D28 | 2026-10-31 | "The UI and progression in the GPT version is far better. I also love the gradually showing new tabs." Release scope "Campaign + Prestige": Age Camp upgrades that reset each Age, permanent Ranged/Tank slots, tabs revealed one by one. Per-troop Gold unlocks and permanent Food/Base/Power upgrades are retired. | LOCKED | Andre |
| D29 | 2026-10-31 | "Do it like We Are Warriors scaling" for HUD, UI and unit size. First pass: the battle world (and the home meadow) is drawn on its own layer at about 1.33x the UI pixel size (always whole device pixels), fortresses partly off the screen edges, the HUD unchanged. To be checked against a We Are Warriors screenshot from Andre. | PROVISIONAL | Andre |
| D30 | 2026-10-31 | Era attack sounds: bow, crossbow, musket, cannon, rifle, steam, energy zap; boss roar on arrival; ward ting and shatter. Listed per troop as manifest meta `sfx`. | PROVISIONAL | Claude |
| D24 | 2026-10-30 | HUD walls: Crusader stone with heraldic pennants, Gunpowder timber and iron, Industrial red brick and steel girder, Future alloy panels (owner brief for this pass; replaces the Open Decision 3 proposal). | PROVISIONAL | Andre (brief) |
