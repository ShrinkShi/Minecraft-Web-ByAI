# 文件职责清单

该文件用于防止项目在快速迭代中退化成“所有逻辑都堆在 main.js”的不可维护结构。新增系统应优先落入明确模块，并在这里更新职责。

| 路径 | 职责 | 生命周期 / 性能要求 |
| --- | --- | --- |
| `index.html` | 菜单、HUD、背包等 DOM 壳层 | 不承载游戏逻辑 |
| `styles.css` | 像素风界面与 HUD 样式 | 避免逐帧触发布局 |
| `src/main.js` | 应用状态机、Three.js 场景、系统编排、自动保存 | 不执行区块生成和网格重计算重活 |
| `src/blocks.js` | 方块 ID、属性、atlas 索引 | 数据定义保持可序列化 |
| `src/world-worker.js` | 程序化地形生成 | Worker 线程；通过 Transferable 返回区块 |
| `src/mesh-worker.js` | 可见面判定与区块 Buffer 数据构建 | Worker 线程；精确 TypedArray 分配；通过 Transferable 返回 |
| `src/world.js` | 区块流式生命周期、方块查询/编辑、GPU mesh 安装 | 卸载区块必须 `geometry.dispose()`；不为方块创建独立 Mesh |
| `src/player.js` | 第一人称输入、AABB 碰撞、重力、玩家快照 | 固定小对象集，不与区块数量线性增长 |
| `src/storage.js` | IndexedDB 世界记录、玩家状态和增量编辑 | 不保存完整程序化区块，只保存修改差异 |
| `src/ui.js` | HUD、快捷栏、背包展示、加载反馈 | 后续需改为增量 DOM 更新 |
| `assets/textures/atlas.png` | v0.x 基础方块纹理 atlas | 共享单纹理，减少材质/纹理切换 |
| `docs/ARCHITECTURE.md` | 架构决策、技术债与性能原则 | 每次架构变化同步更新 |
| `docs/PROGRESS.md` | 功能完成状态与下一阶段 | 只勾选实际落库且验证过的功能 |
| `CHANGELOG.md` | 面向版本的变更记录 | 每个正式功能 commit 更新 |
| `.github/workflows/pages.yml` | GitHub Pages 自动部署 | `main` 更新触发 |
