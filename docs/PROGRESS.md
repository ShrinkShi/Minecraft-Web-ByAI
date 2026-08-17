# Minecraft Web - 当前开发进度

更新时间：2026-08-17

当前事实基线以 GitHub `main`、`docs/PROJECT_BASELINE.md` 和 `docs/MINECRAFT_1_20_1_FEATURE_MATRIX.md` 为准。本文只维护**当前实现链、正在交付的 PR 和下一步**，不重复完整功能矩阵。

## 当前主线

项目已经从“通用 blockstate/model 基础设施”进入 **Java 1.20.1 内容逐步接入真实 gameplay / Worker / authoritative multiplayer** 的阶段。

严格按“完整 Java 1.20.1 复刻”衡量，整体完成度仍保守维持约 **35%**。#108 打通通用模型热路径，#109 落地石镐→铁矿→粗铁，#110 验证 source-backed translucent 方块；#111 开始补铁进程缺失的熔炉/烧炼权威基础。当前仍没有用户可交互的熔炉、铁锭物品、铁工具链、洞穴/生物群系和绝大多数方块/系统，因此不因基础设施进展虚增整体百分比。

## 当前 `main`

PR #110 已 squash merge。

当前 `main`：

`e4f9337e706c2dcb66e153f81496432accee7946`

### #110 Source-backed translucent glass 已交付

- `BLOCK.GLASS=20`，不重排既有 ID；
- source-backed `minecraft:glass` blockstate/model 进入 interpreted translucent chunk batch；
- 相邻同类透明 full-cube 正确剔除内部面；
- 普通破坏无掉落，放置/破坏保持单人和 authoritative gameplay 兼容；
- 玻璃 Inventory / hotbar 不再退化为平面 PNG：source texture 通过现有三面 block-item preview 显示；
- legacy 4×4 terrain atlas 保持字节兼容，没有为了玻璃/后续内容继续塞 tile；
- exact-head asset audit、static/logic 和两路 Chromium 均通过后合并。

这意味着 generic model pipeline 已经证明至少能覆盖：普通 opaque full-cube、矿石、透明 full-cube，以及 source-backed block item preview 扩展。

## 当前进行中：#111 Authoritative furnace smelting foundation

PR：#111

分支：`content/v0.4-furnace-smelting-foundation`

这一 PR **不是“熔炉功能完成”**。目标是先把容易造成单机/多人分叉的处理逻辑收敛成服务器可复用的权威状态机，再接方块、资产、GUI 和网络交互。

### 已实现的基础

1. Deterministic smelting rules
   - `raw_iron → iron_ingot` 逻辑配方；
   - 200 tick cooking；
   - 当前燃料表覆盖 oak planks、oak log、stick、wooden pickaxe；
   - 输出满时不消耗新燃料；
   - 失去燃烧后，未完成 cook progress 按 2/tick 回退；
   - 修复燃料最后一个 tick 不参与 cooking 的 off-by-one。

2. Furnace state
   - 固定三槽：input / fuel / output；
   - `burnRemaining / burnTotal`；
   - `cookProgress / cookTotal`；
   - stored smelting experience；
   - 状态创建时校验计时器边界和槽位合法性。

3. Item-state integrity
   - 炉槽不接受任意伪造 item id；
   - 只接受现有 `ITEMS` 或明确声明的 smelting output；
   - 使用物品真实 `maxStack`，不会允许“64 把木镐”一类非法状态；
   - fuel / output slot 在 restore/state construction 时也执行语义校验；
   - 部分取出 output 时按取出比例结算已累计的 smelting experience，而不是强制等到输出槽清空。

4. World-cell authoritative container foundation
   - 炉状态以世界整数坐标 `{x,y,z}` 为 identity；
   - 重新打开同一坐标不会清空 input/fuel/output/timers；
   - `serialize / restore` 提供未来 server save 接口；
   - block break foundation 可 drain contents 并删除该 world-cell state。

5. Revision concurrency discipline
   - input/fuel/output transaction 使用 expected revision 防 stale write；
   - **纯 burn/cook timer 推进不会每 tick 增加 container revision**；
   - 只有燃料真实被消耗、烧炼产物真实生成等 transaction mutation 才推进 revision；
   - 这样未来 20 TPS server tick 不会让玩家 GUI 点击几乎必然 stale；
   - 回归显式锁定“连续 198 个纯 progress tick revision 不变”。

6. Regression coverage
   - 新增自动发现 `check-furnace-smelting-foundation.mjs`；
   - 覆盖 199/200 cook boundary、完整燃料 tick、cooldown、full output、非法 item/stack、revision conflict、world-cell reopen、serialize/restore、break drain、partial XP 等边界；
   - 该检查成为 logic/server/Worker 自动发现集合中的第 149 个脚本。

