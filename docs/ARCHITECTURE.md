# 架构记录

本文描述当前 v0.4 开发线必须继续遵守的边界。Merged `main` 事实见 `PROJECT_BASELINE.md`，Minecraft Java 1.20.1 parity/roadmap 见 `MINECRAFT_1_20_1_FEATURE_MATRIX.md`。

## 核心原则

1. **玩法语义优先，旧 Java 实现细节不是兼容目标。** 复刻行为/资源语义，不复制历史渲染 API、主线程热点或资源泄漏。
2. **单客户端、多输入适配器。** Desktop/Touch 只产生统一 intent，不分叉 World/Player/Inventory 规则。
3. **数据优先。** Chunk、network snapshot、Inventory、Equipment、recipe、Furnace、tool/audio rules 尽量为 plain data / TypedArray / pure modules。
4. **重活离主线程。** Terrain 与 chunk meshing 进 Worker；主线程负责 input/orchestration/Three.js/WebAudio presentation。
5. **普通体素批处理。** Legacy full-cube 与 interpreted model 都保持 chunk-level batching，禁止一 block 一 Mesh 扩散。
6. **生命周期显式。** Chunk、weather、mob visuals、bed、projectiles、explosions、audio wrappers/listeners/cache owners 必须可 teardown。
7. **Client 不伪造 authority。** Multiplayer 中 server-owned movement/world/Inventory/Equipment/Crafting/Furnace/PvP 只从 server result 推进。
8. **Authority domains 独立 revision/sequence。** Movement、Inventory、Equipment、container、chat、command 不混成全局 revision。
9. **确定性与可验证性优先。** Browser/server 共用 deterministic rules；资源构建可重建；核心语义进入 Node regression。
10. **Source-backed 与 implemented 分开。** 文件存在只是 prerequisite；runtime binding + validation 才算 implemented。
11. **Presentation 不成为 gameplay truth。** CSS、Three.js、WebAudio 只能消费 state/event；不能决定 mining、damage、crafting 或 authority outcome。
12. **只认 exact-head。** 文档、测试与 CI 证据必须对应最终 branch HEAD。

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
                       \
                  chunk-level Three.js

Minecraft client resources --------------------> asset/model pipeline
Java 1.20.1 sound-object corpus ---------------> source audio mappings
                                                   |
                         +-------------------------+-------------------+
                         |                         |                   |
                    tool/block              mining-hit            mob voices
                         |                         |                   |
                         +-------------------------+-------------------+
                                                   |
                                             browser WebAudio
