# 架构记录

本文只描述当前 `main` 已经建立的架构边界，以及下一阶段允许如何扩张。完整功能完成度见 [`PROJECT_BASELINE.md`](PROJECT_BASELINE.md) 和 [`MINECRAFT_1_20_1_FEATURE_MATRIX.md`](MINECRAFT_1_20_1_FEATURE_MATRIX.md)。

## 核心设计原则

1. **玩法语义优先，旧实现细节不是兼容目标。** 目标是复刻 Minecraft 玩法/交互，不复制 Java Edition 的历史渲染 API、主线程热点或资源生命周期问题。
2. **单客户端、多输入适配器。** Desktop/Touch/Future Gamepad 只产生统一 gameplay intent，不得分叉 World/Player/Inventory/规则。
3. **数据优先。** 区块、网络快照、Inventory、Equipment、配方、规则尽量保持 plain data / TypedArray / pure modules。
4. **重活离开主线程。** terrain generation 和 chunk meshing 由 Worker 执行；主线程负责输入、系统编排、Three.js 对象安装与表现。
5. **普通体素批处理。** 不使用“一方块一 Mesh”。完整方块保持 chunk fast path；特殊模型只在必要时走 special/model path。
6. **GPU 生命周期显式。** Chunk remesh/unload、world teardown、mob model cache、bed renderer、weather、projectiles 等必须释放资源。
7. **Client 不得伪造 authoritative state。** Multiplayer 中位置、世界 mutation、Inventory、Equipment、Crafting、PvP 等已进入 server authority 的域只能从服务器状态推进。
8. **不同 authority domain 使用独立 revision/sequence。** 不把 movement tick、Inventory revision、Equipment revision、chat seq、command request id 等混成一个全局序列。
9. **确定性与可验证性优先。** Browser/server 共用 deterministic terrain rules；资源导入可重建并校验 checksum；核心 pure rules 进入 Node regression。
10. **文档不得超前声称完成。** Architecture groundwork 只能把 feature matrix 推到 `FOUNDATION`/`PARTIAL`；只有真实玩法和质量门闭环才能记 `DONE`。

## 总体运行图

```text
DesktopControls ----\
                     > ControlIntentBus ----> singleplayer gameplay adapters
MobileControls  ----/                \
                                   MultiplayerMovementSession
                                             |
                                             v
                                      WebSocket protocol
                                             |
                                             v
                                  AuthoritativeServerRuntime
                                      /      |       \
                              player sim   world    state hubs
                                  |          |        |
                                  +----------+--------+
                                             |
                                  authoritative snapshots/results
                                             |
                                             v
                                    browser presentation

seed + prompt
    |
    +--> shared terrain-generator.js
            |                    |
            v                    v
      browser Worker       ServerTerrainWorld
            |
            v
      mesh-worker.js
        /    |     \
   opaque  water  specials
      |       |      |
      v       v      v
 chunk mesh water  BedModelRenderer / future model interpreter
```

## Client Runtime

`createClientGameplayRuntime()` / `ClientGameplayRuntime` 是浏览器玩法对象图的共享构造边界。Singleplayer 和 Multiplayer 可以复用 World/renderer/UI 侧对象，但 authority 决策由外层 adapter 决定。

核心要求：

- 不为 multiplayer 再复制一套 World/renderer/gameplay class；
- 不在 input adapter 中直接修改 World/Inventory；
- 不在 UI 中预测已经 server-authoritative 的结果；
- runtime dispose 必须关闭其拥有的系统和 GPU resources。

## Platform / Input

### Local intent

`ControlIntentBus` 是设备无关 gameplay input contract。

- `desktop-controls.js`：Keyboard/Mouse/Pointer Lock → canonical intent；
- `mobile-controls.js`：touch/joystick/buttons → canonical intent；
- Player/gameplay 只消费 canonical control/look/action，不根据设备类型改变玩法规则。

当前浏览器安全约束：疾跑保留 double-W，并使用 `R` 作为 hold sprint；不再把 Ctrl 作为 intended gameplay sprint chord。

### Network input

Multiplayer wire 将 input 拆为不同语义帧：

- control：连续移动/跳跃/潜行/疾跑/primary state；
- view：绝对 yaw/pitch；
- action：use/drop/hotbar/attack/respawn 等离散动作；
- command/chat/inventory/equipment/crafting/workbench：独立协议域。

