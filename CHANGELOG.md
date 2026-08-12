# Changelog

## [Unreleased]

### Engineering quality
- GitHub Pages 仓库发布源已设置为 **GitHub Actions**，并持续验证完整 `configure → artifact upload → deploy` 流水线。
- 固定 `@playwright/test` `1.62.0`，要求 Node 22+；`scripts/serve.mjs` 作为本地/CI 浏览器测试统一 HTTP server。
- `Repository quality` 为两层质量门：`static-checks` 成功后运行 Chromium `browser-smoke`；同 `github.ref` 新 push 会取消旧 run。
- `static-checks` 同时检查 `src/*.js`、`scripts/*.mjs`；`npm run test:logic` 现在顺序执行基础、Equipment/Armor、Water Mesh、Oxygen/Drowning、Swimming/Buoyancy 五套回归。
- 新增 `scripts/check-water.mjs`：孤立水、同水内部面、水/实体边界、Transferable buffers、跨 chunk 同水面。
- 新增 `scripts/check-oxygen.mjs`：15 秒空气、4× 恢复、模式边界、跨 0 点、每秒溺水事件与非法输入。
- 新增 `scripts/check-swim.mjs`：三点水覆盖率、dry no-op、水平倍率插值、被动浮力、Space 上游、Shift 下潜、垂直限速、冲突输入与参数校验。
- PR #12 首轮静态质量门暴露旧 `scripts/check.mjs` 仍消费 mesh Worker 顶层 `indices`；修复采用 opaque 顶层兼容视图而不是删除旧回归。
- browser smoke 使用固定 seed + `海` prompt 真实生成水体，验证 Oxygen `data-air` 下降、Space 后玩家 Y 上升、Shift 后 Y 下降、离水恢复；随后继续验证皮革外套、v5 IndexedDB Equipment 快照和虚空死亡清算。
- 浏览器存档断言确认 world record 不含 `oxygen`；`swimCoverage` 同样只存在于 Player 运行时，不进入 snapshot。
- 浏览器失败时上传 trace / screenshot / HTML report；当前 CI 只安装 Chromium。