```

## Client runtime composition

`createClientGameplayRuntime()` / `ClientGameplayRuntime` 是 browser gameplay object graph 的构造/销毁边界。Singleplayer 与 Multiplayer 复用 World、Player、renderers 和 presentation systems；authority 由外层 session/adapter 决定。

要求：

- multiplayer 不复制第二套 World/renderer；
- input adapter 不直接修改 authoritative World/Inventory；
- UI 不预测 server-owned transaction result；
- browser-only Three.js/WebAudio 不泄漏进 Node pure rules；
- runtime dispose 释放自己拥有的 wrapper/listener/renderer。

`browser-bootstrap.js` 只安装页面级 presentation bridges（vanilla UI、Workbench、mining audio、world shell）；这些 installer 不能变成 gameplay state owner。

## Player presentation boundary

### Third-person wide Steve

`player-model-specs.js` 描述 body-part pivots/boxes/UV，`player-model-renderer.js` 只按语义动画部件。

PR #124 固定坐标约束：本地模型 yaw=0 面向 -Z，因此从玩家背后看 anatomical right 是 **+X**：

- `rightArm/rightLeg`：+X；
- `leftArm/leftLeg`：-X；
- primary/use 继续驱动 `rightArm`。

不能通过把 animation channel 改到 `leftArm` 来掩盖错误模型坐标。

### First-person viewmodel

`first-person-presentation-rules.js` 保存可测试 transform contract，`first-person-player-presentation.js` 构造 Three.js arm/sleeve/held-item geometry。

PR #124 修正的是 arm 的 shoulder→hand 几何方向，而不是把右手移动到错误屏幕侧。现阶段仍是兼容 viewmodel，不声称精确复现 Java equip progress / attack-strength 全 transform 链。

## Workbench UI boundary

3×3 crafting gameplay/authority 仍由 `CraftingGrid`、`ui.js` 与 multiplayer Workbench channel/server container 管理。

`vanilla-workbench-presentation.js` 只负责视觉：

- logical asset `gui.crafting_table_panel`；
- canonical Java 1.20.1 `textures/gui/container/crafting_table.png`；
- 2× panel 352×332；
- fixed craft/result/inventory/hotbar coordinates。

因此切换 UI 纹理/坐标不会改变 recipe matching、cursor transaction 或 server revision。

## World / rendering

`terrain-generator.js` 是 browser/server deterministic source；当前 generator v2 仍是简化 16×16×64 terrain，包含 surface/sea/oak tree/simplified iron ore。会改变 seeded bytes 的自然生成内容必须走 terrain compatibility/version。

`VoxelWorld` 管 chunk request/load/unload、edit overlay、Worker lifecycle、queries/raycast、remesh 与 GPU resource lifecycle。

Generic model pipeline 已是 live foundation：resource-id、model parent/texture inheritance、blockstate variants/multipart、element/model rotation、uvlock/cull/tint、deterministic dependency closure/model atlas、chunk-level opaque/cutout/translucent batching。Selected gameplay roots 已接入；broad registry、neighbor-state/collision breadth、animated texture、biome tint仍缺失。

Bed 继续走 paired special renderer；glass 是当前 interpreted translucent acceptance family。

## Minecraft resource architecture

`MC原版素材assets.zip` / extracted tree 是 Java 1.20.1 client texture/model source。规则：

- source asset ≠ gameplay support；
- source 与 derived runtime output 分离；
- direct canonical binding 必须显式 audit；
- missing/unsafe/cyclic dependency fail closed；
- generated output 可重建并 hash/byte 验证。

PR #124 增加 canonical Workbench GUI direct binding。Asset contract 对 item/block/GUI direct paths分别白名单，不允许“只要在原版目录就绕过 runtime boundary”。

## Original audio architecture

PR #122 提供独立 `原版Minecraft音频文件/` Java 1.20.1 sound-object corpus。当前 runtime 只接入一个窄子集。

### Shared block/tool source layer

`vanilla-sounds.js`：

- event → variants；
- SHA-1 object URL；
- fetch/decode cache；
- source event trace；
- current tool + grass/gravel/stone/sand/wood/glass block families。

当前 Java-style playback profile：

- break/place：`(volume + 1) / 2`，`pitch × 0.8`；
- normal step：`volume × 0.15`，original pitch。

`vanilla-block-audio.js` 是 local presentation wrapper：ordinary air↔block mutation + player footsteps。PR #124 将 footstep distance cadence 调整为 1.6 blocks，并继续对 flying/spectator/airborne/swimming/teleport-size frame movement reset/suppress。

### Mining audio

Gameplay controller 只产生 semantic hit，不拥有 WebAudio：

```text
SingleplayerMiningController
    | onHit / minecraft:mining-hit
    v
vanilla-mining-audio-runtime.js
    v
vanilla-mining-audio.js
    |-- source-backed block step variant as hit
    `-- early fetch current block break variants
```

规则：

- survival target acquisition 首 hit 立即；
- 持续 hit cadence ≈200 ms；
- target switch 重启；
- creative instant break 不走 survival hit loop；
- hit profile = 0.25 volume / 0.5 playbackRate；
- early break fetch 只降低 cold network latency，不声称完整 decode/preload scheduler。

### Mob voice audio

Passive/Hostile mob systems不直接依赖 WebAudio，只通过 `onSound({type,kind,position,...})` 产出 semantic presentation event。

`client-gameplay-runtime.js` 把该 event交给 `vanilla-mob-sounds.js`：

- current eight mobs 的 ambient/hurt/death subset；
- ambient 7–16 s sparse cadence；
- death 不再与 hurt 双播；
- local listener 为 24-block linear gain attenuation。

