# Project Baseline — 2026-08-26

This document records **merged `main` only**. Open PR work is excluded from merged facts.

## Authority

- Branch: `main`
- Commit: `9edb249f1f5c44dc9f4f0098fc4d7395b41974e7`
- Includes merged work through PR #138.
- Development line: `v0.4.0-dev`.
- Strict Minecraft Java 1.20.1 gameplay/content parity remains a planning estimate of about **35%**. Engine, source-resource and multiplayer-authority foundations are materially further along than total content breadth.

## Browser / rendering / UI

Merged main provides:

- shared desktop/mobile runtime with unified control intents;
- Pointer Lock desktop controls, landscape mobile controls and F5 first/third-person views;
- source-backed Steve first-person arm/sleeve and articulated wide-Steve third-person model;
- distinct walk/sprint locomotion presentation, Ctrl+W or double-W sprint and immersive browser shortcut containment;
- 70° first-person viewmodel camera with shoulder → arm → wrist → held-item hierarchy;
- distinct first-person transforms for pickaxe/sword/axe/shovel/hoe and lower/right neutral hand placement;
- transparent planar presentation for ordinary textured items and 3D previews for block items;
- Inventory/Workbench modal presentation that hides world HUD/viewmodel while a container is open;
- canonical Java 1.20.1 Workbench and Creative GUI resources;
- Creative category/search/survival-inventory tabs styled from canonical Java 1.20.1 assets;
- compact voxel chunks, terrain/mesh Workers, bounded chunk streaming/unload/disposal and merged geometry;
- selected-root Minecraft blockstate/model interpretation with parent/texture inheritance, variants/multipart, rotations, uvlock/cull/tint metadata and opaque/cutout/translucent batching.

The generic interpreted-model acceptance closure after PR #138 is **24 blockstates / 70 block models / 39 textures / 0 metadata**. The deterministic model texture atlas remains **128×128**, SHA-256 `28dea729513157f790032964dc4607a88ba6657e72d3e9eca5a9cc85fa5ce1b5`. Tracked runtime/source manifests are byte-compared against regenerated CI output.

## Creative mode

Merged Creative behavior includes:

- grounded entry with double-Jump Creative flight toggle; Spectator remains forced-flying;
- Creative/Spectator hide survival-only hearts/hunger, armor, XP and oxygen without falsifying underlying gameplay values;
- hostile target eligibility limited to Survival/Adventure;
- registry-backed categorized/searchable Creative catalog derived from live `ITEMS`;
- real cursor/hotbar transactions in singleplayer and server-authoritative `creative-pick` in multiplayer;
- source-backed block items using the 3D block-preview path;
- historical `CREATIVE_START` ordering and starter-slot mapping unchanged.

Java 1.20.1 operator tabs, saved hotbars, complete registry breadth, full search tags and complete Creative command parity remain incomplete.

## Registry / blocks / world

Block IDs are append-only. Current merged gameplay families include:

- grass/dirt/stone/sand/cobblestone;
- oak planks/log/leaves plus stripped oak log;
- granite, diorite and andesite;
- spruce, birch, jungle, acacia, dark oak, mangrove and cherry planks;
- water, crafting table, glass, furnace, iron ore and coal ore;
- farmland moisture 0..7, wheat age 0..7, dirt path and short grass;
- directional red-bed states.

PR #138 appends IDs **44..53** for granite/diorite/andesite and seven additional wood plank species without reordering existing IDs. Oak planks and IDs 44..53 use canonical Java 1.20.1 source-backed blockstate/model/texture resources through the declarative `MINECRAFT_SIMPLE_FULL_CUBE_MODELS` path.

The voxel world cell payload still stores **block ID only**. Existing stateful behavior therefore uses either separate append-only IDs (bed direction, farmland moisture, wheat age) or a fixed visual state (current furnace north/unlit). A general persisted block-property/state layer for `axis`, `facing`, `half`, `shape`, `open`, `waterlogged`, etc. is not yet merged.

Current terrain generator is **v4**:

- v2 remains the explicit pre-coal compatibility path;
- v3 adds deterministic coal while preserving v2 compatibility;
- v4 adds deterministic short-grass surface decoration;
- persisted worlds remain pinned to their recorded terrain version;
- multiplayer requires the exact current terrain version.

Java biome/climate generation, caves/aquifers, broad features/structures, full vertical range, Nether and End remain unimplemented. The new PR #138 registry blocks are Creative-obtainable but are not added to worldgen distribution.

## Persistence / compatibility

- Singleplayer save schema: **v10**.
- Terrain generator: **v4**.
- Multiplayer handshake/subprotocol: **v5 / `minecraft-web-v5`**.
- Player action frame: **v3**.
- Historical `CREATIVE_START` order/slot mapping remains stable.
- Block/item IDs remain append-only.

Singleplayer save v10 persists normalized active status effects. `terrainVersion` remains required from schema v8 onward. Active input/use gestures remain transient rather than persisted.

## Farming / food / processing

Merged main includes:

