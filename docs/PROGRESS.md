# Minecraft Web - 当前开发进度

更新时间：2026-08-20

当前事实以 GitHub `main`、`docs/PROJECT_BASELINE.md`、`docs/MINECRAFT_1_20_1_FEATURE_MATRIX.md` 和当前交付 PR 的 exact head 为准。本文只维护已合并基线、正在进行的交付和紧邻下一步。

## 当前主线

项目仍处于 `v0.4.0-dev`。严格按 Minecraft Java 1.20.1 完整玩法/内容口径，整体规划完成度继续保守维持约 **35%**。

当前 `main`：

`201b09c532e5d40e9e4079c8c5954be8449e398d`

该 main 已包含：

- #111：shared Furnace smelting foundation；
- #112：source-backed Furnace block / Furnace recipe / iron ingot content；
- #113：用户提供的 Minecraft Java 1.20.1 素材从 ZIP 展开为可追踪目录；
- #114 / #115：玩家与实体视觉回归修复；
- #116：authoritative multiplayer Furnace container runtime；
- #117：persistent singleplayer Furnace runtime；
- #118：source-backed iron pickaxe progression。最终 exact head `7b87fb03bfb354adc3eb2c11221644c0839bccd6` 通过 Minecraft asset source audit、162 个 logic/server/Worker scripts、Chromium 22/22 + 22/22，并实际执行工作台→铁镐→铁矿石 progression E2E 后 squash merge。

#118 完成后，早期铁矿链已经具备：石镐采铁矿 → 粗铁 → Furnace → 铁锭 → 工作台铁镐。铁斧/铁锹之前仍缺失，且现有 block metadata 还把“哪种工具挖得快”和“没有哪种工具就不能掉落”混在同一个 `requires` 字段中，无法正确表达木头/泥土这类可徒手掉落但使用专用工具更快的方块。

## 当前进行中：PR #119 Tool effectiveness split + iron axe/shovel progression

PR：#119

分支：`content/v0.4-tool-effectiveness-iron-axe-shovel`

当前基线：`main 201b09c532e5d40e9e4079c8c5954be8449e398d`

### #119 交付内容

1. 拆分 mining effectiveness 与 harvest requirement
   - 新增 block metadata `effectiveTool`，只表示高效开采工具类型；
   - `requires` / `minToolTier` 继续只表示能否获得掉落物的工具/等级门槛；
   - `miningToolMultiplier()` 优先读取 `effectiveTool`，并对旧 block metadata 保留 `requires` fallback；
   - `canHarvestBlock()` 不读取 `effectiveTool`，仍由 harvest requirement 独立决定掉落资格。

2. 现有方块语义迁移
   - 草方块、泥土、沙子：`effectiveTool = shovel`，但徒手仍能正常 harvest；
   - 橡木木板、橡木原木、工作台：`effectiveTool = axe`，但徒手仍能正常 harvest；
   - 石头、圆石、铁矿石、Furnace：继续 `requires = pickaxe`，同时显式 `effectiveTool = pickaxe`，因此“镐更快”和“需要镐才能掉落”两个事实不再依赖同一字段的隐含双重语义；
   - 错误工具仍只获得既有通用 1.2 倍 multiplier，不能靠 tier 绕过 harvest requirement。

3. Source-backed iron axe / iron shovel
   - 新增 `iron_axe`、`iron_shovel` gameplay items；
   - 两者使用现有 item-instance durability framework，耐久 250、iron tier、mining speed 6；
   - 不改变历史 creative/starter hotbar slot 顺序；
   - canonical source：`MC原版素材assets/minecraft/textures/item/iron_axe.png` 与 `iron_shovel.png`；
   - runtime：`./assets/items/iron_axe.png` 与 `./assets/items/iron_shovel.png`；
   - build pipeline 从追踪的 Java 1.20.1 原版目录逐字节复制到 runtime `./assets/` 边界；
   - iron axe SHA-256：`8dea40bac06c6f14bb0ad9e8b47de63250f6d6a46ae9439b85ddd1377f1edb49`；
   - iron shovel SHA-256：`c9d36d59ec53ebc631bd24930f62087c316eef39bd237d8bb69cb2bb629dfae5`；
   - 两张纹理均固定为 16×16，runtime 与 canonical source 字节一致。

4. Workbench recipes
   - iron axe：真实 2×3 shaped recipe，3 铁锭 + 2 木棍，并由通用 matcher 支持左右镜像；
   - iron shovel：1 铁锭 + 2 木棍纵向 shaped recipe；
   - 两者都要求 3×3 workbench，不允许 2×2 crafting grid 误合成；
   - 当前 recipe 总数提升到 10 条。

