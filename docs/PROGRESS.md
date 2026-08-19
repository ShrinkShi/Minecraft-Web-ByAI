# Minecraft Web - 当前开发进度

更新时间：2026-08-20

当前事实以 GitHub `main`、`docs/PROJECT_BASELINE.md`、`docs/MINECRAFT_1_20_1_FEATURE_MATRIX.md` 和当前交付 PR 的 exact head 为准。本文只维护已合并基线、正在进行的交付和紧邻下一步。

## 当前主线

项目仍处于 `v0.4.0-dev`。严格按 Minecraft Java 1.20.1 完整玩法/内容口径，整体规划完成度继续保守维持约 **35%**。

当前 `main`：

`db89b447e4c70dc025e8d4837cebf4ca62326601`

该 main 已包含：

- #111：shared Furnace smelting foundation；
- #112：source-backed Furnace block / Furnace recipe / iron ingot content；
- #113：用户提供的 Minecraft Java 1.20.1 素材从 ZIP 展开为可追踪目录；
- #114 / #115：玩家与实体视觉回归修复；
- #116：authoritative multiplayer Furnace container runtime；
- #117：persistent singleplayer Furnace runtime。最终 exact head `f20b0d787a1c8511fe795859919dc88c9a091be0` 通过 162 个 logic/server/Worker scripts，以及两路 Chromium；其中 shard 2 实际执行并通过 persistent singleplayer Furnace E2E 后 squash merge。

#117 完成后，铁矿 → 粗铁 → Furnace → 铁锭已经同时具备单人持久化路径和多人 authoritative processing foundation。仍未完成的 Furnace 边界包括：多人 XP、durable server persistence、动态 `facing` / `lit` block state、离线烧炼、通用 loaded-chunk/block-entity scheduler、smoker/blast furnace/hopper 和广泛 recipe/fuel registry。

## 当前进行中：PR #118 Source-backed iron pickaxe progression

PR：#118

分支：`content/v0.4-iron-pickaxe-progression`

当前基线：`main db89b447e4c70dc025e8d4837cebf4ca62326601`

#118 已从旧 pre-#117 基线重放为一个干净提交，业务差异保持 9 个文件，不回退 #117 的 Furnace/Inventory 持久化实现。

### #118 交付内容

1. Iron pickaxe gameplay item
   - 新增 `iron_pickaxe` 注册；
   - `tool.kind = pickaxe`；
   - tier = `iron`；
   - mining speed = 6；
   - durability = 250；
   - attack damage = 4；
   - stack limit = 1。

2. Vanilla-shaped workbench recipe
   - 3 个 `iron_ingot` 横排；
   - 中间两格竖排 2 个 `stick`；
   - 仅 3×3 crafting/workbench 可合成；
   - 不改变历史 creative/starter hotbar slot 顺序。

3. Source-backed Java 1.20.1 presentation
   - canonical source：`MC原版素材assets/minecraft/textures/item/iron_pickaxe.png`；
   - runtime URL：`./assets/items/iron_pickaxe.png`；
   - runtime 文件由 `tools/build-minecraft-runtime-assets.py` 从追踪的原版目录可重建生成；
   - canonical/runtime SHA-256 固定为 `67305d8bd14e1d60633258f52055fce5aeaea7837c10e62d436fc16f163be627`；
   - 尺寸固定为 16×16；
   - 不把 `MC原版素材assets` 目录直接暴露为浏览器 runtime URL，继续遵守 `./assets/` 边界。

4. Progression integration
   - stone pickaxe 仍是采集 iron ore 的最低 tier；
   - iron pickaxe 使用既有共享 mining tier/speed/durability 规则，不新增第二套挖掘逻辑；
   - iron pickaxe 比 stone pickaxe 更快开采 iron ore；
   - 正确采集 iron ore 仍掉落 `raw_iron`；
   - 成功开采后铁镐耐久从 250 变为 249。

