# Project Baseline — 2026-08-22

This document records **merged `main` only**. Open PR work is excluded from merged facts.

## Authority

- Branch: `main`
- Commit: `3961c7ff6f59dcb5d08542c8a99a8f0b36dfbf29`
- Includes merged PRs through **#126**.
- Development line: `v0.4.0-dev`.
- Strict Minecraft Java 1.20.1 gameplay/content parity remains a planning estimate of about **35%**; engine/authority foundations are much further along than content breadth.

## Browser / rendering / UI

- Shared desktop/mobile runtime with unified control intents.
- Pointer Lock desktop controls, landscape mobile controls, F5 first/third-person views.
- Source-backed Steve first-person arm/sleeve and articulated wide-Steve third-person model.
- PR #124 fixed anatomical limb sides: yaw=0 faces -Z, `rightArm/rightLeg` are +X and `leftArm/leftLeg` are -X; primary/use remains on `rightArm`.
- PR #124 fixed the first-person right-arm shoulder→hand geometry while preserving the right-side viewmodel anchor.
- 16×16×64 compact voxel chunks, terrain/mesh Workers, Transferable paths, bounded streaming/unload/disposal and chunk-level merged geometry.
- Generic Minecraft blockstate/model interpretation is live for selected roots: parent/texture inheritance, variants/multipart, rotations, uvlock/cull/tint metadata and chunk batching.
- Workbench presentation now uses canonical Java 1.20.1 `textures/gui/container/crafting_table.png` at 352×332 (2×) with fixed craft/result/inventory/hotbar coordinates.

## World and content boundary

Current gameplay families/states:

`grass_block`, `dirt`, `stone`, `sand`, `oak_planks`, `oak_log`, `oak_leaves`, `water`, `crafting_table`, `cobblestone`, `red_bed`, `iron_ore`, `coal_ore`, `glass`, `furnace`, `farmland`, `dirt_path`, `stripped_oak_log`.

World generation remains a deterministic browser/server simplified fBm baseline with surface layers, sea/water, oak trees and simplified underground iron/coal ore. Terrain generator v3 adds coal while singleplayer keeps an explicit v2 path for pre-#126 saves. Java biome/climate/caves/aquifers/features/structures, expanded vertical range, Nether and End are not implemented.

## Items, crafting and progression

At merged main:

- 36-slot Inventory + 9 hotbar;
- Equipment head/chest/legs/feet foundation with leather armor;
- **46 runtime item IDs**;
- **18 recipes**;
- wooden/stone/iron pickaxes;
- wooden/stone/iron swords;
- iron axe/shovel/hoe;
- raw iron → Furnace → iron ingot;
- coal ore → coal, with coal as a 1600-tick Furnace fuel;
- iron helmet/chestplate/leggings/boots with durability and Java-style damage-dependent armor mitigation;
- till / strip / flatten in singleplayer and authoritative multiplayer;
- item-instance durability for implemented tools/weapons.

Current stone→iron tool chain:

`stone pickaxe → iron ore → raw iron → Furnace → iron ingot → iron pickaxe / axe / shovel / sword / hoe`

Merged progression now includes the complete implemented iron tool + iron armor chain and the first coal/fuel slice. `CREATIVE_START` remains intentionally stable.

## Survival / PvE

Merged slices include HP/damage/hurt cooldown/knockback, death/respawn, recoverable item/XP drops, `/spawnpoint`, bed sleep/respawn, oxygen/drowning, simplified swimming, time/weather, singleplayer XP, Furnace processing and simplified hostile daylight burning.

Current mobs: cow, sheep, pig, chicken, zombie, skeleton, creeper, spider. Their AI/combat remains simplified and client/singleplayer-owned; server-authoritative PvE is still absent.

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
- 2×2 crafting, transient 3×3 Workbench;
- Furnace container/process runtime;
- chat and controlled commands;
- PvP HP/melee/armor mitigation/knockback/death drops/respawn.

Major authority gaps remain mobs/PvE/projectiles/explosions, XP/levels, durable server persistence, reconnect/product/account layers and replicated broad SFX.

## Original Minecraft resources / audio

The project tracks Java 1.20.1 client textures/models plus a separately supplied sound-object corpus under `原版Minecraft音频文件/`. Resource availability is not counted as runtime implementation by itself.

Merged source-backed runtime audio includes:

- `item.hoe.till`, `item.axe.strip`, `item.shovel.flatten`;
- current grass/gravel/stone/sand/wood/glass break/place/step families;
- local material-aware footsteps using a 1.6-block movement cadence;
- survival mining hit cadence around 200 ms;
- mining prewarms mapped break variants through the shared **fetch + decode AudioBuffer cache**, so final break playback can reuse decoded buffers;
- current eight mobs receive a source-backed ambient/hurt/death baseline where those Java events exist;
- mob voices use a simple 24-block local linear attenuation baseline.

This is not full `sounds.json`, true 3D positional/HRTF audio, remote replicated SFX or music parity.

## Quality baseline

Repository quality is exact-head based:

1. Node 22 JavaScript syntax;
2. auto-discovered logic/server/Worker regressions;
3. two Chromium E2E shards;
4. affected asset/source audits;
5. browser integration where Three.js/CSS/WebAudio/HTTP boundaries matter;
6. final base-drift and review-surface checks.

A green older head never validates a newer head.

## Active delivery after this baseline

PR #127, `feature/hunger-food-core`, is the current open delivery and is intentionally excluded from merged facts. It replaces the placeholder hunger drain with explicit food/saturation/exhaustion rules, consumption and cooked-food progression.

Nearest planned work after #127: farming phase 1, broader registry/worldgen, then server-owned PvE/XP/persistence.
