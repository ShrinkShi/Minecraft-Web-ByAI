# 文件职责清单

该文件用于防止项目在快速迭代中退化成“所有逻辑都堆在 main.js”的不可维护结构。新增系统应优先落入明确模块，并在这里更新职责。

| 路径 | 职责 | 生命周期 / 性能要求 |
| --- | --- | --- |
| `index.html` | 菜单、HUD、背包、工作台、聊天 DOM 壳层 | 不承载游戏逻辑 |
| `styles.css` | 像素风界面与 HUD 样式 | 避免逐帧触发布局 |
| `src/main.js` | 应用状态机、Three.js 场景、系统编排、交互、自动保存 | 不执行区块生成和网格重计算重活 |
| `src/blocks.js` | 方块 ID、属性、atlas 索引、基础掉落约束 | 数据定义保持可序列化 |
| `src/items.js` | 物品定义、方块物品映射、基础工具元数据 | 不保存运行时实例状态 |
| `src/inventory.js` | 36 格库存、cursor、堆叠、Shift 移动 | 与 UI 分离，可单测/序列化 |
| `src/recipes.js` | 2×2 / 3×3 shaped + shapeless 配方匹配 | 纯逻辑，无 DOM / Three.js 依赖 |
| `src/drops.js` | 世界掉落物视觉、重力、拾取、销毁 | 共享 block geometry/material；退出世界显式释放 |
| `src/commands.js` | 聊天指令解析与参数验证 | 通过 context 调系统，不直接引用 DOM |
| `src/spatial-hash.js` | X/Z 平面实体空间分桶与半径/AABB 邻域候选查询 | 插入/移动/删除保持索引一致；查询不做全实体扫描 |
| `src/entity-store.js` | 实体 ID、类型、组件数据、位置与 SpatialHash 生命周期协调 | 无 DOM/Three.js 依赖；位置修改必须经 `setPosition()` |
| `src/world-worker.js` | 程序化地形生成 | Worker 线程；Transferable 返回区块 |
| `src/mesh-worker.js` | 可见面判定与区块 Buffer 数据构建 | Worker 线程；精确 TypedArray；Transferable 返回 |
| `src/world.js` | 区块流式生命周期、方块查询/编辑、GPU mesh 安装 | 卸载区块必须 `geometry.dispose()`；不为方块创建独立 Mesh |
| `src/player.js` | 输入、AABB 碰撞、视角、玩家快照和第三人称占位模型 | 固定小对象集，不与区块数量线性增长 |
| `src/storage.js` | IndexedDB 世界记录、玩家/背包状态和增量编辑 | 不保存完整程序化区块，只保存修改差异 |
| `src/ui.js` | HUD、背包/合成 UI、聊天、加载反馈 | 数据源来自 Inventory/Crafting，不自行维护第二套背包真相 |
| `assets/textures/atlas.png` | 基础方块纹理 atlas | 共享单纹理，减少材质/纹理切换 |
| `assets/items/*.png` | 非方块物品图标 | 目前仅必要最小集合 |
| `scripts/check.mjs` | Inventory/Recipes/Commands/EntityStore/SpatialHash/Workers 回归检查 | Node 22，无外部测试依赖 |
| `.github/workflows/quality.yml` | 语法与核心回归检查 | main push / PR 自动执行 |
| `.github/workflows/pages.yml` | GitHub Pages 自动部署 | main 更新触发 |
| `docs/ARCHITECTURE.md` | 架构决策、技术债与性能原则 | 每次架构变化同步更新 |
| `docs/PROGRESS.md` | 功能完成状态与下一阶段 | 只勾选实际落库且验证过的功能 |
| `docs/TESTING.md` | 测试覆盖与验证边界 | 不把静态测试冒充 E2E |
| `CHANGELOG.md` | 面向版本的变更记录 | 每个正式功能 commit 更新 |
