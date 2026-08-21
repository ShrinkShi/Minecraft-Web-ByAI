# Minecraft Web - 当前开发进度

更新时间：2026-08-21

## 当前主线

项目处于 `v0.4.0-dev`。严格按 Minecraft Java 1.20.1 完整玩法/内容口径，整体规划完成度仍保守维持约 **35%**。底层浏览器引擎、资源管线和 authoritative multiplayer 已经形成较强基础，但完整 registry、worldgen、food/farming、redstone、dimensions、enchanting/brewing 和 server PvE 仍是大缺口。

当前 merged `main`：

`2bb4f98474198d68a9b6fc676422d2f4e850866f`

main 已合并到 PR #125。#125 已完成：

- 第一/第三人称右手与 Steve 左右肢体纠正；
- canonical 1.20.1 Workbench GUI；
- local footsteps 从 0.55 调整到 1.6-block cadence；
- survival mining ~200 ms hit cadence；
- break variants 共享 fetch+decode prewarm cache；
- 当前 8 种 mob 的 source-backed ambient/hurt/death baseline。

## 当前进行中：Coal Progression

分支：`feature/coal-progression`

基线：`main 2bb4f98474198d68a9b6fc676422d2f4e850866f`

### 本切片

- `BLOCK.COAL_ORE = 27`，不重编号历史方块 ID；
- canonical Java 1.20.1 `coal_ore.png` 进入 4×4 terrain atlas 的 tile 15；
- white wool item 改为直接引用 canonical `white_wool.png`，无需扩大 atlas 或改变旧 UV；
- canonical `coal.png` 直接作为煤炭物品纹理；
- 木镐及以上可采集煤矿并掉落 `coal`；
- coal Furnace fuel = **1600 ticks**；
- terrain generator **v3** 新增独立 deterministic coal field；
- 生成顺序保持 `iron -> coal`，煤矿不能覆盖已有 v2 铁矿位置；
- v3 golden regression 同时锁定“coal→stone 后 == v2 raw bytes”和“iron+coal→stone 后 == v1 legacy bytes”。

### 兼容性边界

terrain v3 是有意的生成版本升级。server world-info 仍使用 wire schema v1，但只接受当前 `TERRAIN_GENERATOR_VERSION`；旧 terrain-v2 world-info 会被明确拒绝，避免客户端与服务端用不同 base terrain 解释同一组 edit deltas。

`CREATIVE_START` 不插入 coal/coal ore，继续保持既有 starter-slot 和 authoritative bootstrap 合同。

## 当前验证目标

1. 自动发现的全部 logic/server/Worker checks；
2. terrain v3 四组 golden + v2/v1 normalization compatibility；
3. focused coal singleplayer Chromium：木镐挖煤矿、Jade、耐久、canonical coal pickup；
4. asset-source audit 重建 4×4 terrain atlas，并要求 tracked atlas 与 builder byte-identical；
5. 两个 Chromium shard 全绿；
6. branch 对最新 main `behind=0` 且无 review blocker。

## 本切片明确不做

- charcoal；
- torch recipe / dynamic light；
- coal block；
- Fortune / Silk Touch 与煤矿挖掘 XP；
- caves / biome-dependent ore distribution；
- hunger / food / farming。

## 后续连续开发顺序

1. **Hunger + food core**：hunger、saturation、exhaustion、regen/starvation，至少 bread/apple/cooked meats；
2. **Farming phase 1**：seeds/wheat、farmland moisture/irrigation、growth/harvest、bread chain；
3. **Registry breadth**：stone variants、wood species、slab/stair/fence/door 等通用 block families；
4. **Worldgen**：biomes → caves/aquifers → ores/features → structures；
5. server-authoritative PvE/XP 与 durable persistence。

## 工程规则

- 只认 exact-head CI；
- `PROJECT_BASELINE.md` 只写 merged main；
- feature matrix 可以写清楚标注的 projected PR state；
- source asset availability ≠ runtime implementation；
- gameplay pure rules、browser presentation、server authority 分层；
- 内容扩张不能破坏历史 starter/network/persistence compatibility contract。
