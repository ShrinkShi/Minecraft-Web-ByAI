# Minecraft Web - 当前开发进度

更新时间：2026-08-27

## 当前主线

项目处于 `v0.4.0-dev`。严格按 Minecraft Java 1.20.1 完整玩法/内容口径，整体完成度仍保守维持约 **35%**。浏览器渲染/资源管线、单机生存基础和 authoritative multiplayer 骨架已形成；当前连续主线是先把 stateful block 的语义、存储、存档和网络真值打通，再进入模型、放置、碰撞和具体家族扩展。

当前 merged `main`：`299c64b04df1f4280d0b2b399a1abdcb38b4bf75`，为 PR #143 `feat: persist block state sidecar in singleplayer saves` 的 squash merge 结果。

`docs/PROJECT_BASELINE.md` 只描述 merged main；未合并功能必须留在本文件的 active delivery 中。

## 最近完成：Stateful block foundation A → B2a

### PR #140 — Phase A canonical state schema

已合并：`ee8021ac9d5c8de8e7d2d4b3be1a99b8cab6a6e4`。

完成：

- enum / boolean / bounded integer property schema；
- normalize / validate / deterministic canonical key / strict parse round-trip；
- log `axis`；
- furnace `facing + lit`；
- farmland `moisture`；
- wheat `age`；
- slab `type + waterlogged`；
- stair `facing + half + shape + waterlogged`；
- fence cardinal connectivity + `waterlogged`；
- door `facing + half + hinge + open + powered`。

此阶段只建立纯语义层，没有修改 world/save/network 格式。

### PR #142 — Phase B1 sparse in-memory sidecar

已合并：`b6ed60350b76138f51f7028c8ba2675918d7edaa`。

完成：

- `BlockStateSidecar`；
- block identity `{id,stateKey}`；
- stateful default canonical key + sparse default elision；
- stateless `stateKey:null`；
- block ID ownership guard，防止旧 state 泄漏到新 ID；
- deterministic export/import；
- `VoxelWorld.getBlockState()` / `setBlockState()` / `exportBlockStates()`；
- `savedBlockStates` 与独立 `onBlockStateEdit` runtime boundary；
- ordinary `setBlock()` 继续表示“写入 ID 的 canonical default state”。

当前 sidecar registry 只 opt-in oak log、stripped oak log、furnace；farmland/wheat 暂时保留历史 ID-encoded compatibility path。

### PR #143 — Phase B2a singleplayer persistence

已合并到当前 `main 299c64b04df1f4280d0b2b399a1abdcb38b4bf75`。

完成：

- singleplayer save schema **v10 → v11**；
- world record 新增 `blockStates: world.exportBlockStates()`；
- pre-v11 缺少 `blockStates` 时按 canonical default state 迁移；
- v11+ 缺失 `blockStates` 明确拒绝，禁止静默丢 property；
- restore 前通过 `BlockStateSidecar` 验证 canonical key / owning ID；
- state-only local edit 会标记 save dirty；
- terrain generator 仍为 v4；
- multiplayer 仍保持 v5，未在 B2a 假装支持 state transport。

最终 exact head `9f1fe7bc7238b52bda011bb5355a67c0e4dfde4e` 通过 Repository quality `33050099078` / #1314：static + Chromium 1/2 + Chromium 2/2 全绿，reviews/threads/comments 为 0。

## 当前 merged 兼容性边界

当前 `main` 权威边界：

- block/item IDs：append-only；
- singleplayer save schema：**v11**；
- block-state save feature floor：**v11**；
- terrain generator：**v4**；
- multiplayer handshake/subprotocol：**v5 / `minecraft-web-v5`**；
- player action frame：**v3**；
- historical `CREATIVE_START` 顺序/slot mapping 不变；
- browser presentation 不成为 gameplay authority；
- multiplayer 缺失 authority 不允许 client-side competing truth。

## Active delivery：PR #144 Phase B2b multiplayer block-state authority

Draft PR：#144 `feat: replicate authoritative block states in multiplayer`

分支：`feat/b2b-block-state-multiplayer-transport`

基线：`main 299c64b04df1f4280d0b2b399a1abdcb38b4bf75`

### 目标

B2b 只完成 stateful block 的多人权威存储与传输闭环：

`ServerTerrainWorld authority → world-edit snapshot/incremental wire → LiveWorldWebSocketClient → VoxelWorld.blockStates`

它不把 Phase C 的模型解释、放置朝向或复杂碰撞偷偷混入本 PR。

### 已实现候选内容

1. **Server authority**
   - `ServerTerrainWorld` 同时持有 sparse numeric edits 与 sparse non-default state edits；
   - `getBlockState()` 返回 canonical `{id,stateKey}`；
   - `setBlockStateKey()` 以完整 block identity 判定变化；
   - **同 ID、不同 `stateKey` 也会推进 world revision**；
   - state-only base-cell edit 不要求伪造新的 block ID；
   - initial snapshot 使用同一 authority source 导出。

2. **World-edit replication v2**
   - initial chunk tuple：`[x,y,z,id,stateKey]`；
   - incremental block change：`previous + previousStateKey → id + stateKey`；
   - assembler 输出 `edits[coord] = {id,stateKey}`；
   - hydration 同时生成 `savedEdits` 与 `savedBlockStates`；
   - legacy numeric edit object 仅在内部 hydration helper 保留兼容读取，不伪装 wire v1 与 v2 可互通。

