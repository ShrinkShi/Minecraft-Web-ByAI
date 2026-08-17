# Minecraft Web - 当前开发进度

更新时间：2026-08-17

当前事实基线以 GitHub `main`、`docs/PROJECT_BASELINE.md` 和 `docs/MINECRAFT_1_20_1_FEATURE_MATRIX.md` 为准。本文只维护**当前实现链、正在交付的 PR 和下一步**，不重复完整功能矩阵。

## 当前主线

项目当前处于 **Minecraft Java 1.20.1 通用 blockstate/model 内容管线从基础设施进入真实世界运行时**的阶段。

严格按“完整 Java 1.20.1 复刻”衡量，整体完成度仍约 **35%**。#95–#108 主要是在修建可批量扩内容的底座；在矿物、玻璃、台阶、楼梯、门、栅栏、火把、完整工具链和 worldgen 真正扩张前，不因为渲染基础设施完成就虚增整体百分比。

## 已合并：通用 Minecraft model 资源链

### #95–#100：解释与批处理基础

已建立：

- Minecraft resource ID 规范化；
- model parent inheritance 与 texture alias resolution；
- blockstate `variants`、weighted alternatives、`multipart`；
- element geometry、rotation/rescale、face UV；
- blockstate x/y transform 与 `uvlock`；
- generic interpreted faces → chunk-level `opaque` / `cutout` / `translucent` typed-array batches；
- cullface、tint、atlas region 与 Worker-transferable buffer contract。

### #101–#104：可复现 source closure / model atlas / runtime JSON

从用户提供的 Java 1.20.1 source ZIP 建立第一批 acceptance roots 的可复现闭包：

- 9 blockstates；
- 42 models；
- 14 textures；
- 65 source files total；
- per-file SHA-256 / provenance；
- deterministic model texture atlas；
- tracked blockstate/model runtime JSON closure。

第一批 source roots 包括：`iron_ore`、`glass`、`oak_slab`、`oak_stairs`、`oak_door`、`oak_fence`、`torch`、`grass_block`、`crafting_table`。

### #103：Model texture binding

已把 model texture atlas 转成严格 runtime contract：

- `block.model_atlas` / `metadata.minecraft_model_atlas` logical asset keys；
- canonical texture ID → atlas record/UV region；
- manifest format / dimensions / packing / closure consistency validation；
- caller-owned `opaque/cutout/translucent` layer policy；
- injected-fetch browser loader；
- Node + Chromium source-backed regressions。

### #106：Java 1.20.1 HUD / Inventory presentation

已把 source-backed GUI 资源用于真实 HUD / Inventory / hotbar，并补齐 block-item 三面预览和 first-person held 同步。该 PR 已合并并部署。

### #107：单人世界选择流程

已把旧的“创建 / 进入世界”混合表单替换为真正的本地世界列表：

- IndexedDB 世界列表；
- 单击选择 / 双击进入；
- 独立创建页；
- 编辑、重命名、模式修改；
- rename 时安全迁移 deterministic world id；
- seed / terrain prompt 对已有世界锁定，避免生成身份断裂。

该 PR 已合并并部署。

## 当前进行中：#108 Interpreted model runtime integration

分支：`render/v0.4-interpreted-model-runtime`

目标是把 #96–#104 已经存在的 resolver / geometry / batcher / tracked JSON / model atlas **真正接进 `mesh-worker.js` 和 `VoxelWorld` 热路径**，同时保留原有 full-cube terrain-atlas 快路径。

当前实现：

1. `src/minecraft-model-registry.js`
   - 显式 opt-in visual registry；
   - 未注册方块继续走旧 terrain-atlas fast path；
   - 首个 live proof 使用现有 `crafting_table`，不借机声称新增 gameplay block parity。

2. `src/minecraft-model-runtime.js`
   - 启动阶段一次性加载/cache blockstate + recursive model parents；
   - 预编译 geometry/model-instance templates；
   - 保留 weighted variant / multipart alternatives；
   - Worker chunk rebuild 不递归重新 fetch/解释 JSON；
   - local mesh 坐标与 global deterministic weighted-selection 坐标分离。

3. `src/mesh-worker.js`
   - 新增显式 `minecraft-model-runtime-init` / ready / error handshake；
   - 初始化失败时 fail-open 到原有 legacy terrain mesh，避免已存在方块变空气；
   - opt-in block 从 legacy opaque batch 排除；
   - interpreted model 通过已有 #100 batcher 输出独立 `opaque/cutout/translucent` buffers；
   - cullface 使用当前块/邻区数据；
   - 只 transfer 实际挂在消息上的 buffers。

4. `src/minecraft-model-world-renderer.js`
   - `VoxelWorld` 外独立管理 model-atlas Texture；
   - 三层共享 material，不创建 per-block Mesh/material；
   - chunk-level geometry attach/dispose；
   - world dispose 时释放 model materials + atlas texture。

5. `src/world.js`
   - mesh queue 增加 model-runtime init barrier；
   - ready 后才开始 mesh 请求；fallback 后安全恢复 legacy path；
   - interpreted chunk meshes 纳入现有 chunk unload/world dispose lifecycle。

### #108 第一轮真实验证

候选 HEAD：`b77d413adee9f8b516e7d1bed091c54f779fd02e`

Repository quality run `31997813513`：

- JavaScript syntax：PASS；
- 自动发现 logic/server/Worker：**146 / 146 PASS**；
- Chromium shard 1：**18 / 18 PASS**；
- Chromium shard 2：**17 / 17 PASS**；
- 新增真实 Worker + `VoxelWorld` interpreted-model E2E：PASS。

真实浏览器回归证明：

- source-backed `crafting_table` 不再进入旧 terrain opaque batch；
- interpreted opaque batch 为 6 faces / 24 vertices / 36 indices；
- model atlas 使用共享 `block.model_atlas` material；
- real `VoxelWorld` 中 chunk mesh 走新通路；
- chunk geometry / shared material / model atlas texture 的 dispose lifecycle 可验证；
- 原有 multiplayer、singleplayer durability、survival/death/bed、HUD、world-selection 浏览器回归无退化。

文档提交后仍只接受新的 **exact branch HEAD** CI；上面的第一轮绿灯不会继承给后续文档 HEAD。

## #108 合并后的内容扩张顺序

下一步不再继续造抽象层，开始用这条真实 runtime pipeline 扩 gameplay registry / worldgen：

1. `iron_ore`：普通 full cube + registry + mining/harvest + worldgen proof；
2. `glass`：transparent full cube + translucent/culling contract；
3. `oak_slab`：block state + partial collision + model；
4. `oak_stairs`：state + multi-cuboid model + collision；
5. `oak_door`：two-block paired state；
6. `oak_fence`：neighbor-derived multipart state；
7. `torch`：non-full/cutout model + 后续 lighting；
8. grass/foliage biome tint contract；
9. 再批量扩石材、木材、矿物、玻璃、门/活板门、楼梯/台阶、栅栏/墙、花草等。

**视觉模型与 gameplay collision 继续严格分离。** JSON model cuboid 不能自动当作碰撞箱。

## 后续大阶段

通用模型/registry 扩张之后仍依次推进：

- survival progression：石/铁/金/钻石/下界合金工具链、矿物、熔炉、食物、饥饿/饱和度、农业、繁殖；
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
- 基础设施完成不等于内容 parity 完成，功能矩阵状态与整体百分比必须保守。
