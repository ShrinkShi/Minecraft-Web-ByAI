# 文件职责清单

本文不是仓库 `ls` 的复制品，而是**架构责任清单**：列出会影响玩法状态、authority、资源生命周期或下一阶段扩张方式的主要文件。完整目标/完成度见 `PROJECT_BASELINE.md` 与 `MINECRAFT_1_20_1_FEATURE_MATRIX.md`。

新增重要 subsystem 时应在同一个 PR 更新本文；普通 test fixture/小 helper 不要求逐文件登记。

## Product shell / presentation

| 路径 | 职责 | 约束 |
|---|---|---|
| `index.html` | 菜单、HUD、Inventory/Workbench、聊天、死亡界面、多人连接等 DOM 壳 | 不承载 authoritative gameplay 规则 |
| `styles.css` | 基础 Minecraft 风格 UI | 避免逐帧 layout 工作 |
| `mobile.css` | landscape touch UI、portrait rotate overlay、safe-area | 只负责 presentation |
| `armor.css` / `oxygen.css` / `death.css` | 对应 HUD/overlay 表现 | 不成为 gameplay truth |
| `src/ui.js` | Hotbar/Inventory/Crafting/Equipment/HUD DOM binding | multiplayer authoritative state 只从 snapshot/result 渲染 |
| `src/death-screen.js` | 死亡覆盖层 DOM 状态 | 不决定掉落/重生规则 |
| `src/jade.js` / Jade 相关规则 | crosshair target 信息展示 | read-only，不成为 target authority |
| command completion 模块 | slash command suggestion/completion | 只影响输入体验，不绕过 command authority |

## Application/runtime composition

| 路径 | 职责 | 约束 |
|---|---|---|
| `src/main.js` | 浏览器应用状态机、菜单/单人/多人入口、顶层 gameplay orchestration | 不继续吸收可独立纯化的规则；设备输入不在此分叉玩法 |
| `src/client-gameplay-runtime.js` | 构建/拥有共享 browser gameplay object graph | singleplayer/multiplayer 复用 renderer/world/client systems；authority 决策在 adapter 层 |
| `src/device-profile.js` | mobile/desktop + orientation 环境判定 | 不进入 world/gameplay state |
| `src/control-intents.js` | 统一 canonical gameplay intent/state | desktop/touch/gamepad/network 不得定义不同玩法 |
| `src/desktop-controls.js` | Keyboard/Mouse/Pointer Lock → intent | 不修改 World/Inventory |
| `src/mobile-controls.js` | touch/joystick/buttons → intent | 不实现独立移动/战斗规则 |

## World / blocks / rendering

| 路径 | 职责 | 约束 |
|---|---|---|
| `src/blocks.js` | 当前 block IDs/metadata/render classification/face tiles | gameplay registry 仍很小；下一阶段应由更通用 registry/model pipeline 扩张 |
| `src/world.js` | browser chunk streaming、worker requests、edit overlay、mesh install/dispose、queries | chunk lifecycle 是 opaque/water/special/model visuals 的 owner；GPU resource 必须显式 dispose |
| `src/terrain-generator.js` | browser/server 共用 deterministic terrain generation | worldgen 升级时必须保持 shared deterministic source |
| `src/world-worker.js` | terrain Worker adapter | 只包装纯 generator，不复制算法 |
| `src/mesh-worker.js` | 当前 chunk visible-face meshing + water + special descriptors | legacy full-cube fast path 必须保留；generic model 接入不得退化为一 block 一 Mesh |
| `src/minecraft-model-mesh-batch.js` | interpreted model face → chunk-level `opaque/cutout/translucent` TypedArray batches | texture/layer/tint/cull 通过纯 callback 注入；Worker 可 transferable；禁止 per-block material/Mesh |
| `src/bed-rules.js` | bed facing/foot/head/partner/anchor metadata | gameplay state 与 visual geometry 分离 |
| `src/bed-model-specs.js` | bed cuboid/UV/facing pure spec | Node-testable，不依赖 Three.js |
| `src/bed-model-renderer.js` | texture-backed red-bed Three.js adapter/cache | 跟随 chunk/world lifecycle dispose |
| `src/weather-rules.js` | rain/thunder pure profiles | 不操作 Three.js/DOM |
| `src/weather-system.js` | pooled precipitation renderer | 固定容量/显式 resource disposal |

