# 文件职责清单

该文件用于防止项目在快速迭代中退化成“所有逻辑都堆在 main.js”的不可维护结构。新增系统应优先落入明确模块，并在这里更新职责。

| 路径 | 职责 | 生命周期 / 性能要求 |
| --- | --- | --- |
| `index.html` | 菜单、HUD、背包、工作台、聊天 DOM 壳层 | 不承载游戏逻辑 |
| `styles.css` | 像素风界面与 HUD 样式 | 避免逐帧触发布局 |
| `src/main.js` | 应用状态机、Three.js 场景、系统编排、交互、投射物/奖励/死亡结算接线与自动保存 | 不执行区块生成和网格重计算重活；死亡先结算原坐标内容再重生 |
| `src/blocks.js` | 方块 ID、属性、atlas 索引、基础掉落约束 | 数据定义保持可序列化 |
| `src/items.js` | 物品定义、方块物品映射、基础工具/攻击元数据和临时 loot 图标 | 不保存运行时实例状态；色块图标后续替换真实素材 |
| `src/inventory.js` | 36 格库存、cursor、堆叠、Shift 移动、死亡 `drain()` | 与 UI 分离，可单测/序列化；drain 必须复制后清空 cursor 与全部 slot |
| `src/recipes.js` | 2×2 / 3×3 shaped + shapeless 配方匹配，以及合成输入 `drain()` | 纯逻辑，无 DOM / Three.js 依赖；死亡清算不得先回填背包制造 overflow 副作用 |
| `src/death-rules.js` | 模式死亡损失策略、死亡经验公式和虚空/可恢复位置判断 | 纯逻辑；不生成实体、不操作 UI/存档；`y < -10` 与 Player 虚空死亡阈值保持一致 |
| `src/drops.js` | 世界掉落物视觉、重力、拾取、销毁 | 共享 block geometry/material；支持纹理/纯色 Sprite；退出世界显式释放 |
| `src/experience.js` | 经验等级阈值、总经验↔等级换算和 HUD 进度派生 | 纯逻辑；只以 total XP 为单一真相源 |
| `src/experience-orbs.js` | 经验球视觉、重力/弹跳、吸附、拾取和销毁 | 共享低面数 geometry/material；当前小数组更新；退出世界显式释放 |
| `src/projectile-rules.js` | 线段/AABB 首次命中与带重力的初速度瞄准规则 | 纯逻辑，无 Three.js/DOM 依赖；高速命中必须按 segment 而非终点判断 |
| `src/projectiles.js` | 箭矢视觉、重力积分、方块阻挡、玩家碰撞和生命周期 | 共享 geometry/material；当前有界数组；退出世界显式释放 |
| `src/explosion-rules.js` | 爆炸距离伤害/击退等纯规则 | 无 Three.js/DOM 依赖；用于可重复回归 |
| `src/explosions.js` | 苦力怕爆炸事件、玩家伤害/击退与附近方块破坏编排 | 不负责苦力怕 AI；爆炸结束不保留常驻实体 |
| `src/spider-rules.js` | 蜘蛛局部垂直移动规则：正常台阶、有限攀升、最大下落和超高阻挡 | 纯逻辑；不承担全局寻路、任意墙面或天花板导航 |
| `src/commands.js` | 聊天指令解析与参数验证 | 通过 context 调系统，不直接引用 DOM |
| `src/spatial-hash.js` | X/Z 平面实体空间分桶与半径/AABB 邻域候选查询 | 插入/移动/删除保持索引一致；查询不做全实体扫描 |
| `src/entity-store.js` | 实体 ID、类型、组件数据、位置与 SpatialHash 生命周期协调 | 无 DOM/Three.js 依赖；位置修改必须经 `setPosition()` |
| `src/combat.js` | 攻击冷却、伤害无敌窗口、伤害结算与击退方向 | 纯逻辑、毫秒时间基准、无 Three.js/DOM 依赖 |
| `src/mobs.js` | 被动/敌对生物静态规则、生成选择、loot/xp 表与可注入 RNG roll | 僵尸/骷髅/苦力怕/蜘蛛只存规则，不直接操作 HUD/存档 |
| `src/passive-mobs.js` | 被动生物生成、10 Hz 漫游/逃跑、命中、伤害/击退、死亡事件和视觉回收 | 使用 EntityStore/SpatialHash；死亡通过 callback 解耦奖励层 |
| `src/hostile-mobs.js` | 僵尸近战、骷髅远程/侧移、苦力怕 fuse、蜘蛛追击/局部攀爬、夜间生成、伤害与死亡事件 | 使用 EntityStore/SpatialHash；蜘蛛视觉与人形模板分开；通过 callback 请求伤害/投射物/爆炸/奖励 |
| `src/world-worker.js` | 程序化地形生成 | Worker 线程；Transferable 返回区块 |
| `src/mesh-worker.js` | 可见面判定与区块 Buffer 数据构建 | Worker 线程；精确 TypedArray；Transferable 返回 |
| `src/world.js` | 区块流式生命周期、方块查询/编辑、GPU mesh 安装 | 卸载区块必须 `geometry.dispose()`；raycast 是投射物方块阻挡的当前基础 |
| `src/player.js` | 输入、AABB 碰撞、视角、玩家快照、受伤/击退/重生和第三人称占位模型 | 固定小对象集；水平击退速度需衰减；不与区块数量线性增长 |
| `src/storage.js` | IndexedDB 通用 world record 存取 | DB schema 仍 v1；逻辑快照可独立版本化，不保存完整程序化区块或掉落实体 |
| `src/ui.js` | HUD、背包/合成 UI、聊天、加载反馈 | 数据源来自 Inventory/Crafting；经验只接收派生后的进度/等级 |
| `assets/textures/atlas.png` | 基础方块纹理 atlas | 共享单纹理，减少材质/纹理切换 |
| `assets/items/*.png` | 已有非方块物品真实图标 | loot 临时色块当前使用内联 SVG，不伪装成正式素材 |
| `scripts/check.mjs` | Inventory/Recipes/Commands/Entity/Combat/Projectile/Mob/Spider/Death/Loot/Experience/Workers 回归检查 | Node 22，无浏览器依赖 |
| `scripts/serve.mjs` | Playwright / 本地开发共用的跨平台静态 HTTP server | 只服务仓库根目录；阻止 path traversal；测试时 no-store |
| `tests/e2e/smoke.spec.mjs` | Chromium 页面启动、世界创建、HUD/Canvas、暂停和 IndexedDB 基础集成验证 | 固定 seed；不依赖随机战斗结果；失败必须可通过 trace 定位 |
| `playwright.config.mjs` | 浏览器测试超时、单 worker、Chromium/WebGL 启动、静态服务器和失败工件策略 | CI 优先可重复性，不追求并行吞吐 |
| `package.json` | Node 22+ 测试脚本与固定 Playwright 版本 | 不是游戏运行时必需依赖；纯静态 Pages 仍可直接运行 |
| `.github/workflows/quality.yml` | Node 静态/逻辑检查 + Chromium browser smoke 两层质量门 | main push / PR 自动执行；browser job 依赖 static job；同 ref 新 push 取消旧 run |
| `.github/workflows/pages.yml` | GitHub Pages 自动部署 | main 更新触发；仓库 Pages Source 必须为 GitHub Actions |
| `docs/ARCHITECTURE.md` | 架构决策、技术债与性能原则 | 每次架构变化同步更新 |
| `docs/PROGRESS.md` | 功能完成状态与下一阶段 | 只勾选实际落库且验证过的功能 |
| `docs/TESTING.md` | 测试覆盖与验证边界 | 明确区分规则测试、browser smoke 和完整 E2E |
| `CHANGELOG.md` | 面向版本的变更记录 | 每个正式功能 / 工程质量 commit 更新 |
