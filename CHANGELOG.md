# Changelog

## [Unreleased]

### Added
- v0.4-a 实体数据基础：新增 `EntityStore`，统一实体 ID、类型、组件与位置生命周期。
- 新增 `SpatialHash` X/Z 空间索引，支持半径与 AABB 邻域候选查询，并在实体跨 cell 移动时同步迁移索引。
- 为 EntityStore / SpatialHash 增加 Node 回归测试，覆盖负坐标、跨桶移动、删除清理、位置封装和非法参数。
- v0.4-b 第一批被动生物运行时：牛、羊、猪、鸡，当前使用轻量彩色方块占位模型。
- 被动生物支持草地/泥土地表附近生成、固定 10 Hz 漫游、受击逃跑、实体数量上限和远距离回收。
- 玩家左键瞄准加入实体候选，并与方块 raycast 距离比较后选择前方目标。
- 增加被动生物静态规则 Node 回归测试。

### Architecture
- 明确实体空间索引只负责候选缩减，Y 轴、碰撞体、视线和阵营等精确判定继续由玩法层负责。
- 被动生物现已使用 EntityStore / SpatialHash；DropSystem 仍未迁移，敌对 AI、完整战斗、死亡掉落/经验和实体持久化仍未完成。
- 被动生物 AI 与渲染更新解耦：AI 固定 10 Hz，视觉按帧插值；当前 16 实体上限与 48 格回收是浏览器阶段性能边界，不视为最终 Minecraft 规则。

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
- 用户资源中的工作台、圆石、木棍、木镐纹理接入当前资源集。

### Changed
- IndexedDB 存档版本升级为 v3，加入背包、时间、天气和视角状态。
- 生存模式不再默认获得整排无限建材；创造模式保留快速测试用初始物品。
- 方块破坏会经过掉落实体再拾取，而不是只有视觉消失。

### Known limitations
- 工作台正面目前仍按统一 side 纹理渲染，没有方块朝向 blockstate。
- 木镐耐久元数据尚未进入物品栈；战斗、实体 AI、盔甲和经验玩法尚未实现。
- `/weather rain` 目前只改变环境光和天空，没有降雨粒子/湿润效果。
- 完整浏览器端 Pointer Lock/WebGL/IndexedDB E2E 仍需 Pages 实机检查。

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
