# 架构记录

本文描述当前 v0.4 开发线已经建立、后续必须继续遵守的架构边界。完整 merged `main` 事实见 [`PROJECT_BASELINE.md`](PROJECT_BASELINE.md)，Minecraft Java 1.20.1 完成度和缺口见 [`MINECRAFT_1_20_1_FEATURE_MATRIX.md`](MINECRAFT_1_20_1_FEATURE_MATRIX.md)。

## 核心设计原则

1. **玩法语义优先，旧实现细节不是兼容目标。** 目标是复刻 Minecraft 行为/资源语义，不复制 Java Edition 的历史渲染 API、主线程热点或资源泄漏问题。
2. **单客户端、多输入适配器。** Desktop/Touch/Future Gamepad 只产生统一 gameplay intent，不得分叉 World/Player/Inventory 规则。
3. **数据优先。** Chunk、network snapshot、Inventory、Equipment、recipe、Furnace、tool rules 尽量保持 plain data / TypedArray / pure modules。
4. **重活离开主线程。** Terrain generation 和 chunk meshing 进入 Worker；主线程主要负责输入、系统编排、Three.js object installation 与 presentation。
5. **普通体素必须批处理。** 不允许“一方块一 Mesh”扩散。Full-cube fast path 和 interpreted model path 都要保持 chunk-level batching。
6. **生命周期显式。** Chunk、weather、mob models、bed renderer、projectiles、explosions、audio wrappers/cache owners 等必须有明确 dispose/teardown 边界。
7. **Client 不得伪造 authoritative state。** Multiplayer 中已经 server-owned 的 movement/world/Inventory/Equipment/Crafting/Furnace/PvP 等域，只能从服务器结果推进。
8. **Authority domain 独立 revision/sequence。** Movement tick、Inventory revision、Equipment revision、container revision、chat seq、command request id 不混成一个全局序列。
9. **确定性和可验证性优先。** Browser/server 共用 deterministic terrain/gameplay pure rules；资源构建可重建/checksum；核心语义进入 Node regression。
10. **Source-backed 与 implemented 是两个条件。** 资源文件存在只证明 input 可用；必须有 runtime binding + validation 才能提升玩法/渲染/音频 parity。
11. **文档不得超前。** `FOUNDATION`/`PARTIAL`/`DONE` 必须与真实运行路径、authority 和 exact-head 质量证据对应。

## 总体运行图

```text
DesktopControls ----\
                     > ControlIntentBus ----> local singleplayer actions
MobileControls  ----/                \
                                   MultiplayerMovementSession
                                             |
                                             v
                                      WebSocket protocol
                                             |
                                             v
                                  AuthoritativeServerRuntime
                                  /      |        |        \
                              movement  world   state hubs  containers
                                  |       |        |            |
                                  +-------+--------+------------+
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
       /      |       \
 legacy   model batches  specials
 opaque/      |            |
 water        v            bed
       opaque/cutout/translucent

Minecraft resources
    |
    +--> resource-id / blockstate / model resolver
    |        |
    |        v
    |   normalized model instances
    |        |
    |        v
    |   model-atlas binding -> mesh-worker chunk batches
    |
    +--> source audio objects -> vanilla-sounds event registry
                                  |
                                  +--> tool sounds
                                  +--> block break/place/step
```

## Client runtime composition

`createClientGameplayRuntime()` / `ClientGameplayRuntime` 是 browser gameplay object graph 的共享构造/销毁边界。Singleplayer 和 Multiplayer 复用 World、Player、renderers 和 presentation systems，但 authority 由外层 adapter/session 决定。

要求：

- 不为 multiplayer 复制另一套 World/renderer；
- input adapter 不直接修改 authoritative World/Inventory；
- UI 不预测已经 server-owned 的 transaction result；
- runtime dispose 必须释放其拥有的 visual/audio/world systems；
- browser-only Three.js/WebAudio 不泄漏进应由 Node 执行的 pure rules。

## Input 与 action routing

### Local intent

`ControlIntentBus` 是设备无关输入 contract：

- `desktop-controls.js`：keyboard/mouse/Pointer Lock → canonical intent；
- `mobile-controls.js`：touch/joystick/buttons → canonical intent；
- gameplay 只消费 control/look/action，不根据 device type 修改规则。

### Network input

Multiplayer wire 按语义拆分 control/view/action/chat/command/Inventory/Equipment/Crafting/Workbench/Furnace 等 domain。客户端不发送可信 block/entity target；需要 target 的 action 由服务器基于 authoritative position + accepted view raycast/validate。

## World / terrain

### Shared deterministic base

`terrain-generator.js` 是 browser/server 共用的 deterministic source。当前 generator v2 仍是简化世界：

- 16×16×64 chunk；
- stone/dirt/grass/sand/water surface；
- oak trees；
- deterministic underground iron ore；
- prompt 调整 coarse amplitude/sea/forest/sand 参数。

自然生成内容改变 seeded world bytes 时必须显式更新 terrain compatibility/version，不能静默改变 multiplayer 世界身份。

### Browser `VoxelWorld`

