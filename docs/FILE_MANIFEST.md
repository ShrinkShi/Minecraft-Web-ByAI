# 文件职责清单

本文是**架构责任清单**，不是仓库 `ls` 的复制。只登记会影响 gameplay state、authority、资源 provenance/lifecycle 或主要 presentation contract 的文件。完整能力与 roadmap 见 `PROJECT_BASELINE.md`、`MINECRAFT_1_20_1_FEATURE_MATRIX.md`。

## Product shell / UI presentation

| 路径 | 职责 | 约束 |
|---|---|---|
| `index.html` | 菜单、HUD、Inventory/Workbench、聊天、死亡界面 DOM 壳 | 不承载 authoritative gameplay rules |
| `styles.css` / feature CSS | 基础 UI/HUD/overlay | 不成为 gameplay truth；避免逐帧 layout |
| `src/ui.js` | Hotbar/Inventory/Crafting/Equipment/HUD DOM binding | multiplayer 从 authoritative snapshot/result 渲染 |
| `src/vanilla-ui-presentation.js` | source-backed HUD/Inventory presentation | UI sprite provenance 通过 asset manifest |
| `src/vanilla-workbench-presentation.js` | PR #124 canonical Java 1.20.1 Workbench panel + fixed slot coordinates | 只负责 presentation；3×3 crafting state 仍由 `ui.js`/CraftingGrid/authority 管理 |
| `src/inventory-player-preview.js` | Inventory Steve preview | presentation only |
| `src/death-screen.js` | death overlay | 不决定掉落/重生规则 |
| `src/jade*.js` | crosshair inspection | read-only，不成为 target authority |

## Application/runtime composition

| 路径 | 职责 | 约束 |
|---|---|---|
| `src/browser-bootstrap.js` | 安装 source-backed UI、Workbench、mining-audio browser bridges 与顶层 shell | installer 必须可重复/明确生命周期 |
| `src/main.js` | browser app state machine、single/multiplayer orchestration、单人交互入口 | 继续拆纯规则/presentation，不吸收可独立 subsystem |
| `src/client-gameplay-runtime.js` | 构建/拥有共享 browser gameplay object graph | dispose 必须释放 world/entity/audio wrappers；multiplayer 不改变客户端 authority 边界 |
| `src/control-intents.js` | canonical gameplay intent/state | desktop/touch/network 不定义不同玩法 |
| `src/desktop-controls.js` / `src/mobile-controls.js` | device input → intents | 不直接修改 World/Inventory |

## Player presentation

| 路径 | 职责 | 约束 |
|---|---|---|
| `src/player-model-specs.js` | wide Steve body-part pivots/boxes/UV specs | PR #124 明确 yaw=0 面向 -Z 时 anatomical right=+X；左右肢体不得再次镜像 |
| `src/player-model-renderer.js` | third-person articulated player geometry/animation | primary/use 语义驱动 `rightArm`；model spec 决定物理侧 |
| `src/first-person-presentation-rules.js` | first-person arm/action pure transform contract | source-backed right arm；不依赖 DOM/renderer state |
| `src/first-person-player-presentation.js` | Three.js first-person arm/sleeve/held item viewmodel | PR #124 保持右下 presentation anchor并修正 shoulder→hand 几何方向 |
| `src/player.js` | local player/camera/movement + avatar composition | multiplayer position 不以本地 integrator 为 authority |

## World / blocks / rendering

| 路径 | 职责 | 约束 |
|---|---|---|
| `src/blocks.js` | block IDs/metadata/render classification | IDs append-only；player-created states 不静默改写旧 seed bytes |
| `src/world.js` | chunk streaming、edit overlay、mesh lifecycle、queries | GPU/CPU resources 显式 dispose |
| `src/terrain-generator.js` | browser/server deterministic terrain | worldgen 改动必须版本化 |
| `src/world-worker.js` | terrain Worker adapter | 不复制生成算法 |
| `src/mesh-worker.js` | visible-face + special/interpreted batch generation | generic model path不退化为一 block 一 Mesh |
| `src/minecraft-model-mesh-batch.js` | interpreted faces → chunk TypedArrays | texture/layer/tint/cull callback 注入 |
| bed rules/model renderer | paired bed state + source-backed geometry presentation | gameplay state 与 Three.js visual 分层 |
| weather rules/system | pure weather + pooled presentation | fixed capacity/显式 dispose |

