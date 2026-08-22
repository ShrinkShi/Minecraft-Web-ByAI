# Project Baseline — 2026-08-22

This document records **merged `main` only**. Open PR work is excluded from merged facts.

## Authority

- Branch: `main`
- Commit: `408a4a57c68453ec38ccab1e5dcee2e3760eb82b`
- Includes merged PRs through **#127**.
- Development line: `v0.4.0-dev`.
- Strict Minecraft Java 1.20.1 gameplay/content parity remains a planning estimate of about **35%**. Engine, resource and authority foundations are materially further along than content breadth.

## Browser / rendering / UI

- Shared desktop/mobile runtime with unified control intents.
- Pointer Lock desktop controls, landscape mobile controls and F5 first/third-person views.
- Source-backed Steve first-person arm/sleeve and articulated wide-Steve third-person model.
- 16×16×64 compact voxel chunks, terrain/mesh Workers, Transferable paths, bounded streaming/unload/disposal and chunk-level merged geometry.
- Generic Minecraft blockstate/model interpretation is live for selected roots: parent/texture inheritance, variants/multipart, rotations, uvlock/cull/tint metadata and opaque/cutout/translucent chunk batching.
- Workbench uses canonical Java 1.20.1 `textures/gui/container/crafting_table.png` with fixed source-layout coordinates.
- HUD includes HP, armor, hunger, oxygen and XP foundations.

## World / persistence

Merged gameplay families include grass/dirt/stone/sand, oak plank/log/leaves, water, crafting table, cobblestone, red bed, iron ore, coal ore, glass, furnace, farmland, dirt path and stripped oak log.

World generation remains a deterministic simplified browser/server fBm baseline with surface layers, sea/water, oak trees and simplified underground iron/coal ore. Terrain generator v3 adds coal while singleplayer keeps an explicit v2 path for pre-#126 local saves.

Singleplayer save schema is **v9**. `terrainVersion` remains required from schema v8 onward; the v9 hunger migration does not move that compatibility boundary. Java biome/climate/caves/aquifers/features/structures, expanded vertical range, Nether and End remain unimplemented.

## Items, crafting and progression

Merged main has:

- 36-slot Inventory + 9-slot hotbar;
- Equipment head/chest/legs/feet foundation;
- wooden/stone/iron pickaxes;
- wooden/stone/iron swords;
- iron axe/shovel/hoe;
- raw iron → Furnace → iron ingot;
- coal ore → coal, with coal as 1600-tick Furnace fuel;
- leather and iron armor with durability and Java-style damage-dependent armor mitigation;
- till / strip / flatten in singleplayer and authoritative multiplayer;
- item-instance durability for implemented tools/weapons;
- raw beef/mutton/porkchop/chicken and rotten flesh as edible items;
- apple, bread, steak, cooked mutton, cooked porkchop and cooked chicken;
- four 200-tick / 0.35 XP meat Furnace recipes.

The current stone→iron chain is:

`stone pickaxe → iron ore → raw iron → Furnace → iron ingot → iron pickaxe / axe / shovel / sword / hoe / iron armor`

`CREATIVE_START` remains intentionally stable; later progression content is registered/obtainable without silently shifting historical starter slots.

## Hunger / survival / PvE

PR #127 replaced the old fixed hunger placeholder with explicit FoodData-like state:

- food, saturation, exhaustion and food timer;
- exhaustion over 4 drains saturation before food, at most one threshold per tick;
- sprint/swim/jump/sprint-jump/attack/damage exhaustion hooks;
- survival sprint blocked at food <= 6;
- saturated fast regeneration and food>=18 normal regeneration;
- current fixed Normal-style starvation floor of 1 HP because difficulty/gamerule configuration is absent;
- singleplayer right-click food consumption; full food prevents consumption.

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

PR #128, `feature/farming-phase-1`, is the current open delivery and is intentionally excluded from merged facts. It adds the first wheat farming loop: farmland moisture states, wheat age states, seed planting, growth/harvest, canonical crop models/items and wheat→bread acquisition.

Nearest planned work after #128: natural vegetation/seed acquisition and broader registry/worldgen, hunger phase 2/server hunger authority, then server-owned PvE/XP/persistence.