## Minecraft resource / model / asset pipeline

| 路径 | 职责 | 约束 |
|---|---|---|
| `MC原版素材assets.zip` | 用户提供的 Minecraft Java 1.20.1 client resource tree | source archive；存在资源不代表 runtime gameplay 已支持 |
| `src/asset-manifest.js` | logical runtime asset key → tracked source-backed runtime URL | 不允许 missing key 静默伪造“原版资源”；legacy terrain atlas 与 generic model atlas 是独立资源契约 |
| `src/minecraft-resource-id.js` | Minecraft namespace/resource path 规范化与 browser asset path helpers | traversal/非法 segment fail-closed；model/blockstate/texture 层共用 |
| `src/minecraft-model-resolver.js` | parent inheritance、texture variables、elements/faces 的纯 model 语义解析 | Node/browser-neutral；loadModel 注入；不操作 Three.js/DOM/Worker |
| `src/minecraft-blockstate-resolver.js` | variants/weights/x-y/uvlock/multipart 条件解析与确定性选择 | caller 提供 deterministic selection；不调用 `Math.random()` |
| `src/minecraft-model-geometry.js` | normalized elements → renderer-neutral cuboid faces/UV/normals/bounds | element rotation/rescale 在此处理；atlas 和 Three.js 不进入该层 |
| `src/minecraft-model-instance.js` | blockstate model-instance x/y transform、cullface rotation、UV/uvlock | element rotation 与 model-instance rotation 分离 |
| `src/minecraft-model-texture-binding.js` | tracked model-atlas manifest strict validator/resolver + #100 textureBinding adapter | 校验 canonical path/provenance/pixel↔UV/packing；render layer policy 由 caller 注入 |
| `assets/minecraft/runtime-manifest.json` | 现有 selective runtime subset/provenance metadata | 与 generated model atlas contract 分离 |
| `assets/model-textures/model-texture-atlas.png` | interpreted model 第一批 acceptance texture atlas | 128×128/1px gutter；由 source closure 确定性重建 |
| `assets/model-textures/model-texture-atlas.json` | model texture ID → pixel/normalized region + provenance | runtime resolver 的数据输入；不承担 block render-layer policy |
| `tools/audit-minecraft-assets.py` | source ZIP deterministic inventory/audit | source hash/layout/probes 必须稳定 |
| `tools/import-minecraft-assets.py` | selective legacy runtime resource extraction | 只导入明确 runtime subset；不等于 model dependency closure |
| `tools/build-minecraft-runtime-assets.py` | legacy browser-ready runtime assets build | 输出需可重建、checksum 可比 |
| `tools/minecraft_model_closure.py` | blockstate → model parents → textures/metadata dependency closure | unsafe/ambiguous/missing/cyclic resource fail-closed；输出 provenance |
| `tools/minecraft_model_atlas.py` | dependency closure → deterministic model texture atlas + manifest | 生成物必须与 tracked PNG/JSON 逐字节一致；当前 animated/non-square texture fail-closed |
| `.github/workflows/asset-source-audit.yml` | read-only source/resource/atlas reproducibility gate | `contents: read`；不得 self-push；legacy runtime subset 与 model atlas 分别校验 |

当前 generic model 纯语义链已经到达 `blockstate/model → geometry → instance transform → chunk batching → tracked atlas binding`。下一步才允许把**预解析/缓存后的** model template 接入 Worker/VoxelWorld；chunk rebuild 热路径不得递归加载/解释 parent JSON。

## Inventory / items / crafting / progression

