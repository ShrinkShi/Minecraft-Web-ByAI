# Minecraft Web - 当前开发进度

更新时间：2026-08-22

## 当前主线

项目处于 `v0.4.0-dev`。严格按 Minecraft Java 1.20.1 完整玩法/内容口径，整体规划完成度仍保守维持约 **35%**。浏览器引擎、资源管线和 authoritative multiplayer 基础已经较强，但完整 registry、原版 worldgen、farming、redstone、dimensions、enchanting/brewing 和 server PvE 仍是主要缺口。

当前 merged `main`：

`3961c7ff6f59dcb5d08542c8a99a8f0b36dfbf29`

main 已合并到 PR #126。#126 已完成 coal progression、terrain generator v3、singleplayer terrain-v2 compatibility 和 save schema v8 terrain-version pinning。

## 当前进行中：PR #127 Hunger + Food Core

分支：`feature/hunger-food-core`

基线：`main 3961c7ff6f59dcb5d08542c8a99a8f0b36dfbf29`

当前候选 HEAD 在完成代码 finding closure 后继续以 exact-head CI 为准。

### 本切片已实现

- 新增独立 `src/hunger-rules.js`，替换旧的固定时间线性掉饥饿占位逻辑；
- hunger / saturation / exhaustion / food tick timer 成为显式状态；
- exhaustion `> 4` 时按 Java FoodData 顺序每 tick 最多消耗一次：优先 saturation，再 food；
- sprint 地面移动、swimming、jump、sprint-jump、成功攻击、成功受伤接入 exhaustion；
- 生存模式 food `<= 6` 禁止 sprint；
- food=20 且 saturation>0 的快速自然恢复、food>=18 的普通自然恢复；
- 当前项目没有 difficulty 系统，因此 starvation 暂按 **Normal** 边界：最低降到 1 HP，不直接饿死；
- save schema 升到 **v9**，持久化 `exhaustion` / `foodTickTimer`；terrainVersion 从 schema v8 开始必填的合同单独保留，避免 v9 升级破坏 #126 兼容规则；
- 现有 `raw_beef` / `raw_mutton` / `raw_porkchop` / `raw_chicken` / `rotten_flesh` 变为可食用；
- 新增 `apple`、`bread`、`cooked_beef`、`cooked_mutton`、`cooked_porkchop`、`cooked_chicken`；
- 新增物品全部直接绑定仓库中 canonical Java 1.20.1 item PNG；
- Furnace 新增四条肉类烹饪：raw beef/mutton/porkchop/chicken → cooked 对应物，200 ticks，0.35 XP；
- 单机右键食用：饥饿未满时消费 1 个食物并应用 nutrition/saturation；满饥饿不消费；
- `scripts/check-hunger-food.mjs` 覆盖食物数值、exhaustion、regen、starvation、sprint gate 和 Furnace cooking；
- `tests/e2e/hunger-food.spec.mjs` 覆盖真实浏览器吃面包、满饥饿拒绝、快速回血、Normal starvation floor、schema v9 持久化。

### 已完成的 finding closure

1. **schema boundary**：save schema 从 v8 升 v9 后，`terrainVersion` 必填起点不能跟着漂到 v9；已拆成 `TERRAIN_VERSIONED_SAVE_MIN_VERSION=8` 与 `SINGLEPLAYER_SAVE_VERSION=9`。
2. **hotbar E2E**：数量为 1 时 UI 不显示数字，测试不再错误断言 `.slot-count === 1`，改为断言物品槽仍存在。
3. **FoodData tick order**：regen 新增 exhaustion 不在同一 tick 立即再次 drain；下一 tick 才处理，和 Java 顺序一致。
4. **sprint gate**：food <= 6 的 survival player 不再获得 sprint speed / sprint exhaustion。
5. **persistence dirty**：微小移动、跳跃和裸手成功攻击产生的 exhaustion 不再依赖“以后可能有别的状态变化”才进入存档。

上述 finding 修复均已在临时 integration runner 上通过完整 auto-discovered logic/server/Worker suite；最终合并仍只认后续正常用户提交触发的 exact-head 正式门禁。

## 兼容性与 authority 边界

- `PROJECT_BASELINE.md` 只记录 merged main，因此 #127 的 hunger/food 事实在合并前不会写成 merged；
- 旧 v8 单机世界可恢复 hunger/saturation，缺失的 exhaustion/timer 以 0 安全迁移，并在下一次保存写成 v9；
- v8/v9 若缺 `terrainVersion` 都按损坏存档拒绝，不回退成 legacy v2；
- 多人服务器当前没有 authoritative hunger domain。为了避免客户端自说自话，multiplayer secondary 继续明确拒绝本地吃东西，直到服务器拥有 food/hunger transaction/state；
- `CREATIVE_START` 继续保持历史顺序，新食物不插入 starter slots。

## Parity 声明

本 PR 是 hunger/food **核心规则切片**，不是完整 Java 1.20.1 food parity：

- 当前食用是一次右键立即完成，尚无原版约 1.6 秒 use-duration / eating animation / use cancellation；
- raw chicken 与 rotten flesh 的 Hunger 状态效果未实现，因为 status-effect 系统仍为空白；
- 没有 difficulty/gamerule UI，starvation 暂固定按 Normal floor，natural regeneration 默认开启；
- apple/bread 当前可通过 `/give` 获得；bread 的 wheat crafting chain 属于下一阶段 farming；
- 没有 golden food、chorus fruit、stew、cake、honey 等完整食物 registry。

因此整体严格 parity 不因本切片虚高上调。

## 当前验证目标

1. 自动发现的全部 logic/server/Worker checks；
2. save schema v9 + terrainVersion-since-v8 兼容回归；
3. hunger FoodData 顺序、sprint gate、regen/starvation/exhaustion pure contract；
4. canonical food asset manifest 审计；
5. focused hunger/food Chromium；
6. 两个 Chromium shard 全绿；
7. Minecraft asset source audit 全绿；
8. branch 对最新 main `behind=0` 且无 review/thread/comment blocker。

## 后续连续开发顺序

1. **Farming phase 1**：seeds/wheat、farmland moisture/irrigation、growth/harvest、bread chain；
2. **Hunger phase 2**：use-duration/eating animation、status effects、difficulty/gamerule boundary、server-authoritative hunger；
3. **Registry breadth**：stone variants、wood species、slab/stair/fence/door 等通用 families；
4. **Worldgen**：biomes → caves/aquifers → ores/features → structures；
5. server-authoritative PvE/XP 与 durable persistence。

## 工程规则

- 只认 exact-head CI；
- `PROJECT_BASELINE.md` 只写 merged main；
- source asset availability ≠ runtime implementation；
- gameplay pure rules、browser presentation、server authority 分层；
- persistence / terrain version / starter slots / network state 都是兼容性表面；
- 不通过降低测试或静默 client authority 来换绿色门禁。
