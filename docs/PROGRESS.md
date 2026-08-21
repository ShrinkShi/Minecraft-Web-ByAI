# Minecraft Web - 当前开发进度

更新时间：2026-08-21

当前事实以 GitHub `main`、`docs/PROJECT_BASELINE.md`、`docs/MINECRAFT_1_20_1_FEATURE_MATRIX.md` 与当前交付 PR 的 exact head 为准。本文只维护已合并基线、当前交付、验证状态和紧邻下一步。

## 当前主线

项目处于 `v0.4.0-dev`。严格按 Minecraft Java 1.20.1 完整玩法/内容口径，整体规划完成度继续保守维持约 **35%**。浏览器体素引擎、权威多人、Furnace、stone→iron progression、基础实体/战斗与首批原版音频已经形成可运行底座，但 registry breadth、完整 worldgen、farming/food、redstone、dimensions、enchanting/brewing、server PvE 与广泛音频事件仍是主要缺口。

当前 `main`：

`643310e636f8915bc35ec4803777c12b1a147ad0`

当前 main 已合并到 PR #123：

- source-backed iron hoe，40 个 runtime item IDs / 14 recipes 的当前内容边界；
- farmland / dirt_path / stripped_oak_log player-created states；
- singleplayer + authoritative multiplayer till / strip / flatten；
- 原版 `item.hoe.till` / `item.axe.strip` / `item.shovel.flatten`；
- grass / gravel / stone / sand / wood / glass 的 source-backed break/place/step 基线。

## 当前进行中：PR #124 视角 / 工作台 / Gameplay Audio 修复

分支：`fix/v0.4-view-ui-audio-polish`

基线：`main 643310e636f8915bc35ec4803777c12b1a147ad0`

PR #124 只处理已报告的六个可玩性问题，不夹带 iron armor 等新内容。

### 1. 第一人称右手方向

- 保留右下角第一人称 presentation anchor；
- 修正 Steve 右臂 base / sleeve 的 shoulder→hand 几何方向；
- held-item anchor 随手端移动，不再让袖口/手臂上下关系反置；
- 增加纯规则与真实 Three.js browser contract，防止以后再次垂直翻转。

### 2. 第三人称右手攻击 / 使用

- 确认根因不是 animation channel 选错，而是模型左右肢体 pivot 的物理侧镜像；
- yaw=0 时本地模型面向 -Z，因此 anatomical right 必须位于 +X；
- `rightArm/rightLeg` 已移到 +X，`leftArm/leftLeg` 移到 -X；
- attack / use 仍只驱动 `rightArm`，现在视觉侧与语义侧一致。

### 3. 工作台原版布局

- 不再继续修补 legacy generic grey panel；
- 直接使用 Java 1.20.1 canonical `textures/gui/container/crafting_table.png`；
- 以 2× 像素尺寸渲染 352×332 panel；
- 3×3 grid、result、27-slot inventory 和 hotbar 使用固定原版坐标；
- `gui.crafting_table_panel` 进入 logical asset manifest，并明确通过 canonical GUI asset audit。

### 4. 脚步声节奏

- 旧 `0.55 block` 触发阈值在 4.3 blocks/s 普通步行下会接近 7.8 次/秒，确实过密；
- 当前修复改为 `1.6 blocks` grounded horizontal cadence，普通步行约 2.7 次/秒；
- flying / spectator / airborne / swimming / teleport-size frame movement 继续重置或抑制脚步；
- 仍按真实移动距离累计，不与帧率绑定。

### 5. 挖掘 hit 声和 break 延迟

- `SingleplayerMiningController` 增加约 200 ms 的 mining-hit cadence；
- 新目标第一次敲击立即发声，持续挖掘按 cadence 继续；target switch 重启 cadence；creative instant break 不进入 survival hit loop；
- mining hit 使用当前 block sound type 的 source-backed step variant，并使用 Java-style hit playback profile（0.25 volume / 0.5 pitch）；
- 挖掘过程中提前 fetch 对应 break OGG variants，避免等到方块完成破坏才首次走网络路径；
- 新增 browser runtime bridge，把 `minecraft:mining-hit` 事件真正接到 WebAudio 播放层；
- focused Chromium test 会等待 source-backed sound trace 和真实 OGG HTTP 200。

