# Minecraft Web - 当前开发进度

更新时间：2026-08-17

当前事实基线以 GitHub `main`、`docs/PROJECT_BASELINE.md` 和 `docs/MINECRAFT_1_20_1_FEATURE_MATRIX.md` 为准。本文只维护**当前实现链、正在交付的 PR 和下一步**，不重复完整功能矩阵。

## 当前主线

项目已经从“通用 blockstate/model 基础设施”进入 **Java 1.20.1 生存内容逐步接入真实 runtime / worldgen** 的阶段。

严格按“完整 Java 1.20.1 复刻”衡量，整体完成度仍保守维持约 **35%**。#108 打通模型热路径，#109 只是把第一条真实矿业进程落地；熔炉、铁锭、铁工具、其它矿物、完整洞穴/生物群系与大量方块仍未实现，因此不因新增一条进程链虚增整体百分比。

## 已合并并部署：#108 Interpreted model runtime integration

PR #108 已 squash merge 到 `main`，合并后基线：

`a8354ec16c8368622b02e8e6665723f58c460892`

已完成：

- source-backed blockstate/model JSON 启动期 preload/cache；
- recursive parent/model geometry 预编译；
- weighted variant / multipart template 保留；
- `mesh-worker.js` model-runtime init / ready / error barrier；
- legacy terrain-atlas full-cube fast path 保留；
- opt-in interpreted block chunk-level `opaque/cutout/translucent` batching；
- shared deterministic model atlas + 三层共享 Three.js material；
- chunk unload / world dispose 生命周期；
- 初始化失败时安全回退 legacy renderer；
- 首个 live proof：`crafting_table`。

#108 exact-head Repository quality：**146 / 146 logic + 35 / 35 Chromium PASS**，随后 Pages 部署成功。

## 当前进行中：#109 Stone pickaxe → Iron ore → Raw iron

分支：`content/v0.4-stone-pickaxe-iron-ore`

目标不是“展示一个铁矿方块”，而是补出第一条真正的新生存进程：

**木镐 / 圆石 → 工作台合成石镐 → 地下找到铁矿 → 石质及以上镐正确收获 → 粗铁进入背包。**

### 已实现

1. 石镐
   - 使用已导入的 source-backed `item.stone_pickaxe` 资源；
   - 3×3 工作台配方：3 圆石 + 2 木棍；
   - `pickaxe / stone / speed 4 / durability 131`；
   - 纳入现有 item-instance durability 生命周期；
   - 创造模式 starter 只追加，不改变历史 starter slot 顺序。

2. 铁矿石
   - 新内部 block ID `19`，不重排既有 block / bed-state ID；
   - `hardness=3`；
   - 要求 `pickaxe`；
   - 最低收获等级 `stone`；
   - 木镐可以破坏，但不会产出粗铁；
   - 石镐及更高等级通过共享 `canHarvestBlock()` 后掉落 `raw_iron`；
   - source-backed Java 1.20.1 `iron_ore` blockstate/model 通过 #108 interpreted-model runtime 进入真实 Worker/VoxelWorld 热路径；
   - legacy stone tile 仅作为 model-runtime 初始化失败时的 fail-open fallback。

3. 粗铁
   - 使用已导入 source-backed `item.raw_iron` 资源；
   - 当前是采矿产物；
   - **尚未实现熔炉、燃料、烧炼、铁锭，因此不能宣称铁器时代完成。**

4. Terrain generator v2
   - `TERRAIN_GENERATOR_VERSION` 从 1 升到 2；
   - 原因：铁矿改变共享 deterministic world contents，而 terrain version 是多人兼容协议的一部分；
   - 浏览器和权威服务器继续共用同一 generator；
   - 铁矿采用独立 3D coordinate hash 注入地下石层；
   - 当前 64 高度世界中仅做简化 deterministic distribution，不声称复刻 Java 1.20.1 原版矿脉噪声与高度分布；
   - 铁矿范围限制在地下并避免贴近地表；
   - 将 `IRON_ORE` 归一化回 `STONE` 后，旧 v1 四组 golden terrain/surface/tree byte checksum 保持不变，说明新增矿物没有洗牌原有山形、海岸线和树木序列。

5. 单机 / 权威多人收获一致性
   - 单机和服务器继续共享 block harvest metadata + `canHarvestBlock()`；
   - 新回归直接实例化真实 `server/survival-block-break-controller.mjs`；
   - 木镐破坏铁矿：`drop=null`；
   - 石镐破坏铁矿：权威掉落 exactly one `raw_iron`。

