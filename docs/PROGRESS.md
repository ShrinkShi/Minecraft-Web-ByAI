# Minecraft Web - 当前开发进度

更新时间：2026-08-17

当前事实基线以 GitHub `main`、`docs/PROJECT_BASELINE.md` 和 `docs/MINECRAFT_1_20_1_FEATURE_MATRIX.md` 为准。本文只维护**当前实现链、正在交付的 PR 和下一步**，不重复完整功能矩阵。

## 当前主线

项目已经从“通用 blockstate/model 基础设施”进入 **Java 1.20.1 内容逐步接入真实 gameplay / Worker / authoritative multiplayer** 的阶段。

严格按“完整 Java 1.20.1 复刻”衡量，整体完成度仍保守维持约 **35%**。#108 打通通用模型热路径，#109 落地石镐→铁矿→粗铁，#110 再证明同一模型管线能够承载真实 translucent 方块。熔炉、铁锭、完整工具链、洞穴/生物群系、绝大多数方块与系统仍未实现，因此不因单个内容包虚增整体百分比。

## 已合并并部署：#108 Interpreted model runtime integration

PR #108 已 squash merge，建立：

- source-backed blockstate/model JSON 启动期 preload/cache；
- recursive parent/model geometry 预编译；
- weighted variant / multipart template；
- `mesh-worker.js` model-runtime init / ready / error barrier；
- legacy terrain-atlas full-cube fast path；
- interpreted block chunk-level `opaque/cutout/translucent` batching；
- deterministic model atlas + 三层共享 Three.js material；
- chunk unload / world dispose 生命周期；
- 初始化失败时安全回退 legacy renderer。

## 已合并并部署：#109 Stone pickaxe → Iron ore → Raw iron

PR #109 已 squash merge，当前 `main` 基线：

`2105a82d40f9d62f036b3668e897c1cf6d98c38b`

完成第一条新增矿业进程：

**木镐 / 圆石 → 工作台合成石镐 → 地下铁矿 → 石质及以上镐正确收获 → 粗铁。**

主要交付：

- source-backed 石镐，`pickaxe / stone / speed 4 / durability 131`；
- `BLOCK.IRON_ORE=19`，石质收获门槛；
- source-backed `raw_iron`；
- terrain generator v2 的确定性地下铁矿；
- 单机 / 权威多人共享收获规则；
- 首帧 rAF / event clock skew 的 bounded re-anchor 修复；
- `147 / 147` logic/server/Worker；
- `36 / 36` Chromium；
- Pages 部署成功。

粗铁仍是当前铁进程终点：**熔炉、燃料、烧炼、铁锭和铁工具尚未实现。**

## 当前进行中：#110 Source-backed translucent glass

PR：#110

分支：`content/v0.4-glass-translucent`

目标不是“再加一个贴图方块”，而是验证 #108 的 interpreted-model runtime 能正确承载**真实透明 full-cube gameplay block**，同时保持碰撞、放置、采掘、物品 UI 和资源 provenance 一致。

### 已实现

1. 玻璃 gameplay block
   - 新内部 block ID `20`，不重排任何既有 ID；
   - `solid=true`，仍参与玩家/服务器碰撞；
   - `transparent=true`；
   - `hardness=0.3`；
   - 普通破坏无掉落；当前尚未实现 Silk Touch；
   - `/give glass` / `/give minecraft:glass` 可用；
   - creative starter 只在末尾追加，不改变历史 starter slot 顺序。

2. Source-backed interpreted model
   - 直接使用已纳入 Java 1.20.1 model closure 的 `minecraft:glass` blockstate/model；
   - model registry 显式声明 `renderLayer='translucent'`；
   - 继续共享 `block.model_atlas`，没有创建 glass 专用 Three.js Mesh/material 系统；
   - legacy stone tile 只用于 model-runtime 初始化失败时的 fail-open，不作为正常视觉素材。

3. 相邻玻璃内部面剔除
   - 两个同类、solid、transparent、full-cube interpreted 方块相邻时，不再生成两张重叠内部面；
   - 两块相邻玻璃的真实 Worker 输出为 **10 个外表面 / 40 vertices / 60 indices**；
   - 玻璃与空气、不同透明方块、非 full-cube 等边界仍按既有规则保留可见面；
   - 该规则没有退化为“一切透明邻居都剔面”。

