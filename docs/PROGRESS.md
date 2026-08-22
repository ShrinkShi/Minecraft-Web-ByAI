# Minecraft Web - 当前开发进度

更新时间：2026-08-22

## 当前主线

项目处于 `v0.4.0-dev`。严格按 Minecraft Java 1.20.1 完整玩法/内容口径，整体规划完成度仍保守维持约 **35%**。浏览器引擎、资源管线和 authoritative multiplayer 基础已经较强，但完整 registry、原版 worldgen、redstone、dimensions、enchanting/brewing、status effects 和 server PvE 仍是主要缺口。

当前 merged `main`：

`2ba90bd77f510ade4c771a17e3a06b1e2597271f`

merged main 已包含：

- PR #128 Wheat Farming Phase 1：farmland moisture 0..7、wheat age 0..7、种植/生长/成熟收获、canonical crop model/item、wheat → bread；
- PR #130 presentation repair：缩小第一人称手臂、70° viewmodel FOV、shoulder→wrist 持物层级，以及 Inventory/Workbench 打开时隐藏世界 HUD/viewmodel 的模态表现。

`docs/PROJECT_BASELINE.md` 只描述 merged main；当前未合并开发内容单独记录在下面。

## 当前进行中：PR #129 Vegetation / Farming Phase 1.1

分支：`feature/vegetation-farming-1-1`

基线：当前 `main 2ba90bd77f510ade4c771a17e3a06b1e2597271f`

本 PR 保持 Draft，最终只认 **exact-head CI**。

### 已实现

- append-only 新增 `BLOCK.SHORT_GRASS=43`，继续保持历史 block IDs 不移动；
- 使用 Java 1.20.1 canonical `minecraft:grass` blockstate/model/texture 作为该版本资源命名下的矮草来源；
- 矮草走 interpreted Minecraft model 的 cutout/tint 路径；当前 biome colormap 尚未实现，因此使用显式 fallback grass tint，而不是伪称 biome-correct；
- terrain generator 升级到 **v4**，仅 v4 新世界获得 deterministic short-grass surface decoration；
- 显式 terrain v2 / v3 路径继续保留，旧本地世界按已持久化版本生成，不被 v4 植被注入改变；
- multiplayer 继续要求 exact-current terrain version，因此升级后 v3 peer 不与 v4 server 混跑；
- survival 破坏矮草按基础 **1/8** 概率掉落 1 粒 `wheat_seeds`，从而关闭 Phase 1 第一粒种子只能 `/give` 的 bootstrap 缺口；
- 新增 direct-canonical Java 1.20.1 `bone_meal` item texture；
- 新增 shapeless `bone → 3 bone_meal` recipe；
- 对未成熟 wheat 使用骨粉时推进 **2..5** 个 age，最多到 age 7；成熟 wheat 不发生 mutation；
- 对 grass block 使用骨粉时，在受限半径/尝试次数内寻找合法 grass surface，并生成 short grass；
- survival 只有在骨粉实际改变世界后才消费 1 个；失败/no-space/invalid target 不消费；creative 成功使用不消费；spectator/adventure 不执行该 mutation；
- short grass 失去 grass support 时会被移除；survival 按同一 seed drop rule 结算，creative 不产生 seed drop；
- `CREATIVE_START` 保持历史顺序不变；singleplayer save schema 保持 v9；
- multiplayer 骨粉/vegetation farming mutation 继续不做 client-side 假权威，等待 server-owned action/inventory/world transaction。

### 兼容性边界

- merged main 当前仍是 terrain v3；只有 #129 合并后新世界默认才进入 terrain v4；
- v4 只增加 surface short grass decoration，不重新定义 v2/v3 的 iron/coal/height/tree 内容；
- singleplayer `terrainVersion` 仍从 schema v8 开始必填；schema v9 规则不变；
- 旧 terrain v2/v3 local saves 继续显式 pin；不把它们静默升级成 v4；
- current 64-high deterministic browser worldgen 仍不是 Java 1.20.1 exact biome/cave/feature placement；
- grass bone-meal spread 是 phase-1.1 有界近似，不声明 vanilla random-walk / flower biome table parity；
- short-grass seed drop 当前是基础无 Fortune 情况；Fortune/exact loot-table RNG 尚未进入统一 loot system。

## 验证覆盖

### Pure / runtime

`scripts/check-vegetation-farming-1-1.mjs` 覆盖：

1. 1/8 short-grass seed boundary；
2. bone-meal wheat 2..5 growth 与 age-7 cap；
3. grass candidate 半径/尝试次数边界；
4. invalid random contract；
5. SingleplayerVegetationRuntime wheat mutation；
6. grass → short grass spread；
7. support removal → short-grass removal/drop；
8. creative no-drop boundary。

现有 terrain / server world-info / singleplayer terrain-version / model-runtime / model-atlas / asset-manifest goldens 同步升级到 terrain v4 / short-grass canonical closure。

### Browser

`tests/e2e/vegetation-farming-1-1.spec.mjs` 覆盖真实页面路径：

1. survival 创建世界；
2. deterministic 1/8 命中条件下真实 primary mining 破坏 short grass；
3. ground drop pickup 后 Inventory 出现 wheat seeds；
4. `/give bone_meal 2` → Inventory → hotbar；
5. 真实 secondary-action 对 wheat age 0 使用骨粉并推进到 age 2；
6. 成功后 survival bone meal 2→1；
7. 对 grass 使用第二个 bone meal；
8. 世界出现 short grass，最后一个骨粉被消费；
9. 页面无 pageerror / console error。

### 正式门禁

最终合并前必须同时满足：

1. exact final HEAD Node syntax；
2. 全部 auto-discovered logic/server/Worker regressions；
3. vegetation/farming 1.1 pure/runtime regressions；
4. Minecraft asset source audit + deterministic model atlas/runtime provenance；
5. Chromium 1/2 + 2/2 全绿；
6. `behind_by=0`；
7. 无 review / review-thread / conversation-comment blocker；
8. final diff 自审后才转 Ready / squash merge。

## 后续连续开发顺序

1. **Hunger Phase 2**：food use-duration / eating animation、status-effect foundation、difficulty/gamerule boundary；随后把 hunger/eating 推进到 server authority；
2. **Registry breadth**：stone variants、wood species、slab/stair/fence/door 等通用 families；
3. **Worldgen**：biomes → caves/aquifers → ores/features → structures；
4. **Server gameplay breadth**：server-authoritative PvE/XP、durable world/block-entity persistence；
5. 后续 farming：farmland trampling、exact crop random tick/light/neighbor formula、Fortune/loot tables、其它 crops/breeding。

## 工程规则

- 只认 exact-head CI；
- source asset availability ≠ runtime implementation；
- gameplay pure rules、browser presentation、server authority 分层；
- persistence / terrain version / starter slots / network state 都是兼容性表面；
- 不通过降低测试、静默升级旧存档或 client-side fake authority 来换绿色门禁。
