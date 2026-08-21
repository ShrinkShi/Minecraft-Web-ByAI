# Hunger + Food Core — PR #127

本文档定义 `feature/hunger-food-core` 的规则、状态、存档与 authority 边界。目标是把旧的“固定时间线性掉 hunger”占位实现替换为可测试、可持久化、可继续 server-authoritative 化的生存规则核心，而不是宣称已经完整复刻 Minecraft Java 1.20.1 全部食物系统。

## 1. 状态模型

单机 `PlayerController` 当前持有：

- `hp`: 0..20
- `hunger` / food level: 0..20
- `saturation`: 0..min(20, hunger)
- `exhaustion`: 0..40
- `foodTickTimer`: regen / starvation timer

Pure rule authority 位于 `src/hunger-rules.js`。DOM、IndexedDB、Three.js、Inventory 和 WebSocket 都不进入该文件。

## 2. Exhaustion 规则

当前实现值：

| 行为 | Exhaustion |
|---|---:|
| Sprint ground movement | 0.1 / block |
| Swimming | 0.01 / block |
| Normal jump | 0.05 |
| Sprint jump | 0.2 |
| Successful attack | 0.1 |
| Successful damage received | 0.1 |

FoodData tick 开始时，如果 exhaustion `> 4`：

1. 只处理一次 4-point threshold；
2. saturation > 0 时先减 1 saturation；
3. 否则 food > 0 时减 1 food；
4. regen 在当前 tick 新产生的 exhaustion 留给下一 tick 处理。

这一顺序避免“回血和掉饥饿在同一 rule step 中被提前结算”的时间偏差。

## 3. Sprint gate

Survival：

- food > 6：可以 sprint；
- food <= 6：sprint intent 仍可存在，但 motion planning 会移除有效 sprint flag，因此不会获得 sprint speed，也不会产生 sprint-movement exhaustion。

Creative / non-survival 不受该 hunger gate 限制。

## 4. Natural regeneration

当前项目默认 natural regeneration 开启，尚无 gamerule UI。

### Saturated fast regeneration

条件：

- survival；
- HP < 20；
- food = 20；
- saturation > 0。

每 0.5 秒（Java 10 tick boundary）触发一次。当前 heal/exhaustion 公式按 `min(saturation, 6)` 建模。

### Normal regeneration

条件：

- survival；
- HP < 20；
- food >= 18；
- 不满足 saturated fast path。

每 4 秒（Java 80 tick boundary）恢复 1 HP，并产生 6 exhaustion。

## 5. Starvation

当前项目还没有 Difficulty 系统，因此 #127 不伪造 Easy/Hard 配置。暂时固定采用 Normal-style boundary：

- food = 0；
- 每 4 秒一次 starvation damage；
- 最低降到 1 HP；
- starvation 本身不会把玩家从 1 HP 直接杀死。

未来 difficulty 系统进入后，再把 starvation floor 变成 difficulty-driven pure rule input。

## 6. Food registry

| Runtime ID | Nutrition | Saturation modifier | 备注 |
|---|---:|---:|---|
| `apple` | 4 | 0.3 | canonical Java 1.20.1 PNG |
| `bread` | 5 | 0.6 | canonical Java 1.20.1 PNG |
| `raw_beef` | 3 | 0.3 | existing source-backed item |
| `cooked_beef` | 8 | 0.8 | canonical PNG |
| `raw_mutton` | 2 | 0.3 | existing source-backed item |
| `cooked_mutton` | 6 | 0.8 | canonical PNG |
| `raw_porkchop` | 3 | 0.3 | existing source-backed item |
| `cooked_porkchop` | 8 | 0.8 | canonical PNG |
| `raw_chicken` | 2 | 0.3 | Hunger status effect 尚未实现 |
| `cooked_chicken` | 6 | 0.6 | canonical PNG |
| `rotten_flesh` | 4 | 0.1 | Hunger status effect 尚未实现 |

`apple`、`bread` 与 cooked meats 不加入历史 `CREATIVE_START`，避免挪动已有 starter slots。当前可通过 `/give` 和既有/新增 processing path 获取；bread 的自然 survival acquisition 等 farming phase 1。

## 7. Furnace processing

新增 shared pure smelting recipes：

- `raw_beef -> cooked_beef`
- `raw_mutton -> cooked_mutton`
- `raw_porkchop -> cooked_porkchop`
- `raw_chicken -> cooked_chicken`

