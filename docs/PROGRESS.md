# Minecraft Web - 当前开发进度

更新时间：2026-08-21

## 当前主线

项目处于 `v0.4.0-dev`。严格按 Minecraft Java 1.20.1 完整玩法/内容口径，整体规划完成度仍保守维持约 **35%**。底层浏览器引擎、资源管线和 authoritative multiplayer 已经形成较强基础，但完整 registry、worldgen、food/farming、redstone、dimensions、enchanting/brewing 和 server PvE 仍是大缺口。

当前 merged `main`：

`6159b9f47a54bf7e3610897c55f1ee1fdbf6ed7d`

main 已合并到 PR #124。#124 已完成：

- 第一/第三人称右手与 Steve 左右肢体纠正；
- canonical 1.20.1 Workbench GUI；
- local footsteps 从 0.55 调整到 1.6-block cadence；
- survival mining ~200 ms hit cadence；
- break variants 共享 fetch+decode prewarm cache；
- 当前 8 种 mob 的 source-backed ambient/hurt/death baseline。

## 当前进行中：PR #125 Iron Armor Progression

分支：`content/v0.4-iron-armor-progression`

基线：`main 6159b9f47a54bf7e3610897c55f1ee1fdbf6ed7d`

### 内容

PR #125 projected post-merge boundary：

- runtime item IDs：**44**；
- recipes：**18**；
- iron helmet：2 armor / 165 durability；
- iron chestplate：6 / 240；
- iron leggings：5 / 225；
- iron boots：2 / 195；
- full iron set：15 armor points；
- four canonical Java 1.20.1 item textures；
- four vanilla-shaped Workbench recipes。

铁甲不会插入历史 `CREATIVE_START`，避免改变已有 authoritative/bootstrap starter-slot contract；它仍可正常合成，并可通过 `/give minecraft:<registered_item_id>` 获得。

### Armor semantics

- leather armor 恢复 55/80/75/65 durability；
- 旧“每护甲点固定 4%”近似已替换为 Java-style damage-dependent armor mitigation；
- `armorDurabilityDamage(rawDamage)` 统一计算护甲磨损；
- local Equipment snapshot/restore/click/swap/unequip/drain 保留 item-stack `damage`；
- authoritative Equipment 支持磨损、损坏和 revision；
- PvP 按“受击前护甲计算减伤 → damage applied → 磨甲并复制 Equipment → death cleanup”顺序；
- singleplayer hostile/projectile/explosion 通过 applied-damage bridge：hurt-cooldown/rejected hit 不磨甲，致死一击先磨甲再死亡清理，drowning 不磨甲。

### Command / registry cleanup

`/give minecraft:<registered_item_id>` 已改为由 runtime item registry 自动解析，不再要求每新增一种物品就手工维护 namespace alias；特殊方块别名仍保留。

## 当前验证状态

在文档收口前的 exact head `85a3deaab9d70cd25a83c6786fbed6608ee01140`：

- JavaScript syntax：PASS；
- auto-discovered logic/server/Worker regressions：PASS；
- Chromium shards 已启动；
- 该结果只作为 preliminary evidence，因为本次文档收口会移动 HEAD。

CI 已发现并关闭三类真实 finding：

1. `/give minecraft:iron_chestplate` 仍依赖旧手工 alias → 改为 registered-item namespace resolution；
2. 旧 melee test double 缺少新增 `damageArmor()` Equipment contract → 更新测试契约，不在生产代码中静默吞掉缺失能力；
3. 新铁甲一度被加入 `CREATIVE_START`，导致 Furnace starter slot 位移 → 恢复历史 starter 布局，并修正铁甲测试为“注册/可合成/可 give，但不挪旧 starter slots”。

## Ready gate

#125 只有在**文档收口后的最终 exact HEAD**满足以下条件才允许 Ready：

1. static-checks 全绿；
2. Chromium shard 1/2、2/2 全绿；
3. focused iron-armor Chromium 测试通过真实 Workbench 合成、canonical PNG decode、装备和 HUD；
4. authoritative two-client PvP regression验证护甲减伤 + durability replication；
5. branch 对最新 main `behind=0`；
6. reviews / threads / PR comments 无 blocker。

## #125 明确不做

- diamond/netherite armor toughness tiers；
- Protection / Unbreaking / Mending 等附魔；
- armor equip/break sound graph；
- 第三人称完整 armor model layer 渲染；
- shield；
- hunger/food/farming；
- coal/worldgen（下一条 delivery）。

## #125 后续连续开发顺序

1. **Coal progression**：coal ore、coal item、Furnace fuel、deterministic generation、terrain-generator version/compatibility；
2. **Hunger + food core**：hunger、saturation、exhaustion、regen/starvation，至少 bread/apple/cooked meats；
3. **Farming phase 1**：seeds/wheat、farmland moisture/irrigation、growth/harvest、bread chain；
4. **Registry breadth**：stone variants、wood species、slab/stair/fence/door 等通用 block families；
5. **Worldgen**：biomes → caves/aquifers → ores/features → structures；
6. server-authoritative PvE/XP 与 durable persistence。

## 工程规则

- 只认 exact-head CI；
- `PROJECT_BASELINE.md` 只写 merged main；
- feature matrix 可以写清楚标注的 projected PR state；
- source asset availability ≠ runtime implementation；
- gameplay pure rules、browser presentation、server authority 分层；
- 内容扩张不能破坏历史 starter/network/persistence compatibility contract。
