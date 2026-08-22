# Project Baseline — 2026-08-22

This document records **merged `main` only**. Open PR work is excluded from merged facts.

## Authority

- Branch: `main`
- Commit: `2ba90bd77f510ade4c771a17e3a06b1e2597271f`
- Includes merged PR #128 (wheat farming phase one) and PR #130 (first-person / Workbench presentation repair). PR #129 remains open and is not counted as merged.
- Development line: `v0.4.0-dev`.
- Strict Minecraft Java 1.20.1 gameplay/content parity remains a planning estimate of about **35%**. Engine, resource and authority foundations are materially further along than registry/content breadth.

## Browser / rendering / UI

- Shared desktop/mobile runtime with unified control intents.
- Pointer Lock desktop controls, landscape mobile controls and F5 first/third-person views.
- Source-backed Steve first-person arm/sleeve and articulated wide-Steve third-person model.
- PR #130 reduced the oversized first-person arm, aligned the viewmodel camera to 70°, and changed the hierarchy to shoulder → arm → wrist → held item. Textured non-block items use transparent planar presentation while block items remain 3D previews.
- PR #130 also makes Inventory/Workbench act as real modal presentation surfaces: world crosshair, Jade overlay, HP/hunger/XP/hotbar, oxygen, break meter and first-person viewmodel are hidden while the container is visible and restored when it closes.
- 16×16×64 compact voxel chunks, terrain/mesh Workers, Transferable paths, bounded streaming/unload/disposal and chunk-level merged geometry.
- Generic Minecraft blockstate/model interpretation is live for selected roots: parent/texture inheritance, variants/multipart, rotations, uvlock/cull/tint metadata and opaque/cutout/translucent chunk batching.
- Workbench uses canonical Java 1.20.1 `textures/gui/container/crafting_table.png` with fixed 352×332 source-layout coordinates.
- HUD includes HP, armor, hunger, oxygen and XP foundations.

## World / persistence

Merged gameplay families include grass/dirt/stone/sand, oak plank/log/leaves, water, crafting table, cobblestone, red bed, iron ore, coal ore, glass, furnace, farmland moisture 0..7, wheat age 0..7, dirt path and stripped oak log.

World generation on merged main remains deterministic simplified browser/server fBm terrain with surface layers, sea/water, oak trees and simplified underground iron/coal ore. **Merged main still uses terrain generator v3.** Terrain v2 remains an explicit singleplayer compatibility path for pre-#126 local saves.

Singleplayer save schema is **v9**. `terrainVersion` remains required from schema v8 onward; later schema upgrades do not move that compatibility boundary. Java biome/climate/caves/aquifers/features/structures, expanded vertical range, Nether and End remain unimplemented.

## Farming / food / processing

PR #128 is merged and provides the first playable wheat loop:

- append-only farmland moisture 0..7 and wheat age 0..7 states;
- source-backed Java 1.20.1 farmland/wheat blockstate/model interpretation;
- canonical `wheat_seeds` and `wheat` item textures;
- hoe-created farmland, irrigation/rain hydration, drying and empty dry farmland returning to dirt;
- survival seed planting only after successful world mutation; creative does not consume seed;
- simplified 10-second farming tick and wet/dry growth chances;
- immature wheat seed return and mature wheat + seed harvest loop;
- 3-wide wheat → bread Workbench recipe;
- farming state persisted through existing sparse world edits, with save schema remaining v9.

Natural short-grass seed acquisition and bone meal are **not merged in this baseline**; those belong to open PR #129.

Merged food/process support also includes explicit food/saturation/exhaustion state, natural regeneration/starvation, apple/bread/raw meats/cooked meats/rotten flesh, four meat Furnace recipes, raw iron smelting and coal as 1600-tick fuel.

## Items, crafting and progression

Merged main has:

- 36-slot Inventory + 9-slot hotbar;
- Equipment head/chest/legs/feet foundation;
- wooden/stone/iron pickaxes;
- wooden/stone/iron swords;
- iron axe/shovel/hoe;
- raw iron → Furnace → iron ingot;
- coal ore → coal;
- leather and iron armor with durability and Java-style damage-dependent armor mitigation;
- till / strip / flatten in singleplayer and authoritative multiplayer;
- item-instance durability for implemented tools/weapons;
- current food and wheat farming items/recipes described above.

The current stone→iron chain is:

`stone pickaxe → iron ore → raw iron → Furnace → iron ingot → iron pickaxe / axe / shovel / sword / hoe / iron armor`

`CREATIVE_START` remains intentionally stable; later progression content is registered/obtainable without silently shifting historical starter slots.

## Hunger / survival / PvE

Merged singleplayer hunger state includes:

- food, saturation, exhaustion and food timer;
- exhaustion over 4 drains saturation before food, at most one threshold per tick;
- sprint/swim/jump/sprint-jump/attack/damage exhaustion hooks;
- survival sprint blocked at food <= 6;
- saturated fast regeneration and food>=18 normal regeneration;
- current fixed Normal-style starvation floor of 1 HP because difficulty/gamerule configuration is absent;
- immediate right-click food consumption; full food prevents consumption.

Other merged survival slices include HP/damage/hurt cooldown/knockback, death/respawn, recoverable item/XP drops, `/spawnpoint`, bed sleep/respawn, oxygen/drowning, simplified swimming, time/weather, singleplayer XP and Furnace processing.

Current mobs: cow, sheep, pig, chicken, zombie, skeleton, creeper and spider. Their PvE remains simplified and client/singleplayer-owned; server-authoritative PvE is still absent.

## Multiplayer authority

The Node WebSocket runtime currently owns:

- handshake/session/input validation and replay guards;
- 20 Hz movement/collision;
- self/remote player snapshots;
- deterministic terrain + revisioned sparse world edits;
- creative/survival mining and placement;
- till / strip / flatten;
- ground items/drop/pickup;
- Inventory/cursor/item damage;
- Equipment transactions;
- 2×2 crafting and transient 3×3 Workbench;
- Furnace container/process runtime;
- chat and controlled commands;
- PvP HP/melee/armor mitigation/knockback/death drops/respawn.

The server does **not** yet own hunger/eating, farming, mobs/PvE/projectiles/explosions, XP/levels or durable world persistence. Client-side multiplayer hunger/farming is deliberately not faked.

## Original Minecraft resources / audio

The project tracks Java 1.20.1 client textures/models plus the separately supplied sound-object corpus under `原版Minecraft音频文件/`. Resource availability alone is not counted as runtime implementation.

Merged source-backed audio includes current till/strip/flatten, common block/material break/place/step families, local footsteps, mining hits and an ambient/hurt/death baseline for the current mob set. Full `sounds.json`, true positional/HRTF audio, remote replicated SFX and music parity remain incomplete.

## Quality baseline

Repository quality is exact-head based:

1. Node 22 JavaScript syntax;
2. auto-discovered logic/server/Worker regressions;
3. two Chromium E2E shards;
4. affected Minecraft asset/source audits;
5. browser integration where Three.js/CSS/WebAudio/HTTP boundaries matter;
6. final base-drift and review-surface checks.

A green older head never validates a newer head.

## Active delivery after this baseline

PR #129, `feature/vegetation-farming-1-1`, is the current open delivery and is intentionally excluded from merged facts. It adds short grass, deterministic terrain-v4 vegetation for new worlds, natural wheat-seed acquisition and a first bone-meal path while preserving explicit v2/v3 local terrain compatibility and refusing client-side multiplayer farming authority.

Nearest planned work after #129: Hunger phase 2 (use duration/eating animation, status effects and difficulty/gamerule boundaries, then server hunger authority), followed by broad registry families, biome/cave/feature worldgen and server-owned PvE/XP/persistence.
