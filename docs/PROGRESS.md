# Minecraft Web - 当前开发进度

更新时间：2026-08-21

当前事实以 GitHub `main`、`docs/PROJECT_BASELINE.md`、`docs/MINECRAFT_1_20_1_FEATURE_MATRIX.md` 和当前交付 PR 的 exact head 为准。本文只维护已合并基线、正在进行的交付和紧邻下一步。

## 当前主线

项目仍处于 `v0.4.0-dev`。严格按 Minecraft Java 1.20.1 完整玩法/内容口径，整体规划完成度继续保守维持约 **35%**。

当前 `main`：

`7b582e4f68ed21a6f3687ea273bd314c8d8e9917`

该 main 已包含：

- #111：shared Furnace smelting foundation；
- #112：source-backed Furnace block / Furnace recipe / iron ingot content；
- #113：用户提供的 Minecraft Java 1.20.1 素材从 ZIP 展开为可追踪目录；
- #114 / #115：玩家与实体视觉回归修复；
- #116：authoritative multiplayer Furnace container runtime；
- #117：persistent singleplayer Furnace runtime；
- #118：source-backed iron pickaxe progression；
- #119：tool-effectiveness / harvest-requirement 语义拆分，以及 source-backed iron axe / iron shovel progression。#119 最终 exact head `e5cdc476ed2f28ba09f68de1d5130fce74c89b65` 通过 Minecraft asset source audit、163 个 logic/server/Worker scripts、Chromium 23/23 + 22/22 后 squash merge。

#119 合并后，当前铁系基础链已经具备：石镐采铁矿 → 粗铁 → Furnace → 铁锭 → 工作台铁镐/铁斧/铁锹。`effectiveTool` 只负责开采效率，`requires` / `minToolTier` 独立负责掉落资格，木头和泥土不会因为斧/锹更快而失去徒手掉落。

## 当前进行中：PR #120 Iron sword + shared melee item profiles

PR：#120

分支：`content/v0.4-iron-sword-melee-profile`

当前基线：`main 7b582e4f68ed21a6f3687ea273bd314c8d8e9917`

实现稳定阶段 exact head：`d7f535e2da117685e3f8b6a1075e61fb0514a755`

### #120 交付内容

1. Source-backed iron sword
   - 新增 `iron_sword` gameplay item；
   - Java 1.20.1 canonical source：`MC原版素材assets/minecraft/textures/item/iron_sword.png`；
   - runtime：`./assets/items/iron_sword.png`；
   - 正确 SHA-256：`ed1fa2f83955583e70a19791455d13989e8bd93b1d7240e775a57141022bed6b`；
   - 16×16，runtime 与 canonical source 字节一致；
   - item registry 增至 37 IDs；
   - 3×3 workbench recipe：2 铁锭纵向 + 1 木棍，共 11 条 recipe；
   - 6 点基础近战伤害、250 耐久；
   - 剑使用顶层 `durability`，不伪装成 mining `tool`。

2. Shared melee item profile
   - 新增 `meleeProfile(itemId)`，统一解析手持物伤害、attack speed、当前项目采用的满充近似间隔和成功命中的耐久成本；
   - iron sword：attack speed 1.6，对应当前硬间隔 625 ms，成功命中 wear 1；
   - pickaxe / axe / shovel 也进入同一 resolver，避免所有武器继续共享固定 600 ms；
   - iron axe 继续体现高伤害但更慢攻击节奏，而不是在固定 600 ms 下无条件压过铁剑。

3. Singleplayer melee wiring
   - `primaryActionStart()` 的实体攻击从手持物 `meleeProfile()` 读取 damage / interval；
   - 实际调用 mob `hurt()` 后只在返回 `applied:true` 时损耗武器；
   - 空挥、攻击自身 cooldown 拒绝、目标 hurt-cooldown 拒绝均不应消耗耐久；
   - creative 保留即时高伤害且不产生 survival weapon wear。

4. Authoritative multiplayer PvP wiring
   - server combat state 支持每次攻击传入 item-specific interval，同时保留历史默认 cooldown；
   - 显式 `combatOptions.attackCooldownMs` 仍优先，用于既有仿真/测试注入，不被 item profile 意外覆盖；
   - server 在目标伤害实际 `applied` 后才调用 authoritative Inventory `damageSelected()`；
   - Inventory revision 正常推进并复制给客户端；
   - 无需新增 wire protocol。

5. Regression evidence
   - `check-melee-rules.mjs`：锁共享 damage / attack interval / durability-cost profile；
   - `check-iron-sword-progression.mjs`：锁铁剑 item、recipe、250 durability、source/runtime hash 与 16×16 texture；
   - `check-authoritative-melee-profile-runtime.mjs`：锁 6 damage、625 ms sword interval、axe slower interval、成功命中才 wear，以及 authoritative Inventory replication；
   - `iron-sword-progression.spec.mjs`：真实单人世界 → 2 铁锭 + 1 木棍工作台合成铁剑 → 普通 `/summon zombie` → 真实 raycast / 左键攻击 → 热栏耐久 250→249；测试不通过 `/give iron_sword` 绕过合成，也不会靠误挖方块伪造耐久消耗。

