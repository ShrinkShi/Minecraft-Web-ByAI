# Minecraft Web - 当前开发进度

更新时间：2026-08-22

## 当前主线

项目处于 `v0.4.0-dev`。严格按 Minecraft Java 1.20.1 完整玩法/内容口径，整体规划完成度仍保守维持约 **35%**。浏览器引擎、资源管线和 authoritative multiplayer 基础已经较强，但完整 registry、原版 worldgen、redstone、dimensions、enchanting/brewing、status effects 和 server PvE 仍是主要缺口。

当前 merged `main`：

`408a4a57c68453ec38ccab1e5dcee2e3760eb82b`

main 已合并到 PR #127。#127 完成 hunger / saturation / exhaustion / natural regeneration / starvation 核心、第一批可食物品与熟肉 Furnace progression，并把单机存档 schema 提升到 v9，同时保持 terrainVersion 从 schema v8 开始必填的兼容边界。

## 当前进行中：PR #128 Farming Phase 1

分支：`feature/farming-phase-1`

基线：`main 408a4a57c68453ec38ccab1e5dcee2e3760eb82b`

本 PR 保持 Draft，最终只认 exact-head CI。

### 已实现

- 保留 `FARMLAND=24` 为 moisture 0；append-only 增加 moisture 1..7（28..34）；
- append-only 增加 wheat age 0..7（35..42）；
- farmland / wheat 全部走现有 canonical Java 1.20.1 blockstate/model interpreter，不新增手绘 crop geometry；
- wheat 使用 cutout render layer；
- canonical model closure 扩到 12 blockstates / 58 models / 28 textures，tracked atlas 为确定性 128×128；
- 旧 4×4 terrain atlas 保持 byte-stable；
- 新增 direct-canonical `wheat_seeds` / `wheat` item texture；
- 新增 3× wheat 横排 → bread Workbench recipe；
- `SingleplayerFarmingRuntime` 只跟踪 sparse edited farming cells，不扫描整个 voxel world；
- 10 秒 farming tick；水源半径 4 / 非 clear weather 使 farmland 回到 moisture 7；无水逐级干燥；
- moisture 0 且无作物的 farmland 回 dirt；
- wheat 0..7 逐级生长；当前 phase-1 growth chance 为 moist 0.45 / dry 0.20；
- 生存右键种植只在 world mutation 成功后消费 1 粒种子；创造不消费；
- mining controller 增加可选 `resolveDrops` 扩展点，普通方块仍保持历史默认单 stack drop；
- immature wheat 掉 1 seed；mature wheat 掉 1 wheat + 0..3 seeds；
- 成熟作物失去 farmland 支撑时仍走成熟掉落表；creative support removal 不生成掉落；
- farming state 直接通过已有 sparse world edits 持久化，因此 save schema 继续保持 v9；
- multiplayer farming 继续禁用，直到 planting/random tick/drop/inventory 都由 server authority 接管。

### 已关闭的 integration findings

1. **asset-manifest bootstrap anchor**：同一 canonical item list 在审计文件存在 3 个合同位置，bootstrap 从错误的 single-anchor 假设改为显式 3 处更新。
2. **model runtime registry golden**：interpreted block ID golden 从旧 `[9,19,20,21]` 扩展到 farmland moisture / wheat age 的全部 opt-in IDs。
3. **model atlas golden**：闭包从 10/46/18 更新为确定性 12/58/28，同时更新 atlas SHA、glass/furnace region 和 texture-count contracts。
4. **support-break drops**：最初实现会把任何失去支撑的 wheat 固定降级成 1 seed；已改为 survival 使用该 crop 的真实 phase-1 drop resolver，creative 不产掉落。
5. **mode wiring**：farming runtime 现显式读取 player mode，避免 support-break 路径绕过 creative no-drop semantics。

集成 bootstrap 已在干净工作树中通过完整 auto-discovered logic/server/Worker suite、canonical model closure/atlas build 和 farming model boundary，并已自删除；真实集成 commit 为 `05b0d13d822bdb6d9c33a8d8fc86cd3421e4418a`。之后又追加浏览器 farming E2E 与文档，因此最终合并仍需重新以最新 HEAD 跑全部正式门。

## 浏览器验证

`tests/e2e/farming-phase-1.spec.mjs` 覆盖：

1. survival `/give wheat_seeds 2`；
2. 真实 Inventory → hotbar；
3. 对 raycast 命中的 farmland 执行真实 secondary-action planting；
4. 成功后种子 2→1；
5. world cell 进入 wheat age 0；
6. 确定性 farming tick 推进到 age 7；
7. 实际 primary mining 破坏 mature wheat；
8. ground drop 被玩家拾取后 Inventory 中出现 wheat；
9. 页面无 pageerror / console error。

## 兼容性与 parity 边界

- `PROJECT_BASELINE.md` 只记录 merged main，目前只到 #127；
- block IDs append-only，不改历史 ID；
- `CREATIVE_START` 顺序不变；
- terrain generator v2/v3 与 save schema v9 规则不变；
- farming 不新增独立持久化 schema；
- natural short-grass → wheat seeds acquisition 尚未实现，第一粒种子当前需 `/give`；
- exact Java random-tick/growth formula、light/neighbor growth-speed、farmland trampling、exact seed RNG/Fortune、bone meal、其它 crops 尚未实现；
- multiplayer farming 不做 client-side fake authority。

详细合同见 `docs/FARMING_PHASE_1.md`。

## 当前最终门禁

1. exact final HEAD Node syntax；
2. 全部 auto-discovered logic/server/Worker regressions；
3. farming pure/runtime regression；
4. canonical Minecraft asset source audit；
5. farming Chromium E2E；
6. Chromium 1/2 + 2/2 全绿；
7. PR `behind_by=0`；
8. 无 review / review-thread / conversation-comment blocker；
9. final diff 自审后才转 Ready / squash merge。

## 后续连续开发顺序

1. **Vegetation / Farming phase 1.1**：short grass、自然 seed acquisition、bone meal 基础；
2. **Hunger phase 2**：use-duration/eating animation、status effects、difficulty/gamerule boundary、server-authoritative hunger；
3. **Registry breadth**：stone variants、wood species、slab/stair/fence/door 等通用 families；
4. **Worldgen**：biomes → caves/aquifers → ores/features → structures；
5. server-authoritative PvE/XP 与 durable persistence。

## 工程规则

- 只认 exact-head CI；
- source asset availability ≠ runtime implementation；
- gameplay pure rules、browser presentation、server authority 分层；
- persistence / terrain version / starter slots / network state 都是兼容性表面；
- 不通过降低测试或静默 client authority 来换绿色门禁。
