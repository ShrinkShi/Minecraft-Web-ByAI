# Minecraft Web - 当前开发进度

更新时间：2026-08-22

## 当前主线

项目处于 `v0.4.0-dev`。严格按 Minecraft Java 1.20.1 完整玩法/内容口径，整体规划完成度仍保守维持约 **35%**。底层浏览器引擎、资源管线和 authoritative multiplayer 已经形成较强基础，但完整 registry、worldgen、food/farming、redstone、dimensions、enchanting/brewing 和 server PvE 仍是大缺口。

当前 merged `main`：

`2bb4f98474198d68a9b6fc676422d2f4e850866f`

main 已合并到 PR #125。#125 已完成：

- iron helmet/chestplate/leggings/boots 注册、canonical Java 1.20.1 item textures 与 4 个 Workbench recipes；
- full iron set = 15 armor points，四件耐久 165/240/225/195；
- leather armor durability 恢复 55/80/75/65；
- 固定“每护甲点 4%”近似替换为 damage-dependent Java-style mitigation；
- local / authoritative Equipment 支持 armor damage、break 与 revision；
- singleplayer hostile/projectile/explosion applied-damage wear bridge；
- two-client authoritative PvP armor mitigation + durability replication；
- `/give minecraft:<registered_item_id>` 改为 runtime registry 解析；
- `CREATIVE_START` 保持历史顺序，不因铁甲内容移动 starter slots。

## 当前进行中：PR #126 Coal Progression

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
- v3 golden regression 锁定“coal→stone 后 == v2 raw bytes”，并继续锁定旧 legacy terrain bytes；
- terrain generator 同时保留显式 v2 路径，供已有单机世界继续生成未探索区块；
- singleplayer save schema 升到 **v8**，新增 `terrainVersion`：新世界固定 v3；PR #126 前没有该字段的现有存档按 v2 打开，并在后续保存时补写版本；未知/损坏的 terrain version 明确拒绝，避免静默改变世界。

### 兼容性边界

terrain v3 是有意的生成版本升级。多人 server world-info 仍使用 wire schema v1，但只接受当前 `TERRAIN_GENERATOR_VERSION`；旧 terrain-v2 peer 会被明确拒绝，避免客户端与服务端用不同 base terrain 解释同一组 edit deltas。

单机与多人策略不同：单机需要长期读取本地 IndexedDB 世界，因此支持 v2/v3 generator；多人 session 必须与服务器当前生成版本严格一致。

`CREATIVE_START` 不插入 coal/coal ore，继续保持既有 starter-slot 和 authoritative bootstrap 合同。

### Parity 声明

本切片的煤矿生成是当前 64 高度简化世界中的确定性分布，不是 Minecraft Java 1.20.1 原版 biome/cave/ore placement 算法。实现 coal gameplay chain 不等于 worldgen parity 完成。

### CI finding closure

- exact-head `c7b6ec50288c13818a203b59ddb4a9badda34099` 已通过 asset source audit、static logic/server/Worker 与 Chromium shard 1/2；
- Chromium shard 2/2 的 3 个失败都来自旧 E2E 仍硬编码 singleplayer save `version:7`，实际产品状态已正确保存 `version:8`，护甲/天气/spawnpoint/bed pair/respawn anchor 均符合预期；
- browser smoke 已同步到 schema v8，并额外断言 fresh world `terrainVersion:3`；四处旧 v7 断言均已移除；
- 任何这之后的绿色结果只认新的 exact HEAD，不复用 `c7b6ec50…` 的旧 CI 作为最终合并证据。

## 当前验证目标

1. 自动发现的全部 logic/server/Worker checks；
2. terrain v3 四组 golden + 显式 v2 generator byte compatibility；
3. legacy unversioned singleplayer save → terrain v2，新世界 → terrain v3，save schema v8 持久化；
4. focused coal singleplayer Chromium：木镐挖煤矿、Jade、耐久、canonical coal pickup；
5. asset-source audit 重建 4×4 terrain atlas，并要求 tracked atlas 与 builder byte-identical；
6. 两个 Chromium shard 全绿；
7. branch 对最新 main `behind=0` 且无 review blocker。

## 本切片明确不做

- charcoal；
- torch recipe / dynamic light；
- coal block；
- Fortune / Silk Touch 与煤矿挖掘 XP；
- caves / biome-dependent vanilla ore distribution；
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
