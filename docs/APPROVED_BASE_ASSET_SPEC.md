# Stormglass — Approved Fortress Art Direction (11 October 2026)

Status: **visual direction approved; production sprites NOT yet exported or integrated**.

## Source
User-approved third concept sheet: medieval, desert, ice and hell bases, each with ally/enemy variations, angled variants and in-environment previews. This is a visual reference, **not** a transparent sprite atlas.

## Non-negotiable art constraints
- No faction banners, flags, pennants or hanging heraldry.
- No intrusive red/green faction indicators on the buildings. Subtle roof/awning material differences are acceptable; avoid oversaturated paint.
- Match the environment's lighting, texture density, perspective and pixel scale. Bases should look native to the background.
- Medieval: layered timber-frame roofs, stone lower storey, wood palisade, arched door.
- Desert: angular sandstone battlements and square towers; **no domed roofs**.
- Ice: snowy crenellated stone fortresses and layered icy roofs; preserve first concept's silhouette rather than domes.
- Hell: heavy volcanic dark-stone gatehouses, hornlike architectural elements and glowing lava accents; preserve first concept's silhouette rather than domes.
- Do not redesign character sprites as part of base production. Character visual standard requires separate approval.

## Deliverables required before integration
Eight separate transparent-background, pixel-aligned base sprites (four environments × ally/enemy), with consistent art scale, bottom-ground anchor and documented dimensions; optionally separate decorative palisade pieces. No baked background or health bars in the sprite.
Use fixed scene-space coordinates, with HP bars directly above the buildings. Confirm iPhone and iPad screenshot composition before replacing the currently rendered bases.

## QA
1. Compare each sprite at actual game size against the approved environment.
2. Verify silhouettes, doors and roof detail remain legible.
3. No visible rectangular background or matte.
4. Base anchor, unit spawn point and health bar stay aligned across viewport sizes.
5. Require approval of exported sprite previews before final replacement.
