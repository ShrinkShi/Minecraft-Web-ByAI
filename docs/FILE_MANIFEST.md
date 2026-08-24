# 文件职责清单

本文件记录影响 gameplay state、authority、resource provenance/lifecycle 或主要 presentation contract 的关键文件，不是仓库 `ls`。

更新时间：2026-08-24。

## Application / presentation

| 路径 | 职责 |
|---|---|
| `src/main.js` | browser app/session orchestration；singleplayer hunger/farming/use/mining bridge、save-dirty boundary、save schema v9 persistence |
| `src/client-gameplay-runtime.js` | browser gameplay object graph construction/disposal；PR #133 后统一拥有 mining crack overlay，并按 block drop rule 处理本地 explosion drops |
| `src/browser-bootstrap.js` | source-backed UI / Workbench / mining-audio page bridges |
| `src/ui.js` | Inventory/Crafting/Equipment/HUD DOM binding；hunger shank presentation |
| `src/player.js` | local PlayerController；HP/hunger、movement、实际 sprint 判定、sprint exhaustion 与第三人称 sprint presentation 协调 |
| `src/player-motion-rules.js` | pure movement planner；walk/sprint speed、forward-only active sprint、jump/gravity/swim integration |
| `src/player-locomotion-rules.js` | PR #133 pure third-person walk/sprint gait：stride、arm swing、body lean/bob/sway |
| `src/player-model-renderer.js` | source-backed wide Steve renderer；消费 locomotion pose，并保留 attack/use right-arm override |
| `src/first-person-presentation-rules.js` | first-person neutral/action pose；PR #133 将 neutral hand anchor 轻微右下移动 |
| `src/first-person-player-presentation.js` | source-backed first-person arm/sleeve/held-item Three.js viewmodel |
| `src/desktop-controls.js` | desktop control adapter；Ctrl L/R + W 与 double-W 发布统一 sprint intent；R 不再绑定 sprint |
| `src/immersive-shell-rules.js` | gameplay Keyboard Lock key set 与 Ctrl/Meta+W/F3/F5/Tab 浏览器快捷键抑制规则 |
| `src/immersive-game-shell.js` | fullscreen/pointer-lock/Keyboard Lock 生命周期、capture-phase shortcut suppression、first-person presentation shell |
| `src/vanilla-workbench-presentation.js` | canonical Java 1.20.1 Workbench visual coordinates |
| `src/player-model-specs.js` | wide Steve anatomical pivots/boxes/UV |

## Mining / block destruction presentation

| 路径 | 职责 |
|---|---|
| `src/singleplayer-mining-controller.js` | local timed mining；掉落 resolver、tool wear、mining hit cadence；PR #133 发布可清理的 singleplayer crack progress |
| `src/singleplayer-mining-progress-channel.js` | presentation-only singleplayer mining progress channel；不成为 gameplay authority |
| `src/multiplayer-mining-progress-channel.js` | authoritative multiplayer mining progress 的 client presentation channel |
| `src/mining-crack-rules.js` | pure 0..9 mining crack stage / target normalization |
| `src/mining-crack-assets.js` | PR #133 canonical `destroy_stage_0..9.png` source family 与边界校验 |
| `src/mining-crack-overlay.js` | runtime-owned Three.js crack mesh；同时订阅 singleplayer/multiplayer channel，直接使用 Java 1.20.1 canonical textures |
| `src/explosion-drop-rules.js` | PR #133 local explosion destruction → registered block drop mapping；当前 grass→dirt、stone→cobblestone |
| `src/multiplayer-gameplay-adapter.js` | authoritative multiplayer browser binding；复用 `runtime.miningCracks`，不得创建第二个 crack overlay |
| `scripts/check-singleplayer-mining-crack-channel.mjs` | local mining start/progress/cancel/clear channel contract |
| `scripts/check-mining-crack-assets.mjs` | canonical destroy-stage 0..9 tracked PNG audit |
| `scripts/check-explosion-drops.mjs` | current simplified explosion drop semantics |

## Hunger / food / farming / processing