5. Regression / browser evidence
   - 新增 `check-iron-axe-shovel-progression.mjs`，锁 item metadata、recipe/mirror、starter hotbar、effective-tool/harvest 分离、canonical/runtime hashes 与 PNG dimensions；
   - `check-mining-rules.mjs` 明确验证徒手 dirt/log 等仍可 harvest，同时铁锹/铁斧显著提速；
   - `check-tool-tier-rules.mjs` 锁定 `effectiveTool` 不会意外产生 harvest tier requirement；
   - 旧 Furnace / iron progression block-shape contract 已同步显式 `effectiveTool:'pickaxe'`；
   - 新增 `iron-axe-shovel-progression.spec.mjs`：真实单人世界中先 3 铁锭 + 2 木棍工作台合成铁斧，再 1 铁锭 + 2 木棍合成铁锹，然后分别砍原木、挖泥土，验证原版 runtime 图标、对应掉落与耐久 250→249；测试不使用 `/give iron_axe` 或 `/give iron_shovel` 绕过 progression；
   - 实现稳定阶段的 pre-doc head 已通过 asset source audit、163 scripts，以及 Chromium shard 1/2 和 2/2；shard 1 实际执行新 E2E 并 23/23 通过。这些结果只作为实现稳定证据，最终合并仍只认文档落地后的 exact-head CI。

### #119 明确不做

- iron sword；
- iron hoe；
- axe log stripping；
- shovel dirt-path creation / campfire extinguish；
- sword sweep、shield disable、item-specific attack-speed/cooldown parity；
- hoe 对 leaves 等完整 effective-tool 覆盖；
- iron armor；
- coal/worldgen；
- protocol/world/block IDs。

因此铁斧和铁锹在 #119 后应标为 **PARTIAL**，不能标成完整 Java 1.20.1 parity。当前交付只完成 source-backed item、recipe、durability 与核心 effective mining semantics。

## #119 收口门槛

只有以下条件同时满足才允许 Ready + squash merge：

1. branch 必须基于 `main 201b09c5…` 且 behind=0；
2. `effectiveTool` 与 `requires/minToolTier` 必须保持独立语义，徒手可掉落方块不得因新增 axe/shovel effectiveness 变成无掉落；
3. 石头/圆石/铁矿/Furnace 的 pickaxe harvest requirement 不得被放宽；
4. iron axe/shovel canonical Java 1.20.1 textures 与 tracked runtime outputs 必须可重建、字节一致；
5. 两条 3×3 recipe、250 durability、matching-tool mining speed 与 ordinary drops 必须由 logic contract 覆盖；
6. 新 browser E2E 必须实际工作台合成两种工具并真实破坏原木/泥土；
7. exact branch HEAD JavaScript syntax + 完整 logic/server/Worker 全绿；
8. exact branch HEAD Minecraft asset source audit 全绿；
9. exact branch HEAD 两路 Chromium jobs 全绿；
10. feature matrix 与本文同步真实 parity；
11. 无 unresolved review/thread/comment 阻塞。

## #119 合并后的下一步

### 1. Iron sword as a combat-specific delivery

铁剑不应只是给 `ITEMS` 加一行数据。下一阶段应至少解决：

- source-backed iron sword item/recipe/durability；
- 玩家 melee damage 使用手持武器 metadata；
- 单人和多人 PvP 共用一致伤害规则；
- 明确当前攻击冷却与 Java 1.20.1 attack-speed 差异；
- 之后再独立考虑 sweep attack、shield interaction 等行为。

### 2. Iron hoe / secondary tool actions

锄与斧/锹的右键行为需要专门交付：

- farmland tilling；
- axe stripping；
- shovel path creation；
- 对应 world mutation / durability / multiplayer authority；
- 再扩充 hoe/axe 的完整 effective block families。

### 3. Iron armor

在现有 Equipment / armorPoints foundation 上补 iron helmet/chestplate/leggings/boots 与 recipes；armor durability/wear 仍应作为独立缺口，不把“可装备”误写成完整护甲 parity。

### 4. Coal progression as a terrain-version delivery

独立实现 coal ore block/model/texture、coal item/fuel 与 deterministic generation。新增自然煤矿会改变 seeded-world bytes，因此必须显式处理 terrain generator version / multiplayer compatibility，不能夹进普通 item PR。

### 5. Multiplayer XP and durable block-entity infrastructure

继续推进 server-owned XP/level、durable server world/container persistence、generic block-entity storage 与 loaded-chunk/scheduled tick 生命周期。

## 工程规则

- 每个交付 PR 只认 exact branch HEAD 的 CI；
- feature PR 改变 parity 状态时必须在同一 PR 更新 feature matrix；
- mining effectiveness 与 harvest/drop eligibility 是两个独立维度，不能再次复用同一字段表达；
- gameplay state、renderer state、collision state、server authority 和 persistence 分层；
- 单人/多人共用 deterministic gameplay core，但各自 authority backend 不混淆；
- source-backed assets 必须可重建、可验证 provenance；
- progression 能跑通不等于 Java 1.20.1 全内容 parity 完成。