负责：

- chunk request/load/unload；
- local/saved edit overlay；
- terrain/mesh Worker lifecycle；
- legacy/model/special visual records；
- block query/raycast；
- chunk remesh dependencies；
- GPU geometry/material lifecycle。

### Server world

`ServerTerrainWorld` 负责 deterministic base + sparse authoritative edit overlay。Generated baseline 与 mutation overlay 分离，world revision 只在真实 mutation 后推进。

当前多人 edits/Furnace state 主要仍是 process-memory authority，不是 durable world database。

## Chunk meshing / rendering

### Legacy fast path

普通当前体素仍可走快速 visible-face chunk batching，opaque 和 water 独立 pass。

### Generic Minecraft model pipeline

这部分已经从“下一阶段设计”进入 live runtime foundation，不再是 TODO-only：

- `minecraft-resource-id.js`：safe logical resource identity；
- model resolver：parent inheritance、texture variables、elements/faces；
- blockstate resolver：variants、weighted alternatives、multipart conditions；
- geometry/instance rules：element rotation、model rotation、`uvlock`、cull/tint；
- deterministic dependency closure；
- generated model texture atlas + strict provenance binding；
- `minecraft-model-mesh-batch.js`：renderer-neutral faces → chunk-level opaque/cutout/translucent TypedArrays；
- mesh Worker / VoxelWorld 对 selected gameplay model roots 走真实 interpreted path。

当前 live roots 已包括 crafting table、iron ore、glass、furnace，并在 #123 扩展到 farmland/dirt path/stripped oak log 等当前 player-created states。

仍未解决：broad registry、通用 neighbor-driven state、复杂 collision shape、animated texture、biome tint、更多透明排序 edge cases、item model 全量解释。

### Bed

Bed 继续使用独立 special renderer：逻辑为 four-facing × foot/head paired state；mesh Worker 输出 descriptor；`BedModelRenderer` 使用 source-backed red-bed entity texture 构建 partial geometry。Gameplay collision 与 visual geometry 分离。

### Glass / translucent layer

Glass 是当前 interpreted translucent layer 的 acceptance block。Same-type internal face 会剔除，但 stained glass/panes/更复杂透明排序仍未覆盖。

## Minecraft resource architecture

### Client texture/model source

`MC原版素材assets.zip` 是 Java 1.20.1 client resource input。Selective importer、dependency closure 和 atlas builder 保留 source/runtime provenance 与 deterministic rebuild contracts。

基本规则：

- 资源在 ZIP 中 ≠ gameplay 已支持；
- source asset 与 derived runtime output 分离；
- direct canonical binding 必须审计；
- missing/unsafe/cyclic dependencies fail closed；
- generated output 必须可重建并 byte/hash 验证。

### Separate original audio source

PR #122 增加独立 `原版Minecraft音频文件/` Java 1.20.1 sound-object corpus 和 mapping metadata。因此“没有原版声音 source”已经不是当前事实。

但 audio runtime 仍是 PARTIAL：

- `vanilla-sounds.js`：source-backed event→variant registry、SHA-1 object URL、fetch/decode cache；
- `vanilla-block-audio.js`：ordinary air↔block break/place + local distance-driven footsteps；
- #123 首批 tool events：hoe till、axe strip、shovel flatten；
- #123 首批 block sound types：grass/gravel/stone/sand/wood/glass break/place/step；
- `audio-system.js` 仍保留 #121 procedural fallback，服务尚未迁移的 swing/shoot/burn/prime/explosion 等表现事件。

Java SoundType 当前播放语义：

- break/place：`(volume + 1) / 2`，`pitch × 0.8`；
- normal step：`volume × 0.15`，原 `pitch`。

当前尚无 generalized generated sound registry、remote footsteps、multiplayer replicated edit SFX、完整 entity/ambient/weather source audio、spatial attenuation/HRTF 或 music scheduling。

## Inventory / items / crafting

`items.js`、`item-stack.js`、`inventory.js`、`equipment.js` 和 `recipes.js` 保持 definitions / instance state / containers / matching 的分层。

原则：

- item definition 不直接修改 UI；
- damageable item 使用 instance `damage`，不能把耐久写成全局 item definition state；
- mining effectiveness 与 harvest/drop eligibility 分离；
- melee damage/attack interval/durability wear 分离；
- multiplayer transaction 只发送 intent，replacement slots/result 由 server 决定。

当前 v0.4 progression 已覆盖 wooden/stone/iron pickaxes、wooden/stone/iron swords、iron axe/shovel，并由 #123 增加 iron hoe。

## Tool secondary actions

#123 建立新的规则边界：

- browser-neutral `tool-secondary-actions.js` 描述 till/strip/flatten 的合法 mutation；
- server `tool-secondary-action-rules.mjs` 与客户端语义对齐；
- world mutation 与 tool wear 分开；
- survival 仅在 mutation commit 后 wear；
- creative authoritative action no-wear；
- block→block mutation不被 ordinary block-audio wrapper误认为 break+place。