### v0.4.0-dev — 已落库内容
- `EntityStore` + `SpatialHash` 实体数据/空间索引基础。
- 牛、羊、猪、鸡被动生物：地表生成、10 Hz 漫游、受击逃跑、距离回收和数量上限。
- `combat.js`：基础攻击冷却、受击无敌、伤害和击退纯规则。
- 僵尸：夜间生成、追击和近战攻击。
- 骷髅：距离控制/侧移 AI、箭矢远程攻击。
- 苦力怕：敌对生成池、接近、引信、取消范围和爆炸事件。
- 蜘蛛：16 HP、近战追击、独立宽体低矮占位模型、线掉落和有限局部攀爬。
- `ProjectileSystem` + projectile rules：重力、方块阻挡、segment/AABB 玩家命中和瞄准初速度。
- `ExplosionSystem` + explosion rules：基础距离伤害、击退和附近地形破坏。
- 生物死亡奖励：第一批 loot、`ExperienceOrbSystem`、Java 风格经验等级公式、`totalXp` 世界快照。
- `death-rules.js`：survival/adventure 与 creative/spectator 的死亡损失、死亡 XP 和虚空策略。
- `Inventory.drain()` / `CraftingGrid.drain()` / `Equipment.drain()`：死亡时无副作用抽空携带状态。
- 普通 survival/adventure 死亡在原点生成物品，并生成 `min(100, 当前等级 × 7)` 经验后清零 totalXp；`y < -10` 虚空死亡直接损失。
- `Equipment` 独立 head/chest/legs/feet 四槽；皮革帽子/外套/裤子/靴子护甲点 1/3/2/1。
- `armor-rules.js`：过渡公式每护甲点 4%、最高 80%，完整皮革套 28%。
- 僵尸/蜘蛛近战、骷髅箭矢和苦力怕爆炸经过基础护甲减伤；虚空与溺水绕过护甲。
- world record 逻辑快照 v5 保存 Equipment；IndexedDB object-store schema 仍为 v1。
- `mesh-worker.js` 一次 chunk 扫描分别构建 `opaque` 与 `water` 两套 TypedArray/Transferable payload。
- 同水内部面含跨 chunk 边界会剔除；水对实体接触面剔除，实体面对透明水保留。
- `VoxelWorld` 每 chunk 最多一个 opaque mesh 与一个透明 water mesh；共享 atlas，water 使用 `transparent=true / opacity=.68 / depthWrite=false`。
- chunk rebuild/unload/world teardown 显式释放 opaque/water geometry、材质和共享纹理。
- opaque 旧顶层 Worker buffers 暂时保留为迁移兼容层；运行时消费 `opaque/water` 新协议。
- `oxygen-rules.js`：survival/adventure 15 秒空气，离水每秒恢复 4 秒额度；creative/spectator 满空气。
- 主循环按 `Player.eyePosition()` 所在 voxel 的 `liquid` 判定头部浸水。
- 空气耗尽后每累计 1 秒产生一次 2 HP 溺水伤害；跨 0 点仅计算真正无空气的剩余 dt。
- 溺水直接进入 `Player.takeDamage()`，不经过 armor-rules。
- `oxygen.css` + 10 气泡 HUD；Oxygen 为瞬时状态，不进入 v5 world record。
- 新增 `swim-rules.js`：根据水体覆盖率派生水中水平倍率、低重力/浮力、Space/Shift 垂直控制、指数阻尼和垂直限速。
- `PlayerController` 每帧采样脚部 `+0.2`、躯干 `+0.9`、眼睛 `+1.62` 三个 voxel，得到 0/1/3/2/3/1 水覆盖率。
- coverage 从 0→1 时水平移动倍率从 1 平滑趋近 0.5；水中不使用陆地 sprint/sneak 速度语义。
- 完整浸水有轻微正浮力；Space 额外上游、Shift 额外下潜，垂直水中速度约限制在 +3.4/-3.0。
- 水中物理仍复用 Player 原有 AABB `collides()` 与 `moveAxis()` 单一积分路径；离水后恢复原陆地 `-24` 重力和 grounded jump。
- `swimCoverage` 为瞬时派生状态，不进入 Player/world snapshot。
- Chromium E2E 在真实海洋中从 debug HUD 读取 Y，自动验证 Space 上升和 Shift 下降，再继续 Oxygen/Equipment/死亡完整链。

### Documentation
- README 区分稳定基线 `v0.3.0` 与 `v0.4.0-dev`，记录 Armor、Water Render、Oxygen 和 Swimming 当前实现边界。
- `docs/ARCHITECTURE.md` 固化“Player 只有一个位置积分器”，将三点液体采样和 swim-rules 纳入 Player 数据流。
- `docs/PROGRESS.md`、`docs/TESTING.md`、`docs/FILE_MANIFEST.md` 与实际代码/CI 对齐。

### Current limitations
- `v0.4.0` 尚未封版：死亡界面/统计/床重生、完整流体、水下视觉、天气粒子等仍未完成。
- 当前 Swimming 只是基础直立水中运动：没有冲刺游泳姿态、沿 pitch 三维推进、crawl transition、动画、实体游泳 AI、水流推动、Depth Strider/Dolphin's Grace。
- 当前已完成头部浸水→氧气→溺水事件闭环，但没有 Respiration、Water Breathing、Conduit、气泡柱；完整 15 秒真实溺水死亡仍未在 browser E2E 中硬等待。
- 水仍是独立透明静态 pass，没有 fluid level/传播、动态液面、水下 fog/折射或不同 GPU 下的像素级透明排序自动测试。
- mesh Worker 的 opaque 顶层 buffer 字段是临时迁移兼容层。
- 护甲公式是过渡实现，不等于 Java armor+toughness；暂无耐久、更多材质、附魔、Armor Trim、正式穿戴模型或快捷装备。
- 普通可恢复死亡的掉落/重新拾取尚未进入 browser E2E；死亡掉落与经验球也不跨页面持久化。
- Three.js 仍由运行时 jsDelivr URL 加载，后续应本地 vendor / 构建锁定。

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
