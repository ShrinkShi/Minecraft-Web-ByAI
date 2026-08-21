# 文件职责清单

本文不是仓库 `ls` 的复制品，而是**架构责任清单**：列出会影响玩法状态、authority、资源生命周期、原版资源 provenance 或下一阶段扩张方式的主要文件。完整目标/完成度见 `PROJECT_BASELINE.md` 与 `MINECRAFT_1_20_1_FEATURE_MATRIX.md`。

新增重要 subsystem 时应在同一个 PR 更新本文；普通 test fixture/小 helper 不要求逐文件登记。

## Product shell / presentation

| 路径 | 职责 | 约束 |
|---|---|---|
| `index.html` | 菜单、HUD、Inventory/Workbench、聊天、死亡界面、多人连接 DOM 壳 | 不承载 authoritative gameplay 规则 |
| `styles.css` / feature CSS | Minecraft 风格 UI 与 HUD/overlay | 不成为 gameplay truth；避免逐帧 layout |
| `src/ui.js` | Hotbar/Inventory/Crafting/Equipment/HUD DOM binding | multiplayer 只从 authoritative snapshot/result 渲染 |
| `src/death-screen.js` | 死亡覆盖层 DOM | 不决定掉落/重生规则 |
| `src/jade*.js` | crosshair inspection/presentation | read-only，不成为 target authority |

## Application/runtime composition

| 路径 | 职责 | 约束 |
|---|---|---|
| `src/main.js` | 浏览器应用状态机、单人/多人顶层 orchestration、单人交互入口 | 继续把纯规则/presentation 拆出，不吸收可独立 subsystem |
| `src/client-gameplay-runtime.js` | 构建和拥有共享 browser gameplay object graph | singleplayer/multiplayer 共用 world/player/client systems；dispose 必须释放 audio/visual/world resources |
| `src/device-profile.js` | mobile/desktop/orientation 判定 | 不进入 world/gameplay state |
| `src/control-intents.js` | canonical gameplay intent/state | desktop/touch/network 不得定义不同玩法 |
| `src/desktop-controls.js` / `src/mobile-controls.js` | 设备输入 → intent | 不修改 World/Inventory |

## World / blocks / rendering

| 路径 | 职责 | 约束 |
|---|---|---|
| `src/blocks.js` | block IDs/metadata/render classification/face fallback | ID append-only；player-created state 不得静默改写已有 seed bytes |
| `src/world.js` | chunk streaming、worker requests、edit overlay、mesh lifecycle、queries | GPU/CPU chunk resources必须显式 dispose |
| `src/terrain-generator.js` | browser/server deterministic terrain | worldgen 改动必须版本化并保持 shared source |
| `src/world-worker.js` | terrain Worker adapter | 不复制生成算法 |
| `src/mesh-worker.js` | legacy visible-face meshing + water + special/model descriptors | generic model path不得退化为一 block 一 Mesh |
| `src/minecraft-model-mesh-batch.js` | interpreted faces → chunk-level opaque/cutout/translucent TypedArrays | texture/layer/tint/cull 纯 callback 注入 |
| `src/bed-rules.js` / `src/bed-model-*` | bed state、partner、geometry、Three.js rendering | gameplay state 与 visual geometry 分离 |
| `src/weather-rules.js` / `src/weather-system.js` | weather pure rules + pooled renderer | fixed capacity、显式 dispose |

## Minecraft resource / model / asset pipeline

