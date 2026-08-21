# Changelog

## [Unreleased]

> 2026-08-21 documentation baseline: `main` includes PR #123 at `643310e636f8915bc35ec4803777c12b1a147ad0`; PR #124 is the active unmerged presentation/audio repair delivery. Detailed roadmap truth lives in `docs/MINECRAFT_1_20_1_FEATURE_MATRIX.md`, merged facts in `docs/PROJECT_BASELINE.md`, and active status in `docs/PROGRESS.md`.

### 2026-08-21 — PR #124 view / Workbench / gameplay-audio repair

- 修正 wide Steve 第三人称肢体物理侧：yaw=0 面向 -Z 时 `rightArm/rightLeg` 位于 +X，`leftArm/leftLeg` 位于 -X；primary/use 继续驱动语义正确的 `rightArm`。
- 修正第一人称 source-backed Steve 右臂 base/sleeve/held-item anchor 的 shoulder→hand 几何方向，解决手臂上下/朝向反置。
- Workbench 不再叠 legacy generic grey panel；新增 canonical Java 1.20.1 `textures/gui/container/crafting_table.png` logical asset，按 2× 像素尺寸使用 352×332 panel 与 fixed 3×3/result/inventory/hotbar coordinates。
- local grounded footsteps 从过密的 0.55-block cadence 调整为 1.6-block horizontal distance cadence；flying/spectator/airborne/swimming/teleport-sized movement 继续 reset/suppress。
- `SingleplayerMiningController` 新增约 200 ms mining-hit semantic cadence；新 target 首 hit 立即触发、target switch 重启、creative instant break 不进入 survival hit loop。
- 新增 `vanilla-mining-audio` 与 browser event bridge：mining hit 使用当前 block sound type 的 source-backed step variant + Java-style hit profile，并在挖掘过程中提前 fetch break OGG bytes，减少完成破坏时的 cold network delay。
- 新增当前八种 gameplay mobs（cow/sheep/pig/chicken/zombie/skeleton/creeper/spider）的 source-backed ambient/hurt/death 基线；ambient 7–16 秒稀疏 cadence，hurt/death 不双播。
- mob voice 使用 24-block local linear attenuation；这是基础 gain attenuation，不声称完整 positional/HRTF parity。
- 新增 pure regression 与 focused Chromium acceptance：验证 anatomical limb sides、first-person actual Mesh direction、canonical Workbench computed geometry、mining-hit browser bridge 和真实 `原版Minecraft音频文件/` HTTP response。
- asset audit 明确授权且只授权审计过的 canonical crafting-table GUI direct binding，未通过删除 provenance 校验绕过 CI finding。

### 2026-08-21 — PR #122/#123 original audio corpus and tool-action delivery

- PR #122 导入并跟踪单独提供的 Minecraft Java 1.20.1 原版 sound-object corpus、映射/source notes；source availability 与 runtime parity 分开计算。
- PR #123 新增 source-backed `iron_hoe`、标准/镜像配方、250 durability，以及 `farmland` / `dirt_path` / `stripped_oak_log` states。
- till / strip / flatten 进入 singleplayer + authoritative server shared semantics；survival 只有成功 world mutation 后 wear，creative no-wear。
- `item.hoe.till`、`item.axe.strip`、`item.shovel.flatten` 接入真实 Java 1.20.1 OGG。
- `vanilla-block-audio` 为当前 grass/gravel/stone/sand/wood/glass sound types 接入 source-backed break/place/step；block→block tool mutation、explosion bulk removal、paired bed duplicate ordinary events 有明确抑制规则。
- stone→iron progression 当前闭环扩展到 iron pickaxe/axe/shovel/sword/hoe；当前边界 40 runtime item IDs、14 recipes。

### v0.4 accumulated foundation

