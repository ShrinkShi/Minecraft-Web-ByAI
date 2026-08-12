# 文件职责清单

该文件用于防止项目在快速迭代中退化成“所有逻辑都堆在 main.js”的不可维护结构。新增系统应优先落入明确模块，并在这里更新职责。

| 路径 | 职责 | 生命周期 / 性能要求 |
| --- | --- | --- |
| `index.html` | 菜单、HUD、背包、工作台、聊天、护甲槽、Oxygen HUD、死亡界面、横屏旋转提示与手机触控 DOM 壳层 | 不承载游戏逻辑 |
| `styles.css` | 像素风基础界面与 HUD 样式 | 避免逐帧触发布局 |
| `armor.css` | Equipment 槽和护甲 HUD 样式 | 只负责表现 |
| `oxygen.css` | 氧气气泡 HUD 样式 | 只负责表现；空气状态来自 oxygen-rules |
| `death.css` | 死亡覆盖层、死亡原因/摘要和重生按钮样式 | 只负责表现，不参与死亡损失/重生规则 |
| `mobile.css` | 手机 portrait 旋转提示、landscape 虚拟控件、safe-area 与紧凑 HUD/Inventory 布局 | 只负责移动端表现；不改变 gameplay 规则 |
| `src/main.js` | 应用状态机、Three.js 场景、系统编排、桌面/移动共享交互、奖励/死亡/护甲/氧气/天气接线与自动保存 | 主/副交互只有一条 gameplay 路径；手机不要求 Pointer Lock，桌面仍要求；暂停/面板/死亡清虚拟输入 |
| `src/device-profile.js` | 桌面/手机与横竖屏环境判定、body dataset 同步 | 纯环境逻辑；UA/UA-CH + touch/coarse/no-hover 边界可 Node 测试 |
| `src/control-intents.js` | 平台无关控制意图版本、连续状态归一化、多 source 合并、look/action 分发 | 纯逻辑；未来 gamepad/network-peer 必须复用，不得携带 DOM/设备规则 |
| `src/desktop-controls.js` | Keyboard/Mouse/Pointer Lock → ControlIntentBus 桌面适配 | 只翻译输入，不访问 World/Inventory/玩法规则 |
| `src/mobile-controls.js` | Touch/摇杆/手机按钮 → ControlIntentBus 触控适配 | 只翻译输入和维护触控 UI 状态，不实现独立玩法 |
| `src/blocks.js` | 方块 ID、属性、atlas 索引、基础掉落约束 | 注册 8 个四方向床 foot/head ID；`tint` 可供 mesh Worker 做通用顶点着色 |
| `src/items.js` | 物品定义、方块物品映射、工具/攻击/皮革护甲/床元数据 | 床是 stack=1 的 `placeKind=bed` 功能物品；图标为程序化 SVG |
| `src/inventory.js` | 36 格库存、cursor、堆叠、Shift 移动、死亡 `drain()` | 与 Equipment 分离，可单测/序列化 |
| `src/equipment.js` | head/chest/legs/feet 四槽、部位校验、cursor 拖放、快照、护甲点、死亡 drain | 可序列化；非法快照必须过滤 |
| `src/armor-rules.js` | 基础护甲减伤 | 纯逻辑；当前 4%/点、最高 80%；虚空/溺水不应用 |
| `src/oxygen-rules.js` | 15 秒空气、离水恢复、模式边界、溺水事件节拍 | 纯逻辑；瞬时状态，不写入 world record |
| `src/swim-rules.js` | 水体覆盖率、水平速度倍率、降低重力/浮力、Space 上游、Shift 下潜、垂直阻尼/限速 | 纯逻辑；coverage=0 必须严格 no-op |
| `src/weather-rules.js` | clear/rain/thunder 的降水预算、fallSpeed、line length、wind、opacity profile | 纯逻辑；默认固定池 720；不操作 Three.js/DOM/存档 |
| `src/weather-system.js` | 固定容量降雨 LineSegments 池、动态 TypedArray 更新、玩家周围 respawn/recycle、材质/geometry 生命周期 | 只创建 1 个 LineSegments/Geometry/Material；clear drawRange=0；world teardown 必须 dispose |
| `src/recipes.js` | 2×2 / 3×3 配方和 CraftingGrid death drain | 床配方限制 3×3：3 白羊毛 + 3 木板；纯逻辑，无 DOM/Three.js |
| `src/death-rules.js` | 模式死亡损失、死亡经验、虚空/可恢复位置判断 | 纯逻辑；不生成实体/不操作 UI |
| `src/respawn-rules.js` | 自定义重生点归一化、固定周边候选与 first-safe 解析 | 纯逻辑；不导入 Three.js/World；安全判定由调用方注入 |
| `src/bed-rules.js` | 四方向两格床 ID、朝向、foot/head partner 与统一床 respawn anchor | 纯逻辑；不读取 World/Three.js；runtime 只消费计划结果 |
| `src/death-screen.js` | 死亡界面 DOM 引用、原因/损失摘要写入和显示状态读取 | 不决定掉落/经验/重生位置；由 main 状态机驱动 |
| `src/drops.js` | 世界掉落物视觉、重力、拾取、销毁 | 共享资源，退出世界显式释放 |
| `src/experience.js` | XP 等级阈值、总经验↔等级和 HUD 进度派生 | 只以 totalXp 为真相源 |
| `src/experience-orbs.js` | 经验球重力、吸附、拾取、销毁 | 共享低面数资源 |
| `src/projectile-rules.js` | 线段/AABB 首次命中与带重力瞄准 | 纯逻辑 |
| `src/projectiles.js` | 箭矢视觉、重力、方块阻挡、玩家命中 | 共享 geometry/material |
| `src/explosion-rules.js` | 爆炸距离伤害/击退纯规则 | 无 Three.js/DOM |
| `src/explosions.js` | 苦力怕爆炸、玩家伤害/击退、地形破坏 | 不负责 Creeper AI |
| `src/spider-rules.js` | 蜘蛛局部垂直移动/有限攀爬 | 不承担全局寻路 |
| `src/commands.js` | 聊天指令解析与参数验证 | `/weather` 通过 context 切天气；self `/kill` 进入正式死亡生命周期；`/xp add <points>` / `/experience` 调现有经验系统；`/spawnpoint [x y z]` 只经 context 更新持久化自定义点，均不直接改 IndexedDB |
| `src/spatial-hash.js` | X/Z 实体空间分桶和邻域候选查询 | 查询不做全实体扫描 |
| `src/entity-store.js` | 实体 ID、组件、位置与 SpatialHash 生命周期 | 位置移动必须经 `setPosition()` |
| `src/combat.js` | 攻击冷却、受击无敌、伤害、击退方向 | 纯逻辑、时间基准 |
| `src/mobs.js` | 生物静态规则、生成选择、loot/xp | 不直接操作 HUD/存档 |
| `src/passive-mobs.js` | 被动生物生成/漫游/逃跑/受击/死亡 | 使用 EntityStore/SpatialHash |
| `src/hostile-mobs.js` | 四种敌对生物 AI、伤害/投射物/爆炸/死亡事件 | AI 通过 callback 发事件 |
| `src/world-worker.js` | 程序化地形生成 | Worker；固定 CI seed + `海` prompt 提供可重复水体 |
| `src/mesh-worker.js` | 一次 chunk 扫描构建 opaque / water mesh payload | Worker；支持可选 per-block tint；床当前复用整格 voxel mesh，并非半高专用 geometry |
| `src/world.js` | chunk streaming、voxel 查询/编辑、opaque/water GPU 安装 | 两 pass geometry 显式 dispose；`getBlock()` 提供 oxygen/swim voxel 查询 |
| `src/player.js` | 平台无关 controlState、陆地/飞行/水中移动、AABB 碰撞、视角、玩家快照、受伤/击退/世界出生与精确 `respawnAt()` | 不注册 DOM 输入；所有平台/未来网络输入共用单一轴向位移积分 |
| `src/storage.js` | IndexedDB world record | DB schema v1；逻辑快照 v6；weather/respawnPoint 持久化，oxygen/swimCoverage 不持久化 |
| `src/ui.js` | HUD、背包/合成/Equipment/Oxygen UI、聊天 | `data-air` 为稳定 E2E 观测点 |
| `assets/textures/atlas.png` | 基础方块纹理 atlas | opaque/water 共享同一 Texture |
| `assets/items/*.png` | 非方块物品图标 | 部分 loot/皮革护甲仍使用占位图 |
| `scripts/check.mjs` | 基础 Inventory/Entity/Combat/Workers 等回归 | Node 22 |
| `scripts/check-armor.mjs` | Equipment/Armor 回归 | 纯逻辑 |
| `scripts/check-water.mjs` | opaque/water mesh pass 回归 | 直接驱动 mesh Worker |
| `scripts/check-oxygen.mjs` | 氧气/溺水时序回归 | 不等待真实时间 |
| `scripts/check-swim.mjs` | 水覆盖率、dry no-op、速度插值、浮力、上下游、限速回归 | 纯逻辑 |
| `scripts/check-weather.mjs` | clear/rain/thunder profile、精确池预算、参数强弱和非法输入回归 | 不导入 Three.js；渲染实例由 Chromium 覆盖 |
| `scripts/check-death.mjs` | 死亡 DOM/样式、DeathScreen/deathState、显式重生和旧立即重生路径的集成契约 | Node 静态契约；同时拒绝历史一次性 death patch 工具进入交付树 |
| `scripts/check-respawn.mjs` | respawnPoint 归一化、14 个候选顺序、first-safe 与失败边界 | 纯逻辑；不依赖 Three.js/World |
| `scripts/check-bed.mjs` | 床朝向/配对/锚点、BLOCKS/ITEMS 元数据、3×3 配方和羊毛 loot 来源 | 纯逻辑/静态数据；不启动浏览器 |
| `scripts/check-mobile.mjs` | 手机设备判定、Desktop/Touch 适配器与 Player 输入解耦静态契约 | Node 22；Android Chromium 真实交互另由 mobile E2E 覆盖 |
| `scripts/check-controls.mjs` | ControlIntent v1、source 合并、primary edge、look/action、desktop/touch/network-peer 等价性 | 纯逻辑；联机输入协议前置契约 |
| `scripts/serve.mjs` | Playwright / 本地开发共用 HTTP server | 阻止 path traversal；测试 no-store |
| `tests/e2e/smoke.spec.mjs` | Chromium 主世界、普通死亡回收、自定义 `/spawnpoint` 与床重生锚点四世界集成 | 桌面玩法回归；床仍经过真实 raycast/right-click/persist/death/respawn；全程捕获 page/console error |
| `tests/e2e/mobile.spec.mjs` | Android Mobile UA + touch 的横屏浏览器集成 | 横竖屏检测、无 Pointer Lock、背包/暂停/视角、摇杆位移和触控热栏 |
| `playwright.config.mjs` | browser smoke 超时、单 worker、Chromium/WebGL、失败工件 | CI 优先稳定性 |
| `package.json` | Node 22+ 测试脚本与固定 Playwright | `test:logic` 顺序跑基础/armor/water/oxygen/swim/weather/death/respawn/bed/mobile/controls 十一套测试 |
| `.github/workflows/quality.yml` | Node + Chromium 两层质量门 | PR/main 自动执行；同 ref 新 push 取消旧 run |
| `.github/workflows/pages.yml` | GitHub Pages 自动部署 | main 更新触发 |
| `docs/ARCHITECTURE.md` | 架构决策、数据流、技术债 | 架构变化同步更新 |
| `docs/PROGRESS.md` | 功能完成状态与下一阶段 | 只勾选实际落库且验证过的功能 |
| `docs/TESTING.md` | 自动验证覆盖与边界 | 区分纯规则、Worker、browser smoke |
| `CHANGELOG.md` | 版本变更记录 | 每个正式功能/质量 commit 更新 |
