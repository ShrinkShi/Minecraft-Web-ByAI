# Project Baseline — 2026-08-21

This document is the authoritative human-readable snapshot of what is actually present on GitHub `main` at the baseline commit below. It exists to prevent roadmap/documentation drift from being mistaken for implementation state.

## Authority

- Baseline branch: `main`
- Baseline commit: `95fabd9294c0e9a0b38658a4978d912cf6c5d77b`
- Baseline includes merged PRs through **#122**.
- Development line: `v0.4.0-dev`.
- Stable release label remains `v0.3.0` until a release is intentionally cut.
- A feature counts as merged implementation only when its code is on `main`; an open feature PR may document its projected post-merge state in the feature matrix, but does not retroactively change this baseline.
- PR descriptions and older progress documents are historical evidence when they conflict with `main`.

## Planning completion estimate

Two different completion measures must stay separate:

- browser voxel/Minecraft engine foundation: mature enough to support continued content expansion, but still missing several parity/performance/product layers;
- strict Minecraft Java 1.20.1 gameplay/content parity: still conservatively about **35% overall**.

The parity number remains low because missing breadth is dominant: most blocks/items/recipes, biome/cave/structure worldgen, farming/food depth, redstone, dimensions, many mobs, server PvE, enchanting/brewing, broad audio runtime and product/server persistence.

## Current verified runtime facts

### Browser/client foundation

- One shared Web runtime for desktop and mobile; device input converges through `ControlIntentBus`.
- Pointer Lock desktop controls and landscape touch controls.
- First-person plus F5 third-person camera cycle.
- Three.js first-person held-item viewmodel with source-backed Steve arm/sleeve and 3D held presentation from PR #121; exact Java transforms/equip/attack-strength animation remain incomplete.
- 16×16×64 compact voxel chunks, dynamic streaming, separate terrain/mesh Workers, TypedArray/Transferable paths and explicit unload/dispose lifecycle.
- Chunk-level merged geometry; the generic model path is not allowed to degrade to one Three.js Mesh per block.
- Three.js is pinned and prepared as same-origin runtime content.
- IndexedDB singleplayer persistence for current world/player/inventory/equipment/Furnace state.

### World and blocks

Current merged gameplay block families on `main` are:

`grass_block`, `dirt`, `stone`, `sand`, `oak_planks`, `oak_log`, `oak_leaves`, `water`, `crafting_table`, `cobblestone`, `red_bed`, `iron_ore`, `glass`, `furnace`.

The bed uses several internal facing/foot/head IDs but is one gameplay family.

Rendering/resource facts:

- red bed uses a source-backed Java 1.20.1 entity texture and dedicated partial-bed renderer;
- generic blockstate/model parsing, model inheritance, variants/multipart, geometry transforms, atlas binding and chunk batching foundations are implemented;
- crafting table, iron ore, glass and furnace are live source-backed generic-model gameplay roots;
- glass uses a translucent interpreted rendering path with same-glass internal-face culling;
- broad block registry/state/collision parity is still absent.

Current terrain generation is a deterministic shared browser/server fBm heightmap baseline with surface layers, sea/water, oak trees and simplified deterministic underground iron ore. Prompt keywords modify coarse generation parameters. It is **not** a Java biome/cave/aquifer/feature/structure pipeline.

### Items, crafting and progression

At this main baseline:

- 36-slot Inventory + 9-slot hotbar and cursor/stack/Shift transaction semantics;
- Equipment head/chest/legs/feet foundation with current leather armor support;
- runtime item registry: **39 IDs**;
- recipe registry: **13 recipes**;
- source-backed/current progression includes wooden, stone and iron pickaxes; wooden, stone and iron swords; iron axe; iron shovel; raw iron; iron ingot; Furnace and glass block items;
- tool/weapon item-instance durability is wired for the implemented damageable set;
- mining effectiveness is distinct from harvest/drop eligibility;
- shared held-item melee profiles drive current damage, hard minimum attack interval and successful-hit wear;
- Java continuous attack-strength scaling, critical/sweep/shield semantics remain incomplete.

The current stone→iron chain on `main` is real: stone-tier iron ore harvest → raw iron → Furnace → iron ingot → iron pickaxe/axe/shovel/sword crafting.

**Iron hoe and till/strip/flatten secondary actions are not part of this baseline; they belong to open PR #123.**

### Survival and processing

Implemented merged slices include:

- HP, damage, knockback, hurt cooldown, death settlement and explicit respawn;
- recoverable singleplayer item/XP drops and custom spawnpoint;
- two-block bed placement, respawn anchor, night skip and nearby-hostile sleep safety;
- oxygen, drowning and simplified swimming/buoyancy;
- weather/time state and pooled rain/thunder presentation;
- XP orbs and Java-style level calculations in singleplayer;
- persistent singleplayer Furnace runtime using the shared 3-slot processing core, fuel/cook timers and stored XP bookkeeping;
- simplified hostile daylight burning / wet extinguish presentation from PR #121.