## Minecraft resources / asset pipeline

| 路径 | 职责 | 约束 |
|---|---|---|
| `MC原版素材assets.zip` / `MC原版素材assets/` | Java 1.20.1 client texture/model resource input | 文件存在不等于 runtime 已实现对应内容 |
| `原版Minecraft音频文件/` | 单独提供的 Java 1.20.1 sound-object corpus | source availability only；runtime event 必须逐项接入 |
| `src/asset-manifest.js` | logical asset key → tracked source-backed URL | missing fail closed；direct canonical item/block/GUI binding 必须显式审计 |
| resource-id/model/blockstate/geometry/instance modules | renderer-neutral Minecraft model interpretation | Node/browser-neutral；不直接依赖 Three.js |
| `assets/minecraft/runtime-manifest.json` | selective runtime subset/provenance | generated/tracked contract |
| `assets/model-textures/*` | deterministic interpreted-model atlas + manifest | 可重建、逐字节验证 |
| `tools/audit-minecraft-assets.py` | source archive audit | deterministic probes/hash |
| `tools/import-minecraft-assets.py` | selective legacy extraction | 不等于 dependency closure |
| `tools/build-minecraft-runtime-assets.py` | browser-ready runtime build | tracked output 可重建 |
| `tools/minecraft_model_closure.py` / `minecraft_model_atlas.py` | dependency closure + deterministic atlas | missing/cyclic/unsafe fail closed |
| `.github/workflows/asset-source-audit.yml` | read-only resource reproducibility gate | `contents: read`，不得 self-push |

## Original audio subsystem

| 路径 | 职责 | 约束 |
|---|---|---|
| `src/vanilla-sounds.js` | current source-backed tool/block event registry、OGG object URL、decode cache、trace | variants 绑定真实 SHA-1 + logical path |
| `src/vanilla-block-audio.js` | ordinary break/place + local distance-driven footsteps | PR #124 cadence=1.6 blocks；flying/swimming/airborne/teleport reset；block→block tool mutation不误播 ordinary events |
| `src/vanilla-mining-audio.js` | PR #124 mining hit playback profile + early break-object fetch | hit 只复用当前 block sound type；prefetch 不等于完整 decode scheduler |
| `src/vanilla-mining-audio-runtime.js` | `minecraft:mining-hit` browser event → source-backed hit playback | browser-only bridge，installer/dispose 不重复监听 |
| `src/vanilla-mob-sounds.js` | PR #124 current 8 mob ambient/hurt/death source OGG mapping + local distance attenuation | 当前 24-block linear gain 不是完整 3D/HRTF；specialized entity events仍缺 |
| `src/audio-system.js` | interim procedural fallback for unmigrated events | 不得标记为 source-backed Java audio |
| `scripts/check-vanilla-block-audio.mjs` | transition/Java playback/footstep cadence contract | 不依赖浏览器 |
| `scripts/check-mining-audio-cadence.mjs` | mining 200 ms cadence + event bridge pure contract | target switch immediate，creative不走 survival hit loop |
| `scripts/check-vanilla-mob-sounds.mjs` | mob event mapping + real object files + attenuation | 读取真实 tracked sound objects |
| `tests/e2e/iron-hoe-secondary-action.spec.mjs` | tool sound live OGG acceptance | real HTTP/decode boundary |
| `tests/e2e/view-ui-audio-polish.spec.mjs` | PR #124 live limb/Workbench/mining-audio acceptance | computed layout + real source-object HTTP response；不以 synthetic trace 单独冒充完整验证 |

当前 audio 仍是 `PARTIAL`：local tool/block/mining + current mob voice baseline。remote multiplayer SFX、完整 entity/combat/environment registry、music 与 true positional/HRTF 仍缺失。

## Inventory / crafting / progression