| 路径 | 职责 | 约束 |
|---|---|---|
| `src/items.js` | 当前 runtime item registry/metadata | 当前约 28 IDs；床 world texture 已 source-backed，但 inventory bed icon 仍是明确的临时 SVG，因为 source 中无 standalone red-bed item PNG |
| `src/item-stack.js` | item-instance normalization/identity/damage/merge rules | multiplayer/singleplayer 共用 item-instance semantics |
| `src/inventory.js` | 36 slots + cursor/stack movement/snapshot | authoritative multiplayer 时只应用 server state |
| `src/equipment.js` | head/chest/legs/feet slots | 与 Inventory 独立 state domain |
| `src/recipes.js` | current recipe matching + CraftingGrid | 当前 5 recipes；后续需扩 broad registry/recipe content |
| `src/mining-rules.js` | shared mining speed/progress/harvest eligibility | browser/server 共用 semantics |
| tool-tier 规则模块 | tool tier rank/minimum harvest contracts | progression foundation，不等于完整工具内容已实现 |
| durability display/rules 模块 | item-instance durability presentation | UI 不能预测 authoritative wear |

## Player / survival rules

| 路径 | 职责 | 约束 |
|---|---|---|
| `src/player.js` | browser Player/camera/local movement adapter | multiplayer position 不由本地 integrator 作为 truth |
| `src/player-orientation-rules.js` | camera-aligned yaw movement/raycast basis | shared pure rule |
| `src/player-motion-rules.js` | platform-neutral motion planning | browser/server 共享 |
| `src/player-environment-rules.js` | AABB collision/water/ground query rules | environment 通过 callbacks 注入 |
| `src/combat.js` | cooldown/hurt/damage/knockback pure rules | presentation-independent |
| `src/armor-rules.js` | 当前基础 armor mitigation | 仍是过渡公式，不声称 Java full parity |
| `src/death-rules.js` | death loss/XP/recoverability | 不操作 UI |
| `src/respawn-rules.js` | preferred spawn normalization/safety candidate ordering | world safety由调用方提供 |
| `src/sleep-rules.js` | sleep window/quorum | multiplayer-ready pure rule，不等于完整 sleep system |
| `src/sleep-safety-rules.js` | nearby hostile blocker volume | 与 respawn Y offset 分离 |
| `src/oxygen-rules.js` | air/drowning state transitions | transient state |
| `src/swim-rules.js` | water coverage/movement modifiers | coverage=0 必须不污染 dry movement |
| XP/experience modules | level formulas + orb system | enchanting 等尚未实现 |

## Entities / PvE visuals

| 路径 | 职责 | 约束 |
|---|---|---|
| `src/entity-store.js` | entity identity/components/position store | 与 spatial index 分离 |
| `src/spatial-hash.js` | X/Z candidate narrowing | 避免全表 N² 查询 |
| `src/mobs.js` | current 8 mob definitions/loot/xp | 不是完整 vanilla registry |
| passive/hostile mob systems | local spawn/AI/update orchestration | 当前 PvE 主要仍是 client gameplay domain |
| `src/projectile-rules.js` / projectile system | arrow trajectory/hit/runtime | multiplayer server authority 尚待迁移 |
| explosion rules/system | simplified creeper explosion | multiplayer server authority 尚待迁移 |
| `src/mob-model-specs.js` | 8 current species cuboid/UV/pivot pure specs | geometry provenance 与 texture provenance 分开 |
| `src/mob-model-renderer.js` | Three.js texture-backed mob model builder/cache | shared texture/material resources必须 dispose |

## Multiplayer client protocol

| 路径/模块 | 职责 | 约束 |
|---|---|---|
| control/view/action frame modules | strict platform-neutral realtime input schemas | 不包含 trusted target/device identity |
| network sequence/session modules | uint32 ordering/replay guards | 不同 semantic domain 独立 sequencing |
| handshake/WebSocket client | secure-by-default transport/session lifecycle | malformed/stale/unknown messages fail closed |
| multiplayer bootstrap | world-info/world edits/required snapshot synchronization barrier | ready 前不进入 gameplay |
| movement session | input bridge + authoritative player interpolation + remote state plumbing | local camera look可响应；位置来自 authority |
| remote player system | other-player model/interpolation lifecycle | public playerId 与 transport session identity 分离 |
| authoritative presentation channels | Inventory/Equipment/Crafting/Mining/PvP 等 browser reconciliation | sender release/reconnect 不得污染新 session |

