# 文件职责清单

本文件记录影响 gameplay state、authority、resource provenance/lifecycle 或主要 presentation contract 的关键文件，不是仓库 `ls`。

## Application / presentation

| 路径 | 职责 |
|---|---|
| `src/main.js` | browser app/session orchestration、singleplayer interaction entry points；persist/restore `terrainVersion` |
| `src/client-gameplay-runtime.js` | browser gameplay object graph construction/disposal；将选定 terrain version 传入 world runtime |
| `src/browser-bootstrap.js` | source-backed UI / Workbench / mining-audio page bridges |
| `src/ui.js` | Inventory/Crafting/Equipment/HUD DOM binding |
| `src/vanilla-workbench-presentation.js` | canonical Java 1.20.1 Workbench visual coordinates |
| `src/player-model-specs.js` | wide Steve anatomical pivots/boxes/UV |
| `src/first-person-player-presentation.js` | source-backed first-person arm/sleeve/held-item Three.js viewmodel |

## World / resources / audio

| 路径 | 职责 |
|---|---|
| `src/blocks.js` | append-only block IDs/metadata/render classes；#126 adds coal ore ID 27 |
| `src/world.js` | chunk streaming/edit overlay/mesh lifecycle；将 terrain version 传给 Worker |
| `src/world-worker.js` | browser terrain Worker；按 init message 的版本创建 deterministic generator |
| `src/terrain-generator.js` | browser/server deterministic worldgen compatibility source；current v3 + explicit local v2 path |
| `src/world-save-compatibility.js` | singleplayer save schema/terrain-version migration policy；legacy unversioned=v2, new=v3 |
| `src/mesh-worker.js` | chunk visible-face/interpreted model batch generation |
| `src/asset-manifest.js` | logical asset key → tracked source-backed URL; direct canonical bindings audited |
| `tools/import-minecraft-assets.py` | deterministic runtime-source selection；#126 imports canonical coal ore source |
| `tools/build-minecraft-runtime-assets.py` | deterministic 4×4 terrain atlas/runtime artifact builder；tile 15 = coal ore |
| `MC原版素材assets/` | Java 1.20.1 texture/model source input |
| `原版Minecraft音频文件/` | Java 1.20.1 sound-object source corpus |
| `src/vanilla-sounds.js` | current source-backed sound mappings + shared fetch/decode cache |
| `src/vanilla-block-audio.js` | local ordinary block events + material footsteps |
| `src/vanilla-mining-audio.js` | mining hit playback + break-variant shared decoded-buffer prewarm |
| `src/vanilla-mining-audio-runtime.js` | browser `minecraft:mining-hit` event bridge |
| `src/vanilla-mob-sounds.js` | current 8-mob voice mapping + local attenuation |

## Items / armor / crafting / processing

| 路径 | 职责 |
|---|---|
| `src/items.js` | runtime item definitions + stable historical `CREATIVE_START`; #126 adds coal/coal-ore block item without starter-slot shifts |
| `src/item-stack.js` | item-instance normalization/damage/merge |
| `src/inventory.js` | 36 slots + cursor + snapshot; preserves damaged item instances |
| `src/recipes.js` | shaped/shapeless matcher; current 18 recipes |
| `src/smelting.js` | smelting recipes + Furnace fuel registry; #126 coal = 1600 ticks |
| `src/equipment.js` | local head/chest/legs/feet state; points/toughness, damage preservation, armor wear/break |
| `src/armor-rules.js` | pure armor mitigation + per-hit durability wear |
| `src/armor-damage-bridge.js` | singleplayer applied-damage ordering |
| `src/commands.js` | local command parsing; `minecraft:<registered_item_id>` resolves through item registry |

## Server authority

| 路径 | 职责 |
|---|---|
| `server/player-equipment-state.mjs` | authoritative Equipment domain; preserves damage metadata and wear revisions |
| `server/player-combat-state.mjs` | authoritative HP/hurt/attack cooldown; consumes armor points for mitigation |
| `server/combat-runtime-controller.mjs` | PvP transaction orchestration; mitigation → accepted damage → wear replication → death cleanup |
| `server/runtime.mjs` | production server composition; current terrain v3 world-info and authoritative domains |

Other current server domains include movement/world session, mining/placement/secondary actions, ground items, Inventory, crafting/Workbench, Furnace, chat and commands. Multiplayer terrain compatibility is deliberately exact-current-version rather than the wider local v2/v3 save policy.

## #126 tests added/expanded

| 路径 | Purpose |
|---|---|
| `scripts/check-coal-progression.mjs` | coal block/item/harvest/Furnace fuel/deterministic sample contract |
| `scripts/check-terrain-generator.mjs` | v3 golden chunks + explicit v2 byte compatibility + iron/coal precedence |
| `scripts/check-singleplayer-terrain-version.mjs` | save schema v8 + unversioned-v2/new-v3 pinning + corrupt version rejection |
| `scripts/check-minecraft-runtime-assets.mjs` | regenerated atlas/source provenance/checksum contract |
| `scripts/check-server-terrain-world.mjs` | authoritative current-v3 terrain snapshot compatibility |
| `scripts/check-server-world-info.mjs` | exact current terrain-version multiplayer wire gate |
| `tests/e2e/coal-progression.spec.mjs` | real survival wooden-pickaxe mining + Jade + durability + canonical coal pickup |

#125 armor regressions remain part of the auto-discovered suite; #126 must not weaken them while extending terrain/content state.

## Documentation authority

| 路径 | 职责 |
|---|---|
| `README.md` | project overview / current delivery summary |
| `CHANGELOG.md` | chronological Unreleased history |
| `docs/PROJECT_BASELINE.md` | merged main facts only |
| `docs/MINECRAFT_1_20_1_FEATURE_MATRIX.md` | parity/roadmap authority |
| `docs/PROGRESS.md` | active delivery dashboard |
| `docs/ARCHITECTURE.md` | subsystem/authority boundaries |
| `docs/TESTING.md` | exact-head quality policy |
| `docs/FILE_MANIFEST.md` | this responsibility map |

## Global constraints

- IDs / persistence / starter-slot / network contracts are compatibility surfaces;
- source availability does not equal gameplay implementation;
- local persisted world generation must remain pinned to the world’s recorded terrain version;
- multiplayer clients send intent and consume authoritative result, and current sessions require the server’s exact terrain version;
- browser presentation cannot become gameplay truth;
- every parity-changing PR updates matrix/docs and passes final exact-head quality gate.