| 路径 | 职责 | 约束 |
|---|---|---|
| `src/items.js` | runtime item registry | 当前 main/PR #124 内容边界 40 IDs；provenance 明确 |
| `src/item-stack.js` | item instance normalize/damage/merge | single/multiplayer 共享语义 |
| `src/inventory.js` | 36 slots + cursor/snapshot | multiplayer 本地不做 truth |
| `src/equipment.js` | head/chest/legs/feet state | 与 Inventory 独立 revision/domain |
| `src/recipes.js` | current recipe matcher | 当前 14 recipes，远非全 registry |
| `src/mining-rules.js` | mining speed/progress/harvest | browser/server shared |
| `src/singleplayer-mining-controller.js` | singleplayer hold-to-mine lifecycle | PR #124 增加 source-audio-neutral 200 ms hit events；world mutation/drops/wear ordering不变 |
| `src/tool-secondary-actions.js` | browser-neutral till/strip/flatten resolver | 不直接负责 durability/audio |
| `server/tool-secondary-action-rules.mjs` | server authoritative secondary resolver | 客户端 target 不可信 |

## Entities / PvE

| 路径 | 职责 | 约束 |
|---|---|---|
| `src/entity-store.js` / `spatial-hash.js` | identity/components + candidate narrowing | 避免全表 N² |
| `src/mobs.js` | current 8 mob definitions/loot/xp | 不等于完整 registry |
| `src/passive-mobs.js` | local passive spawn/AI/update | PR #124 只产生 semantic `onSound` ambient/hurt/death event；不直接拥有 WebAudio |
| `src/hostile-mobs.js` | local hostile AI/attack/burn/fuse/update | 同上；PvE authority仍未迁 server |
| mob model specs/renderer | source-textured compatible cuboid geometry | texture provenance 与 reconstructed geometry provenance 分开 |
| projectile/explosion systems | local simulation/presentation | multiplayer server authority 尚待实现 |

## Multiplayer authority

| 模块 | 职责 | 约束 |
|---|---|---|
| control/view/action frame modules | strict realtime schemas | 不信任 client target/device identity |
| handshake/sequence/session | transport lifecycle + replay guards | semantic domains 独立 sequencing |
| multiplayer movement/bootstrap | authoritative snapshot barrier + interpolation | local camera 可响应，position 来自 server |
| authoritative presentation channels | Inventory/Equipment/Crafting/Mining/PvP/Furnace reconciliation | reconnect/release 不污染新 session |
| `server/start.mjs` + runtime | production Node composition | one explicit authority lifecycle |
| server terrain/world session | deterministic base + sparse mutable overlay | generated base / mutable edits 分离 |
| inventory/equipment/crafting/furnace hubs | authoritative state/revisions | mutation only through validated transactions |
| survival/creative block-use controllers | placement + till/strip/flatten | survival 成功 world mutation 后 wear；creative no wear |
| PvP authority | HP/target/cooldown/mitigation/knockback/death/respawn | dead state 禁止非法 action/pickup |

仍非 server authority：mobs/PvE/projectiles/explosions、XP/levels、durable world/container persistence、accounts/rooms/operator identity、广泛 replicated SFX。

## Tests / CI

| 路径 | 职责 |
|---|---|
| `scripts/run-logic-checks.mjs` | 自动发现 logic regressions |
| `scripts/check-*.mjs` | pure/contract/Worker/server integration checks |
| `tests/e2e/*.spec.mjs` | real Chromium integration |
| `playwright.config.mjs` | browser runner/sharding |
| `.github/workflows/quality.yml` | Node syntax/logic + 2 Chromium shards |
| `docs/TESTING.md` | exact-head gate policy |

测试数量不作为长期常量；每个 delivery 只记录其 exact HEAD 的实际结果。

## Documentation authority

| 路径 | 职责 |
|---|---|
| `README.md` | user/developer overview |
| `CHANGELOG.md` | Unreleased/release chronology |
| `docs/PROJECT_BASELINE.md` | merged main facts only |
| `docs/MINECRAFT_1_20_1_FEATURE_MATRIX.md` | parity/roadmap authority |
| `docs/PROGRESS.md` | active delivery dashboard |
| `docs/ARCHITECTURE.md` | architecture/authority boundaries |
| `docs/TESTING.md` | quality gate policy |
| `docs/FILE_MANIFEST.md` | 本文件 |

文档规则：parity-changing PR 同步 matrix；资源 availability 与 runtime implementation 分开描述；Ready/merge 只认最终 exact HEAD 的完整 quality gate。