### 6. 当前 8 种生物原版声音基线

当前 roster：cow、sheep、pig、chicken、zombie、skeleton、creeper、spider。

- 从仓库跟踪的 Java 1.20.1 sound-object corpus 绑定真实 OGG SHA-1；
- 当前覆盖 ambient / hurt / death 中该生物实际有的事件；creeper 没有普通 ambient voice；
- hurt 与 death 不重叠双播；
- ambient 使用 7–16 秒随机稀疏 cadence，避免群体声音刷屏；
- local listener 使用 24-block 线性距离衰减；
- regression 会校验当前事件集合涉及的真实对象文件存在且非空。

这仍不是完整实体音频 parity：step、attack、shoot、fuse、splash 等更细事件，以及真正 3D positional/HRTF、remote multiplayer replication 仍未完成。

## 当前验证状态

### Preliminary implementation gate

旧 exact head `ed539b2778802db67d8bf0bc033cdd32c3467e7b` 的 Repository quality #955 首次发现 asset-contract finding：canonical crafting-table GUI 已声明 `directCanonical:true`，但 asset test 白名单尚未授权 GUI 类 direct canonical。该 finding 已按资产边界修复，没有通过删除校验绕过。

之后 exact head `dbc4dadeb7a37d5cd7dee5e83da0c896348744a9`：

- JavaScript syntax：PASS；
- 自动发现 logic/server/Worker regressions：PASS；
- 两路 Chromium 正在运行时又继续补入 focused browser regression，因此该 head 只作为 preliminary 证据，不作为最终 Ready 证据。

### Final gate

PR #124 只有满足以下条件才允许 Ready：

1. 文档与 focused E2E 完成后的 **最终 exact branch HEAD** 通过 static-checks；
2. 同一 exact HEAD 两路 Chromium shards 全绿；
3. focused browser regression 实际验证 limb sides、first-person arm direction、canonical workbench computed layout、mining-hit→source sound event 和真实 OGG response；
4. branch 相对最新 main `behind=0`；
5. PR 无 unresolved review/thread/comment 阻塞；
6. 不把当前 local attenuation 描述成完整 Minecraft spatial audio；
7. 不把当前 8 mob 的 ambient/hurt/death baseline 描述成完整 entity sound parity。

## #124 明确不做

- iron armor 或新的 progression breadth；
- full `sounds.json` event graph / subtitles；
- every mob event、player voice、weather/cave/music；
- remote multiplayer block/mob/player SFX replication；
- WebAudio Panner/HRTF 级完整 3D spatial audio；
- Java 精确 first-person equip progress / attack-strength transform 全套重做；
- workbench recipe-book UI。

## #124 合并后的紧邻下一步

1. **Iron armor**：iron helmet/chestplate/leggings/boots、recipes、Equipment 接入；armor durability/wear 单独按真实规则推进。
2. **Coal progression / terrain version**：coal ore、coal item/fuel、deterministic generation，并显式处理 seeded-world bytes / terrain compatibility。
3. **Audio registry expansion**：从手写当前事件映射走向可审计 registry-driven sound event generation，再扩展 entity/combat/environment/music 与真正 spatial listener。
4. **Multiplayer XP + durable block entities**：server-owned XP/level、durable world/container persistence、generic block-entity storage。

## 工程规则

- 每个交付 PR 只认 exact branch HEAD 的 CI；
- feature/parity 状态变化必须同步 feature matrix；
- 资源文件存在与运行时已接入是两个完成条件；
- source-backed 与 procedural fallback 必须在测试和 provenance 上分开；
- Node-safe gameplay rules 与 browser-only Three.js/WebAudio runtime 分层；
- singleplayer/multiplayer 共用 deterministic gameplay core，但 authority backend 不混淆；
- 可运行闭环不等于 Minecraft Java 1.20.1 全内容 parity 完成。
