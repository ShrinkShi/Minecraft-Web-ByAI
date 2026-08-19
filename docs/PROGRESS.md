# Minecraft Web - 当前开发进度

更新时间：2026-08-19

当前事实以 GitHub `main`、`docs/PROJECT_BASELINE.md`、`docs/MINECRAFT_1_20_1_FEATURE_MATRIX.md` 和当前交付 PR 的 exact head 为准。本文只维护正在进行的交付和紧邻的下一步，不重复完整功能矩阵。

## 当前主线

项目仍处于 `v0.4.0-dev`。严格按 Minecraft Java 1.20.1 完整玩法/内容口径，整体规划完成度继续保守维持约 **35%**。铁矿→粗铁→熔炉→铁锭已经从内容/多人基础进一步补到单人持久化玩法链，但这仍只是完整 Minecraft progression 的一个窄切片。

当前 `main`：

`896a270369343ad35e1647e1a0a1be316b86ab8c`

该 main 已包含：

- #111：shared furnace smelting foundation；
- #112：source-backed furnace block / furnace recipe / iron ingot content；
- #113：用户提供的 Minecraft Java 1.20.1 素材从 ZIP 展开为可追踪目录；
- #114 / #115：玩家与实体视觉回归修复；
- #116：authoritative multiplayer furnace container runtime，最终以 exact-head CI 全绿后 squash merge。

## 当前进行中：PR #117 Persistent singleplayer furnace runtime

PR：#117

分支：`content/v0.4-singleplayer-furnace-runtime`

该 PR 的目标不是再造第二套熔炉规则，而是把 #116 已验证的 Furnace world-cell state / smelting state machine 提升为单人和多人共用的 deterministic core，再把单人 authority 接到现有 Inventory、IndexedDB world save 和 XP 系统。

### #117 当前实现

1. Shared Furnace core
   - `FurnaceContainerState` / `FurnaceContainerHub` 从 server-only 模块提升为 `src/` 共享状态机；
   - server 保留兼容 re-export，因此 #116 的 authoritative runtime 不需要复制实现；
   - input/fuel/output、burn/cook timer、stored XP、revision、serialize/restore、break drain 仍由同一规则维护。

2. Backend-neutral Furnace presentation channel
   - Furnace UI 的 snapshot/result/close/sender 生命周期不再要求 authority 一定来自 WebSocket server；
   - multiplayer API 保留兼容别名，避免破坏 #116 的浏览器/网络链；
   - 单人 runtime 可以驱动同一 Java 1.20.1 Furnace GUI，而不是维护第二套 UI。

3. Singleplayer Furnace runtime
   - 生存/创造模式右键 `BLOCK.FURNACE` 打开现有 Furnace GUI；
   - 本地 Inventory cursor 与 input/fuel/output 事务相连；
   - item-instance metadata 使用共享 item-stack 规则，不因进入 Furnace 丢耐久等实例字段；
   - 单人 Furnace 以 20 Hz 游戏 tick 推进，同时使用 active wall-frame time 补偿渲染 `dt` 的 50 ms physics cap，避免低 FPS 浏览器把熔炼速度拖慢；
   - wall-frame catch-up 只接受不超过 0.5 秒的活动帧间隔，多秒页面挂起不会被误当成“离线烧炼”；
   - GUI close 不删除 world-cell Furnace state，并在关闭前把 transient Inventory cursor 归还背包；背包满时溢出物进入真实掉落物链；
   - Furnace 方块被破坏时 drain 剩余物品进入现有单人掉落物链；
   - 取出产物时把 stored smelting XP 通过 Java 风格 fractional materialization 接入现有 `totalXp` / level 系统。

4. IndexedDB world persistence
   - 单人 world record 从 version 6 升到 version 7；
   - 新增 `furnaces` world-cell state 数组；
   - world load 后恢复 Furnace slots/timers/revision/stored XP；
   - restore 严格校验 Furnace record 自身结构，但不会把未加载 chunk 的 `getBlock()==0` 当作“方块已经不存在”的证据，避免误删远处合法 Furnace 状态；
   - 正常 Furnace 方块破坏通过 runtime 的 `break` 生命周期删除对应状态；结构损坏或重复的 Furnace record 会被丢弃并使存档重新标记 dirty；
   - 本地 `Inventory.snapshot()` 现在把可选 `cursor` 与 slots 一并写入 world record，legacy slots-only 存档仍可恢复；因此 Furnace 打开期间的 autosave 也不会写出“Furnace output 已取走、但 cursor 没保存”的半事务状态；
   - 显式关闭 Furnace 仍会把 cursor settle 回普通背包槽位，因此 save/re-enter 后不依赖重新打开 GUI 才能找回产物。

