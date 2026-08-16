# Minecraft Web - 当前开发进度

更新时间：2026-08-16

当前事实基线以 GitHub `main`、`docs/PROJECT_BASELINE.md` 和 `docs/MINECRAFT_1_20_1_FEATURE_MATRIX.md` 为准。本文只维护**当前实现链和下一步**，不再重复完整功能矩阵。

## 当前主线

项目已从“手工少量方块”进入 **Minecraft Java 1.20.1 通用 blockstate/model 内容管线**阶段。

严格按“完整 Java 1.20.1 复刻”衡量，整体完成度仍约 **35%**。这个数字不会因为模型解释器底座完成就虚增：目前新增工作主要是内容扩张基础设施，尚未把大量新方块正式注册进 gameplay/worldgen。

## 已合并：通用 Minecraft block model 管线

### #95 文档基线重建

- 建立 `PROJECT_BASELINE.md` 与 `MINECRAFT_1_20_1_FEATURE_MATRIX.md`；
- 区分“浏览器引擎成熟度”和“完整 Minecraft 内容完成度”；
- 清理旧 README/PROGRESS 对 multiplayer、床、Three.js、Inventory/Crafting authority 的失真描述。

### #96 Model resolver foundation

- Minecraft resource ID 规范化；
- model parent inheritance；
- texture variable/alias resolution；
- elements/faces/cull/tint/rotation 语义；
- parent/texture cycle 与 missing dependency fail-closed。

### #97 Blockstate resolver

- `variants`；
- weighted alternatives；
- model x/y rotation + `uvlock` 元数据；
- `multipart` AND/OR/property alternatives；
- caller-owned deterministic weighted selection。

### #98 Geometry compiler

- omitted vanilla face UV derivation；
- Minecraft 0..16 model coordinates → block-local geometry；
- face vertices/normals/winding；
- element rotation + `rescale`；
- transformed bounds。

### #99 Model-instance transform

- blockstate x/y model transforms；
- transformed normal/cullface；
- explicit per-vertex UV corners；
- `uvlock`；
- element rotation 与 model-instance rotation 分层。

### #100 Chunk-batched model mesh buffers

- generic interpreted faces → chunk-level typed-array batches；
- 固定 `opaque` / `cutout` / `translucent` 三层；
- atlas region UV mapping；
- cullface-only neighbor culling；
- tint vertex colors；
- Worker-transferable buffers；
- 明确禁止“一 block 一 Three.js Mesh”。

### #101 Deterministic resource dependency closure

- 从用户提供的 Java 1.20.1 source ZIP 解析：`blockstate → models → recursive parents → textures → optional metadata`；
- builtin parent 显式虚拟依赖；
- unsafe/ambiguous/missing/cyclic dependency fail-closed；
- per-file SHA-256/provenance；
- 第一批 acceptance roots 不再靠手工文件表。

### #102 Deterministic model texture atlas

合并 `main`：`cad935ec5216d0bf11f82942162cf3a0caa012a0`

第一批 acceptance roots：iron ore、glass、oak slab、oak stairs、oak door、oak fence、torch、grass block、crafting table。

实际 source closure：

- 9 blockstates
- 42 models
- 14 textures
- 0 metadata
- 65 source files total

生成并追踪：

- `assets/model-textures/model-texture-atlas.png`
- `assets/model-textures/model-texture-atlas.json`

当前 atlas：128×128、14 textures、1 px gutter、`power-of-two-shelf-v1`。CI 会从 source ZIP 重建并对 PNG/JSON 逐字节比较，最终 workflow 保持 `contents: read`。

## 当前进行中：#103 Model texture binding

分支：`render/v0.4-minecraft-model-texture-binding`

目标是把 #102 的可复现二进制资源变成真正可消费的 runtime contract，但**暂不进入 `mesh-worker.js` 热路径**。

当前实现包括：

- `block.model_atlas` / `metadata.minecraft_model_atlas` logical asset keys；
- strict model-atlas manifest validator；
- canonical Minecraft texture ID → tracked atlas record/region resolver；
- pixel rectangle ↔ normalized UV region cross-check；
- source canonical path / SHA metadata / closure texture count / packing contract validation；
- null-prototype texture index，避免资源 ID 触发 prototype mutation；
- `createMinecraftModelTextureBinding()` 与 #100 batcher callback contract 对接；
- render layer policy 保持 caller-owned，但只接受 `opaque/cutout/translucent`；
- injected-fetch browser loader；
- real tracked atlas Node regression；
- Chromium real HTTP manifest fetch + 128×128 PNG decode。

第一轮实现 HEAD 已通过 **137 个**自动发现的 logic/worker/server regressions；经过热路径自审后继续消除重复 texture-ID normalization，并加强 format-1 manifest invariants，因此只接受最终 exact HEAD 的重新 CI 结果。

## 下一步：Worker / VoxelWorld 集成

#103 合并后，下一 PR 才进入 renderer runtime：

1. 在启动/资源阶段只加载一次 model atlas manifest + PNG；
2. 预解析/cache blockstate/model templates，禁止 chunk rebuild 时递归重新解释 JSON；
3. `mesh-worker.js` 保留现有 full-cube 4×4 terrain atlas 快路径；
4. 只有声明为 generic interpreted model 的 block state 进入 #100 batcher；
5. Worker 返回独立 `opaque/cutout/translucent` model typed-array batches；
6. `VoxelWorld` 为三层各维护一个共享 material，不创建 per-block Mesh/material；
7. model atlas texture/material 纳入 chunk/world dispose lifecycle；
8. 用 representative blocks 做真实视觉回归，然后才开始大规模 registry expansion。

## 内容扩张顺序

完成 Worker/VoxelWorld 通路后，按复杂度而不是按素材文件顺序扩张：

1. `iron_ore`：普通 full cube / registry / worldgen proof；
2. `glass`：transparent full cube；
3. `oak_slab`：partial collision + model；
4. `oak_stairs`：state + multi-cuboid + collision；
5. `oak_door`：two-block paired state；
6. `oak_fence`：multipart + neighbor-derived state；
7. `torch`：non-full/cutout model；
8. grass/foliage tint contract；
9. 再批量扩石材、木材、矿物、玻璃、门/活板门、楼梯/台阶、栅栏/墙、花草等。

视觉模型和 gameplay collision 必须继续分离；不能因为 JSON model 有 cuboid 就直接把 cuboid 当碰撞箱。

## 后续大阶段保持不变

通用模型/registry 扩张之后仍依次推进：

- survival progression：石/铁/金/钻石/下界合金工具链、矿物、熔炉、食物、饥饿/饱和度、农业、繁殖；
- worldgen pipeline：biome、caves、ores、features、structures；
- server-authoritative PvE/projectiles/explosions；
- persistent shared containers；
- redstone update/tick/power graph；
- Nether / portal / enchanting / brewing / End / boss progression；
- audio、animated textures、biome tint、lighting/particles、skins/nameplates；
- 最后再补完整 server browser/Realms-like product shell、accounts/permissions/settings/language/resource-pack/accessibility。

## 工程规则

- 每个交付 PR 只认 exact branch HEAD 的 CI；
- 不把旧 HEAD 的绿灯继承给新提交；
- source-backed assets 必须可重建、可校验 provenance；
- `main` 上已存在的 full-cube/authoritative multiplayer 能力不得为了内容扩张而退化；
- 新内容优先通过 registry/model pipeline 批量扩展，不回到“一种方块一个手写 Three.js 模型”的模式。