3. **Client application**
   - multiplayer bootstrap 使用现有 `VoxelWorld(savedEdits,savedBlockStates)`；
   - incremental overlay 直接写真实 `VoxelWorld.blockStates`；
   - stale `previousStateKey` 明确拒绝；
   - state-only mutation 会使已加载 chunk mesh 失效并请求重建；
   - 不建立第二份 client block-state truth。

4. **Explicit compatibility break**
   - 候选 handshake：**v6**；
   - 候选 WebSocket subprotocol：**`minecraft-web-v6`**；
   - 原因：v5 对旧 world-edit shape 做严格校验；若继续让 v5 握手成功再发送 v2 world-edit，只会把明确的不兼容拖到 bootstrap 阶段爆炸。

5. **Regression coverage**
   - world-edit v2 snapshot/incremental/canonical-state checks；
   - same-ID state-only server revision；
   - initial `savedEdits + savedBlockStates` hydration；
   - real `VoxelWorld.blockStates` overlay contract；
   - stale previous-state rejection；
   - live WebSocket client 保留 stateKey；
   - production runtime → real WebSocket stateful/state-only broadcast；
   - v5 → v6 handshake incompatibility boundary。

### PR #144 审查中发现并已修复的问题

- 旧 bootstrap 测试仍把 world edit snapshot 当纯数字 ID；已改为 `{id,stateKey}` identity contract。
- 第一版 overlay 错把真实 `VoxelWorld.blockStates` 写成不存在的 `blockStateSidecar`；fake test 同样用了错误名字，因此最初没有暴露。PR 级审查后已统一到生产 API，并同步测试。
- server terrain state fixture 曾在 fallback 分支使用不完整 Furnace key `facing=north`；Furnace canonical key 实际还要求 `lit=false`。测试已改用 LOG / STRIPPED_LOG 同 schema fixture，避免测试数据本身违反 canonical contract。

### 当前明确非目标

PR #144 **不**声明以下内容完成：

- mesh worker 已消费 block-state sidecar；
- horizontal log 已产生正确旋转模型；
- placement 已根据点击面生成 log axis；
- slab/stair/fence/door gameplay 已实现；
- farmland/wheat 已从历史 state-per-ID 迁移；
- multiplayer farming/random ticks/PvE/XP/durable world persistence 已完成。

尤其要注意：当前 `VoxelWorld.requestMesh()` 仍向 mesh worker 发送 dense block IDs；sidecar state 进入模型解释属于 Phase C。B2b 只保证状态真值不会在网络边界丢失。

## #144 合并门禁

必须同时满足：

1. 当前 **exact head** 的 Repository quality 完整成功；
2. JavaScript syntax 成功；
3. full logic/worker regression 成功；
4. Chromium shard 1/2 成功；
5. Chromium shard 2/2 成功；
6. PR 对 `main` behind=0；
7. reviews / unresolved review threads / blocking comments 清零；
8. 不用删除、放宽或绕过失败测试换绿灯。

旧 head 的绿色 CI 不授权新 head 合并。

## B2b 之后：Phase C1 log axis end-to-end

#144 合并后，不应直接批量上 stairs/doors。下一连续切片先用 log family 压测整条 state pipeline：

1. mesh/model worker payload 携带 sparse normalized state；
2. chunk meshing 按 cell identity 解析 Java blockstate variant；
3. oak log / stripped oak log 使用 `axis=x/y/z` 选择 canonical model rotation；
4. placement 根据点击面决定 axis；
5. break/drop 保持物品 identity，不把放置 state 错当 item identity；
6. singleplayer save/reload 后方向不丢；
7. multiplayer late join + incremental placement 后方向一致；
8. collision/selection 对 full-cube log 继续复用现有 cube contract，不在 renderer 内产生 gameplay truth。

完成 log 后再按依赖推进：

`slab → stair → fence → door → wood species breadth`

其中 slab/stair 需要先建立 property-aware collision/selection；fence 需要邻接重算；door 需要双 block 原子 mutation 与 interaction。不能把这些差异压成同一个“大量方块一次加入”的 PR。

## 后续长期顺序

1. Stateful families：Phase C → logs → slabs → stairs → fences → doors → species breadth；
2. Worldgen：biomes → caves/aquifers → ores/features → structures；
3. Server gameplay breadth：server-authoritative PvE/XP、durable world/block-entity persistence；
4. Farming：farmland trampling、exact crop random tick/light/neighbor formula、Fortune/loot tables、其它 crops/breeding；
5. 更广 status effects / enchanting / brewing / redstone / dimensions。

## 工程规则

- 只认 exact-head CI；
- `PROJECT_BASELINE.md` 只写 merged main；
- source asset availability ≠ runtime implementation；
- gameplay pure rules、browser presentation、server authority 分层；
- persistence / terrain version / starter slots / network state 是独立兼容性表面；
- multiplayer 缺失 authority 必须保持禁用，不通过 client-side fake authority 伪造完成度；
- stateful family 不通过 per-state block-ID 爆炸绕过 property system；
- 不通过降低测试、静默升级旧存档或删除失败覆盖来换绿色门禁。