## Server runtime / authority

| 路径/模块 | 职责 | 约束 |
|---|---|---|
| `server/start.mjs` | production Node server entrypoint | env config + graceful shutdown |
| server runtime/config modules | compose HTTP/WS + world + state hubs | one explicit authoritative runtime lifecycle |
| multiplayer server transport | Upgrade/Origin/subprotocol/session/input validation | untrusted client boundary |
| player input state | accepted control/view/action history/queues | bounded memory + independent replay gates |
| player simulation | fixed 20 Hz authoritative movement/collision | browser不能提交 position/velocity |
| server terrain world | deterministic terrain + sparse authoritative edits | generated base 与 mutable overlay 分离 |
| authoritative world session | player tick/world/session lifecycle | single scheduler owner |
| remote player replication hub | public identity + snapshot/despawn broadcast | 不暴露 transport session as public identity |
| server Inventory hub/state | slots/cursor/revisions | mutation only through validated transactions |
| server item entity hub | ground items/gravity/pickup/lifetime | simulation 每 authoritative world tick 执行一次 |
| survival mining/use controllers | server raycast/mining/placement | client target 不可信 |
| Equipment authority | equipment + Inventory dual-revision transactions | cross-domain atomicity |
| player crafting authority | permanent 2×2 state | server derives recipe output |
| Workbench authority | transient 3×3 server container | block identity/reach/container id validated |
| chat authority | server-derived sender + ordering/rate limit | session identity不是账户身份 |
| command authority | whitelisted server mutations + permission flag | 当前开关不是 OP/auth system |
| PvP combat authority | HP/cooldown/targeting/mitigation/knockback/death/respawn | dead state blocks inappropriate actions/pickup |

当前 **不** 在 server authority 的大域：mobs/PvE/projectiles/explosions、durable multiplayer persistence、persistent shared block containers、accounts/rooms/operator identity。

## Tests / CI

| 路径 | 职责 |
|---|---|
| `scripts/run-logic-checks.mjs` | auto-discover logic regression entrypoint |
| `scripts/check-*.mjs` | pure/contract/Worker/server integration regressions |
| `tests/e2e/*.spec.mjs` | real Chromium integration suites |
| `playwright.config.mjs` | browser test projects/sharding settings |
| `.github/workflows/quality.yml` | Node syntax/logic + 2-way Chromium shard quality gate |
| `docs/TESTING.md` | validation rules/exact-head policy |

测试数量只作为某个 exact HEAD 的交付证据，不作为长期固定常量；新增 `check-*.mjs` 会由 runner 自动发现。

## Documentation authority

| 路径 | 职责 |
|---|---|
| `README.md` | user/developer overview，不维护 exhaustive TODO |
| `docs/PROJECT_BASELINE.md` | 当前 main 的权威实现事实 |
| `docs/MINECRAFT_1_20_1_FEATURE_MATRIX.md` | 1.20.1 parity/roadmap authority |
| `docs/PROGRESS.md` | current active work dashboard |
| `docs/ARCHITECTURE.md` | current architecture/authority boundaries |
| `docs/TESTING.md` | quality gate/validation policy |
| `docs/NETWORKING.md` | networking protocol design/invariants |
| `docs/SERVER.md` | Node authoritative server run/security boundary |
| `CHANGELOG.md` | chronological historical record，不作为当前 TODO authority |

## Manifest maintenance rule

- 新增架构级模块/authority domain/model pipeline 时必须更新本文件。
- 文件职责变化时更新原行，不在末尾重复追加矛盾描述。
- 历史一次性 patch scripts/workflows 不允许留在 delivery tree。
- 临时生成工具若只是迁移手段，应在 final diff 删除；稳定 reproducibility 工具才进入长期 manifest。