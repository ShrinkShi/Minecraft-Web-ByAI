# Changelog

## [Unreleased]

> 2026-08-21 documentation baseline: this section records the accumulated v0.4 state through PR #122 and the in-progress #123 delivery. Detailed per-PR chronology remains available in Git history/Pull Requests; current roadmap truth lives in `docs/MINECRAFT_1_20_1_FEATURE_MATRIX.md` and active implementation state in `docs/PROGRESS.md`.

### 2026-08-21 — original audio corpus and tool-action delivery

- PR #122 将单独提供的 Minecraft Java 1.20.1 原版音频对象集、映射表和来源说明导入仓库，解除“没有 sound objects”的资源阻塞；这只代表 source availability，不等于完整 SFX/music runtime 已实现。
- PR #123 新增 source-backed `iron_hoe`、标准/镜像工作台配方、250 durability，以及 append-only `farmland` / `dirt_path` / `stripped_oak_log` gameplay states。
- till / strip / flatten 使用共享确定性 secondary-action rules；survival 只有真实 world mutation 成功后才 wear，creative authoritative path 不 wear。
- singleplayer 与 authoritative server use-controller 对齐 grass/dirt tilling、oak-log stripping、grass/dirt path flattening 行为边界。
- `item.hoe.till`、`item.axe.strip`、`item.shovel.flatten` 首批接入真实 Java 1.20.1 OGG；CI 读取对象并重算 SHA-1，Chromium E2E 要求真实 HTTP fetch/decode。
- 新增 `vanilla-block-audio`：当前 grass/gravel/stone/sand/wood/glass gameplay sound types 获得 source-backed break/place/step；脚步按真实水平位移累计，不按帧率触发。
- ordinary break/place 不会因 block→block tool mutation 误响；explosion 批量删块显式静音，避免同时启动大量 break OGG；两格床避免重复 ordinary sound。
- 当前 source-backed audio 仍是窄范围 PARTIAL：multiplayer replicated edit SFX、remote footsteps、完整 entity/ambient/weather sound、spatial attenuation 和 music scheduling 尚未实现。

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
- 后续交付已把 selected source-backed model roots 正式接入 mesh Worker / VoxelWorld；当前仍只是有限 gameplay registry，并非完整 Java block registry。

### Survival / Inventory / crafting

- 完整 36-slot Inventory + 9-slot hotbar；cursor left/right/merge/split/place-one/Shift transfer。
- Equipment head/chest/legs/feet 四槽与第一版皮革护甲减伤。
- 2×2 player crafting + 3×3 Workbench；当前配方随 v0.4 progression 已扩展到 14 条，包括 wood/stone/iron tools/weapons、bed、furnace 等当前内容。
- 建立 shared mining rules、harvest tool tier foundation 和 item-instance durability lifecycle。
- durability 从 authoritative item stack damage 渲染到 hotbar/Inventory/Crafting UI；singleplayer/multiplayer mining 和现有 tool/weapon wear 都进入明确路径。
- survival/adventure 死亡清算 Inventory/cursor/Crafting/Equipment；普通死亡生成可回收 item/XP，虚空死亡不可回收。
- 独立 DeathScreen、显式 respawn、`/kill`、`/xp`、持久化 `/spawnpoint`。
- 两格床支持四方向 foot/head、原子放置、partner cleanup、respawn anchor、night skip 和 nearby-hostile sleep safety。
- 水下 15 秒 oxygen、drowning damage、三点 coverage swimming/buoyancy。
- stone→iron progression 已形成石镐采铁矿→粗铁→Furnace→铁锭→铁镐/铁斧/铁锹/铁剑/铁锄的当前闭环。

### Entities / combat

- `EntityStore + SpatialHash` 实体/空间底座。
- 当前 gameplay mobs：cow、sheep、pig、chicken、zombie、skeleton、creeper、spider。
- 单人基础 AI、Combat、skeleton arrows、creeper explosion、mob loot + XP orb/level progression。
- PR #93 将八种现有 mob 从程序化纯色视觉替换为 imported Minecraft Java 1.20.1 texture-backed cuboid models；sheep wool 使用独立 overlay material。
- mob geometry 是基于已验证 texture sheet 的 vanilla-compatible reconstruction；资源 ZIP 不包含 `.bbmodel` 或 Java entity model-layer geometry data，因此不伪称 geometry 从 ZIP 提取。
- #121 增加第一人称 3D viewmodel、wood/stone swords、hit feedback、simplified hostile daylight burning、skeleton ranged presentation、creeper fuse 和 explosion effects。

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
- authoritative Furnace state/viewers/transactions；
- authoritative chat channel and controlled command channel；
- browser-native multiplayer timer binding fix；
- PR #90 完成第一阶段 server-authoritative PvP：HP/death revision、melee targeting、solid-block occlusion、cooldowns、armor mitigation、knockback、death drops、dead-player action/pickup guards 和 server respawn；
- #123 authoritative block use 增加 till / strip / flatten，survival success-only wear 与 creative no-wear 保持明确。

