# 开发进度

## 权威口径

- 当前开发线：`v0.4.0-dev`。
- Progress Baseline 起点：`main` commit `dbdd6a2b632b6a14b9232806bcbf6a9ccea74113`。
- 严格 Minecraft Java 1.20.1 完整复刻规划完成度：约 **35%**。
- Web Minecraft 引擎/基础玩法底座完成度：约 **75–80%**。
- 当前实现事实以 [`PROJECT_BASELINE.md`](PROJECT_BASELINE.md) 为准。
- 全量目标与状态以 [`MINECRAFT_1_20_1_FEATURE_MATRIX.md`](MINECRAFT_1_20_1_FEATURE_MATRIX.md) 为准。
- 只有已经合并到 `main` 且交付 head 质量门通过的功能才允许记为完成。

## 阶段切换

项目已经从“v0.4 技术底座建设”为主，切换到“Minecraft 1.20.1 大规模内容接入”为主。

今后不再按“想到一个方块/功能就手工实现一个”的方式扩张。先建立可以批量解释原版资源、批量注册内容、批量验证的基础设施，然后成批扩展 block/item/world content。

## Progress Baseline 重建结果

本轮已经完成文档 authority 收口：

- [x] 从当前 `main` 恢复权威 baseline SHA。
- [x] 新建 `docs/PROJECT_BASELINE.md`。
- [x] 新建 `docs/MINECRAFT_1_20_1_FEATURE_MATRIX.md`。
- [x] README 改为当前真实产品/玩法口径。
- [x] PROGRESS 改为 active dashboard，不再重复维护全部历史。
- [x] ARCHITECTURE 对齐当前 authoritative multiplayer / asset pipeline / special-model 边界。
- [x] TESTING 对齐 auto-discovered logic regressions + 两个 Chromium shards + asset audit。
- [x] FILE_MANIFEST 更新为当前 architecture responsibility map。
- [x] CHANGELOG 的 `Unreleased` 从早期 v0.4 快照重整为真实累计状态，同时保留 0.1/0.2/0.3 release history。
- [x] 文档明确：历史 PR body / changelog 不再作为当前 TODO authority。

交付 PR 的 exact-head CI/run ID 记录在 PR body，不把瞬时 CI run number 写进长期 PROGRESS。

## 已确认完成的关键底座

### Client / Runtime

- [x] 单一 desktop/mobile Web runtime；`ControlIntentBus` 统一输入语义。
- [x] 桌面 Pointer Lock + 键鼠；移动端 landscape touch controls。
- [x] 第一/第三人称视角。
- [x] 16×16×64 chunk streaming。
- [x] terrain Worker + mesh Worker。
- [x] chunk-level merged opaque/water mesh。
- [x] special bed visual 绑定 chunk lifecycle。
- [x] 显式 chunk/GPU resource disposal。
- [x] pinned/self-hosted Three.js runtime。
- [x] IndexedDB 单人增量存档。

### Gameplay / Survival

- [x] 36-slot Inventory + hotbar + cursor/Shift/right-click stack semantics。
- [x] 2×2 player crafting + 3×3 Workbench。
- [x] 木镐挖掘速度/harvest/durability。
- [x] HP / damage / hurt cooldown / knockback。
- [x] death settlement / DeathScreen / explicit respawn。
- [x] recoverable item + XP death drops。
- [x] persistent custom respawnPoint。
- [x] two-block red bed placement / respawn / sleep / hostile safety。
- [x] red-bed texture-backed partial world visual。
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
- [x] PR #94 delivery gate baseline: 131 logic/worker regressions + both browser shards green。
- [x] PR #96 model resolver foundation: strict resource IDs + parent/texture/element semantics；exact-head 132 regression scripts + both browser shards green。

## 当前主要内容量瓶颈

- gameplay block families 仍只有约 11 类。
- runtime item IDs 约 28；recipes 5。
- tool progression 只有 wooden pickaxe 真正进入完整挖掘/耐久闭环。
- worldgen 仍是 deterministic fBm heightmap + basic surface/sea/oak tree。
- mobs/PvE/projectiles/explosions 仍主要是 client gameplay domain；multiplayer authoritative PvE 尚未完成。
- supplied asset ZIP 没有 sound files / `sounds.json`，AudioEngine 是明确 blocked domain。

## 当前任务：Minecraft JSON blockstate/model interpreter

这是下一阶段最高优先级，不与手工大规模加方块并行。

### A. Resource/model resolver — merged in PR #96

- [x] 定义 Minecraft resource identifier/path resolver。
- [x] 解析 model `parent` inheritance。
- [x] 合并/覆盖 `textures` variables，并在完整 inheritance reduction 后解析 face texture。
- [x] 解析 `elements` cuboids。
- [x] 解析 per-face texture / uv / cullface / tintindex / rotation。
- [x] 解析 element rotation origin / axis / angle / rescale。
- [x] parent cycle / missing model / missing texture / texture-variable cycle fail-closed。
- [x] Node-pure fixtures + tracked original `grass_block.json` regression。

### B. Blockstate resolver — PR #97

- [x] `variants` property matching；empty variant 和 subset predicate 均有明确语义。
- [x] weighted model alternatives；默认 weight=1，拒绝 0/非法权重。
- [x] model x/y 0/90/180/270 rotation + `uvlock` normalization。
- [x] `multipart` unconditional / property AND / `OR` / explicit `AND` / `a|b` alternatives。
- [x] deterministic weighted selection：解释器不调用 `Math.random()`，只消费 caller-provided uint32 selection。
- [x] tracked original `grass_block.json` blockstate：`snowy=false` 四方向 Y variants + `snowy=true` model。
- [x] tracked original `crafting_table.json` empty variant。

### C. Mesh/runtime integration — next

- [ ] normal model cuboids 编译为 mesh-worker 可消费的纯数据 spec。
- [ ] full-cube 保留现有 fast path，避免性能退化。
- [ ] logical resource texture binding。
- [ ] omitted face UV derivation + element/model rotations + uvlock geometry semantics。
- [ ] opaque / cutout / transparent layer contract。
- [ ] visual geometry 与 collision shape 独立。
- [ ] chunk remesh/unload 生命周期完整。
- [ ] Chromium HTTP decode/model construction coverage。

### 第一批 acceptance blocks

- [ ] `iron_ore`：普通 full cube registry/import。
- [ ] `glass`：透明 full cube。
- [ ] `oak_slab`：非满高 cuboid。
- [ ] `oak_stairs`：多 cuboid + state。
- [ ] `oak_door`：上下两格 + facing/open/hinge。
- [ ] `oak_fence`：multipart/neighbor state。
- [ ] `torch`：non-full model。
- [ ] grass/foliage representative tint-index contract。

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
- 不把 Java Edition 的旧技术实现问题作为兼容目标。