这个 attenuation 只是距离增益，不是 Minecraft 完整 positional audio，更不是 HRTF。未来真正 spatial system 应建立 listener/Panner/event bus，而不是继续把坐标逻辑塞进每个 mob system。

### Procedural fallback

`audio-system.js` 暂时保留尚未迁移的 swing/shoot/burn/prime/explosion 等表现事件。它不能被文档称为 source-backed Java audio。

### Future multiplayer audio

Authoritative replicated edits、remote players/mobs 未来应通过明确 network sound/presentation event channel 接入。不得为了“让 wrapper 响”而在客户端伪造 world mutation。

## Inventory / items / progression

`items.js`（definitions）、`item-stack.js`（instance state）、`inventory.js`（container）、`equipment.js`（equipment domain）、`recipes.js`（matcher）保持分层。

- damageable item 使用 instance `damage`；
- mining effectiveness 与 harvest eligibility 分开；
- melee profile 与 wear 分开；
- multiplayer transaction只发 intent，replacement state由 server 返回。

当前 progression through main #123：wood/stone/iron pickaxes，wood/stone/iron swords，iron axe/shovel/hoe，raw iron/Furnace/iron ingot chain。Iron armor 尚未实现。

## Tool secondary actions

- browser-neutral `tool-secondary-actions.js` 描述 till/strip/flatten legal mutation；
- server `tool-secondary-action-rules.mjs` 对齐语义；
- world mutation 与 tool wear 分开；
- survival commit 后 wear；creative no-wear；
- block→block mutation不被 ordinary block-audio 识别为 break+place。

未来扩展 broad registry 继续走 data/rules，不在 `main.js` 堆 item-specific branches。

## Furnace / block entities

Furnace 已有共享 3-slot processing core、fuel/cook timers、stored XP bookkeeping、singleplayer persistence 与 multiplayer authoritative viewers/revisions。

仍缺 durable server storage、server-owned XP extraction、facing/lit parity、loaded-chunk scheduling、broad recipes/fuels、hopper automation。Chest/barrel 需要 generic durable block-entity storage，不能复制 transient Workbench。

## Entities / PvE authority

当前八类 mob 使用 EntityStore/SpatialHash + local low-frequency AI。Gameplay state/hitbox、model texture/geometry、sound presentation保持分层。

**mob/PvE/projectile/explosion 仍不是 multiplayer server-authoritative domain。** 迁移时 server 应拥有 identity/spawn/AI/navigation/combat/projectile/explosion/loot/XP，browser 只消费 snapshots/events并复用 renderer/audio presentation。

## Multiplayer authority domains

当前 server-owned：session/handshake/input validation、movement/collision、player snapshots、world edits、mining/placement、till/strip/flatten、ground items、Inventory/cursor/item damage、Equipment、2×2 crafting、Workbench、Furnace、chat/commands、PvP HP/melee/armor/knockback/death/respawn。

跨域 transaction 显式验证 involved revisions并原子提交。

尚未 server-owned：mobs/PvE/projectiles/explosions、XP/levels、durable persistence/account/product layers、广泛 replicated sound events。

## Persistence

Singleplayer IndexedDB 保存 deterministic base 之外的 edit overlay 与当前 player/world/Inventory/Equipment/Furnace state；generated chunks 不整块持久化。

Multiplayer 当前主要是 process runtime state。未来 durable server storage应有独立 versioned world/player/block-entity schema，不复用 browser IndexedDB。

## Quality gates

Feature delivery只认最终 exact branch HEAD：

1. Node/JavaScript syntax；
2. auto-discovered logic/Worker/server regressions；
3. two Chromium shards；
4. affected asset/source/generated audits；
5. browser integration for Three.js/CSS/WebAudio/HTTP boundaries；
6. base drift + review/thread/comment surface；
7. docs/matrix 与代码一致；
8. Ready 前 exact head 全绿。

PR #124 特别要求 browser直接验证 anatomical limb sides、first-person actual Mesh transforms、Workbench computed geometry、mining-hit event bridge 与 source sound-object HTTP response，而不是只检查字符串或 mock。