统一：

- cook time: 200 ticks；
- stored XP: 0.35 / item；
- coal fuel: 1600 ticks（继承 #126）。

因为 Furnace recipe 是 pure processing rule，singleplayer 和 authoritative Furnace 可以共享；这不等于 multiplayer eating 已完成。

## 8. Eating interaction

当前 singleplayer：

1. 右键 / secondary action；
2. bed、Workbench、Furnace 等真实方块交互保持优先；
3. 若手持 item 有 `food` profile 且 hunger 未满，则应用 food/saturation 并消费 1 个；
4. ordinary food 在 hunger=20 时拒绝，不消费物品；
5. status-effect hooks 暂不存在。

当前 **不是**完整 vanilla use semantics：

- 没有约 1.6 秒连续使用；
- 没有 eating animation / sound cadence；
- 没有 release/cancel；
- 没有 use-item packet/state machine；
- 没有 always-edible special items 的完整 registry。

因此 feature matrix 保持 `PARTIAL`。

## 9. Save schema v9

PR #126 引入：

- terrain generator v3；
- local terrain v2 compatibility；
- save schema v8；
- `terrainVersion` persistence。

PR #127 增加 player hunger runtime state，需要保存：

- `exhaustion`
- `foodTickTimer`

因此 current singleplayer schema = **v9**。

关键兼容约束不是“所有验证都用当前 schema number”，而是：

- `TERRAIN_VERSIONED_SAVE_MIN_VERSION = 8`
- `SINGLEPLAYER_SAVE_VERSION = 9`

所以：

- pre-#126、无 terrainVersion 的 legacy record 仍按 terrain v2；
- schema v8/v9 若缺 terrainVersion 都视为损坏；
- v8 player snapshot 缺 exhaustion/timer 时恢复为 0；
- 后续保存迁移成 v9；
- 不因为 hunger schema 升级改变旧世界 base terrain。

## 10. Save-dirty contract

Hunger state 本身是 persistent gameplay state，不能依赖“之后可能还有别的变化”才保存。

因此以下 mutation 都必须进入 save-dirty path：

- food consumption；
- regen / starvation / exhaustion drain；
- short sprint/swim movement产生 exhaustion；
- jump exhaustion；
- successful bare-hand attack exhaustion；
- successful incoming damage exhaustion。

这条约束专门避免“玩家做了一次动作马上暂停/退出，exhaustion 丢失”的隐性 persistence bug。

## 11. Multiplayer authority boundary

当前 multiplayer 已 server-authoritative 的领域包括 movement/world/mining/placement/items/Inventory/Equipment/Crafting/Workbench/Furnace/PvP 等，但 **没有 hunger state / eat transaction**。

#127 的策略是禁止 silent divergence：

- multiplayer main loop 不运行 competing local hunger tick；
- multiplayer secondary food use 明确拒绝；
- 不允许客户端自行消费 authoritative Inventory 中的食物；
- 不把 local `PlayerController.hunger` 当作 server truth。

下一阶段要实现 multiplayer hunger，必须增加 server-owned state、revision/snapshot、eat transaction、movement exhaustion input boundary、combat exhaustion 与 persistence，而不是移除当前拒绝 toast。

## 12. Tests

Pure：`scripts/check-hunger-food.mjs`

- values / consumption；
- exhaustion threshold/order；
- movement/jump/attack/damage costs；
- sprint food gate；
- fast/normal regen；
- Normal starvation floor；
- Furnace meat recipes。

Browser：`tests/e2e/hunger-food.spec.mjs`

- real Inventory/hotbar food path；
- consume exactly one bread；
- full-hunger rejection；
- fast regen；
- starvation floor；
- IndexedDB schema v9 + terrain v3 + exhaustion/timer persistence；
- zero page/console errors。

Existing #124/#125/#126 regressions remain mandatory。

## 13. Explicitly out of scope

- raw chicken / rotten flesh Hunger MobEffect；
- potion/status-effect engine；
- difficulty/gamerule settings；
- food-use duration/animation/sounds；
- golden food / stew / cake / honey / chorus fruit / broad food registry；
- wheat/seeds/growth/harvest and normal bread acquisition；
- animal breeding；
- server-authoritative hunger/eating。

这些属于后续切片，不在 #127 中以占位 stub 伪装成 DONE。