4. Render-layer callback 契约修复
   - 新 Chromium 用例暴露了 #108 以来潜伏的接口适配问题：`createMinecraftModelTextureBinding()` 调用 layer resolver 的签名是 `(texture, face, instance)`，而旧 Worker 直接传入二参 `(texture, instance)` helper；
   - 结果是 `face` 被误当成 instance，玻璃即使声明 translucent 也会静默回退 opaque；
   - 现在 runtime 提供正式三参 `minecraftModelTextureLayerResolver()` 适配器；
   - Worker 与逻辑回归都走该适配器；
   - texture-specific layer override 仍优先于 instance 默认 layer。

5. Source-backed 玻璃物品图
   - 玻璃没有伪装成 legacy terrain-atlas 石头预览；
   - `assets/items/glass.png` 为原始 Java 1.20.1 `textures/block/glass.png` 的逐字节副本；
   - SHA-256：`cb89c706dce86eac3123cef087d359b5f23098b658a468fb91662b4a9922bcd0`；
   - 与现有 model-atlas provenance 中记录的 source hash 完全一致；
   - `build-minecraft-runtime-assets.py` 直接从已跟踪原始素材 ZIP 确定性生成该文件；
   - asset source audit 会把生成物与 tracked `assets/items/glass.png` 逐字节比较；
   - `assets/minecraft/**` 既有 selective runtime closure 保持不变，没有为了 UI 图标污染模型闭包。

6. Gameplay / authoritative compatibility
   - 单人生存可 `/give glass`、在背包/快捷栏显示 source-backed 图标；
   - Jade 可识别“玻璃”；
   - 徒手可破坏且普通破坏不产生掉落；
   - 权威 `SurvivalBlockUseController` 回归证明放置成功后只消费一个玻璃；
   - 权威 `SurvivalBlockBreakController` 回归证明普通破坏 `drop=null`；
   - 没有 worldgen 变化，因此 **不升级 terrain generator version**；
   - 没有网络协议形状变化，因此 **不升级 multiplayer protocol version**。

### #110 功能候选验证

功能候选 HEAD：

`d5ac04774daa38800f89f80e7af7728dac4cd972`

Minecraft asset source audit run：`32036939951` — **PASS**

Repository quality run：`32036939933` — **PASS**

- JavaScript syntax：PASS；
- 自动发现 logic/server/Worker：**148 / 148 PASS**；
- Chromium shard 1：**19 / 19 PASS**；
- Chromium shard 2：**18 / 18 PASS**；
- Chromium total：**37 / 37 PASS**。

新增真实 Chromium `glass-runtime.spec.mjs` 已证明：

- 两块相邻玻璃不会进入 legacy opaque 或 interpreted opaque batch；
- interpreted translucent batch 恰好为 10 faces / 40 vertices / 60 indices；
- world renderer 使用共享 `chunk-model-translucent` material；
- `transparent=true`、`opacity=1`、`depthWrite=false`、`renderOrder=2`；
- 玻璃物品使用真实 source-backed PNG；
- 生存背包/快捷栏、Jade、徒手采掘与无掉落路径可真实运行；
- 页面和 console 无未处理错误。

**注意：**文档提交会产生新的 branch HEAD；上述绿灯只证明功能候选。最终合并仍只接受文档提交后的 exact-head asset audit + Repository quality。

## #110 合并后的下一步

生存进程优先级仍高于展示内容。

1. **Furnace / smelting source closure + runtime foundation**
   - 先从已跟踪的 Java 1.20.1 原始素材 ZIP 扩充 furnace / iron_ingot 所需 provenance closure；
   - 熔炉方块与 persistent container；
   - 输入 / 燃料 / 输出槽；
   - tick-based cooking；
   - fuel burn time；
   - raw iron → iron ingot；
   - singleplayer + authoritative multiplayer shared-container state；
   - 不用占位纹理冒充原版。

2. Iron progression continuation
   - iron ingot；
   - iron pickaxe；
   - 后续铁工具/铁甲；
   - coal / copper / gold / redstone / lapis / diamond 等矿业链。

3. 继续批量验证 interpreted-model runtime
   - `oak_slab`：state + partial collision；
   - `oak_stairs`：state + multi-cuboid collision；
   - `oak_door`：two-block paired state；
   - `oak_fence`：neighbor-derived multipart state；
   - `torch`：non-full/cutout + 后续 lighting；
   - grass/foliage biome tint contract。

**视觉模型与 gameplay collision/state 继续严格分离。** JSON model cuboid 不能自动当碰撞箱；透明材质、multipart renderer 也不能替代真实 block state/update 逻辑。

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
- callback / wire contract 必须用真实调用形状做回归，不允许只测试 helper 而漏掉 integration adapter；
- 基础设施完成或单条 progression 完成不等于 Java 1.20.1 全内容 parity 完成，功能矩阵状态与整体百分比必须保守。