### #111 明确未实现

- 没有 `BLOCK.FURNACE`；
- 没有 furnace blockstate/model runtime registration；
- 没有 furnace item / `iron_ingot` gameplay item registration；
- 没有 furnace 8-cobblestone crafting recipe；
- 没有客户端 Furnace GUI；
- 没有 WebSocket furnace snapshot/transaction channel；
- 没有把 furnace hub 挂到 production server 20 Hz tick；
- 没有把 block break/placement 与 furnace state 生命周期接起来；
- 没有 durable server save backend，只提供 serialize/restore contract；
- 没有动态 `facing` / `lit` voxel state；当前 world voxel contract 仍主要是 block ID；
- 没有新增二进制 Minecraft 资产。

因此 feature matrix 只把 Furnace / furnace recipes / persistent container 对应项提升到 **FOUNDATION**，没有标成 PARTIAL 或 DONE。

## 为什么 #111 不直接把完整熔炉都塞进一个 PR

仓库现有 legacy terrain atlas 是固定 4×4 且 16 个 tile 已占满，并且构建脚本要求保持 byte-compatible。熔炉不能通过“再塞一个 tile”继续扩展，否则会破坏已经锁定的资源契约。

正确路线是：

- 世界模型走现有 generic blockstate/model interpreted runtime；
- item / GUI 所需 direct texture 继续从仓库已跟踪的 `MC原版素材assets.zip` 确定性生成；
- persistent processing state 独立于 UI；
- server authority、client presentation 和 source asset closure 分层交付。

GitHub connector 能确认原始素材 ZIP 已跟踪，但不能直接把二进制 ZIP 当 UTF-8 文件解码。因此 #111 不通过复制外部/占位纹理绕过 provenance；二进制生成物留给下一次 source-asset closure 交付。

## #111 收口条件

- 最终 exact branch HEAD JavaScript syntax：PASS；
- 自动发现 logic/server/Worker 全绿；
- 两路 Chromium smoke 全绿，证明非 UI foundation 没有破坏现有浏览器路径；
- 代码自审后不存在已知 item-state / timer / revision 边界错误；
- `docs/MINECRAFT_1_20_1_FEATURE_MATRIX.md` 与本文同步；
- 只有以上条件同时满足才将 Draft 转 Ready 并 squash merge。

任何文档提交都会生成新的 branch HEAD，因此旧 head 的绿灯不能继承给最终提交。

## #111 合并后的下一步

### 1. Furnace source assets + gameplay block

从已跟踪 Java 1.20.1 素材 ZIP 扩充确定性 source closure：

- `minecraft:furnace` blockstate/model acceptance root；
- furnace model atlas dependencies；
- source-backed furnace item preview 所需 face textures；
- source-backed `iron_ingot` item texture；
- 保持 legacy terrain atlas 不变。

然后接入：

- `BLOCK.FURNACE=21`（若合并时 21 仍为空闲）；
- furnace block metadata / harvest / drop；
- 8 cobblestone furnace recipe；
- `iron_ingot` gameplay item；
- `/give furnace` / `minecraft:furnace` 等 alias；
- interpreted model world rendering。

当前 voxel state 只有 block ID，不能假装已经支持 Java furnace 的动态 `facing/lit`。第一版若只能静态 north/unlit visual，必须明确记录；之后再扩展 per-cell block state。

### 2. Furnace UI + singleplayer/server runtime binding

- source-backed Furnace GUI；
- input/fuel/output slot transaction；
- burn/cook progress rendering；
- singleplayer 复用同一 furnace state engine；
- server 20 Hz processing lifecycle；
- block break 时 contents drop；
- world close/save 的持久化挂接。

### 3. Authoritative multiplayer furnace channel

- strict snapshot wire contract；
- revision-guarded click/shift transaction；
- 多客户端打开同一 world-cell furnace；
- stale transaction rejection + resync；
- real two-client WebSocket regression。

### 4. Iron progression continuation

- iron ingot；
- iron pickaxe；
- 后续铁工具 / 铁甲；
- coal / copper / gold / redstone / lapis / diamond 等矿业链。

### 5. 继续验证 interpreted-model runtime

- `oak_slab`：state + partial collision；
- `oak_stairs`：state + multi-cuboid collision；
- `oak_door`：two-block paired state；
- `oak_fence`：neighbor-derived multipart state；
- `torch`：non-full/cutout + 后续 lighting；
- grass/foliage biome tint contract。

**视觉模型与 gameplay collision/state 继续严格分离。** JSON model cuboid 不能自动当碰撞箱；renderer 支持某种状态也不等于 gameplay 已拥有对应 block-state/update 规则。

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