# 文件职责清单

本文件记录影响 gameplay state、authority、resource provenance/lifecycle 或主要 presentation contract 的关键文件，不是仓库 `ls`。

## Application / presentation

| 路径 | 职责 |
|---|---|
| `src/main.js` | browser app/session orchestration；singleplayer hunger tick、food-use entry、save-dirty boundary、save schema v9 persistence |
| `src/client-gameplay-runtime.js` | browser gameplay object graph construction/disposal；terrain version 传递 |
| `src/browser-bootstrap.js` | source-backed UI / Workbench / mining-audio page bridges |
| `src/ui.js` | Inventory/Crafting/Equipment/HUD DOM binding；hunger shank presentation |
| `src/player.js` | local PlayerController；HP + hunger/saturation/exhaustion/timer、movement exhaustion、sprint gating、food consumption |
| `src/vanilla-workbench-presentation.js` | canonical Java 1.20.1 Workbench visual coordinates |
| `src/player-model-specs.js` | wide Steve anatomical pivots/boxes/UV |
| `src/first-person-player-presentation.js` | source-backed first-person arm/sleeve/held-item Three.js viewmodel |

## Hunger / food / processing

| 路径 | 职责 |
|---|---|
| `src/hunger-rules.js` | pure FoodData-like rules：nutrition/saturation、exhaustion drain、regen/starvation、sprint food threshold |
| `src/items.js` | runtime item registry + food profiles；历史 `CREATIVE_START` 保持稳定 |
| `src/smelting.js` | Furnace recipe/fuel registry；raw iron + four raw-meat recipes；coal=1600 ticks |
| `src/world-save-compatibility.js` | save schema version + terrain-version migration；terrainVersion required since v8, current save schema v9 |
| `scripts/check-hunger-food.mjs` | pure hunger/food/sprint/Furnace contract |
| `tests/e2e/hunger-food.spec.mjs` | real singleplayer eating/regen/starvation/IndexedDB v9 acceptance |
| `docs/HUNGER_FOOD.md` | #127 scope、rule constants、persistence/authority/parity boundaries |

## World / resources / audio

| 路径 | 职责 |
|---|---|
| `src/blocks.js` | append-only block IDs/metadata/render classes；coal ore ID 27 |
| `src/world.js` | chunk streaming/edit overlay/mesh lifecycle；terrain version 传给 Worker |
| `src/world-worker.js` | browser terrain Worker；按 init version 创建 deterministic generator |
| `src/terrain-generator.js` | browser/server deterministic worldgen compatibility source；current v3 + explicit local v2 path |
| `src/mesh-worker.js` | chunk visible-face/interpreted model batch generation |
| `src/asset-manifest.js` | logical asset key → tracked source-backed URL；#127 adds direct canonical apple/bread/cooked-meat keys |
| `tools/import-minecraft-assets.py` | deterministic runtime-source selection |
| `tools/build-minecraft-runtime-assets.py` | deterministic terrain atlas/runtime artifact builder |
| `MC原版素材assets/` | Java 1.20.1 texture/model source input；#127 food PNGs are consumed directly from audited item paths |
| `原版Minecraft音频文件/` | Java 1.20.1 sound-object source corpus |
| `src/vanilla-sounds.js` | source-backed sound mappings + shared fetch/decode cache |
| `src/vanilla-block-audio.js` | local block events + material footsteps |
| `src/vanilla-mining-audio.js` | mining hit playback + break-variant prewarm |
| `src/vanilla-mob-sounds.js` | current 8-mob voice mapping + local attenuation |

## Inventory / armor / crafting

| 路径 | 职责 |
|---|---|
| `src/item-stack.js` | item-instance normalization/damage/merge |
| `src/inventory.js` | 36 slots + cursor + snapshot；preserves damaged item instances |
| `src/recipes.js` | shaped/shapeless matcher；current 18 crafting recipes |
| `src/equipment.js` | local head/chest/legs/feet state；points/toughness, damage preservation, armor wear/break |
| `src/armor-rules.js` | pure armor mitigation + per-hit durability wear |
| `src/armor-damage-bridge.js` | singleplayer applied-damage ordering |
| `src/commands.js` | local command parsing；`minecraft:<registered_item_id>` resolves through runtime registry |

## Server authority

| 路径 | 职责 |
|---|---|
| `server/player-equipment-state.mjs` | authoritative Equipment state + damage metadata/revisions |
| `server/player-combat-state.mjs` | authoritative HP/hurt/attack cooldown + armor mitigation inputs |
| `server/combat-runtime-controller.mjs` | PvP transaction orchestration |
| `server/runtime.mjs` | production server composition；current terrain v3 world-info and authoritative domains |

Current server domains include movement/world, mining/placement/secondary actions, items, Inventory, Equipment, crafting/Workbench, Furnace, chat, commands and PvP。

**#127 authority boundary:** shared Furnace recipes are pure rules and therefore become visible to the authoritative Furnace, but hunger/eating itself is not server-owned yet。The browser must reject multiplayer local eating rather than mutate a competing client hunger state。

## Save compatibility

| Contract | Current rule |
|---|---|
| Pre-#126 unversioned terrain save | resolve as terrain generator v2 |
| `terrainVersion` required since | save schema **v8** |
| Current singleplayer save schema | **v9** (#127 adds exhaustion / foodTickTimer persistence) |
| New world terrain | v3 |
| Multiplayer terrain | exact current generator only |

Schema numbers and terrain generator numbers are deliberately separate compatibility surfaces。

## #127 tests added/expanded

| 路径 | Purpose |
|---|---|
| `scripts/check-hunger-food.mjs` | food values、consumption、exhaustion、regen/starvation、sprint gate、Furnace meats |
| `scripts/check-singleplayer-terrain-version.mjs` | schema v9 while retaining terrainVersion-required-since-v8 contract |
| `scripts/check-asset-manifest.mjs` | direct canonical food texture logical-key/path audit |
| `tests/e2e/hunger-food.spec.mjs` | eating + full-hunger rejection + regen + starvation floor + IndexedDB persistence |
| `tests/e2e/smoke.spec.mjs` | existing singleplayer snapshots upgraded to expected save schema v9 |

#124/#125/#126 regressions remain auto-discovered and may not be weakened by #127。

## Documentation authority

| 路径 | 职责 |
|---|---|
| `README.md` | project overview |
| `CHANGELOG.md` | chronological Unreleased history |
| `docs/PROJECT_BASELINE.md` | merged main facts only |
| `docs/MINECRAFT_1_20_1_FEATURE_MATRIX.md` | parity/roadmap authority |
| `docs/PROGRESS.md` | active delivery dashboard |
| `docs/HUNGER_FOOD.md` | current hunger/food design/limitations |
| `docs/ARCHITECTURE.md` | subsystem/authority boundaries |
| `docs/TESTING.md` | exact-head quality policy |
| `docs/FILE_MANIFEST.md` | this responsibility map |

## Global constraints

- IDs / persistence / starter-slot / network contracts are compatibility surfaces；
- source availability does not equal gameplay implementation；
- local persisted world generation remains pinned to the world’s recorded terrain version；
- multiplayer clients send intent and consume authoritative result；unimplemented authority remains disabled rather than locally faked；
- browser presentation cannot become gameplay truth；
- hunger pure rules must not depend on DOM/storage/network code；
- every parity-changing PR updates matrix/docs and passes final exact-head quality gate。