6. 单机采矿时间基准修复
   - 新真实 Chromium 用例暴露了历史问题：输入事件中的 `performance.now()` 可能略晚于同一刷新周期的 rAF timestamp，导致首次 `step()` 被误判为时间倒退；
   - `SingleplayerMiningController` 现在只允许第一次 frame 在 `<=50ms` 的同源时钟偏差内重锚；
   - 重锚不奖励负数/幽灵挖掘进度；
   - 第一次之后的任何倒退仍报错；
   - 大幅跨时钟域倒退仍报错。

### #109 功能候选验证

功能候选 HEAD：

`8b13b00feb0bf369a0f51495a0cb38832f0d6a57`

Repository quality run：`32001540747`

- JavaScript syntax：PASS；
- 自动发现 logic/server/Worker：**147 / 147 PASS**；
- Chromium shard 1：**18 / 18 PASS**；
- Chromium shard 2：**18 / 18 PASS**；
- Chromium total：**36 / 36 PASS**。

新增真实浏览器 `iron-progression.spec.mjs` 已证明：

- 生存世界能获得并显示 source-backed 石镐；
- Jade 正确显示“铁矿石 / 最低石质”；
- 玩家真实按住左键可用石镐挖掉铁矿；
- 石镐 durability 从 131 减到 130；
- 粗铁通过现有掉落物系统被拾取，并遵守 hotbar-first pickup；
- source-backed 粗铁图标在真实 hotbar 中显示；
- 页面与 console 无未处理错误。

**注意：**本文档提交会产生新的 branch HEAD；上面的功能候选绿灯只证明功能实现，不能继承为最终合并证据。最终合并只接受文档提交后的 exact-head Repository quality。

## #109 合并后的下一步

优先把当前粗铁死路继续打通，而不是马上跳到低关联展示内容：

1. **Furnace / smelting foundation**
   - 熔炉方块与 persistent container；
   - 输入 / 燃料 / 输出槽；
   - tick-based cooking；
   - fuel burn time；
   - raw iron → iron ingot；
   - singleplayer + authoritative multiplayer shared-container state；
   - source-backed furnace / iron ingot assets 若仓库闭包完整则直接使用，若资源不完整先补 provenance closure，不用占位素材冒充原版。

2. Iron progression continuation
   - iron ingot；
   - iron pickaxe；
   - 后续铁工具/铁甲；
   - 再逐步加入 coal / copper / gold / redstone / lapis / diamond 等矿业链。

3. 继续使用 #108 模型 runtime 扩方块内容
   - `glass`：translucent/culling；
   - `oak_slab`：state + partial collision；
   - `oak_stairs`：state + multi-cuboid collision；
   - `oak_door`：two-block paired state；
   - `oak_fence`：neighbor-derived multipart state；
   - `torch`：non-full/cutout + 后续 lighting；
   - grass/foliage biome tint contract。

**视觉模型与 gameplay collision/state 继续严格分离。** JSON model cuboid 不能自动当碰撞箱，multipart renderer 也不能替代门、栅栏、红石等真实 gameplay state/update 逻辑。

## 后续大阶段

- 完整工具/矿业/熔炼/食物/饥饿/农业/繁殖生存进程；
- worldgen pipeline：biome、caves、ores、features、structures；
- server-authoritative PvE/projectiles/explosions；
- persistent shared containers；
- redstone update/tick/power graph；
- Nether / portal / enchanting / brewing / End / boss progression；
- audio、animated textures、biome tint、lighting/particles、skins/nameplates；
- 最后补完整 server browser/Realms-like product shell、accounts/permissions/settings/language/resource-pack/accessibility。

## 工程规则

- 每个交付 PR 只认 exact branch HEAD 的 CI；
- 不把旧 HEAD 的绿灯继承给新提交；
- source-backed assets 必须可重建、可校验 provenance；
- `main` 上已有 full-cube、UI、save、authoritative multiplayer 能力不得为了内容扩张退化；
- 新内容优先通过 registry/model pipeline 批量扩展，不回到“一种方块一个手写 Three.js 模型”；
- generator semantics 变化必须升级 compatibility version，不静默改旧版本世界；
- 基础设施完成或单条 progression 完成不等于 Java 1.20.1 全内容 parity 完成，功能矩阵状态与整体百分比必须保守。
