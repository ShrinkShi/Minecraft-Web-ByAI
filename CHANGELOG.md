# Changelog

## [Unreleased]

> 2026-08-16 documentation baseline: this section records the accumulated v0.4 state through the generic Minecraft model/resource pipeline. Detailed per-PR chronology remains available in Git history/Pull Requests; current roadmap truth lives in `docs/MINECRAFT_1_20_1_FEATURE_MATRIX.md` and active implementation state in `docs/PROGRESS.md`.

### Project baseline / documentation

- 建立 `docs/PROJECT_BASELINE.md`，固定当前 `main` 的可验证实现事实、资产来源、authority 边界和完成度口径。
- 建立 `docs/MINECRAFT_1_20_1_FEATURE_MATRIX.md`，以 `DONE / PARTIAL / FOUNDATION / TODO / BLOCKED` 维护完整 Minecraft Java 1.20.1 parity roadmap；严格完整复刻规划完成度基线约 35%。
- README、PROGRESS、ARCHITECTURE、TESTING、FILE_MANIFEST 重新对齐当前代码，不再把历史 PR 的 out-of-scope 自动当作今天的 TODO。
- `docs/PROGRESS.md` 改为 active dashboard；以后所有改变 Minecraft parity 的 PR 必须同步 feature matrix。
- generic Minecraft model pipeline 进入架构责任清单，明确 pure resolver/compiler、deterministic assets、Worker batching 与 Three.js runtime 的分层边界。

### Client / runtime / platform

- PC/手机输入收口到统一 `ControlIntentBus`；Desktop/Touch 只是适配器，共享一个 World/Player/Inventory/gameplay runtime。
- 手机浏览器支持 landscape touch 控件、portrait rotate overlay、safe-area；桌面继续使用 Pointer Lock。
- F5 第一/第三人称视角路径保持统一。
- 修复 camera yaw 与 WASD/raycast 的水平符号一致性。
- 浏览器安全控制调整：double-W sprint 保留，hold sprint 改为 `R`，不再把 Ctrl 作为 intended sprint 键。
- Three.js 固定为 `0.169.0` production dependency，并通过 `prepare:static` 提供 same-origin `vendor/three.module.js`；运行时不再依赖历史 jsDelivr Three.js URL。
- `createClientGameplayRuntime()` 抽出共享 browser gameplay object graph，为 singleplayer/multiplayer 复用同一渲染/世界对象奠定边界。

### World / rendering / environment

- chunk streaming、terrain Worker、mesh Worker、TypedArray/Transferable 和显式 unload/dispose 继续作为世界底座。
- terrain generator 抽成 browser/server 共用 deterministic pure module；Node server 使用同一 seed/prompt→voxel mapping。
- 水从 opaque chunk mesh 拆为独立 transparent pass；增加氧气、溺水、基础游泳/浮力。
- 加入 pooled rain/thunder precipitation renderer；当前仍没有自动天气周期、雪、闪电实体/伤害或完整水体传播。
- 修复工作台 cardinal face texture mapping。
- 两格红床不再使用红 tint full-cube visual：PR #94 将床标记为 special/non-full-cube render，mesh Worker 输出 special descriptors，`BedModelRenderer` 使用导入的 Java 1.20.1 `entity/bed/red.png` 构建 partial red-bed visual，并绑定 chunk remesh/unload 生命周期。
- PR #96–#100 建立 renderer-neutral Minecraft block model 解释/编译链：resource IDs、parent/texture inheritance、blockstate variants/multipart、cuboid geometry、element/model rotation、`uvlock`、cull/tint 以及 chunk-level `opaque/cutout/translucent` TypedArray batching。
- generic model batching明确保持 chunk-level shared buffers/material contract，不允许退化为“一 block 一 Three.js Mesh”。

### Survival / Inventory / crafting

- 完整 36-slot Inventory + 9-slot hotbar；cursor left/right/merge/split/place-one/Shift transfer。
- Equipment head/chest/legs/feet 四槽与第一版皮革护甲减伤。
- 2×2 player crafting + 3×3 Workbench；当前配方集包括 planks、sticks、crafting table、red bed、wooden pickaxe。
- 建立 shared mining rules、harvest tool tier foundation 和 wooden-pickaxe durability/item-instance lifecycle。
- durability 从 authoritative item stack damage 渲染到 hotbar/Inventory/Crafting UI；singleplayer/multiplayer mining 都进入明确耐久消费路径。
- survival/adventure 死亡清算 Inventory/cursor/Crafting/Equipment；普通死亡生成可回收 item/XP，虚空死亡不可回收。
- 独立 DeathScreen、显式 respawn、`/kill`、`/xp`、持久化 `/spawnpoint`。
- 两格床支持四方向 foot/head、原子放置、partner cleanup、respawn anchor、night skip 和 nearby-hostile sleep safety。
- 水下 15 秒 oxygen、drowning damage、三点 coverage swimming/buoyancy。

