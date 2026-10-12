# Stormglass — Visual Gauntlet & Tonight's Engineering Pass
Date: 2026-10-12  
Scope: existing deployed React/Vite game. **Approval does not imply sprite-export readiness.**

## Source of truth
Google Drive → ChatGPT → VideoGame Projects → Stormglass → Assets → 02_Approved.
- Rich, environment-native backgrounds and bases.
- Hell base: same ally/enemy architecture **and exact colours**; charcoal roofs on both; horned volcanic stone, lava doorway; **no faction flags/banners**.
- Regular units: simple, emotive, readable at battle scale; **heroes are the premium focal point and occupy the Special slot**.
- The art concept sheets are presentation boards, NOT transparent production sprites. Never crop/place a whole board into gameplay.
- No new ordinary troop designs or hero portraits are approved for production without separately accepted transparent source art.

## Implemented tonight (source code)
1. Uniform logical portrait artboard (420×900) scaled to actual viewport without independent HUD/background stretching. Resizes on browser chrome/orientation changes. Stage uses one scale factor on both iPhone/iPad.
2. Idle stage and active stage share base grounding; idle visuals choose the current campaign stage environment.
3. Temporary SVG base fallback no longer draws rejected flags; its Hell roof now uses the same neutral charcoal for both factions. **Do not mistake fallback for the final approved fortress illustration.**
4. Bottom navigation: consistent vector icon for Cards and more legible tab labels.
5. Era-themed battle dock: improved subtle material gradients, slightly taller troop cards, and selected-hero labelling without substituting the Crusader Champion portrait for unrelated heroes.
6. Compact gold/gems/food typography, with tests covering billions of gold; exact game balance values remain unchanged.
7. Tests: viewport fit/invariant and numeric formatting. GitHub Actions checks run tests, TypeScript, Vite build.

## Adversarial screenshot audit — perform on each deployment
Test **idle, active combat, dungeon tab, upgrades, cards, shop, and open modal** at:
- iPhone SE size: 375×667; modern iPhone: 390×844; large iPhone: 430×932
- iPad portrait: 820×1180 and 1024×1366; iPad landscape: 1180×820.
For each screenshot, fail a build visually if:
- any main tab, battle CTA, currency counter, hero slot, skill, or troop card is clipped or only reachable by scrolling;
- base HP floats away from the fortress; troops are on a different ground line; spawn positions are obscured;
- roof material differs between ally/enemy Hell bases, or banners appear on base architecture;
- base/banner/text is pasted on an opaque rectangle instead of environment-integrated art;
- regular troops overpower heroes; unreadable faces/weapons or wrong hero portrait appears;
- foreground is an accidental full-height wallpaper instead of an intentionally framed combat lane;
- a screenshot is claimed to be verified without opening it.

## Implementation priorities still outstanding
**P0:** Export eight genuine transparent approved base sprites; render at scene-native scale, keep identical ally/enemy silhouettes and charcoals where required. Screen-capture visual proof before replacing fallback SVG.
**P0:** Capture deployment screenshots on real iPhone/iPad sizes and compare against approved references.
**P1:** Produce readable simplified unit sprite sheet (melee/ranged/tank), distinct hero character assets, and movement/hit/death animation frames; obtain approval before integrating.
**P1:** Split detailed environment boards into transparent/independent parallax and combat-plane layers; never try to disguise a non-transparent board with CSS.
**P2:** Theme-fidelity upgrade for bottom barricade, nav illustrations, and contextual icons after accepted files exist.

## Mandatory gauntlet prompt for future coding agents
> You are auditing Stormglass for visual fidelity, not generating new design direction. Inspect the actual GitHub implementation and the latest real screenshots beside the approved Drive art. List the five biggest *measurable* deviations, categorize by P0/P1/P2, and fix only issues grounded in code and approved art. Never claim a concept board is a production sprite. Never introduce unapproved banners, faction paint, character redesigns, world eras, or gameplay mechanics. Keep the portrait canvas, base anchors, HP, actor spawn point and HUD in one coordinate system. After each commit run tests/typecheck/build, capture phone and tablet screenshots where accessible, identify remaining mismatches explicitly, and do not claim finished work without visual verification.

## Release status
**Automated tests/build:** checked by GitHub Actions per commit.  
**Real-device visual QA:** NOT yet performed in this session.  
**Approved transparent sprites deployed:** NOT yet; current bases remain code-drawn fallbacks.