### 实现稳定证据

实现稳定阶段 exact head `d7f535e2da117685e3f8b6a1075e61fb0514a755` 已通过：

- Minecraft asset source audit：PASS，包含最终 generated-vs-tracked runtime 比对；
- JavaScript syntax + **166** 个自动发现的 logic/server/Worker scripts：PASS；
- Chromium shard 1/2：**23/23 PASS**，其中 `iron-sword-progression.spec.mjs` 实际执行并通过；
- Chromium shard 2/2：**23/23 PASS**，覆盖 multiplayer PvP、authoritative mining、tool durability、workbench、persistent singleplayer Furnace 与长期 smoke 回归。

这些只作为 pre-doc 实现稳定证据。本文和 feature matrix 落地后会产生新的 exact head；最终合并不得继承上述旧 head 绿灯，必须重新跑完整 asset audit、166 scripts 和两路 Chromium。

### #120 明确不做

- Java 1.20.1 完整 attack-strength 曲线；
- sweep attack；
- critical hit 完整规则；
- shield disable / blocking interaction；
- attack animation / cooldown indicator 完整 Java UI parity；
- iron hoe / farmland tilling；
- axe stripping；
- shovel path creation / campfire extinguish；
- iron armor；
- coal/worldgen；
- server-authoritative PvE。

因此 **iron sword 与 held-item melee semantics 必须标为 PARTIAL**。当前 625 ms 等间隔是基于 attack speed 的“满充攻击硬门槛近似”，不是 Java 1.20.1 连续 attack-strength / damage scaling 的等价实现。

## #120 最终收口门槛

只有以下条件同时满足才允许 Ready + squash merge：

1. branch 仍基于 `main 7b582e4f…` 且 behind=0；
2. canonical iron-sword texture 与 runtime output 可从 tracked Java 1.20.1 source 重建且字节一致；
3. iron sword recipe、6 damage、250 durability、1.6 attack speed profile 均有 logic contract；
4. 单人和多人都从共享 melee profile 读取手持物规则；
5. 只有真实 `applied` damage 才产生 weapon wear；
6. authoritative PvP weapon wear 必须推进并复制 Inventory revision；
7. browser E2E 必须真实工作台合成铁剑并真实命中 mob，验证 250→249；
8. 文档后的 exact branch HEAD Minecraft asset source audit 全绿；
9. 文档后的 exact branch HEAD JavaScript syntax + 166 logic/server/Worker scripts 全绿；
10. 文档后的 exact branch HEAD 两路 Chromium 全绿，且 iron-sword E2E 确认实际执行；
11. PR body、feature matrix 与本文使用正确 texture hash 和真实 parity 口径；
12. 无 unresolved review/thread/comment 阻塞。

## #120 合并后的下一步

### 1. Iron hoe + secondary tool actions

下一阶段不应只把锄头加进 `ITEMS`。需要形成行为闭环：

- source-backed iron hoe + 3×3 recipe + durability；
- farmland tilling；
- axe log stripping；
- shovel dirt-path creation；
- 对应 world mutation / item wear；
- 单人和 multiplayer authority 规则一致；
- 再扩充 hoe/axe/shovel 的真实 effective block families。

### 2. Iron armor

在现有 Equipment / armorPoints foundation 上补 iron helmet/chestplate/leggings/boots 与 recipes。Armor durability/wear 仍作为独立缺口，不把“可装备”误写成完整护甲 parity。

### 3. Coal progression as a terrain-version delivery

独立实现 coal ore block/model/texture、coal item/fuel 与 deterministic generation。新增自然煤矿会改变 seeded-world bytes，因此必须显式处理 terrain generator version / multiplayer compatibility，不能夹进普通 item PR。

### 4. Multiplayer XP and durable block-entity infrastructure

继续推进 server-owned XP/level、durable server world/container persistence、generic block-entity storage 与 loaded-chunk/scheduled tick 生命周期，再扩展 chest/barrel 等持久容器。

## 工程规则

- 每个交付 PR 只认 exact branch HEAD 的 CI；
- feature PR 改变 parity 状态时必须在同一 PR 更新 feature matrix；
- mining effectiveness 与 harvest/drop eligibility 是两个独立维度，不能再次复用同一字段表达；
- melee damage、attack timing、hurt cooldown 与 durability wear 需要分层，不能用一个固定 cooldown 假装完整 Java combat；
- gameplay state、renderer state、collision state、server authority 和 persistence 分层；
- 单人/多人共用 deterministic gameplay core，但各自 authority backend 不混淆；
- source-backed assets 必须可重建、可验证 provenance；
- progression 能跑通不等于 Java 1.20.1 全内容 parity 完成。
