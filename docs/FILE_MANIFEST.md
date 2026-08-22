# 文件职责清单

本文件记录影响 gameplay state、authority、resource provenance/lifecycle 或主要 presentation contract 的关键文件，不是仓库 `ls`。

## Application / presentation

| 路径 | 职责 |
|---|---|
| `src/main.js` | browser app/session orchestration；singleplayer hunger + farming tick/use/mining bridge、save-dirty boundary、save schema v9 persistence |
| `src/client-gameplay-runtime.js` | browser gameplay object graph construction/disposal；terrain version 传递 |
| `src/browser-bootstrap.js` | source-backed UI / Workbench / mining-audio page bridges |
| `src/ui.js` | Inventory/Crafting/Equipment/HUD DOM binding；hunger shank presentation |
| `src/player.js` | local PlayerController；HP + hunger/saturation/exhaustion/timer、movement exhaustion、sprint gating、food consumption |
| `src/vanilla-workbench-presentation.js` | canonical Java 1.20.1 Workbench visual coordinates |
| `src/player-model-specs.js` | wide Steve anatomical pivots/boxes/UV |
| `src/first-person-player-presentation.js` | source-backed first-person arm/sleeve/held-item Three.js viewmodel |

## Hunger / food / farming / processing

| 路径 | 职责 |
|---|---|
| `src/hunger-rules.js` | pure FoodData-like rules：nutrition/saturation、exhaustion drain、regen/starvation、sprint food threshold |
| `src/farming-rules.js` | pure phase-1 farming rules：farmland moisture mapping、water probe、wheat age/growth/drop transitions |
| `src/singleplayer-farming-runtime.js` | singleplayer sparse farming-cell tracker；10-second ticks、hydration/drying、growth、support-break cleanup/drop semantics |
| `src/items.js` | runtime item registry + food/farming profiles；`wheat_seeds`/`wheat`；历史 `CREATIVE_START` 保持稳定 |
| `src/recipes.js` | shaped/shapeless crafting registry；#128 adds 3-wide wheat→bread |
| `src/smelting.js` | Furnace recipe/fuel registry；raw iron + four raw-meat recipes；coal=1600 ticks |
| `src/singleplayer-mining-controller.js` | local timed mining；#128 adds optional `resolveDrops` extension while preserving default block-drop behavior |
| `src/world-save-compatibility.js` | save schema version + terrain-version migration；terrainVersion required since v8, current save schema v9 |
| `scripts/check-hunger-food.mjs` | pure hunger/food/sprint/Furnace contract |
| `scripts/check-farming-phase-1.mjs` | farming IDs/states/transitions/recipe/support-break drop contract |
| `tests/e2e/hunger-food.spec.mjs` | real singleplayer eating/regen/starvation/IndexedDB v9 acceptance |
| `tests/e2e/farming-phase-1.spec.mjs` | real Inventory→secondary planting→age 0..7→primary mature harvest→pickup acceptance |
| `docs/HUNGER_FOOD.md` | #127 scope、rule constants、persistence/authority/parity boundaries |
| `docs/FARMING_PHASE_1.md` | #128 state encoding、runtime ownership、canonical assets、compatibility/parity boundaries |

## World / model resources / audio

| 路径 | 职责 |
|---|---|
| `src/blocks.js` | append-only block IDs/metadata/render classes；coal 27；farmland moisture 24/28..34；wheat age 35..42 |
| `src/world.js` | chunk streaming/edit overlay/mesh lifecycle；farming states persist through sparse edits |
| `src/world-worker.js` | browser terrain Worker；按 init version 创建 deterministic generator；不生成 farming IDs |
| `src/terrain-generator.js` | browser/server deterministic worldgen compatibility source；current v3 + explicit local v2 path |
| `src/mesh-worker.js` | chunk visible-face/interpreted model batch generation |
| `src/minecraft-model-registry.js` | explicit interpreted-model block opt-in；#128 registers all farmland moisture and wheat age states |
| `src/minecraft-model-runtime.js` | canonical blockstate/model compilation, caching and deterministic model instance selection |
| `src/minecraft-model-texture-binding.js` | deterministic model-atlas manifest validation + texture region/layer binding |
| `src/asset-manifest.js` | logical asset key → tracked source-backed URL；direct-canonical food, wheat seed/wheat and selected block resources |
| `tools/minecraft_model_acceptance.py` | canonical model-closure roots；#128 adds `minecraft:farmland` and `minecraft:wheat` |
| `tools/import-minecraft-assets.py` | deterministic runtime-source selection + model dependency closure |
| `tools/build-minecraft-model-atlas.py` / `tools/minecraft_model_atlas.py` | deterministic interpreted-model texture atlas build |
| `tools/build-minecraft-runtime-assets.py` | deterministic terrain atlas/runtime artifact builder |
| `assets/minecraft/blockstates/farmland.json` | tracked generated canonical farmland blockstate |
| `assets/minecraft/blockstates/wheat.json` | tracked generated canonical wheat age blockstate |
| `assets/minecraft/models/block/farmland*.json` | tracked canonical farmland model dependency closure |
| `assets/minecraft/models/block/wheat_stage0..7.json` / `crop.json` | tracked canonical wheat/crop model dependency closure |
| `assets/model-textures/model-texture-atlas.{png,json}` | deterministic interpreted-model atlas；#128 closure 12 blockstates / 58 models / 28 textures |
| `assets/minecraft/source-manifest.json` / `runtime-manifest.json` | generated source provenance/runtime closure records |
| `MC原版素材assets/` | Java 1.20.1 texture/model source input；runtime use still requires explicit manifest/model registration |
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
| `src/equipment.js` | local head/chest/legs/feet state；points/toughness, damage preservation, armor wear/break |
| `src/armor-rules.js` | pure armor mitigation + per-hit durability wear |
| `src/armor-damage-bridge.js` | singleplayer applied-damage ordering |
| `src/commands.js` | local command parsing；`minecraft:<registered_item_id>` resolves through runtime registry |