Major gaps include full hunger/saturation/food behavior, farming/crops, iron armor progression/wear, broad smelting/fuels, fire/lava entity rules, enchanting, brewing and status effects.

### Entities and PvE

Current gameplay mobs:

- passive: cow, sheep, pig, chicken;
- hostile: zombie, skeleton, creeper, spider.

All eight use imported Java 1.20.1 texture sheets with project-side compatible cuboid geometry. Texture provenance is source-backed; geometry is a reconstruction and is not falsely described as extracted `.bbmodel`/Java model-layer data.

Singleplayer includes simplified AI/combat, skeleton arrows, creeper explosions, loot/XP, per-entity hit feedback and expanded combat/explosion presentation. Full pathfinding, vanilla spawn/equipment/variant rules, breeding/taming/riding and most species are absent.

### Multiplayer/server authority

The project has a real Node WebSocket authoritative runtime. Merged work covers:

- strict handshake/session/input protocol and independent sequence/replay gates;
- deterministic shared terrain and 20 Hz authoritative movement/collision;
- authoritative self/remote player snapshots and remote rendering;
- authoritative sparse world edits with bootstrap/live revisions;
- creative/survival mining and ordinary placement;
- authoritative ground item entities, drop/pickup/lifetime;
- authoritative Inventory/cursor and item damage replication;
- authoritative Equipment transactions;
- authoritative 2×2 crafting and transient 3×3 Workbench container;
- authoritative Furnace container/process runtime with shared viewers (process-memory only);
- authoritative chat and controlled command channels;
- server-owned PvP HP, melee targeting, mitigation, knockback, death drops and respawn.

Major authority gaps remain: mobs/PvE/projectiles/explosions, XP/levels, durable multiplayer world/container persistence, accounts/rooms/operator identity and reconnect/resume.

## Minecraft resource baseline

### Java client resource tree

Tracked source input: `MC原版素材assets.zip` / extracted tracked subset.

The deterministic audit of that resource tree found thousands of Java client resources including roughly:

- 977 block textures;
- 582 item textures;
- 497 entity textures;
- 2,016 block model JSON files;
- 1,675 item model JSON files;
- 1,005 blockstates;
- no `.bbmodel` files.

That particular resource tree does not contain the Minecraft sound-object store or a usable full sound source input by itself.

### Separate Java 1.20.1 audio source

PR #122 added the separately supplied Java 1.20.1 audio object corpus under `原版Minecraft音频文件/`, together with mapping metadata/source notes.

This changes the baseline in one important way:

- **original sound objects are now available as tracked source input**;
- **source availability is not the same as runtime audio parity**.

At main `95fabd9`, PR #121 still supplies an interim procedural WebAudio feedback layer for a small set of combat/presentation events. The source-backed original tool/block sound runtime being developed in PR #123 is not yet part of `main` and must not be counted here.

### Remaining resource/render/audio gaps

- broad generated gameplay registry from the Java resource tree;
- full item-model interpretation;
- generalized gameplay state/neighbor-state mapping and collision shapes;
- biome tint/color-map runtime;
- animated texture playback;
- generalized source-backed sound-event registry/runtime;
- spatial audio and remote sound presentation;
- ambient/environment sound scheduling and music playback.

## Quality baseline

The project quality policy is exact-head based:

- Node 22 JavaScript syntax;
- automatically discovered logic/server/Worker regression scripts;
- two Chromium browser-smoke shards;
- deterministic asset/source audits where affected;
- failure traces/screenshots/reports for browser regressions.

Merged delivery history through #122 passed its required gates before merge. Exact run/test counts belong to the delivery PR/head that produced them and are not treated as permanent project constants.

## Documentation policy

1. `docs/PROJECT_BASELINE.md` records **merged `main` facts only** at its stated baseline commit.
2. `docs/MINECRAFT_1_20_1_FEATURE_MATRIX.md` is the parity/roadmap authority and may describe the state expected after the currently open feature PR, clearly labeled as such.
3. `docs/PROGRESS.md` is the active delivery dashboard.
4. `README.md` is the user/developer overview, not an exhaustive roadmap.
5. `CHANGELOG.md` is chronological history and current Unreleased accumulation.
6. Every feature PR that changes parity status must update the matrix in the same PR.
7. Resource files existing in the repository do **not** make their corresponding gameplay/render/audio feature implemented.
8. A feature PR is not Ready based on an older green commit; the current exact branch HEAD must pass the required quality gate.

## Immediate development line after this baseline

The active delivery after `main 95fabd9` is PR #123: source-backed iron hoe, till/strip/flatten secondary tool actions, new player-created block states and the first source-backed original tool/block sound runtime.

After that delivery, the nearest planned work is iron armor, coal progression/worldgen compatibility, broader original audio runtime, server-owned XP and durable multiplayer block-entity/world persistence.