| 路径 | 职责 |
|---|---|
| `src/hunger-rules.js` | pure FoodData-like rules：nutrition/saturation、exhaustion drain、regen/starvation、sprint food threshold |
| `src/food-use-rules.js` | timed/interruptible food-use pure state rules |
| `src/singleplayer-food-use-runtime.js` | PR #131 singleplayer 1.6 s food-use transaction/cancel/complete runtime |
| `src/farming-rules.js` | pure farming rules：farmland moisture mapping、water probe、wheat age/growth/drop transitions |
| `src/singleplayer-farming-runtime.js` | singleplayer sparse farming-cell tracker；hydration/drying、growth、support-break cleanup/drop semantics |
| `src/vegetation-farming-rules.js` | short-grass / bone-meal farming phase 1.1 rules |
| `src/items.js` | runtime item registry + food/farming profiles；历史 `CREATIVE_START` 保持稳定 |
| `src/recipes.js` | shaped/shapeless crafting registry；含 wheat→bread 与 bone→bone meal |
| `src/smelting.js` | Furnace recipe/fuel registry；raw iron + four raw-meat recipes；coal=1600 ticks |
| `src/world-save-compatibility.js` | save schema + terrain-version compatibility；terrainVersion required since v8，current save schema v9 |
| `docs/HUNGER_FOOD.md` | hunger/food core scope 与 authority/parity boundary |
| `docs/HUNGER_PHASE_2.md` | PR #131 timed/interruptible food-use boundary |
| `docs/FARMING_PHASE_1.md` | wheat farming state/runtime/canonical asset boundary |
| `docs/VEGETATION_FARMING_1_1.md` | short grass / terrain-v4 / bone-meal boundary |

## World / model resources / audio

| 路径 | 职责 |
|---|---|
| `src/blocks.js` | append-only block IDs/metadata/render classes/drop metadata |
| `src/world.js` | chunk streaming/edit overlay/mesh lifecycle；farming/vegetation states persist through sparse edits |
| `src/world-worker.js` | browser terrain Worker；按 persisted terrain version 创建 deterministic generator |
| `src/terrain-generator.js` | browser/server deterministic worldgen compatibility source；current v4 + explicit local v2/v3 paths |
| `src/mesh-worker.js` | chunk visible-face/interpreted model batch generation |
| `src/minecraft-model-registry.js` | explicit interpreted-model block opt-in |
| `src/minecraft-model-runtime.js` | canonical blockstate/model compilation、caching 与 deterministic model selection |
| `src/minecraft-model-texture-binding.js` | deterministic model-atlas manifest validation + texture region/layer binding |
| `src/asset-manifest.js` | general logical asset key → tracked source-backed URL；specialized crack family由 `mining-crack-assets.js` 管理 |
| `tools/minecraft_model_acceptance.py` | canonical model-closure roots |
| `tools/import-minecraft-assets.py` | deterministic runtime-source selection + model dependency closure |
| `tools/build-minecraft-model-atlas.py` / `tools/minecraft_model_atlas.py` | interpreted-model texture atlas build |
| `tools/build-minecraft-runtime-assets.py` | deterministic terrain atlas/runtime artifact builder |
| `assets/model-textures/model-texture-atlas.{png,json}` | deterministic interpreted-model atlas |
| `assets/minecraft/source-manifest.json` / `runtime-manifest.json` | generated source provenance/runtime closure records |
| `MC原版素材assets/` | Java 1.20.1 texture/model source input；source availability 不自动等于 runtime parity |
| `原版Minecraft音频文件/` | Java 1.20.1 sound-object source corpus |
| `src/vanilla-sounds.js` | source-backed sound mappings + shared fetch/decode cache |
| `src/vanilla-block-audio.js` | local block events + material footsteps |
| `src/vanilla-mining-audio.js` | mining hit playback + break-variant prewarm |
| `src/vanilla-mob-sounds.js` | current mob voice mapping + local attenuation |

## Inventory / armor / crafting

| 路径 | 职责 |
|---|---|
| `src/item-stack.js` | item-instance normalization/damage/merge |
| `src/inventory.js` | 36 slots + cursor + snapshot；preserves damaged item instances |
| `src/equipment.js` | local head/chest/legs/feet state；points/toughness、damage preservation、armor wear/break |
| `src/armor-rules.js` | pure armor mitigation + per-hit durability wear |
| `src/armor-damage-bridge.js` | singleplayer applied-damage ordering |
| `src/commands.js` | local command parsing；`minecraft:<registered_item_id>` resolves through runtime registry |

