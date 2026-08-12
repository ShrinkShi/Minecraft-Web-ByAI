# 文件职责清单

该文件用于防止项目在快速迭代中退化成“所有逻辑都堆在 main.js”的不可维护结构。新增系统应优先落入明确模块，并在这里更新职责。

| 路径 | 职责 | 生命周期 / 性能要求 |
| --- | --- | --- |
| `index.html` | 菜单、HUD、背包、工作台、聊天、护甲槽和 Oxygen HUD DOM 壳层 | 不承载游戏逻辑 |
| `styles.css` | 像素风基础界面与 HUD 样式 | 避免逐帧触发布局 |
| `armor.css` | Equipment 槽和护甲 HUD 样式 | 只负责表现 |
| `oxygen.css` | 氧气气泡 HUD 样式 | 只负责表现；空气状态来自 oxygen-rules |
| `src/main.js` | 应用状态机、Three.js 场景、系统编排、交互、奖励/死亡/护甲/氧气接线与自动保存 | 不重复积分玩家位移；游泳物理由 PlayerController 内部完成 |
| `src/blocks.js` | 方块 ID、属性、atlas 索引、基础掉落约束 | `liquid/transparent` 同时供水 render、oxygen 与 Player water coverage 使用 |
| `src/items.js` | 物品定义、方块物品映射、工具/攻击/皮革护甲元数据 | 静态数据，不保存运行时状态 |
| `src/inventory.js` | 36 格库存、cursor、堆叠、Shift 移动、死亡 `drain()` | 与 Equipment 分离，可单测/序列化 |
| `src/equipment.js` | head/chest/legs/feet 四槽、部位校验、cursor 拖放、快照、护甲点、死亡 drain | 可序列化；非法快照必须过滤 |
| `src/armor-rules.js` | 基础护甲减伤 | 纯逻辑；当前 4%/点、最高 80%；虚空/溺水不应用 |
| `src/oxygen-rules.js` | 15 秒空气、离水恢复、模式边界、溺水事件节拍 | 纯逻辑；瞬时状态，不写入 world record |
| `src/swim-rules.js` | 水体覆盖率、水平速度倍率、降低重力/浮力、Space 上游、Shift 下潜、垂直阻尼/限速 | 纯逻辑；coverage=0 必须严格 no-op，不能改变陆地物理 |
| `src/recipes.js` | 2×2 / 3×3 配方和 CraftingGrid death drain | 纯逻辑，无 DOM/Three.js |
| `src/death-rules.js` | 模式死亡损失、死亡经验、虚空/可恢复位置判断 | 纯逻辑；不生成实体/不操作 UI |
| `src/drops.js` | 世界掉落物视觉、重力、拾取、销毁 | 共享资源，退出世界显式释放 |
| `src/experience.js` | XP 等级阈值、总经验↔等级和 HUD 进度派生 | 只以 totalXp 为真相源 |
| `src/experience-orbs.js` | 经验球重力、吸附、拾取、销毁 | 共享低面数资源 |
| `src/projectile-rules.js` | 线段/AABB 首次命中与带重力瞄准 | 纯逻辑 |
| `src/projectiles.js` | 箭矢视觉、重力、方块阻挡、玩家命中 | 共享 geometry/material |
| `src/explosion-rules.js` | 爆炸距离伤害/击退纯规则 | 无 Three.js/DOM |
| `src/explosions.js` | 苦力怕爆炸、玩家伤害/击退、地形破坏 | 不负责 Creeper AI |
| `src/spider-rules.js` | 蜘蛛局部垂直移动/有限攀爬 | 不承担全局寻路 |
| `src/commands.js` | 聊天指令解析与参数验证 | 通过 context 调系统 |
| `src/spatial-hash.js` | X/Z 实体空间分桶和邻域候选查询 | 查询不做全实体扫描 |
| `src/entity-store.js` | 实体 ID、组件、位置与 SpatialHash 生命周期 | 位置移动必须经 `setPosition()` |
| `src/combat.js` | 攻击冷却、受击无敌、伤害、击退方向 | 纯逻辑、时间基准 |
| `src/mobs.js` | 生物静态规则、生成选择、loot/xp | 不直接操作 HUD/存档 |
| `src/passive-mobs.js` | 被动生物生成/漫游/逃跑/受击/死亡 | 使用 EntityStore/SpatialHash |
| `src/hostile-mobs.js` | 四种敌对生物 AI、伤害/投射物/爆炸/死亡事件 | AI 通过 callback 发事件 |
| `src/world-worker.js` | 程序化地形生成 | Worker；固定 CI seed + `海` prompt 提供可重复水体 |
| `src/mesh-worker.js` | 一次 chunk 扫描构建 opaque / water mesh payload | Worker；独立 TypedArray/Transferable；opaque 顶层兼容字段为临时层 |
| `src/world.js` | chunk streaming、voxel 查询/编辑、opaque/water GPU 安装 | 两 pass geometry 显式 dispose；`getBlock()` 提供 oxygen/swim 的 voxel 查询 |
| `src/player.js` | 输入、陆地/飞行/水中移动、AABB 碰撞、视角、玩家快照、受伤/击退/重生 | 脚/躯干/眼睛三点采样 liquid；swimCoverage 为瞬时状态；所有模式共用单一轴向位移积分 |
| `src/storage.js` | IndexedDB world record | DB schema v1；逻辑快照 v5；oxygen/swimCoverage 不持久化 |
| `src/ui.js` | HUD、背包/合成/Equipment/Oxygen UI、聊天 | `data-air` 为稳定 E2E 观测点 |
| `assets/textures/atlas.png` | 基础方块纹理 atlas | opaque/water 共享同一 Texture |
| `assets/items/*.png` | 非方块物品图标 | 部分 loot/皮革护甲仍使用占位图 |
| `scripts/check.mjs` | 基础 Inventory/Entity/Combat/Workers 等回归 | Node 22 |
| `scripts/check-armor.mjs` | Equipment/Armor 回归 | 纯逻辑 |
| `scripts/check-water.mjs` | opaque/water mesh pass 回归 | 直接驱动 mesh Worker |
| `scripts/check-oxygen.mjs` | 氧气/溺水时序回归 | 不等待真实时间 |
| `scripts/check-swim.mjs` | 水覆盖率、dry no-op、速度插值、浮力、上下游、限速和非法输入回归 | 纯逻辑；防止水规则污染陆地路径 |
| `scripts/serve.mjs` | Playwright / 本地开发共用 HTTP server | 阻止 path traversal；测试 no-store |
| `tests/e2e/smoke.spec.mjs` | Chromium 世界启动、真实水体 oxygen + swimming、护甲存档、虚空死亡 | 固定 seed + `海`；读取 debug Y 验证 Space 上游和 Shift 下潜 |
| `playwright.config.mjs` | browser smoke 超时、单 worker、Chromium/WebGL、失败工件 | CI 优先稳定性 |
| `package.json` | Node 22+ 测试脚本与固定 Playwright | `test:logic` 顺序跑基础/armor/water/oxygen/swim 五套测试 |
| `.github/workflows/quality.yml` | Node + Chromium 两层质量门 | PR/main 自动执行；同 ref 新 push 取消旧 run |
| `.github/workflows/pages.yml` | GitHub Pages 自动部署 | main 更新触发 |
| `docs/ARCHITECTURE.md` | 架构决策、数据流、技术债 | 架构变化同步更新 |
| `docs/PROGRESS.md` | 功能完成状态与下一阶段 | 只勾选实际落库且验证过的功能 |
| `docs/TESTING.md` | 自动验证覆盖与边界 | 区分纯规则、Worker、browser smoke |
| `CHANGELOG.md` | 版本变更记录 | 每个正式功能/质量 commit 更新 |