| 路径 | 职责 | 约束 |
|---|---|---|
| `MC原版素材assets.zip` / `MC原版素材assets/` | 用户提供的 Java 1.20.1 client resource tree | source input；存在资源不代表 runtime 已实现对应玩法 |
| `原版Minecraft音频文件/` | #122 导入的 Java 1.20.1 sound-object corpus、映射表和来源说明 | **source availability only**；不得把目录存在写成完整 audio parity |
| `src/asset-manifest.js` | logical runtime asset key → tracked source-backed URL | missing key fail closed；direct canonical binding 必须显式 audit |
| `src/minecraft-resource-id.js` | namespace/path 规范化 | traversal/非法 segment fail closed |
| `src/minecraft-model-resolver.js` | parent inheritance、textures、elements/faces | Node/browser-neutral；不操作 Three.js |
| `src/minecraft-blockstate-resolver.js` | variants/weights/rotation/uvlock/multipart | deterministic selection，不直接 `Math.random()` |
| `src/minecraft-model-geometry.js` | model elements → renderer-neutral faces | atlas/Three.js 不进入该层 |
| `src/minecraft-model-instance.js` | blockstate instance rotation/cull/uvlock | element rotation 与 instance rotation 分离 |
| `src/minecraft-model-texture-binding.js` | tracked model-atlas strict binding | 校验 provenance/pixel↔UV/packing |
| `assets/minecraft/runtime-manifest.json` | selective runtime subset/provenance | 与 model atlas contract 分离 |
| `assets/model-textures/*` | interpreted-model atlas + manifest | generated output 必须 deterministic |
| `tools/audit-minecraft-assets.py` | source archive deterministic audit | source hash/layout/probes 稳定 |
| `tools/import-minecraft-assets.py` | selective legacy runtime extraction | 不等于 dependency closure |
| `tools/build-minecraft-runtime-assets.py` | browser-ready runtime build | tracked output 可重建 |
| `tools/minecraft_model_closure.py` | blockstate→models→textures dependency closure | missing/cyclic/unsafe fail closed |
| `tools/minecraft_model_atlas.py` | closure→deterministic atlas | tracked PNG/JSON 必须逐字节可重建 |
| `.github/workflows/asset-source-audit.yml` | read-only source/reproducibility gate | `contents: read`，不得 self-push |

## Original audio subsystem

| 路径 | 职责 | 约束 |
|---|---|---|
| `src/vanilla-sounds.js` | source-backed Minecraft sound event→variant registry、object URL、OGG fetch/decode cache、trace | variant 必须绑定真实 SHA-1 + logical path；资源存在不等于事件已接入 |
| `src/vanilla-block-audio.js` | ordinary block transition break/place 与 local-player distance-driven step presentation | block→block tool mutation不误播 ordinary event；dispose 恢复 wrapped methods |
| `src/audio-system.js` | #121 interim procedural WebAudio fallback | 只服务尚未迁移的 swing/shoot/burn/prime/explosion 等；不得标记为 source-backed Minecraft audio |
| `scripts/check-vanilla-tool-sounds.mjs` | tool + current block sound variant/entity contract | 真实读取 OGG 并重算 SHA-1，不接受只校验字符串映射 |
| `tests/e2e/iron-hoe-secondary-action.spec.mjs` | live browser source-audio acceptance | 必须看到真实 OGG HTTP 200/body/decode，且失败 use 不重复发成功事件 |

当前 audio 边界仍是 **PARTIAL**：local/singleplayer tool/block subset 已 source-backed；multiplayer replicated edits、remote footsteps、entity/ambient/music/spatial audio 尚未完成。

## Inventory / items / crafting / progression

| 路径 | 职责 | 约束 |
|---|---|---|
| `src/items.js` | runtime item registry/metadata | #123 delivery boundary 为 40 IDs；source-backed/direct canonical provenance必须明确 |
| `src/item-stack.js` | item-instance normalize/damage/merge | singleplayer/multiplayer 共用语义 |
| `src/inventory.js` | 36 slots + cursor/snapshot | authoritative multiplayer 不做本地 truth |
| `src/equipment.js` | armor equipment slots | 与 Inventory 独立 state domain |
| `src/recipes.js` | current recipe matcher | #123 delivery boundary 为 14 recipes；仍远非全量 registry |
| `src/mining-rules.js` | mining speed/progress/harvest eligibility | browser/server shared |
| `src/tool-secondary-actions.js` | singleplayer/browser-neutral till/strip/flatten resolver | 只描述可变换目标/前置条件，不直接负责 durability/audio |
| `server/tool-secondary-action-rules.mjs` | server authoritative secondary-action resolver | 与 browser semantics 对齐；客户端 target 不可信 |
| durability/item rules | item-instance durability | UI 不预测 authoritative wear |

## Player / survival rules

