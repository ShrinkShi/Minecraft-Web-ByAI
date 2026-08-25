# Project Baseline — 2026-08-25

This document records **merged `main` only**. Open PR work is excluded from merged facts.

## Authority

- Branch: `main`
- Commit: `ad12dd143263628aac856a1538d6093a7614dae3`
- Includes merged work through PR #134.
- Development line: `v0.4.0-dev`.
- Strict Minecraft Java 1.20.1 gameplay/content parity remains a planning estimate of about **35%**. Engine, resource and multiplayer-authority foundations are materially further along than registry/content breadth.

## Browser / rendering / UI

Merged main provides:

- shared desktop/mobile runtime with unified control intents;
- Pointer Lock desktop controls, landscape mobile controls and F5 first/third-person views;
- source-backed Steve first-person arm/sleeve and articulated wide-Steve third-person model;
- distinct walk/sprint locomotion presentation with sprint body lean/bob/sway;
- desktop sprint via Ctrl+W or double-W, with the legacy temporary R binding removed;
- immersive browser shortcut containment for Ctrl/Meta+W and Keyboard Lock where supported;
- 70° first-person viewmodel camera with shoulder → arm → wrist → held-item hierarchy;
- transparent planar presentation for ordinary textured items and 3D previews for block items;
- Inventory/Workbench modal presentation that hides world HUD/viewmodel while a container is open;
- canonical Java 1.20.1 Workbench texture/layout;
- compact voxel chunks, terrain/mesh Workers, bounded chunk streaming/unload/disposal and merged geometry;
- selected-root Minecraft blockstate/model interpretation with parent/texture inheritance, variants/multipart, rotations, uvlock/cull/tint metadata and opaque/cutout/translucent batching.

PR #134 adds merged mode-aware Creative presentation:

- Creative/Spectator hide survival-only hearts/hunger, armor, XP and oxygen while retaining the hotbar;
- underlying HP/hunger/armor/XP/oxygen gameplay values are not falsified to achieve that presentation;
- Creative inventory is a categorized/searchable registry-backed catalog rather than an expansion of `CREATIVE_START`;
- Survival equipment/2×2 crafting/27-slot main presentation is removed from Creative layout/hit-testing while the real nine-slot hotbar remains available.

## Creative mode

Merged Creative behavior now includes:

- Creative enters grounded instead of permanently flying;
- double-Jump toggles Creative flight through the shared desktop/mobile Jump edge detector;
- Spectator remains forced-flying; Survival/Adventure remain non-flying;
- hostile player target eligibility is limited to Survival/Adventure, so Creative/Spectator are not acquired/maintained as hostile targets;
- Creeper fuse clears when its player target becomes ineligible while physical knockback decay continues;
- the live Creative catalog derives from `ITEMS`, supports category and name/ID search, and writes selections to the real inventory cursor;
- historical `CREATIVE_START` ordering and starter-slot mapping remain unchanged.

The implementation does not claim complete Java 1.20.1 Creative tabs/search tags, operator tabs, saved hotbars, full registry breadth or complete Creative command parity.

## Mining / block destruction presentation

PR #133 remains the merged mining-presentation foundation:

- singleplayer mining progress published through a presentation-only channel;
- singleplayer and multiplayer sharing one runtime-owned mining crack overlay;
- Java 1.20.1 canonical `destroy_stage_0.png` … `destroy_stage_9.png` rather than generated crack textures;
- explicit crack cleanup on cancellation, target loss, restricted mode and completed break;
- local explosion destruction resolving current drops through registered block drop metadata, including grass→dirt and stone→cobblestone under the current simplified rules.

Full Java loot tables, explosion decay, Silk Touch/Fortune and complete mining particles/animation remain outside the merged implementation.

## World / persistence

Merged gameplay families include grass/dirt/stone/sand, oak plank/log/leaves, water, crafting table, cobblestone, red bed, iron ore, coal ore, glass, furnace, farmland moisture 0..7, wheat age 0..7, dirt path, stripped oak log and short grass.

Current merged terrain generator is **v4**:

- v2 remains the explicit pre-coal singleplayer compatibility path;
- v3 adds deterministic coal while preserving the v2 compatibility contract;
- v4 adds deterministic short-grass surface decoration for new/current worlds;
- old persisted worlds stay pinned to their recorded terrain version rather than being silently reinterpreted;
- multiplayer requires the exact current terrain version and does not allow mixed generator versions.

Singleplayer save schema remains **v9**. `terrainVersion` is required from schema v8 onward. PR #134 did not add Creative `flying` as a new persistent save field; player mode remains the persistence boundary and runtime flight is normalized by mode rules.

Java biome/climate generation, caves/aquifers, broad features/structures, full vertical range, Nether and End remain unimplemented.

## Farming / food / processing

Merged main contains the first natural wheat progression loop:

- farmland moisture 0..7 and wheat age 0..7;
- source-backed farmland/wheat blockstate and model interpretation;
- hoe-created farmland, nearby-water/weather hydration, drying and empty dry farmland returning to dirt;
- survival seed planting after successful mutation only; creative planting does not consume seed;
- simplified farming tick/growth probabilities rather than exact Java random-tick/light/neighbor formulas;
- immature/mature wheat harvest and seed recycling;
- wheat → bread Workbench recipe;
- deterministic short grass in terrain v4;
- base short-grass wheat-seed acquisition;
- bone → 3 bone meal;
- singleplayer bone meal advances wheat and spreads short grass under the current simplified rules.

Merged food/hunger support includes food, saturation, exhaustion and food timer; apple, bread, raw meats, cooked meats and rotten flesh; natural regeneration/starvation; raw iron and meat Furnace recipes; coal as 1600-tick fuel.

Singleplayer eating is a held, interruptible 1.6-second action. Release, control/modal loss, hotbar/item/mode change, drop or primary attack cancels without consuming. Multiplayer hunger/eating state remains disabled until the server owns the complete transaction.

Food status effects such as raw-chicken/rotten-flesh Hunger remain unimplemented because a generic status-effect system is absent. Difficulty/gamerule-specific hunger behavior is also not yet modeled beyond the current fixed Normal-style starvation floor/natural-regeneration rules.

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
- the current food/farming items described above.

The current stone→iron chain is:

`stone pickaxe → iron ore → raw iron → Furnace → iron ingot → iron pickaxe / axe / shovel / sword / hoe / iron armor`

`CREATIVE_START` remains intentionally stable. Later progression content is registered/obtainable without silently shifting historical bootstrap slots. Creative catalog breadth follows the live `ITEMS` registry and is therefore separate from the historical starter list.

## Survival / combat / PvE

Merged singleplayer survival includes:

- HP, hurt cooldown, knockback, death/respawn and recoverable item/XP drops;
- armor mitigation and durability wear;
- food/saturation/exhaustion and hunger-driven sprint gate at food <= 6;
- saturated fast regeneration, food>=18 normal regeneration and the current fixed Normal-style 1 HP starvation floor;
- timed/interruptible food use;
- oxygen/drowning and simplified swimming;
- time/weather, bed sleep/respawn and singleplayer XP;
- persistent singleplayer Furnace processing.

Current mobs are cow, sheep, pig, chicken, zombie, skeleton, creeper and spider. Their PvE remains simplified and client/singleplayer-owned; server-authoritative PvE is still absent. PR #134 does, however, make local hostile targeting mode-aware so Creative/Spectator players are not valid proactive hostile targets.

## Multiplayer authority

The merged Node WebSocket runtime owns:

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
- PvP HP/melee/armor mitigation/knockback/death drops/respawn;
- Creative flight intent/state ownership;
- Creative item creation through inventory transaction protocol **v2** `creative-pick`.

For `creative-pick`, the client submits only `itemId`; server mode/dead/registry/revision/replay checks determine validity, server-side registry metadata determines `maxStack`, and the server owns cursor/revision mutation and replication.

Because PR #134 expanded inventory transaction semantics incompatibly, the merged handshake/subprotocol is **v4 / `minecraft-web-v4`**. Legacy v3 peers are rejected rather than silently treated as compatible.

The merged server does **not** yet own hunger/eating state, farming/random ticks/bone meal, mobs/PvE/projectiles/explosions, XP/levels or durable world persistence. Client-side competing truth remains deliberately disabled for those missing multiplayer domains.

## Original Minecraft resources / audio

The repository tracks the extracted Java 1.20.1 client resource tree under `MC原版素材assets/` and the separately imported sound-object corpus under `原版Minecraft音频文件/`. Resource availability alone is not counted as runtime parity.

Merged source-backed audio includes current till/strip/flatten actions, common block/material break/place/step families, local footsteps, mining hits and ambient/hurt/death baseline events for the current mob set.

Full `sounds.json` event coverage, true positional/HRTF audio, remote replicated SFX and music scheduling remain incomplete.

## Quality baseline

Repository quality is exact-head based:

1. Node 22 JavaScript syntax;
2. auto-discovered logic/server/Worker regressions;
3. two Chromium E2E shards;
4. affected Minecraft asset/source audits;
5. browser integration where Three.js/CSS/WebAudio/HTTP boundaries matter;
6. final base-drift and review-surface checks.

PR #134 final head `e2dd61ae5603839ed4590f2a58121a4aad296a13` passed Repository quality run #1212: static checks, Chromium 1/2 and Chromium 2/2 all succeeded. It was `behind_by=0` with no reviews, review threads or PR comments before squash merge.

A green older head never validates a newer head.

## Next planned delivery

The next continuous development slice is Hunger follow-up:

- food status effects, starting with raw chicken / rotten flesh Hunger semantics and a reusable status-effect foundation;
- difficulty / gamerule boundary for starvation and natural regeneration behavior;
- server-authoritative multiplayer hunger/use state and transactions;
- preservation of current singleplayer save v9 and 1.6-second held/cancelable food-use behavior unless an actual persistence change requires a schema bump.

Registry breadth, broader worldgen, server-authoritative PvE/XP/persistence and farming depth remain subsequent planned slices.