Projected after #128: 54 runtime item IDs / 19 crafting recipes plus 5 Furnace recipes. This is active-PR scope, not merged-main baseline.

## Server authority

| 路径 | 职责 |
|---|---|
| `server/player-equipment-state.mjs` | authoritative Equipment state + damage metadata/revisions |
| `server/player-combat-state.mjs` | authoritative HP/hurt/attack cooldown + armor mitigation inputs |
| `server/combat-runtime-controller.mjs` | PvP transaction orchestration |
| `server/runtime.mjs` | production server composition；current terrain v3 world-info and authoritative domains |

Current server domains include movement/world, mining/placement/tool-secondary actions, items, Inventory, Equipment, crafting/Workbench, Furnace, chat, commands and PvP。

**#127 authority boundary:** hunger/eating is not server-owned；browser rejects multiplayer local eating rather than mutating competing hunger state。

**#128 authority boundary:** planting/crop ticks/crop drops are not server-owned；`SingleplayerFarmingRuntime` is never used as multiplayer world truth，and multiplayer farming remains disabled until authoritative transactions exist。

## Save compatibility

| Contract | Current rule |
|---|---|
| Pre-#126 unversioned terrain save | resolve as terrain generator v2 |
| `terrainVersion` required since | save schema **v8** |
| Current singleplayer save schema | **v9** (#127 exhaustion / foodTickTimer) |
| Farming persistence | existing sparse `edits` IDs；no #128 schema bump |
| New world terrain | v3 |
| Multiplayer terrain | exact current generator only |

Schema numbers、terrain generator numbers、append-only block IDs are deliberately separate compatibility surfaces。

## #127/#128 tests added or expanded

| 路径 | Purpose |
|---|---|
| `scripts/check-hunger-food.mjs` | food values、consumption、exhaustion、regen/starvation、sprint gate、Furnace meats |
| `scripts/check-farming-phase-1.mjs` | moisture/age IDs、canonical model descriptors、growth/drop/support-break semantics、bread recipe |
| `scripts/check-singleplayer-terrain-version.mjs` | schema v9 while retaining terrainVersion-required-since-v8 contract |
| `scripts/check-asset-manifest.mjs` | direct canonical food + wheat texture logical-key/path audit |
| `scripts/check-minecraft-model-runtime.mjs` | interpreted-model registry includes farming state IDs |
| `scripts/check-minecraft-model-texture-binding.mjs` | exact 12/58/28 closure、atlas SHA/regions、farming textures |
| `scripts/check-minecraft-runtime-assets.mjs` | runtime/source provenance closure |
| `tests/e2e/hunger-food.spec.mjs` | eating + full-hunger rejection + regen + starvation floor + IndexedDB persistence |
| `tests/e2e/farming-phase-1.spec.mjs` | real planting + deterministic age progression + real mature mining/drop pickup |
| `tests/e2e/smoke.spec.mjs` | existing singleplayer save schema v9 smoke |

Earlier regressions remain auto-discovered and may not be weakened by current work。

## Documentation authority

| 路径 | 职责 |
|---|---|
| `README.md` | project overview |
| `CHANGELOG.md` | chronological Unreleased history |
| `docs/PROJECT_BASELINE.md` | merged main facts only；currently through #127 |
| `docs/MINECRAFT_1_20_1_FEATURE_MATRIX.md` | projected parity/roadmap authority；may describe active PR explicitly |
| `docs/PROGRESS.md` | active delivery dashboard |
| `docs/HUNGER_FOOD.md` | hunger/food design/limitations |
| `docs/FARMING_PHASE_1.md` | wheat farming design/limitations |
| `docs/ARCHITECTURE.md` | subsystem/authority boundaries |
| `docs/TESTING.md` | exact-head quality policy and acceptance contracts |
| `docs/FILE_MANIFEST.md` | this responsibility map |

## Global constraints

- IDs / persistence / starter-slot / network contracts are compatibility surfaces；
- source availability does not equal gameplay implementation；
- local persisted world generation remains pinned to the world’s recorded terrain version；
- multiplayer clients send intent and consume authoritative result；unimplemented authority remains disabled rather than locally faked；
- browser presentation cannot become gameplay truth；
- hunger/farming pure rules must not depend on DOM/storage/network code；
- every parity-changing PR updates matrix/docs and passes final exact-head quality gate。
