# Minecraft Web - 当前开发进度

更新时间：2026-08-21

当前事实以 GitHub `main`、`docs/PROJECT_BASELINE.md`、`docs/MINECRAFT_1_20_1_FEATURE_MATRIX.md` 和当前交付 PR 的 exact head 为准。本文只维护已合并基线、正在进行的交付、验证证据和紧邻下一步。

## 当前主线

项目仍处于 `v0.4.0-dev`。严格按 Minecraft Java 1.20.1 完整玩法/内容口径，整体规划完成度继续保守维持约 **35%**。工具行为和原版音效开始形成真实闭环，但这并没有解决大规模 registry、维度、redstone、farming、enchanting、server PvE 等主要缺口。

当前 `main`：

`95fabd9294c0e9a0b38658a4978d912cf6c5d77b`

当前 main 已包含：

- #120：source-backed iron sword + shared held-item melee profiles；
- #121：第一人称 3D viewmodel、wood/stone swords、hostile/combat presentation、explosion gameplay closure；
- #122：导入并跟踪 Minecraft Java 1.20.1 原版音频对象集及映射表，解除“仓库没有 sound objects”的资源阻塞。

注意：#122 只意味着原版音频**资源可用**，不等于完整 sound registry / SFX / music 已接入运行时。

## 当前进行中：PR #123 Iron hoe + secondary tool actions + first original block/tool sounds

PR：#123

分支：`content/v0.4-iron-hoe-secondary-actions`

当前基线：`main 95fabd9294c0e9a0b38658a4978d912cf6c5d77b`

pre-doc 实现稳定 exact head：`c9bd6b9eba8bcf02272d2d7844bad64895fd0440`

### #123 交付内容

1. Iron hoe progression
   - 注册 source-backed Java 1.20.1 `iron_hoe`；
   - 标准/镜像 3×3 工作台配方：2 iron ingot + 2 sticks；
   - iron tier speed 6、250 durability；
   - 保持 item-instance damage 生命周期和现有 UI durability presentation；
   - canonical `iron_hoe.png` 直接绑定经过 asset audit 和 SHA-256 contract。

2. Secondary tool actions
   - 新增 append-only player-created states：`FARMLAND=24`、`DIRT_PATH=25`、`STRIPPED_OAK_LOG=26`；
   - iron hoe：grass/dirt → farmland；
   - iron axe：oak log → stripped oak log；
   - iron shovel：grass/dirt → dirt path；
   - 规则层检查顶部空间、命中面等成功条件；
   - 只有真实 world mutation 成功后才消耗 survival tool durability；
   - creative authoritative path 复用同一行为规则但不消耗耐久；
   - singleplayer 和 authoritative multiplayer server use-controller 共用确定性 secondary-action semantics。

3. Player-created block visuals/assets
   - farmland / dirt path / stripped oak log 进入当前 gameplay block registry；
   - stripped oak log 使用 Java 1.20.1 canonical side/top textures，并为 Inventory/hotbar 提供 source-face preview；
   - farmland / dirt path / stripped log 已进入 Java model registry / acceptance roots；
   - 当前状态仍是有限 registry 接入，不意味着所有可耕作/可去皮/可铲平方块族已经覆盖。

4. Source-backed original tool sounds
   - `item.hoe.till`、`item.axe.strip`、`item.shovel.flatten` 从 #122 导入的原版 sound objects 解析并播放；
   - 每个 variant 由 SHA-1 + Java 1.20.1 logical path 明确绑定；
   - 成功行为才播放，失败 use 不播放成功音，也不消耗耐久；
   - Chromium E2E 会等待真实原版 OGG HTTP 响应并验证 decode，不允许只发 synthetic trace 假装成功。

5. First original block interaction sounds
   - 新增独立 `vanilla-block-audio` presentation layer；
   - 当前 gameplay block sound types 覆盖 grass / gravel / stone / sand / wood / glass；
   - 现有方块族获得 break/place/step 的 Java 1.20.1 source-backed OGG；
   - bed 按 Java 1.20.1 `SoundType.WOOD` 处理；glass break 使用原版 glass variants，而 glass place/step 按 Java `SoundType.GLASS` 的 stone-backed事件族处理；
   - 玩家脚步按真实水平移动距离累计触发，不按帧率触发；
   - tool 的 block→block 转换不会误播普通 break/place；
   - explosion 批量删块显式静音，避免一场爆炸启动几十个 break OGG；
   - 两格床避免 partner 重复播放同一普通方块音。

6. Audio architecture boundary
   - `vanilla-sounds.js` 负责 source-backed sound event / variants / decode cache；
   - `vanilla-block-audio.js` 负责 block transition 与 local-player step presentation；
   - 旧的 `audio-system.js` procedural profiles 仍保留给尚未迁移的 swing/shoot/burn/prime/explosion 等事件；
   - 当前原版声音接入仍主要是 singleplayer/local runtime；authoritative multiplayer replicated world edits、远端玩家脚步、完整实体声、环境声和空间衰减尚未形成完整 parity。

