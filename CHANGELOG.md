# Changelog

## [Unreleased]

### Engineering quality
- GitHub Pages 仓库发布源已设置为 **GitHub Actions**，并持续验证完整 `configure → artifact upload → deploy` 流水线。
- 固定 `@playwright/test` `1.62.0`，要求 Node 22+；`scripts/serve.mjs` 作为本地/CI 浏览器测试统一 HTTP server。
- `Repository quality` 为两层质量门：`static-checks` 成功后运行 Chromium `browser-smoke`；同 `github.ref` 新 push 会取消旧 run。
- `static-checks` 同时检查 `src/*.js`、`scripts/*.mjs`；`npm run test:logic` 现在顺序执行基础、Equipment/Armor、Water Mesh、Oxygen/Drowning、Swimming/Buoyancy、Weather/Precipitation、Death Integration、Custom Respawn、Bed Rules、Mobile Device/Input 十套回归。
- 新增 `scripts/check-death.mjs`：锁定死亡 DOM/样式引用、`DeathScreen`/`deathState`/显式重生接线，禁止旧 `respawnPlayer()` 和一次性 death patch 工具重新进入交付树。
- 新增 `scripts/check-respawn.mjs`：覆盖自定义重生点归一化、14 个固定候选顺序、first-safe 解析和失败边界。
- 新增 `scripts/check-bed.mjs`：覆盖 8 个床 ID、四方向朝向、foot/head 配对、统一重生锚点、方块/物品元数据、3×3 床配方和羊毛 loot 来源。
- 主线 `7e2a4920...` 验收发现 PR #16 的死亡界面曾半落库：`death.css`/`death-screen.js` 存在，但 `index.html` 缺 DOM/样式引用，`main.js` 仍走立即重生且遗留 patch workflow/script；PR #19 将运行时、DOM 与质量门统一恢复，并以两条 Chromium 死亡链重新验收。
- 新增 `scripts/check-water.mjs`：孤立水、同水内部面、水/实体边界、Transferable buffers、跨 chunk 同水面。
- 新增 `scripts/check-oxygen.mjs`：15 秒空气、4× 恢复、模式边界、跨 0 点、每秒溺水事件与非法输入。
- 新增 `scripts/check-swim.mjs`：三点水覆盖率、dry no-op、水平倍率插值、被动浮力、Space 上游、Shift 下潜、垂直限速、冲突输入与参数校验。
- 新增 `scripts/check-weather.mjs`：clear/rain/thunder 类型、固定池精确预算、雷雨相对雨天的速度/长度/风偏/透明度强度和非法容量。
- PR #12 首轮静态质量门暴露旧 `scripts/check.mjs` 仍消费 mesh Worker 顶层 `indices`；修复采用 opaque 顶层兼容视图而不是删除旧回归。
- browser smoke 使用固定 seed + `海` prompt 真实生成水体，验证 Oxygen `data-air`、Space 上游、Shift 下潜；随后实际执行 `/weather rain → thunder → clear` 并要求 `WeatherFX 446 → 720 → 0`，再继续 Equipment/v6 存档和虚空死亡界面→显式重生链；第二世界验证普通死亡物品+XP 回收，第三世界验证持久化 `/spawnpoint`，第四世界验证两格床放置与床锚点重生；第五条 Android 横屏用例验证手机自动识别、旋转提示、无 Pointer Lock 触控、摇杆与移动端 UI 操作。
- 浏览器存档断言确认 world record 不含 `oxygen`；`swimCoverage` 同样只存在于 Player 运行时。weather 继续使用既有长期存档字段。
- 浏览器失败时上传 trace / screenshot / HTML report；当前 CI 只安装 Chromium。