客户端不发送可信 block/entity target。需要目标的动作由服务器结合 authoritative player position + referenced accepted view 自行 raycast/validate。

## World / Terrain

### Deterministic base world

`terrain-generator.js` 是 browser/server 共用的纯 deterministic terrain baseline。

当前仍是简化 heightmap/fBm world：

- 16×16×64 chunk；
- stone/dirt/grass/sand/water；
- oak tree；
- prompt 只调整 amplitude/sea/forest/sand 参数。

未来 biome/caves/ores/features/structures 必须在这个“共享 deterministic source”原则上升级，不能让 browser 和 server 各自实现一份生成器。

### Browser world

`VoxelWorld` 管理：

- chunk request/load/unload；
- voxel edits overlay；
- terrain/mesh Worker lifecycle；
- opaque/water/special visual chunk records；
- raycast/query；
- GPU object disposal。

### Server world

`ServerTerrainWorld` 管理 deterministic base + sparse authoritative edit overlay。

原则：

- generated baseline 不直接被 mutation 改写；
- edit overlay 独立于 chunk cache；
- revision 只由真实 mutation 推进；
- browser bootstrap/live edit replication 只能消费 server truth。

当前 server world edits 仍是运行期 authoritative state，不是 durable world database；多人持久化是后续独立工作。

## Chunk Meshing / Rendering Layers

### Full-cube fast path

`mesh-worker.js` 负责普通体素可见面合并，输出 TypedArray/Transferable buffers。

当前主要 pass：

- opaque；
- water transparent pass；
- `specials` descriptors（当前用于 bed，未来可承接通用 model path）。

### Water

水拥有独立 transparent material/pass，同水内部面会剔除。当前没有 vanilla fluid level/flow/propagation/dynamic surface。

### Bed special renderer

Bed gameplay 仍使用四方向 × foot/head block state IDs，但视觉已经从 full cube mesh 移出：

- `blocks.js` 标记 `fullCube:false` / `renderKind:'bed'`；
- mesh Worker 输出 bed special descriptors；
- `BedModelRenderer` 使用 `entity.bed.red` texture 构建 partial geometry；
- special group 跟随 chunk remesh/unload 生命周期；
- bed gameplay collision 与 visual geometry 明确分离。

这个模式是下一阶段 generic block model renderer 的直接参考，但普通模型不能全部变成主线程一个 block 一个 Mesh。

## Asset Architecture

### Source

仓库跟踪 `MC原版素材assets.zip`，确定性审计已经确认其中包含大量 1.20.1 block/item/entity textures、block models、item models 和 blockstates。

### Runtime manifest

`asset-manifest.js` 使用逻辑 key → runtime resource 映射；已导入的资源带来源/manifest/checksum 证据。

当前原则：

- 不因为资源 ZIP 中存在某文件就声称玩法支持；
- 不为缺失资源伪造“原版素材”；
- importer 选择性、可重建、可 checksum 验证；
- source asset 与 derived runtime asset provenance 分离。

### Missing audio

当前 supplied ZIP 没有 sound files / `sounds.json`，因此 audio 是明确 blocked domain，不能在文档中假装“原版声音已经具备”。

## 下一阶段：Minecraft JSON Model Interpreter

这是从手工内容扩张切换到批量内容扩张的关键架构。

### 解析层（Node/browser-neutral）

目标模块不能依赖 Three.js/DOM/Worker：

```text
resource id
   |
   v
model resolver
   |- parent inheritance
   |- texture variables
   |- elements/faces/uv
   |- element rotation
   |- cycle/missing validation
   v
normalized model spec
```

Blockstate resolver：

```text
block properties
   |
   +--> variants -> model alternatives/weights
   |
   +--> multipart -> condition matching
   v
resolved model instances
```

### 编译/渲染层

- full cube 必须保留现有 fast path；
- non-full/multipart model 编译为 mesh-worker 可消费的纯数据 spec；
- texture binding 通过 logical resource layer；
- rendering geometry 不自动等于 collision shape；
- transparent/cutout/opaque render layer 需要显式分类；
- weighted variant 的随机输入必须 deterministic，不能刷新页面后任意变化。

### 首批 acceptance blocks

用少量 representative blocks 覆盖解释器能力：