| 路径 | 职责 | 约束 |
|---|---|---|
| `src/player.js` | browser player/camera/local movement | multiplayer position 不以本地 integrator 为 truth |
| orientation/motion/environment pure modules | camera-aligned movement、collision、水/ground queries | browser/server shared where applicable |
| `src/combat.js` / `src/melee-rules.js` | combat cooldown/damage/profile | 不把 hard interval 假装成完整 Java attack-strength curve |
| `src/armor-rules.js` | 当前基础 mitigation | 过渡公式，不声称 full parity |
| death/respawn/sleep/oxygen/swim rules | 对应 pure state transition | 不操作 UI/Three.js |
| XP/experience modules | level formula + orbs | multiplayer server-owned XP 尚未完成 |

## Entities / PvE visuals

| 路径 | 职责 | 约束 |
|---|---|---|
| `src/entity-store.js` / `src/spatial-hash.js` | entity identity/components + candidate narrowing | 避免全表 N² |
| `src/mobs.js` | current 8 mob definitions/loot/xp | 不等于完整 registry |
| passive/hostile mob systems | local spawn/AI/update | PvE authority 尚未迁到 server |
| projectile/explosion rules/systems | local projectile/explosion simulation | multiplayer server authority 尚待实现 |
| mob model specs/renderer | source-textured compatible cuboid geometry | texture provenance 与 reconstructed geometry provenance 分开 |

## Multiplayer client / server authority

| 路径/模块 | 职责 | 约束 |
|---|---|---|
| control/view/action frame modules | strict realtime input schemas | 不包含 trusted target/device identity |
| handshake/sequence/session modules | transport lifecycle + replay guards | 不同 semantic domain 独立 sequencing |
| multiplayer bootstrap/movement session | authoritative snapshot barrier/interpolation | local camera可响应，位置来自 authority |
| authoritative presentation channels | Inventory/Equipment/Crafting/Mining/PvP/Furnace reconciliation | reconnect/release 不污染新 session |
| `server/start.mjs` + runtime/config | production Node composition | one explicit authority lifecycle |
| server terrain/world session | deterministic base + sparse edits + fixed tick | generated base 与 mutable overlay 分离 |
| server Inventory/item/equipment/crafting hubs | authoritative state/revisions | mutation only through validated transaction/action |
| survival/creative block use controllers | authoritative placement + #123 till/strip/flatten | survival 成功 mutation 后才 wear；creative no wear |
| PvP combat authority | HP/target/cooldown/mitigation/knockback/death/respawn | dead state阻止非法 action/pickup |

当前仍不在 server authority 的大域：mobs/PvE/projectiles/explosions、XP/levels、durable world/container persistence、accounts/rooms/operator identity。

## Tests / CI

| 路径 | 职责 |
|---|---|
| `scripts/run-logic-checks.mjs` | 自动发现 logic regression |
| `scripts/check-*.mjs` | pure/contract/Worker/server integration regressions |
| `tests/e2e/*.spec.mjs` | real Chromium integration suites |
| `playwright.config.mjs` | browser test projects/sharding |
| `.github/workflows/quality.yml` | Node syntax/logic + 2-way Chromium gate |
| `docs/TESTING.md` | exact-head validation policy |

测试数量只作为某个 exact HEAD 的交付证据，不作为长期常量。#123 pre-doc head `c9bd6b9…` 的 Repository quality #941：shard 1 为 24/24，shard 2 为 23/23，均无 retry。

## Documentation authority

| 路径 | 职责 |
|---|---|
| `README.md` | user/developer overview |
| `CHANGELOG.md` | 版本/Unreleased 累积变更，不替代 roadmap |
| `docs/PROJECT_BASELINE.md` | 已合并 main 的权威事实 |
| `docs/MINECRAFT_1_20_1_FEATURE_MATRIX.md` | 1.20.1 parity/roadmap authority |
| `docs/PROGRESS.md` | current active delivery dashboard |
| `docs/ARCHITECTURE.md` | architecture/authority boundaries |
| `docs/TESTING.md` | quality gate/validation policy |
| `docs/FILE_MANIFEST.md` | 本文件：重要 subsystem/文件职责 |

文档规则：feature PR 改变 parity 时必须同步 matrix；source resource availability 与 runtime implementation 必须分别描述；只有 exact HEAD 的完整 CI 可以作为 Ready/merge 证据。