5. Validation contract
   - `check-iron-progression.mjs` 覆盖 iron ingot → iron pickaxe recipe、tier/speed/durability、iron ore harvest/drop 与 canonical/runtime texture hash；
   - `check-asset-manifest.mjs` 和 `check-minecraft-runtime-assets.mjs` 锁定 runtime asset 边界与 provenance；
   - Minecraft asset source audit 必须从 `MC原版素材assets` 实际重建 runtime assets，并以 `cmp` 验证追踪产物一致；
   - `iron-pickaxe-progression.spec.mjs` 走真实单人世界：`/give iron_ingot 3` + `/give stick 2` → 真实工作台 3×3 → 合成铁镐 → 放入 hotbar → 挖 iron ore → 耐久 249 + raw iron pickup；
   - 早期 pre-#117 Draft 已证明 asset source audit、static 和该真实 browser E2E 可通过，但这些结果不作为最终 merge evidence；最终只认重放到 #117 新 main 后的 exact-head CI。

### #118 明确不做

- coal / coal ore / coal fuel；
- iron axe / shovel / sword / hoe；
- iron armor；
- gold / diamond / netherite progression；
- terrain generator version、world compatibility 或 block ID 变化；
- Furnace authority/persistence 修改；
- multiplayer protocol 变化。

煤矿不能为了“顺手补燃料”塞进 #118。当前 deterministic terrain generator v2 已把 world generation version 用作多人兼容边界；新增自然生成 coal ore 会改变相同 seed 的世界字节，因此必须作为独立交付审查 terrain/world compatibility，而不是隐藏在纯工具 PR 中。

## #118 收口门槛

只有以下条件同时满足才允许 Ready + squash merge：

1. #118 必须直接基于已合并 #117 的 `main db89b447…`，behind=0；
2. branch diff 只包含 iron pickaxe / asset pipeline / regression / 文档相关改动，不回退 Furnace 或 Inventory persistence；
3. canonical Java 1.20.1 iron-pickaxe texture 与 runtime asset 必须字节一致且可重建；
4. 3×3 recipe、iron-tier mining speed、250 durability 和 raw-iron drop contract 必须由共享规则验证；
5. 真实 browser E2E 必须实际执行工作台合成和开采，不用 `/give iron_pickaxe` 绕过 progression；
6. exact branch HEAD JavaScript syntax + 完整 logic/server/Worker 全绿；
7. exact branch HEAD Minecraft asset source audit 全绿；
8. exact branch HEAD 两路 Chromium jobs 全绿；
9. feature matrix 与本文同步真实 parity；
10. 无 unresolved review/thread/comment 阻塞。

## #118 合并后的下一步

### 1. Complete the early iron tool set

继续使用同一 item/tool architecture，分批加入：

- iron axe；
- iron shovel；
- iron sword；
- iron hoe；
- 对应 Java 1.20.1 source-backed textures、recipes、durability、mining/combat behaviour。

不建议一次把所有工具、armor、coal 和 worldgen 混成一个 PR；每一类都应有可审的 gameplay contract。

### 2. Iron armor

在现有 Equipment / armorPoints foundation 上补：

- iron helmet / chestplate / leggings / boots；
- recipes；
- 正确 armor points；
- 后续再补 armor durability/wear，而不是把“可装备”误写成完整 armor parity。

### 3. Coal progression as a terrain-version delivery

独立实现：

- coal ore block/model/texture/item drop；
- coal item；
- coal 作为 Furnace fuel；
- deterministic coal generation；
- terrain generator version bump / compatibility tests；
- 锁定旧 terrain byte compatibility 的迁移规则。

当前 world height 只有 64，不能机械照抄 Java 1.20.1 的绝对 Y 分布；需要在保持 deterministic/compatibility contract 的前提下设计适配后的分布并明确记录差异。

### 4. Multiplayer XP and durable block-entity infrastructure

- server-owned XP/level domain；
- Furnace output XP；
- PvE kill XP / death XP settlement；
- production server world save；
- generic block-entity state/persistence；
- loaded-chunk / scheduled tick lifecycle；
- chest / barrel shared persistent containers。

## 工程规则

- 每个交付 PR 只认 exact branch HEAD 的 CI；
- feature PR 改变 parity 状态时必须在同一 PR 更新 feature matrix；
- gameplay state、renderer state、collision state、server authority 和 persistence 分层；
- 单人/多人共用 deterministic gameplay core，但各自 authority backend 不混淆；
- source-backed assets 必须可重建、可验证 provenance；
- progression 能跑通不等于 Java 1.20.1 全内容 parity 完成。