### v0.4.0-dev — 已落库内容
- `device-profile.js`：结合 Mobile UA / `userAgentData.mobile` 与 touch + coarse pointer + no-hover 回退自动区分手机与桌面；iPadOS 桌面 UA 可识别，普通带触摸屏但仍有 fine pointer/hover 的笔记本保持 desktop。
- `mobile-controls.js` + `mobile.css`：手机横屏提供虚拟摇杆、拖动视角、攻击/挖掘、使用/放置、跳跃、疾跑、潜行、丢弃、背包、暂停、聊天、视角和触控热栏；竖屏显示旋转提示，safe-area 参与布局。
- `PlayerController` 新增独立 virtual input；桌面键盘/Pointer Lock 与手机触控共用同一位移积分和主/副交互路径。手机 gameplay 不要求 Pointer Lock，普通桌面行为保持不变。
- 新增 Android Chromium 移动端回归：Mobile UA + touch + 844×390，真实验证 portrait/landscape 切换、背包/暂停/视角、摇杆位移和触控热栏。
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
- 新增独立 `DeathScreen`：死亡结算与重生动作拆开，死亡后停留在原因/损失摘要界面，不再自动传送；只有点击“重生”才调用 `Player.respawn(0,0)`。
- deathState 会阻断 Pointer Lock、暂停/背包/工作台/普通键盘输入和主世界更新；Escape 不能从死亡界面绕入暂停菜单。
- “返回标题画面”先强制保存 hp=0 的已结算状态再销毁世界；DeathScreen 不持久化，重新进入时由现有 hp<=0 startup fallback 回出生点。
- Chromium E2E 现在要求虚空死亡界面至少持续约 450 ms、Escape 仍停在死亡界面；点击“重生”后新鲜存档必须 hp=20、Inventory/Equipment/XP 仍清空。
- 新增标准 self `/kill` 指令，复用正式 `beginPlayerDeath()`；命令回归覆盖成功调用和额外参数拒绝。
- 新增第二条 Chromium 可恢复死亡回归：3 原木→`/kill`→死亡界面报告掉落→显式重生→返回原死亡坐标→真实 DropSystem 拾回→新鲜 IndexedDB 再次持有全部 3 原木。
- 新增 self `/xp add <points>`（`/experience` 别名），通过现有 `addExperience()` 增加 points；拒绝 0/负数、超限和 `levels`。
- 可恢复死亡 Chromium 回归升级为 3 原木 + 16 XP：Lv.2 死亡摘要必须报告 14 XP，显式重生回死亡点后真实 ExperienceOrbSystem 吸收，最终新鲜 IndexedDB 必须 `totalXp=14`（派生 Lv.1）；测试由固定 1400ms sleep 改为等待公开 runtime 状态 `Drops 0 · XPOrbs 0 · XP 14`。
- 新增 `respawn-rules.js` 与 `Player.respawnAt()`：持久化精确点通过固定周边候选和世界/AABB 安全判定选择首个可用重生位置，全部无效时回退世界出生点。
- 新增 self `/spawnpoint [x y z]`，支持当前精确位置和 `~` 相对坐标；world record 逻辑快照升级到 v6 并保存 `respawnPoint`，IndexedDB object-store schema 仍为 v1。
- 新增第三条 Chromium 自定义重生用例：非原点设置 `/spawnpoint`→确认 v6 新鲜存档→异地 `/kill`→显式重生必须回到该持久化安全点。
- 新增两格床基础：四方向 foot/head voxel ID，按玩家水平视线原子放置；右键任一端经共享 `setRespawnPoint()` 设置床锚点，破坏任一端会联动删除预期配对端并只掉 1 床。
- 新增床物品与 3×3 配方：3 `white_wool` + 3 橡木木板→1 床，羊既有 loot 作为真实羊毛来源；床图标为程序化 SVG。
- `mesh-worker.js` 增加通用 per-block vertex tint；床当前用红色 tint + 现有木板 tile 形成明显占位视觉，仍是两个整格 voxel 的过渡 mesh/collision。
- 新增第四条 Chromium 床用例：`/give bed` 后真实从背包主区移到热栏，再通过 Pointer Lock + 鼠标视角 + 右键放置/激活；v6 快照必须同时包含两端 bed edits 与 respawnPoint，异地死亡后显式重生回床锚点。
- `Equipment` 独立 head/chest/legs/feet 四槽；皮革帽子/外套/裤子/靴子护甲点 1/3/2/1。
- `armor-rules.js`：过渡公式每护甲点 4%、最高 80%，完整皮革套 28%。
- 僵尸/蜘蛛近战、骷髅箭矢和苦力怕爆炸经过基础护甲减伤；虚空与溺水绕过护甲。
- world record 逻辑快照 v6 保存 Equipment 与 respawnPoint；IndexedDB object-store schema 仍为 v1。
- `mesh-worker.js` 一次 chunk 扫描分别构建 `opaque` 与 `water` 两套 TypedArray/Transferable payload。
- 同水内部面含跨 chunk 边界会剔除；水对实体接触面剔除，实体面对透明水保留。
- `VoxelWorld` 每 chunk 最多一个 opaque mesh 与一个透明 water mesh；共享 atlas，water 使用 `transparent=true / opacity=.68 / depthWrite=false`。
- chunk rebuild/unload/world teardown 显式释放 opaque/water geometry、材质和共享纹理。
- opaque 旧顶层 Worker buffers 暂时保留为迁移兼容层；运行时消费 `opaque/water` 新协议。
- `oxygen-rules.js`：survival/adventure 15 秒空气，离水每秒恢复 4 秒额度；creative/spectator 满空气。
- 主循环按 `Player.eyePosition()` 所在 voxel 的 `liquid` 判定头部浸水。
- 空气耗尽后每累计 1 秒产生一次 2 HP 溺水伤害；跨 0 点仅计算真正无空气的剩余 dt。
- 溺水直接进入 `Player.takeDamage()`，不经过 armor-rules。
- `oxygen.css` + 10 气泡 HUD；Oxygen 为瞬时状态，不进入 v6 world record。
- `swim-rules.js`：根据水体覆盖率派生水中水平倍率、低重力/浮力、Space/Shift 垂直控制、指数阻尼和垂直限速。
- `PlayerController` 每帧采样脚部 `+0.2`、躯干 `+0.9`、眼睛 `+1.62` 三个 voxel，得到 0/1/3/2/3/1 水覆盖率。
- coverage 从 0→1 时水平移动倍率从 1 平滑趋近 0.5；水中不使用陆地 sprint/sneak 速度语义。
- 完整浸水有轻微正浮力；Space 额外上游、Shift 额外下潜，垂直水中速度约限制在 +3.4/-3.0。
- 水中物理仍复用 Player 原有 AABB `collides()` 与 `moveAxis()` 单一积分路径；离水后恢复原陆地 `-24` 重力和 grounded jump。
- `swimCoverage` 为瞬时派生状态，不进入 Player/world snapshot。
- Chromium E2E 在真实海洋中从 debug HUD 读取 Y，自动验证 Space 上升和 Shift 下降。
- 新增 `weather-rules.js`：clear/rain/thunder 纯降水 profile，默认固定容量 720；clear=0、rain=446、thunder=720。
- 新增 `WeatherSystem`：单一 `THREE.LineSegments` + 单一动态 Float32Array position buffer；不按雨滴创建 Mesh/Geometry。
- rain/thunder 通过 profile 调整 fallSpeed、line length、wind 和 opacity；thunder 的视觉强度参数高于 rain。
- 雨线在玩家约 16 格范围内循环复用，落出下边界或玩家移动/传送导致超范围时重新生成到玩家上方。
- `/weather` 现在同时更新天空/环境光与 WeatherSystem profile；加载既有 world record 时恢复天气 FX，不升级存档 schema。
- world teardown 显式移除 WeatherSystem 并 dispose weather geometry/material。
- Chromium E2E 实际验证 `/weather rain`=`WeatherFX rain:446`、`thunder`=`720`、`clear`=`0`，并确认 Three.js 更新链无 pageerror/console error。

