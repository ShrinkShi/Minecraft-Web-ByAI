# 文件职责清单

本文件记录影响 gameplay state、authority、resource provenance/lifecycle 或主要 presentation contract 的关键文件，不是仓库 `ls`。

更新时间：2026-08-25。

## Application / presentation

| 路径 | 职责 |
|---|---|
| `src/main.js` | browser app/session orchestration；singleplayer hunger/farming/use/mining、save schema v9；将 authoritative/local mode 同步给 HUD/Creative presentation |
| `src/client-gameplay-runtime.js` | browser gameplay object graph construction/disposal；统一拥有 mining crack overlay；按 block drop metadata 处理本地 explosion drops |
| `src/browser-bootstrap.js` | source-backed UI / Workbench / mining-audio page bridges |
| `src/ui.js` | Inventory/Crafting/Equipment/HUD DOM binding；真实 slot/cursor/hotbar transaction presentation；不负责决定 Creative authority |
| `src/player.js` | local PlayerController；HP/hunger、movement、mode、Creative flight edge detector 与 flight toggle handler |
| `src/player-motion-rules.js` | pure movement planner；walk/sprint speed、forward-only active sprint、jump/gravity/swim integration |
| `src/player-locomotion-rules.js` | pure third-person walk/sprint gait：stride、arm swing、body lean/bob/sway |
| `src/player-model-renderer.js` | source-backed wide Steve renderer；消费 locomotion pose并保留 attack/use override |
| `src/desktop-controls.js` | Ctrl+W + double-W sprint 与 desktop Jump 输入 |
| `src/mobile-controls.js` | mobile movement/Jump input；与 desktop 经 control intent 进入同一 player jump edge |
| `src/immersive-game-shell.js` | fullscreen/pointer-lock/Keyboard Lock 生命周期、浏览器快捷键 containment |
| `src/first-person-player-presentation.js` | source-backed first-person arm/sleeve/held-item Three.js viewmodel |

## Creative mode overhaul

| 路径 | 职责 |
|---|---|
| `src/creative-flight-rules.js` | Creative double-Jump timing、mode eligibility 与 mode→flying normalization pure contract |
| `server/player-simulation.mjs` | server-owned flying state 与 `flightToggleSequence` idempotent consumption |
| `src/player-action-frame.js` | gameplay action wire；v2 含 payloadless `flight-toggle` |
| `src/server-player-snapshot.js` | self-authoritative snapshot v2；wire 上严格要求 boolean `flying` |
| `src/authoritative-player-interpolator.js` | shared snapshot interpolation；`flying` optional-but-strict-when-present，兼容 remote replication 无该字段 |
| `src/hostile-target-rules.js` | hostile player target eligibility；Survival/Adventure true，Creative/Spectator false |
| `src/hostile-mobs.js` | local hostile runtime；消费 eligibility gate，清 chase/attack/fuse target state但保留物理 knockback decay |
| `src/hud-presentation-rules.js` | survival-status HUD 是否可见的 pure mode rule |
| `src/hud-presentation-runtime.js` | mode-aware hearts/hunger/armor/XP/oxygen presentation；并同步 Creative inventory presentation |
| `src/creative-catalog.js` | 从 `ITEMS` registry 派生冻结的 Creative catalog descriptor、分类和名称/ID搜索；不维护第二份 item registry |
| `src/creative-inventory-runtime.js` | Creative browser catalog UI；单机写真实 local cursor，多人数端仅发送 server-owned `creative-pick` intent |
| `creative-inventory.css` | Creative catalog 分类、搜索、9-column item grid 与 hotbar presentation 样式 |
| `src/inventory-transaction-wire.js` | authoritative inventory transaction protocol v2；`slot-click` / `return-cursor` / `creative-pick` 严格 wire schema |
| `src/multiplayer-inventory-transaction-channel.js` | UI 与 active multiplayer client 之间的 scoped inventory transaction sender/result channel |
| `src/multiplayer-handshake.js` | multiplayer handshake v4 / `minecraft-web-v4`；因 Creative inventory action semantics 扩展而拒绝 legacy v3 |
| `server/player-inventory-state.mjs` | authoritative 36-slot inventory/cursor/mode/revision；Creative pick 验证 mode/item 并由 server `maxStack()` 生成 cursor stack |
| `server/runtime.mjs` | Creative pick revision/death/mode/item裁决、snapshot-first replication 和 transaction result orchestration |

`CREATIVE_START` 仍是历史 bootstrap compatibility surface。Creative catalog 从 `ITEMS` registry 派生，不能反向扩展/重排 `CREATIVE_START`。