- farmland moisture 0..7 and wheat age 0..7;
- hoe-created farmland, nearby-water/weather hydration, drying and empty dry farmland returning to dirt;
- seed planting, wheat growth/harvest, seed recycling and wheat → bread;
- short-grass wheat-seed acquisition and bone-meal wheat/grass behavior in singleplayer;
- food, saturation, exhaustion and food timer;
- apple, bread, raw/cooked meats and rotten flesh;
- held, interruptible 1.6-second eating;
- raw chicken 30% and rotten flesh 80% Hunger I / 30 s through the status-effect foundation;
- Peaceful/Easy/Normal/Hard starvation boundaries and `naturalRegeneration` switch;
- saturated fast regeneration and normal regeneration;
- raw iron and meat Furnace recipes; coal as 1600-tick fuel.

Singleplayer and multiplayer preserve held/cancelable food use. Multiplayer server authority owns Hunger state, status effects, selected-stack revalidation and item commit.

Exact Java random-tick/light/neighbor crop formulas, farmland trampling, Fortune/loot tables, broad crops/breeding and broad potion/effect semantics remain incomplete.

## Items, crafting and progression

Merged main includes:

- 36-slot Inventory + 9-slot hotbar;
- Equipment head/chest/legs/feet foundation;
- wooden/stone/iron pickaxes and swords;
- iron axe/shovel/hoe;
- leather and iron armor with durability;
- item-instance durability for implemented tools/weapons;
- till / strip / flatten;
- current food/farming items and recipes;
- source-backed block item entries for the expanded stone/wood registry.

The current stone→iron chain remains:

`stone pickaxe → iron ore → raw iron → Furnace → iron ingot → iron pickaxe / axe / shovel / sword / hoe / iron armor`

## Survival / combat / PvE

Merged singleplayer survival includes HP, hurt cooldown, knockback, death/respawn, recoverable item/XP drops, armor mitigation/wear, hunger/sprint gates, regeneration/starvation, finite Hunger status effects, oxygen/drowning, simplified swimming, time/weather, bed sleep/respawn, XP and persistent Furnace processing.

Current mobs are cow, sheep, pig, chicken, zombie, skeleton, creeper and spider. PvE remains simplified and client/singleplayer-owned; server-authoritative PvE is not merged.

## Multiplayer authority

The merged Node WebSocket runtime owns:

- handshake/session/input validation and replay guards;
- 20 Hz movement/collision and player snapshots;
- deterministic terrain + revisioned sparse world edits;
- mining, placement and till/strip/flatten;
- ground items/drop/pickup;
- Inventory/cursor/item damage, Equipment, 2×2 crafting and transient 3×3 Workbench;
- Furnace container/process runtime;
- chat and controlled commands;
- PvP HP/melee/armor/knockback/death drops/respawn;
- Creative flight and authoritative `creative-pick`;
- revisioned Hunger/status effects/active food use;
- server sprint gating, exhaustion, regeneration and starvation.

The server does not yet own farming/random ticks/bone meal, mobs/PvE/projectiles/explosions, XP/levels, durable world/block-entity persistence or a generic block-property state layer. Missing multiplayer domains remain disabled rather than replaced by client-side competing truth.

## Original Minecraft resources / audio

The repository tracks the extracted Java 1.20.1 client resource tree under `MC原版素材assets/` and imported sound-object corpus under `原版Minecraft音频文件/`. Resource availability alone is not counted as runtime parity.

Source-backed audio covers current tool secondary actions, common block/material break/place/step families, local footsteps, mining hits and baseline mob ambient/hurt/death events. Full `sounds.json` event coverage, positional/HRTF audio, remote replicated SFX and music scheduling remain incomplete.

## Quality baseline

Repository quality is exact-head based:

1. Node 22 JavaScript syntax;
2. auto-discovered logic/server/Worker regressions;
3. two Chromium E2E shards;
4. affected Minecraft asset/source audits;
5. browser integration where Three.js/CSS/WebAudio/HTTP boundaries matter;
6. final base-drift and review-surface checks.

PR #138 final head `a40ac69137a0636f6831ba3e91d1590e676ad730` passed:

- Minecraft asset source audit #317 (`32971126562`);
- Repository quality #1296 (`32971126568`): static checks, Chromium 1/2 and Chromium 2/2 all succeeded;
- final compare against `main 7dafe9f23700ae57af261d357339cc673eb4afb6`: ahead 21 / behind 0;
- reviews 0, review threads 0, PR comments 0.

It was squash-merged as `9edb249f1f5c44dc9f4f0098fc4d7395b41974e7`.

A green older head never validates a newer head.

## Next planned delivery

The next continuous development slice is **Stateful registry families foundation**:

1. define reusable, canonical block-property schemas and deterministic state keys for properties such as `axis`, horizontal `facing`, `half`, stair `shape`, door `hinge/open/powered`, fence connectivity and `waterlogged`;
2. decide and implement the world/save/network storage boundary for block properties instead of multiplying block IDs per state;
3. feed normalized state properties into the existing Java 1.20.1 blockstate/model interpreter;
4. add placement/collision/interaction rules only after the state representation is deterministic and persistence-safe;
5. then expand common logs/slabs/stairs/fences/doors by wood species using data-driven family registration.

Broader worldgen, server-authoritative PvE/XP/persistence and deeper farming parity remain subsequent planned slices.