### Entities / combat

- `EntityStore + SpatialHash` 实体/空间底座。
- 当前 gameplay mobs：cow、sheep、pig、chicken、zombie、skeleton、creeper、spider。
- 单人基础 AI、Combat、skeleton arrows、creeper explosion、mob loot + XP orb/level progression。
- PR #93 将八种现有 mob 从程序化纯色视觉替换为 imported Minecraft Java 1.20.1 texture-backed cuboid models；sheep wool 使用独立 overlay material。
- mob geometry 是基于已验证 texture sheet 的 vanilla-compatible reconstruction；资源 ZIP 不包含 `.bbmodel` 或 Java entity model-layer geometry data，因此不伪称 geometry 从 ZIP 提取。

### Multiplayer / server authority

v0.4 已从协议前置发展为真实 Node authoritative server/runtime：

- strict WebSocket subprotocol/Origin/hello/session/input envelope；
- independent semantic sequence/replay gates；
- 20 Hz server-authoritative player movement/collision；
- browser bootstrap + authoritative snapshot interpolation；
- public remote player identity、replication、rendering/despawn；
- browser/server shared deterministic terrain；
- server mutable sparse world edit overlay；
- initial world edit sync + live revisioned block replication；
- server-authoritative targeting、creative break/place；
- survival continuous mining、server mining progress、crack presentation；
- survival placement with transactional Inventory consumption；
- authoritative ground item entities、Q drop、pickup、lifetime；
- authoritative Inventory snapshots and slot/cursor transactions；
- item-instance durability replication；
- authoritative Equipment dual-revision transactions；
- authoritative 2×2 player crafting；
- authoritative 3×3 Workbench container；
- authoritative chat channel and controlled command channel；
- browser-native multiplayer timer binding fix；
- PR #90 完成第一阶段 server-authoritative PvP：HP/death revision、melee targeting、solid-block occlusion、cooldowns、armor mitigation、knockback、death drops、dead-player action/pickup guards 和 server respawn。

真实 WebSocket/Chromium 回归已覆盖多条双客户端 authoritative 路径。

### Minecraft Java 1.20.1 resource integration

- 建立 logical `asset-manifest.js`，runtime 不再把 resource path 散落为隐式真相。
- 仓库跟踪 `MC原版素材assets.zip`；deterministic audit 识别 7,623 files，约包含 977 block textures、582 item textures、497 entity textures、2,016 block model JSON、1,675 item model JSON、1,005 blockstates。
- source archive 中没有 `.bbmodel`，这是 vanilla Java resource tree 的正常结果；entity geometry 不能从 texture/resource JSON 伪造 provenance。
- source archive 中 **没有 sound files，也没有 `sounds.json`**，因此音效/音乐仍是明确 blocked domain。
- selective importer/build pipeline 将当前 gameplay 所需 block/item/entity resources 导入 runtime，并保留 source/runtime checksum/provenance。
- terrain atlas 迁移为 Minecraft 1.20.1 original texture subset；当前没有 runtime biome tint，因此 grass/foliage/water compatibility 使用明确记录的 default/Plains tint 处理。
- 导入 current item textures、iron-ore/white-wool atlas tiles、red-bed entity texture、八种 current mob texture sheets。
- red bed inventory icon 仍是明确的程序化临时 SVG：source archive 没有 standalone `textures/item/red_bed.png`，不能把不存在的资源伪装成已导入原版 item icon。
- PR #101 建立 deterministic blockstate/model parent/texture dependency closure；unsafe/ambiguous/missing/cyclic source dependency fail-closed，并为每个文件保留 SHA-256/provenance。
- PR #102 从第一批 9 个 acceptance block roots 自动得到 9 blockstates / 42 models / 14 textures / 0 metadata 的 65-file closure，生成并跟踪独立 128×128 model texture atlas 与 manifest；CI 从 source ZIP 重建并逐字节比较 tracked PNG/JSON，workflow 保持 `contents: read`。
- model atlas 与 legacy 4×4 terrain atlas 保持独立，避免 generic model expansion 改写既有 tile-ID fast-path contract。
- PR #103 增加 strict model-atlas runtime resolver/binding：校验 canonical resource path、source provenance、SHA metadata、pixel region↔normalized UV、closure texture count、power-of-two/gutter/packing contract，并直接适配 #100 chunk batcher 的 texture-binding callback；render-layer policy 仍由 caller 注入。

### Engineering quality

- `npm run test:logic` 已改为 `scripts/run-logic-checks.mjs` 自动发现回归，不再维护容易漂移的手工串联列表。
- `Repository quality`：Node 22 syntax + logic/server/Worker regressions，再运行两个 Chromium shards；同 ref 新 push 会取消旧 run。
- Minecraft assets 另有 read-only deterministic source audit；最终 workflow 不保留 self-push 权限。
- browser failures 保留 Playwright trace/screenshot/report artifacts。
- logic regression 数量不再作为长期固定常量；每个 delivery PR 只记录 exact HEAD 当时自动发现并通过的实际数量。

