# Minecraft Web - 当前开发进度

更新时间：2026-08-23

## 当前主线

项目处于 `v0.4.0-dev`。严格按 Minecraft Java 1.20.1 完整玩法/内容口径，整体规划完成度仍保守维持约 **35%**。浏览器引擎、原版资源管线、单机生存基础和 authoritative multiplayer 骨架已经形成；完整 registry、原版 worldgen、redstone、dimensions、enchanting/brewing、status effects 与 server PvE 仍是主要缺口。

当前 merged `main`：

`2495bfad7b261ce0331fd49a20072bd2e25306f0`

merged main 已包含：

- PR #128 Wheat Farming Phase 1：farmland moisture 0..7、wheat age 0..7、种植/生长/成熟收获、canonical crop model/item、wheat → bread；
- PR #130 presentation repair：第一人称肩→腕持物层级、70° viewmodel FOV，以及 Inventory/Workbench 的 gameplay-HUD 模态表现；
- PR #129 Vegetation / Farming Phase 1.1：terrain v4 deterministic short grass、矮草 1/8 小麦种子 bootstrap、bone meal、canonical grass model closure 与 zero-hardness 植物快速破坏。

`docs/PROJECT_BASELINE.md` 只描述 merged main；当前未合并开发内容单独记录在下面。

## 当前进行中：PR #131 Hunger Phase 2 — timed / interruptible food use

分支：`feature/hunger-phase-2-use-duration`

基线：`main 2495bfad7b261ce0331fd49a20072bd2e25306f0`

本 PR 保持 Draft，最终只认 **exact-head CI**。

### 已实现

- Java-style food use duration 固定为 **1.6 s**；食物不再在右键 press edge 上瞬间消费；
- desktop right mouse 与 mobile Use 改为真实 secondary press/release 生命周期；
- `ControlIntentBus` 新增独立 held-secondary channel，但 `CONTROL_INTENT_VERSION=1` 与 multiplayer movement snapshot 结构保持不变；
- `SingleplayerFoodUseRuntime` 负责 start / update / cancel / exactly-once completion；
- 松开使用键、失去 gameplay control、暂停/打开面板、切换 hotbar、丢弃、开始 primary attack、切出 survival mode、手持物变化都会取消进行中的进食；
- completion 时先验证模式/手持 stack，再应用 hunger/saturation，并与 selected-stack removal 作为同一客户端事务收口；失败时恢复 hunger state，不产生半提交；
- 低 FPS 下 food-use duration 使用 wall-clock 补偿，不受 player physics `dt<=50 ms` 限幅拖慢；规则层仍保持显式 dt 状态机以便 deterministic testing；
- first-person action channel 新增 continuous food-use state；viewmodel 在整个 use duration 内获得 `foodUseProgress`，而不是只播放一次短 `use` pulse；
- multiplayer held-secondary press 已重新接回 server-authoritative `sendUse()` routing；release 不重复发送，secondary hold 仍不进入 movement wire state；
- multiplayer food/hunger 仍不做客户端假权威，直到 server 同时拥有 use duration、hunger、inventory consume 与 player snapshot；
- active food use 是 transient input state，不持久化，因此 singleplayer save schema 保持 v9，terrainVersion 保持 v4。

### 浏览器验收合同

`tests/e2e/hunger-food.spec.mjs` 现在锁定：

1. hotbar 中 `bread ×2`；
2. 按住 Use 约 0.7 s 时 runtime/viewmodel progress 可观察，但 count、hunger、saturation 不变；
3. 松开后 use state 变为 `released`，再等待也不能补吃；
4. 第二次连续按满 1.6 s 后才发生 `2→1`、hunger `10→15`、saturation `0→6`；
5. 满饥饿时立即拒绝新 food use，最后一个 bread 不消费；
6. 世界仍以 save schema v9 / terrain v4 持久化。

旧 bed / bone-meal browser tests 也已迁移为真实 `mousedown→mouseup` secondary click，以避免测试伪造“永远按住”的输入状态。

### Pure / runtime 回归

- `scripts/check-food-use.mjs`：1.6 s threshold、early-release cancel、item/mode cancellation、exactly-once completion、低 FPS wall-clock duration；
- `scripts/check-secondary-control.mjs`：secondary held state 不进入 multiplayer movement snapshot；
- `scripts/check-multiplayer-held-secondary.mjs`：survival/creative press 恰好发送一次 authoritative use，release 不重复，spectator 不发送；
- 原有 authoritative placement/tool/workbench/furnace/primary mining regressions 必须继续全绿。

## 下一轮开发：presentation + creative + mining polish

PR #131 合并后从新 main 分支推进用户当前要求：

1. 第一人称右手轻微向右下调整；第三人称增加 grounded walk / sprint-run 动画，Ctrl+W 与 double-W 均可触发 sprint；
2. Creative overhaul：隐藏 survival health/hunger HUD、怪物不主动攻击、分类 creative inventory、double-Space 切换飞行，非飞行状态保持 grounded physics；
3. Grass block 正常无 Silk Touch 掉落 dirt，包含 creeper/explosion 路径；
4. 复用现有 mining crack overlay/rules，把单机挖掘 progress 映射到方块表面的动态裂痕。

## 后续连续开发顺序

1. Hunger Phase 2 后续：food status effects、difficulty/gamerule boundary、server-authoritative hunger/use；
2. Registry breadth：stone variants、wood species、slab/stair/fence/door 等通用 families；
3. Worldgen：biomes → caves/aquifers → ores/features → structures；
4. Server gameplay breadth：server-authoritative PvE/XP、durable world/block-entity persistence；
5. Farming 后续：farmland trampling、exact crop random tick/light/neighbor formula、Fortune/loot tables、其它 crops/breeding。

## 工程规则

- 只认 exact-head CI；
- source asset availability ≠ runtime implementation；
- gameplay pure rules、browser presentation、server authority 分层；
- persistence / terrain version / starter slots / network state 都是兼容性表面；
- 不通过降低测试、静默升级旧存档或 client-side fake authority 来换绿色门禁。