`CREATIVE_START` 是兼容性 bootstrap，不应被未来 Creative inventory catalog 当作完整 Creative registry。

## Server authority

| 路径 | 职责 |
|---|---|
| `server/player-equipment-state.mjs` | authoritative Equipment state + damage metadata/revisions |
| `server/player-combat-state.mjs` | authoritative HP/hurt/attack cooldown + armor mitigation inputs |
| `server/combat-runtime-controller.mjs` | PvP transaction orchestration |
| `server/runtime.mjs` | production server composition；terrain-v4 world-info 与 authoritative domains |

Current server domains include movement/world, mining/placement/tool-secondary actions, items, Inventory, Equipment, crafting/Workbench, Furnace, chat, commands and PvP。

仍未 server-owned：hunger/eating state、farming/bone meal、mobs/PvE/projectiles/explosions、XP/levels 与 durable world persistence。多人客户端不得为这些域创建 competing truth。

## Save / terrain compatibility

| Contract | Current merged rule |
|---|---|
| Pre-#126 unversioned terrain save | resolve as terrain generator v2 |
| `terrainVersion` required since | save schema **v8** |
| Current singleplayer save schema | **v9** |
| v2 terrain | pre-coal explicit compatibility path |
| v3 terrain | deterministic coal path |
| v4 terrain | current new-world path；adds deterministic short grass |
| Farming/vegetation persistence | existing sparse `edits` IDs；no extra schema bump |
| Multiplayer terrain | exact current generator only |

Schema version、terrain version、append-only block IDs、starter slots 与 network schemas 是相互独立的兼容性表面。

## PR #133 tests added or expanded

| 路径 | Purpose |
|---|---|
| `scripts/check-browser-safe-keymap.mjs` | Ctrl sprint mapping + legacy R removal |
| `scripts/check-desktop-sprint-controls.mjs` | Ctrl+W / double-W desktop integration |
| `scripts/check-immersive-game-shell.mjs` | Keyboard Lock set + Ctrl/Meta+W shortcut containment |
| `scripts/check-player-motion.mjs` | forward-only effective sprint、swim/sneak/back/strafe boundaries |
| `scripts/check-player-locomotion.mjs` | distinct walk/sprint gait constants and poses |
| `scripts/check-singleplayer-mining-crack-channel.mjs` | local crack progress + clear lifecycle |
| `scripts/check-mining-crack-assets.mjs` | canonical destroy-stage 0..9 paths/files |
| `scripts/check-explosion-drops.mjs` | explosion drop mapping |

Earlier regressions remain auto-discovered and may not be weakened by current work。

## Documentation authority

| 路径 | 职责 |
|---|---|
| `README.md` | project overview |
| `CHANGELOG.md` | chronological Unreleased history |
| `docs/PROJECT_BASELINE.md` | merged main facts only；currently through PR #131 |
| `docs/MINECRAFT_1_20_1_FEATURE_MATRIX.md` | parity/roadmap authority；active PR must be clearly marked |
| `docs/PROGRESS.md` | active delivery dashboard |
| `docs/PRESENTATION_MINING_FOUNDATION.md` | PR #133 scope、browser/input、crack/drop、compatibility and merge gate |
| `docs/ARCHITECTURE.md` | subsystem/authority boundaries |
| `docs/TESTING.md` | exact-head quality policy and acceptance contracts |
| `docs/FILE_MANIFEST.md` | this responsibility map |

## Global constraints

- IDs / persistence / terrain version / starter slots / network contracts are compatibility surfaces；
- source availability does not equal gameplay implementation；
- local persisted world generation remains pinned to the world’s recorded terrain version；
- multiplayer clients send intent and consume authoritative result；missing authority remains disabled rather than locally faked；
- browser presentation cannot become gameplay truth；
- pure gameplay rules must not depend on DOM/storage/network code；
- every parity-changing PR must update current documentation and pass the final exact-head quality gate。