未来扩展 broad strippable/flattenable/tillable registry 时继续增加 data/rules，不为每个 item 在 `main.js` 写特殊分支。

## Furnace / processing architecture

Furnace 已经不是“未来容器”概念，而是共享 processing core：

- 3-slot state；
- fuel/burn/cook timers；
- deterministic recipe processing；
- stored XP bookkeeping；
- persistent singleplayer binding；
- authoritative multiplayer container/process binding；
- multiplayer shared viewers/revisions。

尚缺：durable server storage、server-owned XP extraction、dynamic facing/lit blockstate parity、loaded-chunk scheduling、broad recipes/fuels、hopper automation。

Chest/barrel 仍需要 durable block-entity storage + shared viewer concurrency，不能简单复制 transient Workbench。

## Player / survival / combat

Pure rules 与 presentation/orchestration 分离：

- death/respawn/sleep/oxygen/swim/XP 等尽量保持可测试 state transition；
- visual effect 不成为 gameplay truth；
- transient state 不无条件进入 save；
- current melee profile 是 full-charge/hard-minimum-interval approximation，不得称为完整 Java attack-strength curve。

## Entities / PvE

当前八类 mob 的本地 AI 使用 EntityStore/SpatialHash 和低频 AI tick；source-textured model/presentation 与 gameplay hitbox/state 分离。

重要边界仍然是：**mob/PvE/projectile/explosion 不是 multiplayer server-authoritative domain。**

迁移时 server 应拥有 mob identity/spawn/AI/navigation/combat/projectile/explosion/loot/XP；browser 只消费 authoritative snapshot/event 并复用现有 renderer。

## Multiplayer authority domains

当前服务器已拥有：

- session/handshake/input validation；
- movement/collision；
- self/remote snapshots；
- world edit state；
- mining/ordinary placement；
- #123 till/strip/flatten authoritative block use；
- ground item entities/pickup；
- Inventory/cursor/item damage；
- Equipment；
- player crafting；
- Workbench；
- Furnace；
- chat；
- command boundary；
- PvP HP/melee/armor/knockback/death/respawn。

跨域 transaction 必须显式验证所有 involved revisions 并原子提交。

尚未 server-owned：mobs/PvE/projectiles/explosions、XP/levels，以及 durable persistence/account/product layers。

## Persistence

### Singleplayer

IndexedDB 保存 deterministic base 之外的 edit overlay，以及当前已实现的 player/world/Inventory/Equipment/Furnace state。Generated chunks 不整块持久化。

### Multiplayer

当前 authority 主要为 process runtime state。未来 durable server persistence 应定义自己的 versioned world/player/block-entity storage，不复用浏览器 IndexedDB schema。

## Original block audio runtime boundary

`vanilla-block-audio.js` 以 presentation wrapper 的形式挂接 local `world.setBlock` 和 `player.update`：

- non-air→air 才是 ordinary break；
- air→non-air 才是 ordinary place；
- block→block 不发 ordinary sound；
- `sound:false` 可让 explosion 等批量系统静音；
- paired bed ordinary sound 去重；
- footstep 依据水平移动距离累计，不依据 render FPS；
- flying/spectator/non-grounded/swimming/teleport-sized frame move 抑制/重置 footstep cadence；
- dispose 恢复原始 methods，避免切世界后的 wrapper 泄漏。

这个 wrapper 是当前 local presentation 层，不是未来 multiplayer spatial event bus 的最终形态。Authoritative replicated edits/remote players 应通过明确 network event/presentation channel 接入，而不是让客户端伪造 world mutation 来触发声音。

## Quality gates

Feature delivery 只认 exact branch HEAD：

1. JavaScript/Node syntax；
2. auto-discovered logic/contract/Worker/server regressions；
3. two Chromium E2E shards；
4. affected asset source/generated checksum audits；
5. base drift + review/thread/comment surface；
6. 文档/feature matrix 与代码 state 对齐；
7. Ready 前当前 exact head 必须全绿。

音频额外要求：

- source OGG variant 必须绑定并验证真实 SHA-1 object；
- mapping 字符串不能替代对象实体校验；
- browser acceptance 对 source audio 至少要覆盖真实 HTTP fetch/decode boundary；
- pure wrapper/routing/cadence semantics 用 Node regression 覆盖。

## 当前明确技术债

- world height 仍为 64，worldgen 仍是简化 heightmap；
- no vanilla biome/cave/aquifer/structure pipeline；
- block/item registry breadth 很低；
- generic neighbor state/collision-shape/scheduled tick framework 不完整；
- no fluid propagation/lava system；
- hunger/food/farming/breeding depth 不完整；
- iron armor/armor durability 尚缺；
- no redstone update/power graph；
- no durable multiplayer persistence/accounts/rooms/operators；
- no server-authoritative PvE/XP；
- no Nether/End；
- original audio runtime 仍只覆盖首批事件，没有 spatial/music/broad entity/environment parity；
- long-session memory/load/soak 与 real-device/browser matrix 仍需扩大。

这些缺口的优先级和完成度只在 feature matrix 中维护，避免多份文档再生成互相漂移的 TODO 清单。
