# 架构记录

## 设计原则

1. **不复制 Java 版技术债。** 浏览器项目不会模拟单线程世界生成、每方块对象模型或无边界常驻内存。
2. **数据优先。** 区块以紧凑 TypedArray 保存，不为每个方块创建 JS 对象。
3. **并行优先。** 地形生成和区块网格计算分别运行在独立 Web Worker；主线程主要负责输入、状态协调与 GPU 对象安装。
4. **渲染批处理。** 每个区块生成一个合并 `BufferGeometry`，只提交暴露面。
5. **资源生命周期显式管理。** 区块越过保留距离后立即释放 CPU 区块引用和 GPU geometry；世界退出时终止 Worker 并释放共享纹理/材质。
6. **存档保存差异。** 程序化区块由 seed 可重建，因此 IndexedDB 只记录玩家状态和被玩家修改过的 voxel index，避免存储与世界面积线性膨胀。
7. **固定系统边界。** World / Player / Storage / UI 分层，避免把所有玩法塞进渲染循环。

## v0.2 数据流

```text
                  ┌──────────────────────┐
                  │      main thread     │
输入 ────────────>│ Player / World / UI  │──────> Three.js / GPU
                  └─────┬──────────┬─────┘
                        │          │
               chunk请求│          │mesh请求（TypedArray copy）
                        ▼          ▼
               ┌────────────┐  ┌────────────┐
               │ terrain    │  │ mesh       │
               │ worker     │  │ worker     │
               └─────┬──────┘  └─────┬──────┘
                     │ Transferable    │ Transferable
                     └────────┬────────┘
                              ▼
                    区块数据 / 顶点缓冲

主线程 ──增量 edits + player snapshot──> IndexedDB
```

### 区块生命周期

- 以玩家所在 chunk 为中心计算需要集合。
- 进入新 chunk 时只补请求缺失区块。
- `renderDistance=3` 负责目标可见范围；`unloadDistance=4` 提供一圈滞回，避免在边界反复加载/卸载。
- 被卸载区块的程序化原始数据直接丢弃；再次进入时按 seed 重生成，并叠加 IndexedDB 中的修改差异。
- 邻区块出现/消失时重新请求边界 mesh，保证接缝面的显隐正确。

### Worker 网格化

- `mesh-worker.js` 做两遍扫描：第一遍统计可见面数量，第二遍直接填充精确尺寸 TypedArray。
- position/uv 使用 `Float32Array`；normal 使用 normalized `Int8Array`；vertex color 使用 normalized `Uint8Array`；index 使用 `Uint32Array`。
- 网格结果使用 Transferable buffers 返回，避免再复制大数组。
- 主线程只把这些 buffer 包装为 Three.js `BufferAttribute`，不再执行逐 voxel 顶点构建循环。
- mesh 请求使用 `Set` 去重并通过单 Worker 串行泵发送，邻区块连续到达不会无限堆积重复网格任务。

## v0.1 模块基础

- `src/world-worker.js`：种子噪声、地形、海平面、基础树木生成。
- `src/world.js`：区块数据、方块读写、流式生命周期、voxel raycast、GPU mesh 安装。
- `src/player.js`：输入、相机、AABB 碰撞、重力、跳跃、创造飞行和玩家快照。
- `src/storage.js`：IndexedDB 世界元数据、玩家快照、增量方块编辑。
- `src/ui.js`：HUD、快捷栏、物品栏展示、加载进度。
- `src/main.js`：状态机、场景、交互、主循环、自动保存策略。

## 当前仍存在的技术债

- 地形生成只有单 terrain Worker；远距离高速移动时未来应引入小型 Worker pool 和任务优先级。
- mesh 目前只有单 Worker，虽然避免阻塞主线程，但大量批量编辑时吞吐仍有限。
- 水仍与实体方块共用不透明材质，没有独立透明 pass、流体更新或水下介质效果。
- 存档目前以单个 world record 写回所有 edits；超大长期世界应拆成按 chunk 的 object store，避免一次事务对象过大。
- 物品栏 DOM 每次选格会整条重建，后续应改为局部更新。
- 生存数值仍是骨架，不是 Java 版精确规则。

这些项目必须继续被拆除，不能因为“已经能跑”就固化成长期架构。
