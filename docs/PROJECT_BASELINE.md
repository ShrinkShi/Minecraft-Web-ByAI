# Project Baseline — 2026-08-21

This document is the authoritative human-readable snapshot of what is actually present on GitHub `main` at the baseline commit below. Open PR work is deliberately excluded from merged facts.

## Authority

- Baseline branch: `main`
- Baseline commit: `643310e636f8915bc35ec4803777c12b1a147ad0`
- Baseline includes merged PRs through **#123**.
- Development line: `v0.4.0-dev`.
- Stable release label remains `v0.3.0` until a release is intentionally cut.
- A feature counts as merged implementation only when its code is on `main`.

## Planning completion estimate

Strict Minecraft Java 1.20.1 gameplay/content parity remains conservatively about **35% overall**. Engine/authority foundations are substantially further along than content breadth. Most registry content, biome/cave/structure worldgen, food/farming depth, redstone, dimensions, enchanting/brewing, server PvE, broad audio and durable multiplayer persistence remain incomplete.

## Current verified runtime facts

### Browser/client foundation

- Shared desktop/mobile Web runtime with `ControlIntentBus`.
- Pointer Lock desktop controls and landscape touch controls.
- First-person plus F5 third-person camera cycle.
- Three.js first-person source-backed Steve arm/sleeve + 3D held-item/block viewmodel with attack/use animation.
- Source-backed articulated wide-Steve third-person model.
- 16×16×64 compact voxel chunks, terrain/mesh Workers, Transferable paths, bounded streaming/unload/disposal.
- Chunk-level merged legacy and interpreted-model geometry; no one-Mesh-per-block regression.
- IndexedDB singleplayer persistence for current world/player/inventory/equipment/Furnace state.

At this baseline, the user-reported first-person arm orientation and third-person physical left/right limb presentation bugs are still present on `main`; they belong to open PR #124 and are not counted as merged fixes here.

### World and blocks

Current gameplay families/states include:

`grass_block`, `dirt`, `stone`, `sand`, `oak_planks`, `oak_log`, `oak_leaves`, `water`, `crafting_table`, `cobblestone`, `red_bed`, `iron_ore`, `glass`, `furnace`, `farmland`, `dirt_path`, `stripped_oak_log`.

The bed uses several internal facing/foot/head IDs but is one gameplay family.

Rendering/resource facts:

- red bed uses Java 1.20.1 entity texture + dedicated paired partial-bed renderer;
- blockstate/model inheritance, variants/multipart, rotations, culling/tint metadata, deterministic model atlas and chunk batching exist for selected live roots;
- crafting table, iron ore, glass, furnace and the current player-created states are integrated into the present rendering/resource pipeline;
- broad Java block registry/state/collision-shape parity is absent.

World generation is still a deterministic browser/server fBm heightmap baseline with simple surface layers, sea/water, oak trees and simplified underground iron ore. It is not a Java biome/cave/aquifer/feature/structure pipeline.

### Items, crafting and progression

At main `643310e…`:

- 36-slot Inventory + 9-slot hotbar with cursor/stack/Shift transaction semantics;
- Equipment head/chest/legs/feet foundation with current leather armor support;
- runtime item registry: **40 IDs**;
- recipe registry: **14 recipes**;
- wooden/stone/iron pickaxes, wooden/stone/iron swords, iron axe, iron shovel and iron hoe are in the current progression set;
- raw iron → Furnace → iron ingot → iron pickaxe/axe/shovel/sword/hoe forms the current stone→iron tool/weapon chain;
- tool/weapon item-instance durability exists for the implemented damageable set;
- mining effectiveness remains distinct from harvest/drop eligibility;
- till / strip / flatten secondary actions are shared between singleplayer and authoritative server rules with success-only survival wear and creative no-wear.

Iron armor is not in this baseline.

### Survival and processing

Implemented slices include:

- HP, damage, knockback, hurt cooldown, death settlement and explicit respawn;
- recoverable singleplayer item/XP drops and custom spawnpoint;
- paired bed placement, respawn anchor, night skip and nearby-hostile sleep safety;
- oxygen/drowning and simplified swimming/buoyancy;
- time/weather state with pooled rain/thunder presentation;
- singleplayer XP orbs/level calculations;
- persistent singleplayer Furnace using the shared 3-slot processing core;
- simplified hostile daylight burning/wet extinguish presentation.