- iron ore：full cube registry/resource；
- glass：transparent cube；
- oak slab：partial cuboid；
- oak stairs：multiple cuboids + state；
- oak door：paired/stateful block；
- oak fence：multipart/neighbor state；
- torch：non-full model；
- tint-index representative block。

解释器通过后才批量扩展 registry，避免为每个 block 重复手写 renderer。

## Inventory / Equipment / Crafting

Singleplayer 有本地 Inventory/Equipment/CraftingGrid models。

Multiplayer 已拆成独立 authoritative domains：

- Inventory snapshot/transaction + carried cursor；
- Equipment snapshot/transaction，涉及 cursor 时同时验证 Inventory/Equipment revisions；
- permanent 2×2 player crafting；
- transient 3×3 Workbench container。

客户端发送操作意图，不发送可信 replacement slots/result/recipe output。

未来 chest/furnace 不能直接复用 transient Workbench 语义，因为它们需要：

- persistent block entity state；
- chunk/world storage；
- multi-viewer concurrency；
- container-specific processing/update rules。

## Player / Survival

Singleplayer 当前拥有 HP/death/respawn、oxygen/swimming、weather、XP、Equipment、bed 等已实现 slices。

这些系统的 pure rule modules 与 presentation/runtime orchestration 分离。新增 survival progression 应继续遵守：

- item/block definitions 不直接写 UI；
- recipe/mining/damage/status rules 可 Node 测试；
- visual state 不应成为 gameplay truth；
- transient state 不无条件进入 world save。

## Entities / PvE

当前八类 mob 的本地 AI 使用 EntityStore/SpatialHash 和低频 AI tick，visual renderer 与 gameplay hitbox/state 分离。

重要边界：

**现有 mob/PvE/projectile/explosion 还不是 multiplayer server-authoritative domain。**

下一阶段迁移时应：

1. 将 mob identity/state 生命周期放到 server；
2. server 执行 spawn/AI/navigation/combat；
3. projectile/explosion 在 server 做命中和 world mutation；
4. server 生成 loot/item entities/XP；
5. browser 只插值/表现 authoritative mob snapshots/events；
6. 复用现有 mob texture/model renderer，不重写视觉。

## Multiplayer Authority Domains

当前服务器已拥有：

- session/handshake/input validation；
- player movement/collision；
- self + remote player snapshots；
- world info/edit state；
- mining/placement；
- ground item entities/pickup；
- item-instance durability state；
- Inventory/cursor；
- Equipment；
- player crafting；
- Workbench；
- chat；
- command execution boundary；
- PvP HP/melee/armor/knockback/death/respawn。

每个 domain 保持自己的 revision/request/sequence。跨域 transaction（例如 Equipment ↔ Inventory cursor）必须显式验证所有涉及 revisions 并原子提交。

## Persistence

### Singleplayer

IndexedDB 当前保存 deterministic world 的 edit overlay 和已实现的 player/world state。世界生成 baseline 不整块写入数据库。

### Multiplayer

当前 authoritative server state 主要是进程运行期状态。正式 durable server persistence 尚未完成。

后续 server persistence 不得直接复用浏览器 IndexedDB schema；应定义服务器自己的 durable world/player/block-entity storage boundary，并提供 migration/versioning。

## Quality Gates

当前交付原则：

1. JavaScript/Node syntax；
2. auto-discovered logic/contract/Worker/server integration regressions；
3. Chromium E2E shards；
4. asset changes额外执行 source archive / generated bytes / manifest checksum audit；
5. exact-head CI green；
6. base drift/review surface 检查；
7. squash merge。

PR #94 baseline 的 Repository quality：131 logic/worker regressions + 两个 Chromium shards 全绿。

## 明确技术债 / 后续边界

- generic blockstate/model interpreter 尚未实现；
- world height 仍为 64，worldgen 仍是简化 heightmap；
- no vanilla biome/cave/ore/structure pipeline；
- no fluid propagation/lava；
- no full hunger/food/farming/smelting progression；
- no redstone neighbor update/scheduled tick/power system；
- no durable multiplayer persistence/accounts/rooms/operators；
- no server-authoritative PvE；
- no Nether/End；
- no audio source/AudioEngine；
- long-session memory/load/soak coverage 仍需加强。

这些缺口的优先级和完成度只在 feature matrix 中维护，不再在多份文档里各写一套互相漂移的 TODO。