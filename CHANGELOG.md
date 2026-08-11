# Changelog

## [Unreleased]

### Engineering quality
- GitHub Pages 仓库发布源已设置为 **GitHub Actions**，并于 2026-08-12 验证完整 `configure → artifact upload → deploy` 流水线成功。
- 新增 `package.json`，固定 `@playwright/test` `1.62.0`，要求 Node 22+。
- 新增 `scripts/serve.mjs` 跨平台静态 HTTP server，作为本地/CI 浏览器测试统一入口。
- 新增 `playwright.config.mjs` 和 `tests/e2e/smoke.spec.mjs`。
- `Repository quality` 从单一 Node job 扩展为两层质量门：`static-checks` 成功后，再运行 Chromium `browser-smoke`。
- browser smoke 真实验证：主菜单→单人世界→创建世界→HUD/Canvas→暂停→IndexedDB 世界记录，并捕获 page/console error。
- 浏览器测试失败时上传 trace / screenshot / HTML report 目录作为定位工件。
- GitHub Actions checkout/setup-node 更新到 v6；浏览器 CI 只安装 Chromium，避免无用浏览器下载。
- `.gitignore` 增加 `playwright-report/` 和 `test-results/`。

### v0.4.0-dev — 已落库内容
- `EntityStore` + `SpatialHash` 实体数据/空间索引基础。
- 牛、羊、猪、鸡被动生物：地表生成、10 Hz 漫游、受击逃跑、距离回收和实体数量上限。
- `combat.js`：基础攻击冷却、受击无敌窗口、伤害和击退纯规则。
- 僵尸：夜间生成、追击和近战攻击。
- 生物死亡奖励：第一批 loot、`ExperienceOrbSystem`、Java 风格经验等级公式、`totalXp` 世界快照。
- 骷髅：距离控制/侧移 AI、箭矢远程攻击。
- `ProjectileSystem` + `projectile-rules.js`：重力、方块阻挡、线段/AABB 玩家命中和瞄准初速度。
- 苦力怕：敌对生成池、接近、引信、取消范围和爆炸事件。
- `ExplosionSystem` + `explosion-rules.js`：基础距离伤害、击退和附近地形破坏。
- 蜘蛛：加入第四种敌对生物，16 HP、近战追击、独立宽体低矮占位模型、线掉落和基础经验。
- 新增 `spider-rules.js`：把局部攀爬从渲染/AI 分支中抽成纯规则；最多约 3 格向上高度差，超过 2 格向下落差拒绝前进。
- 蜘蛛攀爬只在当前 X/Z 上升到前方地形柱顶面后才允许水平推进，避免把视觉/实体中心直接移动进固体柱。
- 修正 Creeper 加入 `HOSTILE_MOBS` 后测试仍只期望 zombie/skeleton 的回归错误；补充 Creeper 选择、fuse/explosion、loot 与 XP 断言。
- 扩展 hostile selection / loot / XP 回归到 zombie、skeleton、creeper、spider 四种敌对生物。

### Documentation
- README 明确区分稳定基线 `v0.3.0` 与 `main` 的 `v0.4.0-dev`，不再把未落库功能计入完成度。
- `docs/PROGRESS.md`、`docs/TESTING.md`、`docs/FILE_MANIFEST.md` 与远端实际代码/CI 对齐。

### Current limitations
- `v0.4.0` 尚未封版：护甲、完整死亡规则、水/氧气、天气粒子等仍未完成。
- 蜘蛛当前只有基于前方地形柱高度的局部攀升，不支持任意墙面附着、天花板移动或全局路径搜索。
- 当前 Three.js 仍由运行时 jsDelivr URL 加载；CDN 失败会同时影响网站和 browser smoke，后续应本地 vendor / 构建锁定。
- browser smoke 只覆盖“页面可启动并能创建/保存世界”的最低集成链，不等价于战斗/存档/键鼠玩法完整 E2E。

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
- `/weather rain` 目前只改变环境光和天空，没有降雨粒子/湿润效果。

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