真实 WebSocket/Chromium 回归已覆盖多条双客户端 authoritative 路径。

### Minecraft Java 1.20.1 resource integration

- 建立 logical `asset-manifest.js`，runtime 不再把 resource path 散落为隐式真相。
- 仓库跟踪 `MC原版素材assets.zip`；deterministic audit 识别 7,623 files，约包含 977 block textures、582 item textures、497 entity textures、2,016 block model JSON、1,675 item model JSON、1,005 blockstates。
- 该原始 client resource archive 中没有 `.bbmodel`，entity geometry 不能从 texture/resource JSON 伪造 provenance。
- 该原始 archive 本身没有 sound files / `sounds.json`；但 #122 已从单独提供的 Java 1.20.1 音频对象输入建立并跟踪 `原版Minecraft音频文件/` corpus，因此原版音频 source 已不再 blocked。runtime parity 仍按已接入事件逐项计算。
- selective importer/build pipeline 将当前 gameplay 所需 block/item/entity resources 导入 runtime，并保留 source/runtime checksum/provenance。
- terrain atlas 迁移为 Minecraft 1.20.1 original texture subset；当前没有 runtime biome tint，因此 grass/foliage/water compatibility 使用明确记录的 default/Plains tint 处理。
- 导入 current item textures、iron-ore/white-wool atlas tiles、red-bed entity texture、八种 current mob texture sheets，以及当前 progression 所需 iron tools/weapons。
- red bed inventory icon 仍是明确的程序化临时 SVG：source archive 没有 standalone `textures/item/red_bed.png`，不能把不存在的资源伪装成已导入原版 item icon。
- PR #101 建立 deterministic blockstate/model parent/texture dependency closure；unsafe/ambiguous/missing/cyclic source dependency fail-closed，并为每个文件保留 SHA-256/provenance。
- PR #102 从 acceptance roots 构建 deterministic model texture atlas / manifest；CI 从 source 重建并比较 tracked PNG/JSON，workflow 保持 `contents: read`。
- model atlas 与 legacy terrain atlas 保持独立，避免 generic model expansion 改写既有 tile-ID fast-path contract。
- PR #103 增加 strict model-atlas runtime resolver/binding，并在后续内容 PR 中继续扩展 live model roots。
- #123 canonical `iron_hoe.png` 和 stripped-oak-log side/top textures 保留 direct binding audit；原版 OGG variant 同样按真实对象 SHA-1 约束。

### Engineering quality

- `npm run test:logic` 使用 `scripts/run-logic-checks.mjs` 自动发现回归，不维护易漂移的手工串联列表。
- `Repository quality`：Node 22 syntax + logic/server/Worker regressions，再运行两个 Chromium shards；同 ref 新 push 会取消旧 run。
- Minecraft assets 另有 read-only deterministic source audit；workflow 不保留 self-push 权限。
- browser failures 保留 Playwright trace/screenshot/report artifacts。
- logic regression 数量不作为长期固定常量；每个 delivery PR 只记录 exact HEAD 当时实际通过数量。
- #123 pre-doc exact head `c9bd6b9…` 的 Repository quality #941：static-checks success，Chromium shard 1 **24/24**、shard 2 **23/23**，均无 retry；失败 artifact 上传均 skipped。

### Current major limitations

- Minecraft content breadth 仍是主要缺口：#123 delivery boundary 约 17 个当前 gameplay block families/states、40 runtime item IDs、14 recipes，距离 Java 1.20.1 全 registry 仍极远。
- generic blockstate/model 语义、atlas/batching 与 selected live Worker/VoxelWorld roots 已存在，但 broad block registry、neighbor state、collision-shape breadth 仍缺失。
- worldgen 仍是 16×16×64 deterministic fBm heightmap + basic surface/sea/oak tree + simplified iron ore，不是 vanilla biome/cave/ore/feature/structure pipeline。
- hunger/saturation、完整 food/farming、iron armor、enchanting/brewing/status effects 尚未完成。
- mobs/PvE/projectiles/explosions 仍不是 multiplayer server-authoritative domain。
- durable multiplayer world/player persistence、rooms/accounts/operators、durable shared containers、reconnect/resume 未完成。
- redstone、Nether、End、boss progression 尚未实质实现。
- source-backed audio 只覆盖首批 tool/block events；完整 sound registry、entity/ambient/music/spatial audio 仍是大缺口。

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
