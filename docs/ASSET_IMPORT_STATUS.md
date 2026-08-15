# Asset import status

## Current repository reality

The repository now contains the user-supplied `MC原版素材assets.zip` and a deterministic import pipeline for the subset used by the browser runtime.

The exact source archive currently tracked has SHA-256:

`b65a2211175af90664de9f41ea422f4869eee855f0da4bf6fe0715434ebe9c69`

GitHub Actions classifies it as a Minecraft Java client resource tree, not a `.minecraft/assets` hash store. The audited archive contains 7,623 files, including:

- 977 block textures;
- 582 item textures;
- 497 entity textures;
- 89 GUI textures;
- 195 particle textures;
- 2,016 block-model JSON files;
- 1,675 item-model JSON files;
- 1,005 blockstate JSON files.

The archive contains no `.bbmodel` files. That is expected for vanilla Java resources: block/item geometry is described by Minecraft JSON models/blockstates, while much entity geometry is defined by client code/model layers rather than Blockbench project files.

## Runtime resources now imported

`tools/import-minecraft-assets.py` resolves required files by canonical Minecraft resource suffix so the ZIP's arbitrary/top-level encoded folder name does not leak into runtime code. It extracts only the resources used by implemented gameplay and writes an exact per-file source manifest.

`tools/build-minecraft-runtime-assets.py` then produces browser-ready files. The currently tracked outputs include:

- `assets/textures/atlas.png` — generated 4×4 terrain atlas using original Minecraft 1.20.1 source textures;
- file-backed item textures under `assets/items/` for stick, wooden/stone pickaxes, raw iron, leather armor, mob drops and common materials already represented by gameplay;
- `assets/minecraft/runtime-manifest.json` — generated runtime checksum/source mapping;
- selected original model/blockstate JSON files;
- water animation metadata;
- the red bed entity texture;
- original entity sheets for cow, sheep + sheep fur, pig, chicken, zombie, skeleton, creeper and spider.

The terrain atlas checksum is:

`02f5d5a4926b5da7f217b60028d5fbb5ae864c6b5d0483d021ec074639c921f2`

Current atlas slots remain compatible with the chunk mesher while adding original resources for crafting-table front, iron ore and white wool. Cardinal face names are now preserved so the crafting table can distinguish its vanilla front and side textures instead of flattening all horizontal faces into one `side` texture.

## Implemented mob visual boundary

The eight mob types already implemented by gameplay no longer use generic color-only box templates. Their renderer now has two layers:

1. `src/mob-model-specs.js` — pure/testable per-species cuboid, pivot, UV-sheet and material-slot data;
2. `src/mob-model-renderer.js` — Three.js adapter that builds face-specific UV geometry, loads logical entity textures with nearest filtering, caches shared textures/materials, and applies visual articulation.

Current covered species:

- passive: cow, sheep, pig, chicken;
- hostile: zombie, skeleton, creeper, spider.

The sheep keeps its fur as a separate inflated overlay material; the skeleton uses thin limbs; the creeper has four independent legs; the spider has eight articulated legs; the chicken has separate wings. Passive/hostile gameplay state, hitboxes, damage, sleep safety, ranged/fuse behavior and spider climbing remain controlled by their existing systems rather than being coupled to render geometry.

The source ZIP proves the exact texture sheets but does **not** contain entity geometry definitions or `.bbmodel` files. The checked-in cuboid specs are therefore a vanilla-compatible rendering reconstruction designed for those classic sheets, not a claim that entity geometry was extracted from this ZIP.

## Tint handling

Minecraft applies tint-index colors at render time. The current world generator does not yet expose biome tint data, so the importer deliberately bakes stable Plains/default colors into tint-dependent runtime textures:

- grass: `[145, 189, 89]`;
- foliage: `[119, 171, 47]`;
- water: `[63, 118, 228]`;
- leather armor item base: `[160, 101, 64]`.

This is a compatibility stage, not a claim that biome coloring is finished. When biome state becomes authoritative/runtime-visible, those colors should move from build-time baking to render-time tinting.

## Manifest authority

`src/asset-manifest.js` remains the logical asset authority. Imported runtime resources are marked `source: "user-supplied"`; the terrain atlas and current file-backed item/entity resources must not silently fall back to prototype art.

CI verifies both layers:

1. the archive can be audited, selectively imported and rebuilt from scratch;
2. tracked runtime binaries exactly match the regenerated output;
3. runtime manifest checksums match tracked files;
4. logical asset keys resolve to tracked files;
5. directional block-face mappings remain stable;
6. entity texture dimensions match their declared model-sheet contracts;
7. all eight mob specs keep UV rectangles within the source-sheet bounds;
8. Chromium can construct every texture-backed articulated mob model without falling back to color-only materials.

## Known limitations / next batches

The current archive has **no sound resources and no `sounds.json`**. Audio therefore remains a separate asset-source task; it must not be described as imported from this ZIP.

The following work is also intentionally separate:

- biome-aware grass/foliage/water tinting;
- animated water frame playback (the original `.mcmeta` metadata is already retained);
- broader Minecraft JSON model/blockstate interpretation for non-cube blocks/items;
- real bed geometry/item rendering from the available entity texture;
- closer entity-geometry parity where vanilla model-layer definitions need to be researched beyond the resource ZIP;
- mob equipment/held-item visual layers (for example skeleton bow) where gameplay support exists or is added later;
- GUI/font/particle migration in controlled batches;
- sound import once a source archive containing the sound object set/registry is supplied.

The old blocker — absence of the Minecraft resource archive in the active repository — is closed.