- PC/手机输入统一到 `ControlIntentBus`；desktop Pointer Lock 与 mobile touch 共享 gameplay runtime。
- F5 first/third-person cameras、source-backed first-person viewmodel 与 articulated Steve player model。
- deterministic browser/server terrain、chunk/mesh Workers、TypedArray/Transferable、bounded chunk streaming/dispose。
- generic Minecraft blockstate/model resolver/compiler、deterministic model atlas 与 chunk-level opaque/cutout/translucent batching；selected roots 已进入 live runtime。
- 36-slot Inventory + 9 hotbar、Equipment、2×2/3×3 crafting、Workbench、Furnace、durability、bed/sleep/respawn、oxygen/swimming/weather、XP/death flows。
- current gameplay mobs：cow/sheep/pig/chicken/zombie/skeleton/creeper/spider，使用 imported Java 1.20.1 texture sheets + reconstructed compatible cuboid geometry。
- real Node authoritative WebSocket runtime 覆盖 movement/world edits/mining/placement/items/Inventory/Equipment/player crafting/Workbench/Furnace/chat/commands/PvP；PvE/XP/durable persistence 仍是主要 server gaps。
- strict Java 1.20.1 overall parity planning estimate remains about 35%；registry breadth、worldgen、food/farming、redstone、dimensions、enchanting/brewing 与 broad audio 仍远未完成。

## [0.3.0] - 2026-08-11

### Added
- 真实 36 格 Inventory 数据模型，快捷栏直接映射背包最后 9 格。
- 背包左键、右键、Shift 点击、cursor stack 操作语义。
- 2×2 配方匹配：原木→木板、木板→木棍、工作台。
- 可放置工作台方块，以及右键工作台打开 3×3 合成界面。
- 3×3 木镐配方。
- 方块掉落物实体、重力/轻微弹跳、拾取、5 分钟销毁。
- Q 丢弃当前快捷栏物品。
- 圆石方块和“石头需要镐才能获得掉落”的基础采集规则。
- F5 第一人称 / 第三人称背面 / 第三人称正面切换，并加入轻量方块人形占位模型。
- 聊天输入与 `/gamemode`、`/give`、`/tp`、`/time set`、`/weather`、`/help`。
- 24000 tick 昼夜环境光变化和天气光照状态。
- `scripts/check.mjs` 核心逻辑/Worker 回归检查。
- `.github/workflows/quality.yml` GitHub Actions 质量门。
- `docs/TESTING.md` 自动测试能力和浏览器端验证边界记录。

### Changed
- IndexedDB 存档版本升级为 v3，加入背包、时间、天气和视角状态。
- 生存模式不再默认获得整排无限建材；创造模式保留快速测试用初始物品。
- 方块破坏会经过掉落实体再拾取，而不是只有视觉消失。

### Known limitations
- 工作台正面目前仍按统一 side 纹理渲染，没有方块朝向 blockstate。
- 木镐耐久元数据尚未进入物品栈。
- `/weather rain` 在 v0.3.0 仍只改变环境光和天空，没有降雨粒子/湿润效果。

## [0.2.0] - 2026-08-11

### Added
- 玩家移动驱动的动态 chunk streaming，世界不再固定为出生点周围 5×5 区块。
- IndexedDB 世界存档：保存玩家状态和程序化世界的增量方块修改。
- `mesh-worker.js`：将暴露面扫描、顶点/UV/法线/索引构建从渲染主线程迁出。
- Worker mesh 使用精确长度 TypedArray 与 Transferable buffers。
- mesh 请求去重队列，限制重复边界重建造成的任务堆积。
- 重新进入相同“世界名称 + seed”时恢复玩家位置和已修改方块。
- `docs/FILE_MANIFEST.md` 文件职责与生命周期记录。

### Changed
- 默认渲染距离提升为 3 chunks，并增加 1 chunk 卸载滞回区。
- 自动保存采用节流策略；暂停、页面隐藏以及“保存并返回标题”会请求保存。
- debug HUD 增加 mesh queue 指标。

### Performance
- 主线程不再执行逐 voxel 网格顶点生成循环。
- 离开活动范围的 chunk 会释放 `BufferGeometry` 和 CPU 区块数组，避免世界探索时间与常驻内存无限线性增长。
- 存档不复制完整程序化 chunk，只保存被修改 voxel 的差异。

## [0.1.0] - 2026-08-11

### Added
- 建立可直接在 GitHub Pages 运行的静态 Web 游戏入口。
- 建立 Three.js 第一人称体素渲染与世界主循环。
- 使用 Web Worker 生成区块地形，避免地形生成阻塞渲染主线程。
- 使用 TypedArray 保存区块数据，按区块合并可见面生成 BufferGeometry。
- 加入基础方块破坏/放置、AABB 碰撞、跳跃、疾跑与创造模式移动。
- 加入主菜单、世界创建、暂停、HUD、快捷栏和物品栏基础 UI。
- 从用户提供资源中抽取必要基础纹理并制作小型纹理 atlas。
- 加入架构与进度文档。