## Mining / block destruction presentation

| 路径 | 职责 |
|---|---|
| `src/singleplayer-mining-controller.js` | local timed mining；drop resolver、tool wear、mining hit cadence；发布可清理的 singleplayer crack progress |
| `src/singleplayer-mining-progress-channel.js` | presentation-only singleplayer mining progress channel；不是 gameplay authority |
| `src/multiplayer-mining-progress-channel.js` | authoritative multiplayer mining progress client presentation channel |
| `src/mining-crack-rules.js` | pure 0..9 mining crack stage / target normalization |
| `src/mining-crack-assets.js` | canonical Java 1.20.1 `destroy_stage_0..9.png` source family |
| `src/mining-crack-overlay.js` | runtime-owned Three.js crack mesh；singleplayer/multiplayer 共用 |
| `src/explosion-drop-rules.js` | local explosion destruction → registered block drop mapping |

## Hunger / food / farming / processing

| 路径 | 职责 |
|---|---|
| `src/hunger-rules.js` | pure FoodData-like nutrition/saturation/exhaustion/regen/starvation/sprint threshold |
| `src/food-use-rules.js` | timed/interruptible food-use pure state rules |
| `src/singleplayer-food-use-runtime.js` | singleplayer 1.6 s food-use transaction/cancel/complete runtime |
| `src/farming-rules.js` | farmland moisture、水源 probe、wheat age/growth/drop transitions |
| `src/singleplayer-farming-runtime.js` | sparse farming-cell hydration/drying/growth/support-break runtime |
| `src/vegetation-farming-rules.js` | short-grass / bone-meal rules |
| `src/items.js` | canonical runtime item registry + gameplay profiles；历史 `CREATIVE_START` 定义所在 |
| `src/recipes.js` | shaped/shapeless crafting registry |
| `src/smelting.js` | Furnace recipe/fuel registry |
| `src/world-save-compatibility.js` | save schema + terrain-version compatibility；current save schema v9 |

## World / model resources / audio

| 路径 | 职责 |
|---|---|
| `src/blocks.js` | append-only block IDs/metadata/render classes/drop metadata |
| `src/world.js` | chunk streaming/edit overlay/mesh lifecycle；sparse edits persistence |
| `src/world-worker.js` | browser terrain Worker；按 persisted terrain version 创建 deterministic generator |
| `src/terrain-generator.js` | browser/server deterministic worldgen compatibility source；current v4 + explicit local v2/v3 paths |
| `src/mesh-worker.js` | chunk visible-face/interpreted model batch generation |
| `src/minecraft-model-registry.js` | explicit interpreted-model block opt-in |
| `src/minecraft-model-runtime.js` | canonical blockstate/model compilation、cache 与 deterministic model selection |
| `src/minecraft-model-texture-binding.js` | deterministic model-atlas validation + texture region/layer binding |
| `src/asset-manifest.js` | logical asset key → tracked source-backed URL |
| `MC原版素材assets/` | Java 1.20.1 texture/model source input；availability != runtime parity |
| `原版Minecraft音频文件/` | Java 1.20.1 sound-object source corpus |
| `src/vanilla-sounds.js` | source-backed sound mappings + shared fetch/decode cache |
| `src/vanilla-block-audio.js` | local block events + material footsteps |
| `src/vanilla-mining-audio.js` | mining hit playback + break-variant prewarm |
| `src/vanilla-mob-sounds.js` | current mob voice mapping + local attenuation |

## Inventory / armor / crafting

| 路径 | 职责 |
|---|---|
| `src/item-stack.js` | item-instance normalization/damage/merge |
| `src/inventory.js` | local 36 slots + cursor + snapshot；preserves damaged item instances；不持有 multiplayer authority |
| `src/equipment.js` | local head/chest/legs/feet state、armor points/toughness、damage preservation |
| `src/armor-rules.js` | pure armor mitigation + per-hit durability wear |
| `src/armor-damage-bridge.js` | singleplayer applied-damage ordering |
| `src/commands.js` | local command parsing；registered item namespace resolution |

## Server authority

| 路径 | 职责 |
|---|---|
| `server/multiplayer-server.mjs` | WebSocket transport、session/input/reliable request replay guards、transaction dispatch |
| `server/authoritative-world-session.mjs` | fixed-step server player/world session lifecycle |
| `server/player-inventory-state.mjs` | authoritative Inventory/cursor/mode/revision + Creative pick |
| `server/player-equipment-state.mjs` | authoritative Equipment state + damage metadata/revisions |
| `server/player-combat-state.mjs` | authoritative HP/hurt/attack cooldown + armor mitigation inputs |
| `server/combat-runtime-controller.mjs` | PvP transaction orchestration |
| `server/runtime.mjs` | production server composition；terrain-v4 world-info 与 authoritative domains |