Major gaps include complete hunger/saturation/food behavior, crop/farming lifecycle, iron armor/wear, broad smelting/fuels, generic fire/lava entity rules, enchanting, brewing and status effects.

### Entities and PvE

Current gameplay mobs:

- passive: cow, sheep, pig, chicken;
- hostile: zombie, skeleton, creeper, spider.

All eight use imported Java 1.20.1 texture sheets with project-side compatible cuboid geometry. Singleplayer has simplified AI/combat, skeleton arrows, creeper explosions, loot/XP, hit feedback and current combat presentation. Full pathfinding, vanilla spawn/equipment/variant rules, breeding/taming/riding and most species are absent.

At this baseline these mobs do **not** yet have the source-backed ambient/hurt/death sound runtime introduced by open PR #124.

### Multiplayer/server authority

The Node WebSocket authoritative runtime currently covers:

- strict handshake/session/input protocol and sequence/replay gates;
- deterministic shared terrain + 20 Hz movement/collision;
- self/remote player snapshots and remote rendering;
- revisioned sparse world edits;
- creative/survival mining and ordinary placement;
- till / strip / flatten authoritative block use;
- ground item entities, pickup/lifetime;
- authoritative Inventory/cursor + item damage;
- authoritative Equipment transactions;
- 2×2 player crafting + transient 3×3 Workbench;
- authoritative Furnace container/process runtime in process memory;
- chat and controlled command channels;
- server-owned PvP HP/melee/armor mitigation/knockback/death drops/respawn.

Major gaps: mobs/PvE/projectiles/explosions, XP/levels, durable world/container persistence, rooms/accounts/operators, reconnect/resume and replicated broad SFX.

## Minecraft resource baseline

### Java client resources

The project tracks a Java 1.20.1 client resource input with hundreds of block/item/entity textures and thousands of model/blockstate JSON files. That resource tree does not contain entity model-layer geometry and is not treated as if `.bbmodel` data existed.

### Java 1.20.1 audio object corpus

PR #122 added a separately supplied original Java 1.20.1 sound-object corpus under `原版Minecraft音频文件/` with mapping/source metadata.

PR #123 then made a first source-backed runtime subset real:

- `item.hoe.till`, `item.axe.strip`, `item.shovel.flatten`;
- grass / gravel / stone / sand / wood / glass break/place/step families;
- Java-style break/place/step volume/pitch profile for the current block sound types;
- local ordinary block mutation and local player footstep presentation.

This is still a narrow subset. Entity voices, broader combat/player/environment events, music, remote multiplayer replication and full spatial audio remain incomplete on this baseline.

## Known presentation regressions at this baseline

These are intentionally recorded because they are the scope of open PR #124, not merged facts:

1. first-person right arm is visually reversed;
2. third-person physical limb sides make right-hand actions appear on the visual left;
3. Workbench still uses the legacy generic panel composition instead of canonical crafting-table container geometry;
4. local footsteps use an overly dense distance cadence;
5. mining has no continuous source-backed hit cadence and final break audio can cold-start late;
6. current mobs lack source-backed ambient/hurt/death audio.

## Quality baseline

Repository quality is exact-head based:

- Node 22 JavaScript syntax;
- automatically discovered logic/server/Worker checks;
- two Chromium browser-smoke shards;
- deterministic asset/source audits where affected;
- failure trace/screenshot/report artifacts.

No open PR inherits a green result from an older head.

## Documentation policy

1. `PROJECT_BASELINE.md` records merged `main` only.
2. `MINECRAFT_1_20_1_FEATURE_MATRIX.md` is parity/roadmap authority and may state projected post-PR status when clearly labeled.
3. `PROGRESS.md` is the active delivery dashboard.
4. `README.md` is an overview, not the exhaustive roadmap.
5. `CHANGELOG.md` records chronological Unreleased/release changes.
6. Features that change parity must update the matrix in the same PR.
7. Resource availability does not equal runtime implementation.
8. Ready/merge requires the current exact branch HEAD quality gate.

## Immediate active delivery

Open PR #124 fixes the six presentation/audio regressions listed above: player hand orientation, canonical Workbench UI, footstep cadence, mining hit/break audio responsiveness and a first source-backed ambient/hurt/death baseline for the current eight mobs.

After that, the nearest planned content line is iron armor, followed by coal progression/worldgen compatibility, broader registry-driven original audio and server-owned XP/durable block-entity persistence.
