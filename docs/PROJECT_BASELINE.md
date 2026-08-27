# Project Baseline — 2026-08-27

This document records **merged `main` only**. Open PR work is excluded from merged facts.

## Authority

- Branch: `main`
- Commit: `299c64b04df1f4280d0b2b399a1abdcb38b4bf75`
- Includes merged work through PR #143.
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

The generic interpreted-model acceptance closure after PR #138 remains **24 blockstates / 70 block models / 39 textures / 0 metadata**. The deterministic model texture atlas remains **128×128**, SHA-256 `28dea729513157f790032964dc4607a88ba6657e72d3e9eca5a9cc85fa5ce1b5`.

## Registry / blocks / world

Block IDs remain append-only. Current merged gameplay families include:

- grass/dirt/stone/sand/cobblestone;
- oak planks/log/leaves plus stripped oak log;
- granite, diorite and andesite;
- spruce, birch, jungle, acacia, dark oak, mangrove and cherry planks;
- water, crafting table, glass, furnace, iron ore and coal ore;
- farmland moisture 0..7, wheat age 0..7, dirt path and short grass;
- directional red-bed states.

PR #138 appended IDs **44..53** for granite/diorite/andesite and seven additional wood plank species without reordering existing IDs. These source-backed full cubes use the declarative Minecraft blockstate/model path rather than per-block renderer special cases.

Current terrain generator is **v4**:

- v2 remains the explicit pre-coal compatibility path;
- v3 adds deterministic coal while preserving v2 compatibility;
- v4 adds deterministic short-grass surface decoration;
- persisted worlds remain pinned to their recorded terrain version;
- multiplayer requires the exact current terrain version.

Java biome/climate generation, caves/aquifers, broad features/structures, full vertical range, Nether and End remain unimplemented.

## Stateful block foundation

The previous “one block ID per state” approach is no longer the intended expansion path for new stateful families.

### Phase A — canonical property schemas, merged in PR #140

Merged main includes a pure block-state schema layer with:

- enum, boolean and bounded-integer properties;
- strict validation and unknown-property rejection;
- deterministic property ordering;
- canonical `name=value,...` state keys and strict parse/round-trip;
- representative schemas for log `axis`, furnace `facing/lit`, farmland `moisture`, wheat `age`, slab `type/waterlogged`, stair `facing/half/shape/waterlogged`, fence connectivity/waterlogged and door `facing/half/hinge/open/powered`.

Existing furnace/farmland/wheat descriptors can consume normalized schema output without a second translation layer. This does not yet mean those legacy ID-encoded families have been migrated to the new sidecar representation.

### Phase B1 — sparse in-memory state sidecar, merged in PR #142

`VoxelWorld` keeps its dense `Uint8Array` block-ID fast path and adds a sparse `BlockStateSidecar` for non-default properties.

Merged APIs include:

- `getBlockState()`;
- `setBlockState()`;
- `exportBlockStates()`;
- `savedBlockStates` constructor input;
- independent `onBlockStateEdit` notification.

Current sidecar registry opts in oak log, stripped oak log and furnace. A block identity is `{id,stateKey}`. Stateful default keys are canonical but elided from sparse storage; stateless blocks use `stateKey:null`. Sidecar rows retain their owning block ID and are reconciled against generated/edited dense IDs so stale properties cannot leak across ID replacement.

Ordinary `setBlock()` remains compatible and means “set this ID in its canonical default state”. Legacy `onEdit` remains ID-only.

### Phase B2a — singleplayer persistence, merged in PR #143

Singleplayer save schema is now **v11** and persists:

- existing sparse numeric `edits`;
- new sparse `blockStates` sidecar.

Compatibility is explicit:

- pre-v11 saves with no `blockStates` migrate as canonical default states;
- v11+ records missing `blockStates` are rejected rather than silently discarding properties;
- present sidecars are validated through `BlockStateSidecar` before world construction;
- terrain-version pinning is unchanged;
- status effects remain a v10 persistence feature floor while the current schema is allowed to advance.

### Not yet merged at this baseline

Merged `main` does **not** yet contain:

- multiplayer block-property transport/server authority;
- a world-edit wire carrying `stateKey`;
- mesh-worker/model-runtime state payloads from the sidecar;
- property-aware placement/collision/interaction for logs/slabs/stairs/fences/doors;
- broad stateful family registry expansion.

Those items must not be inferred merely from the presence of schemas or the sidecar.

## Persistence / compatibility

Merged compatibility boundary at `main 299c64b04df1f4280d0b2b399a1abdcb38b4bf75`:

- Singleplayer save schema: **v11**.
- Block-state save feature floor: **v11**.
- Terrain generator: **v4**.
- Multiplayer handshake/subprotocol: **v5 / `minecraft-web-v5`**.
- Player action frame: **v3**.
- Historical `CREATIVE_START` order/slot mapping remains stable.
- Block/item IDs remain append-only.

A later open PR may intentionally bump another compatibility surface; until merged, this section remains the authority for `main`.

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

- v5 handshake/session/input validation and replay guards;
- 20 Hz movement/collision and player snapshots;
- deterministic terrain + revisioned **ID-only** sparse world edits;
- mining, placement and till/strip/flatten;
- ground items/drop/pickup;
- Inventory/cursor/item damage, Equipment, 2×2 crafting and transient 3×3 Workbench;
- Furnace container/process runtime;
- chat and controlled commands;
- PvP HP/melee/armor/knockback/death drops/respawn;
- Creative flight and authoritative `creative-pick`;
- revisioned Hunger/status effects/active food use;
- server sprint gating, exhaustion, regeneration and starvation.

At this baseline the server does not own generic block-property state, farming/random ticks/bone meal, mobs/PvE/projectiles/explosions, XP/levels or durable world/block-entity persistence. Missing multiplayer domains remain disabled rather than replaced by client-side competing truth.

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

PR #143 final head `9f1fe7bc7238b52bda011bb5355a67c0e4dfde4e` passed Repository quality run `33050099078` / #1314:

- static checks: success;
- browser-smoke shard 1/2: success;
- browser-smoke shard 2/2: success;
- reviews: 0;
- review threads: 0;
- comments: 0;
- final branch relation to its base: ahead only / behind 0.

PR #143 was squash-merged as `299c64b04df1f4280d0b2b399a1abdcb38b4bf75`.

A green older head never validates a newer head.

## Next planned delivery

Starting from this merged baseline, the next dependency order is:

1. **Phase B2b:** server-authoritative block identity + multiplayer snapshot/incremental transport, with an explicit wire/handshake bump if required;
2. **Phase C1:** carry normalized state into the mesh/model runtime and prove log `axis` end to end;
3. property-aware placement for representative logs;
4. slabs → stairs → fences → doors, including collision/selection/interaction semantics;
5. only after family infrastructure is stable, expand spruce/birch/jungle/acacia/dark oak/mangrove/cherry stateful entries.

Do not use per-state block-ID explosion or renderer-only state as a shortcut around this dependency chain.