Current server domains include movement/world, mining/placement/tool-secondary actions, items, Inventory/Creative pick, Creative flight, Equipment, crafting/Workbench, Furnace, chat, commands and PvP.

仍未 server-owned：hunger/eating state、farming/bone meal、mobs/PvE/projectiles/explosions、XP/levels 与 durable world persistence。多人客户端不得为这些域创建 competing truth。

## Save / terrain / wire compatibility

| Contract | Current rule on PR #134 |
|---|---|
| Pre-#126 unversioned terrain save | resolve as terrain generator v2 |
| `terrainVersion` required since | save schema **v8** |
| Current singleplayer save schema | **v9** |
| Current terrain generator | **v4** |
| Local legacy terrain | explicit v2/v3 compatibility paths retained |
| Multiplayer terrain | exact current generator only |
| Historical Creative starter | `CREATIVE_START` order/slot mapping unchanged |
| Player action frame | v2 (`flight-toggle`) |
| Self player snapshot | v2 (`flying`) |
| Inventory transaction | **v2** (`creative-pick`) |
| Multiplayer handshake | **v4 / `minecraft-web-v4`** |

Schema version、terrain version、append-only IDs、starter slots 与 individual network protocols 是相互独立的兼容性表面。

## PR #134 principal regressions

| 路径 | Purpose |
|---|---|
| `scripts/check-creative-flight-rules.mjs` | mode normalization + double-Jump timing |
| `scripts/check-server-creative-flight.mjs` | server-owned flight toggle/replay semantics |
| `scripts/check-hostile-target-eligibility.mjs` | hostile target mode eligibility/runtime source integration |
| `tests/e2e/hostile-target-eligibility.spec.mjs` | real hostile chase/attack/fuse/knockback browser behavior |
| `scripts/check-hud-presentation.mjs` | mode-aware HUD + armor re-render guard |
| `tests/e2e/creative-hud.spec.mjs` | real Creative HUD value-preservation/oxygen behavior |
| `scripts/check-creative-catalog.mjs` | full current registry coverage, category/search and stable `CREATIVE_START` |
| `scripts/check-inventory-transaction-wire.mjs` | inventory transaction v2 strict Creative-pick wire, count-spoof rejection |
| `scripts/check-authoritative-inventory-clicks.mjs` | server Creative pick mode/item/maxStack/revision state machine |
| `scripts/check-authoritative-inventory-transaction-runtime.mjs` | real WebSocket Creative pick snapshot/result/replay ordering |
| `scripts/check-websocket-inventory-transaction.mjs` | browser-client transaction serialization/result correlation |
| `tests/e2e/creative-inventory.spec.mjs` | singleplayer catalog/search/category/real cursor/hotbar continuity |
| `tests/e2e/multiplayer-inventory-transactions.spec.mjs` | multiplayer browser catalog → authoritative server cursor/slot round trip |

Earlier regressions remain auto-discovered and may not be weakened by current work.

## Documentation authority

| 路径 | 职责 |
|---|---|
| `README.md` | project overview |
| `CHANGELOG.md` | chronological Unreleased history |
| `docs/PROJECT_BASELINE.md` | merged main facts only；through PR #133 while #134 is open |
| `docs/MINECRAFT_1_20_1_FEATURE_MATRIX.md` | parity/roadmap authority；active PR explicitly marked |
| `docs/PROGRESS.md` | active delivery dashboard |
| `docs/CREATIVE_MODE_OVERHAUL.md` | PR #134 scope、authority、compatibility、tests and non-goals |
| `docs/PRESENTATION_MINING_FOUNDATION.md` | merged PR #133 delivery record |
| `docs/ARCHITECTURE.md` | subsystem/authority boundaries |
| `docs/TESTING.md` | exact-head quality policy and acceptance contracts |
| `docs/FILE_MANIFEST.md` | this responsibility map |

## Global constraints

- IDs / persistence / terrain version / starter slots / network contracts are compatibility surfaces；
- source availability does not equal gameplay implementation；
- local persisted world generation remains pinned to the recorded terrain version；
- multiplayer clients send intent and consume authoritative results；missing authority remains disabled rather than locally faked；
- browser presentation cannot become gameplay truth；
- pure gameplay rules must not depend on DOM/storage/network code；
- every parity-changing PR must update documentation and pass the final exact-head quality gate。