5. Validation contract
   - `check-singleplayer-furnace-runtime.mjs` 覆盖 persistence、未加载 chunk 恢复、cursor 收尾、smelting、fractional XP、close/reopen 和 block-break drain；
   - `check-singleplayer-furnace-frame-clock.mjs` 模拟 10 FPS + 50 ms physics dt cap，要求 10 秒活动墙钟时间仍完成一个 200-tick 熔炼，并要求 5 秒挂起不会瞬间完成下一次熔炼；
   - `check-inventory-item-instances.mjs` 锁定本地 Inventory snapshot/restore 对 cursor 和耐久元数据的持久化，同时兼容旧 slots-only world save；
   - `singleplayer-furnace.spec.mjs` 走真实 `DesktopControls → secondaryAction → raycast → Furnace UI`，验证燃烧中保存/重新进入、恢复进度、2 个粗铁→2 个铁锭、stored XP→单人经验、同步 close/reopen、Furnace 打开时 autosave 直接持久化 cursor，以及显式关闭后的 cursor settle/save/reload；
   - 旧 authoritative Furnace、workbench、world-save smoke 回归继续保留；
   - 最终合并只认 **最终 exact branch HEAD** 的 syntax、完整 logic/server/Worker 与两路 Chromium 结果，任何较早 head 的绿灯都不能继承。

## #117 仍然不是“完整 Minecraft 熔炉”

以下边界继续保留为未完成：

- **多人 XP 仍不是 server-owned domain。** #117 只把 Furnace XP 接回单人现有经验系统；#116 production server 仍不能声称 authoritative multiplayer Furnace extraction 已正确增加玩家经验。
- **服务器 Furnace 持久化仍是进程内存。** 单人 IndexedDB 已持久化 Furnace，但 production multiplayer server 还没有 durable world/container save backend。
- **动态 `facing` / `lit` block state 仍缺失。** 当前 voxel cell 主要保存 numeric block ID，Furnace world model 仍不是完整 Java block-state parity。
- **离线时间推进未实现。** 单人退出世界、页面长时间挂起后 Furnace 不按真实离线时长补烧；当前 wall-frame 补偿只解决正常活动状态下低 FPS 对 20 Hz tick 的拖慢。
- **完整 chunk/block-entity tick 策略尚未抽象。** 当前记录中的 Furnace 随单人世界 loop 推进，尚不是 Java 风格按 loaded chunk 管理的通用 block-entity scheduler。
- **2×2/3×3 本地 crafting input grid 的 crash-time persistence 仍不是本 PR 的完成项。** #117 只把 Inventory cursor 与 Furnace world-cell state 做成一致的 world-save 事务，不应把所有临时容器都宣称为 durable。
- smokers / blast furnaces / hopper automation / broad vanilla smelting recipe & fuel registry / recipe book 仍缺失。
- chest / barrel 等第二种持久共享容器仍未实现，不能把“容器系统”标为 DONE。

## #117 收口门槛

只有以下条件同时满足才允许 Ready + squash merge：

1. 单人右键必须走真实输入/targeting 路径，不使用测试专用直接-open 后门；
2. 单人 Furnace 使用与 server 相同的 shared state/smelting rules；
3. IndexedDB save/reload 必须保留 world-cell slots/timers/stored XP，并且不能因 chunk 尚未加载而误删合法记录；
4. Furnace 打开期间 autosave 必须同时保存 Inventory cursor，不能产生“容器已扣物品、cursor 未持久化”的半事务 world record；
5. output XP 必须进入现有单人 XP 系统，不能把 0.7 直接 `Math.floor()` 成 0；
6. block break 必须 drain Furnace contents，不能复制或吞物品；
7. 正常活动状态下 Furnace 20 Hz 时间基准不能随浏览器渲染 FPS 降速，同时多秒页面挂起不得被当成离线烧炼；
8. exact branch HEAD JavaScript syntax + 完整 logic/server/Worker 全绿；
9. exact branch HEAD 两路 Chromium jobs 全绿，persistent singleplayer Furnace E2E 必须实际执行；
10. feature matrix 与本文同步真实 parity，不把 remaining boundaries 写成已完成。

## #117 合并后的下一步

### 1. Iron progression continuation

优先把“得到铁锭”推进成真正有用途的早期生存 progression：

- iron pickaxe；
- iron axe / shovel / sword / hoe；
- iron armor；
- 对应 durability / mining tier / combat / armor / recipes；
- coal ore + coal item + coal fuel 单独作为涉及 terrain/world compatibility 的后续交付，不和纯工具内容混在同一个 PR。

### 2. Authoritative multiplayer XP foundation

建立 server-owned XP/level domain，至少覆盖：

- Furnace output XP；
- 后续 authoritative PvE kill XP；
- death XP settlement/drop；
- snapshot / persistence / reconnect contract。

在该 domain 落库前，不允许把多人经验写成 DONE。

### 3. Durable world / block-entity infrastructure

- production server world save；
- Furnace durable restore；
- generic block-entity/state storage；
- loaded-chunk / scheduled tick 生命周期；
- chest / barrel shared persistent containers；
- 然后再推进 hopper、redstone、农业等依赖系统。

### 4. Broader world/content parity

- caves / biome pipeline / structures；
- copper / gold / redstone / lapis / diamond 等矿业链；
- hunger / food / crops / breeding；
- server-authoritative PvE / projectiles / explosions；
- Nether / End；
- audio source 可用后再建设声音与音乐系统。

## 工程规则

- 每个交付 PR 只认 exact branch HEAD 的 CI；
- feature PR 改变 parity 状态时必须在同一 PR 更新 feature matrix；
- gameplay state、renderer state、collision state、server authority 和 persistence 分层；
- 单人/多人共用 deterministic gameplay core，但各自 authority backend 不混淆；
- source-backed assets 必须可重建、可验证 provenance；
- 一条 progression 能跑通不等于 Java 1.20.1 全内容 parity 完成。