### Documentation
- README 区分稳定基线 `v0.3.0` 与 `v0.4.0-dev`，记录 Armor、Water、Oxygen、Swimming、Precipitation 当前实现边界。
- `docs/ARCHITECTURE.md` 固化 Player 单一积分器和固定天气 Buffer 池架构。
- `docs/PROGRESS.md`、`docs/TESTING.md`、`docs/FILE_MANIFEST.md` 与实际代码/CI 对齐。

### Current limitations
- `v0.4.0` 尚未封版：死亡统计/床睡眠与半高模型/`keepInventory`、完整流体、水下视觉、自动天气/闪电/雪等仍未完成。
- WeatherSystem 当前只有玩家周围的轻量 rain/thunder 线段 FX：没有自动周期、群系降水、屋顶遮雨/世界碰撞、飞溅/湿润、闪电 flash/bolt/damage/sound 或像素级天气 E2E。
- Swimming 只是基础直立水中运动：没有冲刺游泳姿态、沿 pitch 三维推进、crawl transition、动画、实体游泳 AI、水流推动、Depth Strider/Dolphin's Grace。
- 已完成头部浸水→氧气→溺水事件闭环，但没有 Respiration、Water Breathing、Conduit、气泡柱；完整 15 秒真实溺水死亡仍未在 browser E2E 中硬等待。
- 水仍是独立透明静态 pass，没有 fluid level/传播、动态液面、水下 fog/折射或不同 GPU 下的像素级透明排序自动测试。
- mesh Worker 的 opaque 顶层 buffer 字段是临时迁移兼容层。
- 护甲公式是过渡实现，不等于 Java armor+toughness；暂无耐久、更多材质、附魔、Armor Trim、正式穿戴模型或快捷装备。
- 普通可恢复死亡的物品与 XP 球回收均已进入 browser E2E；装备掉落的单独回收断言与死亡实体跨页面持久化仍未覆盖。
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