### pre-doc 实现稳定证据

exact head `c9bd6b9eba8bcf02272d2d7844bad64895fd0440` 已通过 Repository quality run #941：

- static-checks：JavaScript syntax + 自动发现的 logic/server/Worker regressions 全部 PASS；
- source-backed sound contract 会读取仓库中的真实 OGG 并重算 SHA-1；
- Chromium shard 1/2：**24/24 PASS**，无 retry；其中 `iron-hoe-secondary-action.spec.mjs` 实际合成铁锄、右键 grass、验证耐久 250→249，并等待真实 `item.hoe.till` OGG 请求/解码；
- Chromium shard 2/2：**23/23 PASS**，无 retry；覆盖 authoritative multiplayer、persistent Furnace、durability、smoke/world-selection 等长期回归；
- 两路 browser failure artifact upload 均 skipped，因为没有失败；
- branch 相对 main：behind=0。

以上只作为 **pre-doc** 稳定证据。文档提交会产生新的 exact HEAD；最终 Ready / merge 不继承旧 head 绿灯，必须重新跑完整 Repository quality。

## #123 明确不做

- 全材料等级的 hoe/axe/shovel secondary-action breadth；
- farmland hydration、crop planting/growth、scheduled ticks；
- 所有 Java 1.20.1 strippable logs / flattenable blocks / hoe-effective families；
- item model JSON 全量解释；
- 完整 Minecraft sound registry / `sounds.json` semantics；
- music playback、ambient/cave/weather source audio；
- entity 全量 source-backed sounds；
- positional/spatial attenuation、listener/HRTF、远端玩家脚步；
- multiplayer replicated block-edit SFX parity；
- 用原版音频完全替换 #121 的 procedural fallback layer。

因此 #123 只能把 iron hoe、secondary tool actions 和 Audio/SFX 对应项目提升为 **PARTIAL**，不能据此声称 farming、tool breadth 或 audio parity 完成。

## #123 最终收口门槛

只有以下条件同时满足才允许 Ready：

1. branch 仍基于 `main 95fabd9294c0e9a0b38658a4978d912cf6c5d77b` 且 behind=0；
2. iron hoe / stripped oak log canonical assets 和生成的 model-runtime/model-atlas outputs 保持 provenance/audit 可重复；
3. till / strip / flatten 的 pure rules、singleplayer mutation、creative/survival authoritative paths和 success-only wear 有回归；
4. 原版 tool sound variants 与 block sound variants 必须以仓库对象 SHA-1 验证，不能用逻辑路径字符串替代实体校验；
5. 真实 Chromium 必须覆盖 source-backed iron hoe craft/till/durability 和真实 OGG fetch/decode；
6. failed tool action 不消耗耐久且不播放成功音；
7. block→block secondary actions 不误触发 ordinary break/place；explosion 不产生 OGG storm；
8. 文档后的 exact HEAD static-checks 全绿；
9. 文档后的 exact HEAD 两路 Chromium 全绿且无 retry；
10. feature matrix / CHANGELOG / PR body 不再写“sound objects 缺失”，同时不把“资源已导入”夸大成完整 sound parity；
11. 无 unresolved review/thread/comment 阻塞。

## #123 合并后的下一步

### 1. Iron armor

在现有 Equipment / armorPoints foundation 上补 iron helmet/chestplate/leggings/boots 与 recipes。Armor durability/wear 仍是独立缺口。

### 2. Coal progression as a terrain-version delivery

独立实现 coal ore block/model/texture、coal item/fuel 与 deterministic generation。自然煤矿会改变 seeded-world bytes，必须显式处理 terrain generator version / multiplayer compatibility。

### 3. Original audio expansion

从“少数 tool/block events”扩展到 registry-driven source audio：

- 建立可审计 sound-event registry 生成/解析流程；
- 逐步迁移 player/entity/combat/environment procedural fallback；
- 增加 spatial listener / attenuation；
- 再处理 music scheduling，而不是一次性加载整个对象集。

### 4. Multiplayer XP + durable block-entity infrastructure

继续推进 server-owned XP/level、durable server world/container persistence、generic block-entity storage 与 loaded-chunk/scheduled tick 生命周期，再扩展 chest/barrel 等持久容器。

## 工程规则

- 每个交付 PR 只认 exact branch HEAD 的 CI；
- feature PR 改变 parity 状态时必须在同一 PR 更新 feature matrix；
- “资源文件已存在”与“运行时已接入”是两个不同完成条件；
- source-backed 与 procedural presentation 必须在测试和 provenance 上分开；
- Node-safe gameplay rules 与 browser-only Three.js/WebAudio runtime 分层；
- mining effectiveness 与 harvest/drop eligibility 是两个独立维度；
- 单人/多人共用 deterministic gameplay core，但 authority backend 不混淆；
- progression 或表现闭环可运行不等于 Minecraft Java 1.20.1 全内容 parity 完成。
