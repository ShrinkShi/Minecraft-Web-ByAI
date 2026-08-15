# 开发进度

## 权威口径

- 当前开发线：`v0.4.0-dev`。
- 本轮 Progress Baseline 基于 `main` commit `dbdd6a2b632b6a14b9232806bcbf6a9ccea74113`。
- 严格 Minecraft Java 1.20.1 完整复刻规划完成度：约 **35%**。
- Web Minecraft 引擎/基础玩法底座完成度：约 **75–80%**。
- 当前实现事实以 [`PROJECT_BASELINE.md`](PROJECT_BASELINE.md) 为准。
- 全量目标与状态以 [`MINECRAFT_1_20_1_FEATURE_MATRIX.md`](MINECRAFT_1_20_1_FEATURE_MATRIX.md) 为准。
- 只有已经合并到 `main` 且交付 head 质量门通过的功能才允许记为完成。

## 当前阶段

项目已从“v0.4 技术底座建设”为主，切换到“Minecraft 1.20.1 大规模内容接入”为主。

当前不再按“想到一个方块/功能就手工实现一个”的方式扩张。下一阶段的核心原则是先建立可以批量解释原版资源、批量注册内容、批量验证的基础设施。

## 已确认完成的关键底座

### Client / Runtime

- [x] 单一 desktop/mobile Web runtime；`ControlIntentBus` 统一输入语义。
- [x] 桌面 Pointer Lock + 键鼠；移动端 landscape touch controls。
- [x] 第一/第三人称视角。
- [x] 16×16×64 chunk streaming。
- [x] terrain Worker + mesh Worker。
- [x] chunk-level merged opaque/water mesh。
- [x] 显式 chunk/GPU resource disposal。
- [x] pinned/self-hosted Three.js runtime。
- [x] IndexedDB 单人增量存档。

### Gameplay / Survival

- [x] 36-slot Inventory + hotbar + cursor/Shift/right-click stack semantics。
- [x] 2×2 player crafting + 3×3 workbench。
- [x] 木镐挖掘速度/harvest/durability。
- [x] HP / damage / hurt cooldown / knockback。
- [x] death settlement / DeathScreen / explicit respawn。
- [x] recoverable item + XP death drops。
- [x] persistent custom respawnPoint。
- [x] two-block red bed placement / respawn / sleep / hostile safety。
- [x] bed partial red entity-texture visual through chunk special rendering。
- [x] leather Equipment + basic mitigation。
- [x] water render pass / oxygen / drowning / basic swimming/buoyancy。
- [x] rain/thunder visible FX。
- [x] XP orbs and level formulas。

### Entities

- [x] EntityStore + SpatialHash foundation。
- [x] cow / sheep / pig / chicken gameplay slices。
- [x] zombie / skeleton / creeper / spider gameplay slices。
- [x] arrow projectile and creeper explosion foundations。
- [x] first loot/XP tables。
- [x] all eight current mobs use imported Minecraft Java 1.20.1 texture-backed cuboid models。

### Multiplayer authority

- [x] strict WebSocket handshake/session/input protocol。
- [x] server-authoritative movement/collision at 20 Hz。
- [x] remote player replication + interpolation/rendering。
- [x] shared deterministic terrain on browser/server。
- [x] initial + live authoritative world edits。
- [x] authoritative creative/survival mining and placement。
- [x] authoritative mining progress + crack presentation。
- [x] authoritative ground item entities + pickup。
- [x] item-instance durability wire/state path。
- [x] authoritative Inventory + carried cursor transactions。
- [x] authoritative Equipment transactions。
- [x] authoritative 2×2 crafting。
- [x] authoritative 3×3 Workbench container。
- [x] authoritative chat + command channel。
- [x] authoritative PvP melee, HP, mitigation, knockback, death drops and respawn。
- [x] real two-browser E2E coverage for important multiplayer paths。

### Assets / Quality

- [x] logical runtime asset manifest。
- [x] tracked Minecraft 1.20.1 source archive audit。
- [x] deterministic selective import/build/checksum pipeline。
- [x] original block/item subset integrated into runtime atlas/assets。
- [x] original texture sheets for eight implemented mobs。
- [x] original red-bed texture in world rendering。
- [x] Repository quality gate + sharded Chromium browser smoke。
- [x] PR #94 delivery gate: 131 logic/worker regressions + both browser shards green。

## 当前内容量瓶颈

### Blocks

正式 gameplay block families 仍然只有约 11 类：grass/dirt/stone/sand/oak planks/oak log/oak leaves/water/crafting table/cobblestone/red bed。

导入资源已经远多于 runtime registry，但尚无通用 blockstate/model interpreter，因此大量 block models/blockstates 不能直接变成可玩的方块。

### Items / Recipes

- runtime item IDs：28。
- recipes：5。
- tool progression 只有 wooden pickaxe 真正进入完整挖掘/耐久闭环。

### Worldgen

