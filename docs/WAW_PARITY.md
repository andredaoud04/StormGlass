# We Are Warriors parity sheet

Purpose: record every number and feature we take from We Are Warriors (WAW) as a baseline, and where it came from.
Rule D3: WAW formulas and numbers may be a starting point. Never copy its art, audio, names, text or code.

Status labels: LOCKED (Andre decided), PROVISIONAL (we chose, may change), MODEL (a tuning guess, change freely), OPEN (needs a decision).

## How numbers were gathered (2026-10-25)

- Web search worked. Direct page fetches did not (the session's network could not resolve the wiki hosts).
- So the only WAW facts below come from search-result snippets. We have not measured the live game yet.
- Every other number is a Stormglass MODEL value, checked with the headless simulator (`npm run sim`) and the tests.
- Next step: measure the live game on a phone (stopwatch + screen recording) and replace MODEL values. See "To measure".

## Sources

| ID | Source | What it says |
|----|--------|--------------|
| S1 | Andre's brief, 2026-10-25 | Locked rules, Stone costs, later-Age cost model, status effects |
| S2 | We Are Warriors fandom wiki, "Timelines & Ages" page, via search snippet | Evolution costs by Age: first two Ages free, mid Ages about 2K and 16K Gold, late Ages 1.03M and 10.3M. The table has columns Age, troops, evolution cost, description, time. |
| S3 | Guides via search snippets (talkandroid, touchtapplay, appgamer, kashkick) | Food recruits units; Gold comes from combat; Gems buy Cards; about three units per Age (cheap melee, ranged, expensive strong one) |
| S4 | App Store listing (Lessmore GmbH) via search snippet | Many eras, each with new units |
| M | Stormglass MODEL | Our own estimate, tuned with the simulator |

## Numbers

| Number | Value | Status | Source | Notes |
|--------|-------|--------|--------|-------|
| Ages | 6: Stone, Ancient, Crusader, Gunpowder, Industrial, Future | LOCKED | S1 | WAW has more eras (S2); we compress to six |
| Food at battle start | 0 | LOCKED | S1 | |
| Stone Food income | 1 Food/s | LOCKED | S1 | |
| Stone costs | Clubber 5, Slinger 8, Brute 12 | LOCKED | S1 | |
| Later-Age costs | Ancient 6/9/14, Crusader 7/11/16, Gunpowder 8/12/18, Industrial 9/14/20, Future 10/16/23 | MODEL | S1 | Andre marked these MODEL |
| Starting Gold | 18 | MODEL | S1 | |
| Gold per normal kill | 1 | LOCKED | S1 | |
| Gold per tank kill | 5 | LOCKED | S1 | |
| Base-damage Gold | Paid in 10 steps (each 10% of enemy base HP). Totals by enemy Age: 30, 55, 95, 165, 285, 490 | MODEL | M | Rule 5 says Gold is paid for base damage; the amount is ours. Main income source, as in WAW (S3) |
| Evolution cost | Ancient 35, Crusader 80, Gunpowder 140, Industrial 220, Future 330 Gold; free once that Age's fortress is beaten | MODEL (free rule LOCKED) | S1, M | WAW's curve (S2) is much steeper (thousands) because WAW has more eras and pays more Gold per battle; ours is scaled to the locked 1/5 kill Gold |
| Troop stats per Age | Stone Clubber 50 HP / 12 dmg / 1.0 s; Slinger 34 / 10 / 1.0 s, range 320; Brute 260 / 28 / 1.4 s. Later Ages x1.6 per Age | MODEL | M | `src/data/balance.json` |
| Fortress HP | Enemy: 400, 640, 1024, 1638, 2621, 4194. Your fortress: 0.75x of your Age's value | MODEL | M | |
| Enemy power at Timeline 1 | By enemy Age: 0.85, 0.72, 0.78, 0.80, 0.92, 0.98 x troop stats | MODEL | M | Battle 1 winnable with Clubbers only (49 s); later stages need a few more upgrades each |
| Base Food income by army Age | 1.0, 1.2, 1.4, 1.6, 1.8, 2.0 Food/s | Stone LOCKED, rest MODEL | S1, M | Keeps troop counts similar as costs rise |
| Troop unlocks (ranged/tank) | Stone 20/45, Ancient 30/60, Crusader 45/90, Gunpowder 70/140, Industrial 130/260, Future 200/400 | MODEL | M | |
| Timeline scaling | +60% enemy stats and fortress HP per Timeline, waves +8% faster | MODEL | M | |
| Battle length target | about 1 minute | LOCKED | S1 | Battle 1 with Clubbers only: 49 s. Average over a first Timeline: 69-82 s (simulator) |
| First Prestige target | about 1 hour without ads | LOCKED target | S1 | Simulator: 44 min (smart bot), 81 min (simple bot) |
| Army upgrades | Food +0.1/s per level (max 30); Base +6% HP (max 40); Power +8% troop HP and damage (max 40). Cost = base x 1.25^level (6, 5, 8) | MODEL | M | |
| Status effects | Poison 8%/s per stack, 4 s, max 5; Burn 20%/s, 3 s, no stacking; Cold 15% slow per stack, 2.5 s, max 3; bosses half | MODEL (design LOCKED) | S1 | Stormglass extra, not in WAW |
| Max troop slots | 3 | LOCKED | S1 | |
| Skill buttons / Hero buttons | 3 / 1 | LOCKED | S1 | |

## Feature parity (D2: everything WAW does, plus Stormglass extras)

| Feature | WAW has it | Stormglass status |
|---------|-----------|-------------------|
| One-lane battle, Food, auto-walking troops | Yes | Done (M1) |
| Three troops per Age, unlock with Gold | Yes | Done (M1) |
| Evolution between Ages | Yes | Done for the rules; art for Stone and Ancient only (M3 adds the rest) |
| Gold upgrades | Yes | Done: Food, Base, Power (M2) |
| Timelines and Prestige | Yes | Rules and tests done; Prestige screen in M4 |
| Skills (3 buttons) | Yes | Sockets shown locked; M4 |
| Heroes | Yes | Socket shown locked until first Prestige; M4 |
| Cards (Gems) | Yes | Tab present, "later update"; M4 |
| Dungeons, Keys | Yes | Tab shows the four modes with their unlock rules; M4 |
| Events | Yes | M5 |
| Shop | Yes | Tab present: no ads, no purchases; M5/M6 |
| Status effects | No | Stormglass extra; sim and tests done, sources in M4 |

## To measure in the live game

1. Seconds from battle start to the first enemy spawn, and the enemy spawn order in the first battle.
2. HP, damage and attack interval of the first three units (count hits to kill).
3. Gold paid per kill, per tank kill and for base damage in the first three battles.
4. Unlock prices of the first ranged and tank units; first upgrade prices and their growth.
5. Time to the first Evolution and to the first Timeline jump for a new player.