### Current major limitations

- Minecraft content breadth 仍是主要缺口：当前正式 gameplay block families 约 11 类、runtime item IDs 约 28、recipes 5。
- generic blockstate/model **纯语义与 atlas/batching 基础已经存在**，但尚未把预解析 model templates 正式接入 `mesh-worker.js` / `VoxelWorld`，因此大量原版 blocks 还没有进入 gameplay registry/worldgen。
- worldgen 仍是 16×16×64 deterministic fBm heightmap + basic surface/sea/oak tree，不是 vanilla biome/cave/ore/feature/structure pipeline。
- hunger/saturation、完整 food/farming/smelting/tool progression、enchanting/brewing/status effects 尚未完成。
- mobs/PvE/projectiles/explosions 仍不是 multiplayer server-authoritative domain。
- durable multiplayer world/player persistence、rooms/accounts/operators、persistent shared containers、reconnect/resume 未完成。
- redstone、Nether、End、boss progression 尚未实质实现。
- audio source/AudioEngine 尚未实现，因为当前 supplied archive 没有声音资源。

## [0.3.0] - 2026-08-11

### Added
- 真实 36 格 Inventory 数据模型，快捷栏直接映射背包最后 9 格。
- 背包左键、右键、Shift 点击、cursor stack 操作语义。
- 2×2 配方匹配：原木→木板、木板→木棍、工作台。
- 可放置工作台方块，以及右键工作台打开 3×3 合成界面。
- 3×3 木镐配方。
- 方块掉落物实体、重力/轻微弹跳、拾取、5 分钟销毁。
- Q 丢弃当前快捷栏物品。
- 圆石方块和“石头需要镐才能获得掉落”的基础采集规则。
- F5 第一人称 / 第三人称背面 / 第三人称正面切换，并加入轻量方块人形占位模型。
- 聊天输入与 `/gamemode`、`/give`、`/tp`、`/time set`、`/weather`、`/help`。
- 24000 tick 昼夜环境光变化和天气光照状态。
- `scripts/check.mjs` 核心逻辑/Worker 回归检查。
- `.github/workflows/quality.yml` GitHub Actions 质量门。
- `docs/TESTING.md` 自动测试能力和浏览器端验证边界记录。

### Changed
- IndexedDB 存档版本升级为 v3，加入背包、时间、天气和视角状态。
- 生存模式不再默认获得整排无限建材；创造模式保留快速测试用初始物品。
- 方块破坏会经过掉落实体再拾取，而不是只有视觉消失。

### Known limitations
- 工作台正面目前仍按统一 side 纹理渲染，没有方块朝向 blockstate。
- 木镐耐久元数据尚未进入物品栈。
- `/weather rain` 在 v0.3.0 仍只改变环境光和天空，没有降雨粒子/湿润效果。

## [0.2.0] - 2026-08-11

### Added
- 玩家移动驱动的动态 chunk streaming，世界不再固定为出生点周围 5×5 区块。
- IndexedDB 世界存档：保存玩家状态和程序化世界的增量方块修改。
- `mesh-worker.js`：将暴露面扫描、顶点/UV/法线/索引构建从渲染主线程迁出。
- Worker mesh 使用精确长度 TypedArray 与 Transferable buffers。
- mesh 请求去重队列，限制重复边界重建造成的任务堆积。
- 重新进入相同“世界名称 + seed”时恢复玩家位置和已修改方块。
- `docs/FILE_MANIFEST.md` 文件职责与生命周期记录。

### Changed
- 默认渲染距离提升为 3 chunks，并增加 1 chunk 卸载滞回区。
- 自动保存采用节流策略；暂停、页面隐藏以及“保存并返回标题”会请求保存。
- debug HUD 增加 mesh queue 指标。

### Performance
- 主线程不再执行逐 voxel 网格顶点生成循环。
- 离开活动范围的 chunk 会释放 `BufferGeometry` 和 CPU 区块数组，避免世界探索时间与常驻内存无限线性增长。
- 存档不复制完整程序化 chunk，只保存被修改 voxel 的差异。

## [0.1.0] - 2026-08-11

### Added
- 建立可直接在 GitHub Pages 运行的静态 Web 游戏入口。
- 建立 Three.js 第一人称体素渲染与世界主循环。
- 使用 Web Worker 生成区块地形，避免地形生成阻塞渲染主线程。
- 使用 TypedArray 保存区块数据，按区块合并可见面生成 BufferGeometry。
- 加入基础方块破坏/放置、AABB 碰撞、跳跃、疾跑与创造模式移动。
- 加入主菜单、世界创建、暂停、HUD、快捷栏和物品栏基础 UI。
- 从用户提供资源中抽取必要基础纹理并制作小型纹理 atlas。
- 加入架构与进度文档。