当前仍是 deterministic fBm heightmap + basic surface + sea + oak tree。没有真正的 biome / cave / ore / feature / structure pipeline。

### PvE Authority

当前 mobs、hostile AI、projectiles、explosions 仍主要是 client gameplay 系统。多人已经有 authoritative PvP，但 server-authoritative PvE 尚未完成。

### Audio

当前 supplied asset ZIP 中没有 sound files 或 `sounds.json`。音效/音乐需要额外资源源，因此 AudioEngine 暂时是 blocked domain。

## 当前任务：Progress Baseline 重建

目标：消除旧 README/PROGRESS 与真实 `main` 的状态漂移，并把未来 roadmap 固定为可维护矩阵。

- [x] 从当前 `main` 恢复权威 SHA。
- [x] 新建 `docs/PROJECT_BASELINE.md`。
- [x] 新建 `docs/MINECRAFT_1_20_1_FEATURE_MATRIX.md`。
- [x] README 重写为当前真实功能口径。
- [x] PROGRESS 改为短期 active dashboard，不再重复维护整套历史。
- [ ] ARCHITECTURE 对齐当前 authoritative multiplayer / asset interpretation 下一阶段边界。
- [ ] CHANGELOG 增加本轮 baseline/documentation reset 记录。
- [ ] FILE_MANIFEST / TESTING 检查是否仍含明显失真条目。
- [ ] exact-head quality gate。
- [ ] PR review surface clear 后 squash merge。

## 下一任务：Minecraft JSON blockstate/model interpreter

Baseline PR 合并后立即开始，不与其它内容扩张并行手工堆叠。

### 第一阶段：格式/解析边界

- [ ] 定义 resource identifier/path resolver。
- [ ] 解析 block model `parent` inheritance。
- [ ] 合并/覆盖 `textures` variables。
- [ ] 解析 `elements` cuboids。
- [ ] 解析 per-face texture/uv/cullface/tintindex/rotation。
- [ ] 解析 element rotation origin/axis/angle/rescale。
- [ ] 检测 parent cycle / missing model / missing texture。
- [ ] Node-pure fixtures 和 golden tests。

### 第二阶段：blockstate

- [ ] `variants` property matching。
- [ ] weighted model alternatives。
- [ ] x/y model rotation + uvlock。
- [ ] `multipart` conditions / OR / AND。
- [ ] deterministic model selection inputs。

### 第三阶段：render/mesh integration

- [ ] 将普通 model cuboids 编译为 mesh-worker 可消费的纯数据 spec。
- [ ] 支持 atlas/resource texture binding。
- [ ] 保留 full-cube fast path，非 cube 才走 model interpreter，避免性能退化。
- [ ] 建立 transparent/cutout/render-layer 分类边界。
- [ ] 建立 model/collision independence，避免把视觉几何错误当碰撞盒。
- [ ] Chromium 解码/构建 representative models。

### 第一批 acceptance blocks

优先选择能覆盖模型解释器能力、同时对后续内容扩张有价值的一组 representative blocks，而不是一次盲目导入全部 1.20.1：

- [ ] iron_ore：普通 full cube registry/import 验证；
- [ ] glass：透明 full cube；
- [ ] oak_slab：非满高 cuboid；
- [ ] oak_stairs：多 cuboid + state；
- [ ] oak_door：上下两格 + facing/open/hinge；
- [ ] oak_fence：multipart/neighbor state；
- [ ] torch：非 full cube / texture model；
- [ ] grass/foliage representative tint index contract。

这批通过后再启动 broad block/item registry batch import。

## 后续批准路线

1. Minecraft JSON blockstate/model interpreter；
2. broad block/item registry + batch original resource integration；
3. survival progression：stone/iron/gold/diamond/netherite tools、ores、furnace、food、farming、breeding；
4. worldgen：biome → caves → ores → vegetation/features → structures → vertical expansion；
5. server-authoritative mobs/PvE/projectiles/explosions；
6. persistent shared containers：chest/furnace first；
7. neighbor updates + scheduled ticks + redstone；
8. Nether → portal → brewing/enchanting → End → bosses；
9. AudioEngine + audio source；
10. lighting/particles/animated textures/biome tint/skins/nameplates；
11. rooms/auth/operators/reconnect/Realms-like product shell and remaining settings/accessibility/mobile polish。

## 维护规则

- 不再把旧 PR body 中的 “follow-up/out of scope” 自动当成当前 TODO；必须先检查 matrix 和 `main`。
- 每个改变 Minecraft parity 的 PR 必须同步更新 feature matrix。
- 普通架构 groundwork 默认只能标 `FOUNDATION`/`PARTIAL`，不能因为有文件/协议就标 `DONE`。
- 不为扩大内容量牺牲已有 server-authoritative 边界、determinism、Worker isolation 或 resource lifecycle。
- 不把 Java Edition 的旧技术实现问题（渲染 API、单线程热点、无界资源生命周期等）作为兼容目标。