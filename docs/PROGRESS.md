# Minecraft Web - 当前开发进度

更新时间：2026-08-19

当前事实以 GitHub `main`、`docs/PROJECT_BASELINE.md`、`docs/MINECRAFT_1_20_1_FEATURE_MATRIX.md` 和当前交付 PR 的 exact head 为准。本文只维护正在进行的交付和紧邻的下一步，不重复完整功能矩阵。

## 当前主线

项目仍处于 `v0.4.0-dev`。严格按 Minecraft Java 1.20.1 完整玩法/内容口径，整体规划完成度继续保守维持约 **35%**；近期工作只补齐铁矿→粗铁→熔炉→铁锭这条 progression 的一个窄切片，不因此虚增整体百分比。

当前 `main`：

`1d8b7dffb5b04bcf244ffcc40eb200f31073f8be`

该 main 已包含：

- #111：authoritative furnace smelting foundation；
- #112：source-backed furnace block / furnace recipe / iron ingot content；
- #113：将用户提供的 Minecraft 原版素材从 ZIP 展开为目录树；
- #114 / #115：玩家与实体视觉回归修复。

因此旧文档里“没有 furnace block / iron ingot / furnace recipe”的描述已经过时。

## 当前进行中：PR #116 Authoritative furnace container runtime

PR：#116

分支：`content/v0.4-furnace-container-runtime`

已审查的核心代码 head：

`f097b2a5baf780d43f29f8570ca0928d170e7287`

在此基础上又补了一条真实多人浏览器 E2E，用于覆盖浏览器→WebSocket→server furnace→snapshot/UI 的整条集成链；最终是否可合并只认该后续 exact head 的 CI。

### #116 已实现

1. Strict furnace wire contract
   - furnace snapshot / forced close / transaction result；
   - world-cell `{x,y,z}` 作为容器 identity；
   - inventory revision + furnace revision 双重 stale-write 防护；
   - transaction request 独立 sequence gate。

2. Server-authoritative furnace runtime
   - 服务器拥有 input / fuel / output、燃料时间、cook progress 和 stored smelting XP；
   - 20 Hz server tick 推进 furnace state；
   - 纯 timer progress 不人为抬高 container revision；
   - 燃料实际消耗、产物生成、槽位变更才推进 revision；
   - GUI close 只移除 viewer，不清空 world-cell furnace state；
   - 方块被移除时强制关闭 viewers，并 drain contents 进入服务器掉落物链。

3. Shared-viewer replication
   - 同一个 world-cell furnace 可有多个 viewer；
   - state mutation / timer progress 向当前 viewers 广播；
   - 距离过远、方块被移除、模式非法或玩家死亡会由服务器强制关闭。

4. Browser presentation
   - 使用仓库中的 Java 1.20.1 furnace GUI texture；
   - input / fuel / output 与服务器事务相连；
   - burn / cook progress 可显示同 revision 的 timer-only snapshot；
   - furnace modal 与 Pointer Lock、Inventory、Workbench 的 panel 生命周期衔接。

5. Validation coverage
   - furnace controller / real WebSocket runtime / strict wire / content / smelting foundation logic checks 已进入自动发现集合；
   - 原 #116 code head 的 logic/server/Worker 集合为 **156 scripts passed**；
   - Chromium shard 1/2 的 furnace content 与 authoritative furnace UI 测试通过；
   - shard 2/2 job 成功，但现有 `multiplayer-survival-mining` presentation test 出现一次 retry 后通过的 flaky，不能把它描述成“完全无抖动”；
   - 后续新增真实多人 furnace browser E2E 后，必须重新以新的 exact head CI 为准，旧绿灯不得继承。

## #116 仍然不是“完整 Minecraft 熔炉”

以下边界必须保留为未完成状态：

- **单人 furnace container/runtime 尚未绑定。** #116 的用户交互链是多人 authoritative 路径；单人右键 furnace 仍需要复用同一 smelting state engine，而不是再造第二套规则。
- **没有 durable server save backend。** furnace hub 有 world-cell persistence 与 serialize/restore contract，但当前 production server 的炉状态仍只在进程内存中。
- **动态 `facing` / `lit` block state 尚未实现。** 当前 voxel cell 仍主要保存 numeric block ID；source-backed furnace world model 仍不能宣称拥有完整 Java block-state parity。
- **多人 furnace XP 尚未接入 authoritative player XP。** controller 能从 output 结算 stored smelting XP，但 production `server/runtime.mjs` 当前没有 server-owned player XP domain，因此不能声称多人取出铁锭已正确增加经验。
- 没有 smokers / blast furnaces / hopper automation / recipe breadth / recipe book。
- 没有 chest 等第二种 persistent shared container，不能因为 furnace 一条链就把“共享容器系统”标成 DONE。

## #116 收口门槛

只有以下条件同时满足才允许 Ready + squash merge：

1. feature matrix 同步 #112 与 #116 的真实状态；
2. 新增真实多人 furnace browser E2E；
3. exact branch HEAD JavaScript syntax + logic/server/Worker 全绿；
4. exact branch HEAD 两路 Chromium jobs 成功；
5. 不存在未说明的 item duplication / loss、viewer leak、stale revision、block-break drain 回归；
6. PR 描述明确列出 singleplayer、durable save、dynamic block state、multiplayer XP 的剩余边界。

## #116 合并后的下一步

### 1. Singleplayer furnace parity

优先把现有 `FurnaceState` / smelting rules 接入单人世界：

- 右键打开同一 furnace UI；
- input/fuel/output transaction；
- world-cell state 随单人 save 持久化；
- close/reopen 保留 slots/timers；
- block break drain/drop；
- output XP 接回现有单人经验系统；
- 不复制一套与 server 不同的 smelting 规则。

### 2. Authoritative multiplayer XP foundation

如果继续扩展多人 survival progression，需要把 XP/level 从当前客户端生存系统迁移出一个 server-owned domain，至少覆盖：

- furnace output XP；
- PvE/后续 server mob kill XP；
- death XP settlement；
- snapshot / persistence / reconnect contract。

在该 domain 落库前，不要用 no-op callback 冒充“多人经验已完成”。

### 3. Iron progression continuation

- iron pickaxe；
- 后续 iron tools / iron armor；
- coal fuel 与 coal ore；
- copper / gold / redstone / lapis / diamond 等矿业链。

### 4. World / container infrastructure

- durable server world + furnace persistence；
- chest / barrel shared container；
- block-entity/state storage；
- neighbor updates / scheduled ticks，随后再推进 hopper/redstone/农业。

## 工程规则

- 每个交付 PR 只认 exact branch HEAD 的 CI；
- feature PR 改变 parity 状态时必须在同一 PR 更新 feature matrix；
- source-backed assets 必须可重建、可验证 provenance；
- gameplay state、renderer state、collision state、server authority 分层，不因视觉能显示就宣称玩法完成；
- 单人/多人共用 deterministic rules/state machine，客户端 presentation 不持有 authoritative truth；
- 基础设施完成或一条 progression 能跑通，不等于 Java 1.20.1 全内容 parity 完成。
