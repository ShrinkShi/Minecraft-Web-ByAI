# 架构记录

## 设计原则

1. **不复制 Java 版技术债。** 浏览器项目不会模拟单线程世界生成、每方块对象模型或无边界常驻内存。
2. **数据优先。** 区块以紧凑 TypedArray 保存；背包/配方也是纯数据模型，不把 DOM 当游戏状态。
3. **并行优先。** 地形生成和区块网格计算分别运行在独立 Web Worker；主线程主要负责输入、状态协调与 GPU 对象安装。
4. **渲染批处理。** 每个区块生成一个合并 `BufferGeometry`，只提交暴露面。
5. **资源生命周期显式管理。** 区块、掉落物、玩家和生物视觉对象都有明确销毁路径；世界退出终止 Worker 并释放共享资源。
6. **存档保存差异。** 程序化区块由 seed 可重建，因此 IndexedDB 只记录玩家/背包状态和被修改 voxel index。
7. **固定系统边界。** World / Player / Inventory / Crafting / Storage / UI / Commands / Entities / Combat 分层，避免把玩法塞进渲染循环。
8. **规则逻辑可离线测试。** Inventory、Recipe、Command、Entity、Combat、Worker 等核心规则应能在没有 WebGL 的 Node 环境验证关键不变量。
9. **实体查询不能依赖全表两两扫描。** 实体身份、位置和玩法组件由独立数据层维护；邻域交互先经过 Spatial Hash 缩小候选集合，再做精确规则判断。
10. **战斗数值与视觉/AI 解耦。** 攻击冷却、伤害窗口和击退方向属于纯规则；生物系统只负责何时发起攻击以及如何表现结果。

## v0.4 实体与战斗基础

当前 v0.4 先建立不依赖 Three.js 的实体/战斗数据层，再由具体运行时系统组合渲染、AI 和玩法规则，避免把 AI、Mesh、掉落和战斗全部绑进 `main.js`。

```text
Input / AI
    │
    ├──────────────> combat.js ───────> damage / cooldown / knockback rule
    │                                      │
    ▼                                      ▼
PassiveMobSystem                    PlayerController
HostileMobSystem                         │
    │                                    │
    └──────────────> EntityStore <───────┘
                         │
                         ▼
                    SpatialHash
```

### EntityStore 不变量

- 实体由单调递增 ID 标识；类型和玩法组件记录在 `records` 中。
- 位置单独保存在 `positions`，外部读取返回副本，避免绕过空间索引直接修改坐标造成不同步。
- `setPosition()` 是移动实体的唯一数据层入口，并同步更新 Spatial Hash 所在桶。
- `despawn()` / `clear()` 必须同时清理 record、position 和空间索引，不允许留下孤儿索引。
- 该层不引用 DOM / Three.js，因此可由 Node 回归测试直接验证。

### Spatial Hash 约束

- 当前按 X/Z 平面分桶，默认 cell size 为 8；适用于地面生物邻域、近战目标、拾取等二维候选过滤。
- `queryRadius()` 和 `queryAabb()` 只访问覆盖查询范围的桶，不扫描所有实体。
- 空间索引只负责候选缩减，不替代 Y 轴、碰撞体、视线、阵营等精确判定。
- 插入、移动、删除都维护桶与 entry 双向一致性，并对非法数值参数直接报错，防止 NaN 污染索引。

### PassiveMobSystem

- `PassiveMobSystem` 管理牛、羊、猪、鸡；静态规则与运行时状态分离，位置和组件由 `EntityStore` 持有，Three.js 对象只作为视觉映射。
- 生物默认在玩家 12~30 格外的草方块/泥土地表尝试生成；当前最多 16 只，离玩家超过 48 格会回收。这是浏览器阶段的性能边界，不等同于 Java 版完整实体持久化规则。
- AI 使用固定 10 Hz tick 执行漫游、地表高度查询、受击逃跑和距离回收；视觉位置按渲染帧插值。
- 玩家实体瞄准先使用 Spatial Hash 缩小候选，再执行三维近似命中测试；与方块 raycast 比较距离后只选择更靠前的目标。
- v0.4-c 起，被动生物受击改用公共 combat 伤害窗口，并加入水平击退；死亡掉落、经验、繁殖和持久化仍未实现。

### Combat 规则

- `combat.js` 不引用 DOM / Three.js；当前提供 600 ms 基础攻击冷却、500 ms 默认受击无敌窗口、伤害结算和二维击退方向。
- 战斗时间基准使用 `performance.now()` 风格的毫秒时间，不把冷却绑定到渲染帧数。
- `PlayerController.takeDamage()` 负责创造/旁观免伤边界，并把成功伤害转成 HP 变化和速度脉冲；水平速度在玩家移动中指数衰减，所以击退不会永久污染移动状态。
- 玩家 0 HP 或掉出世界后由编排层调用 `respawn()`，恢复生命/饱食并回到出生点。当前尚无死亡界面、物品掉落或死亡统计。
- 玩家普通攻击当前基础伤害为 1，木镐暂设 `attackDamage=2`；这只是第一版战斗数据入口，不代表完整 Java 版攻击强度、暴击和武器平衡已复刻。

### HostileMobSystem / Zombie

- 第一种敌对实体只实现僵尸，继续使用 `EntityStore` / `SpatialHash` 和共享轻量几何视觉。
- 僵尸只在全局时间 13000~23000 的夜间窗口尝试生成，当前最多 8 只；离玩家超过 48 格回收。
- AI 固定 10 Hz：24 格内朝玩家追踪，约 1.55 格内按自身攻击冷却触发近战事件；运行时通过 `onPlayerHit` 回调把伤害交给玩家战斗层，不直接修改 HUD 或存档。
- 当前僵尸近战伤害为 3、攻击间隔约 1 秒，并支持被玩家击退。
- 当前没有 A* / 导航网格、视线寻路、日照燃烧、障碍绕行、门交互、装备或精确亮度生成规则；这些不能被“会追玩家”掩盖。

## v0.3 生存闭环

```text
                         ┌──────────────┐
             左/右/Shift │ Inventory UI │
                         └──────┬───────┘
                                ▼
                         ┌──────────────┐
                         │ Inventory(36)│◄──────────────┐
                         └───┬──────┬───┘               │
                             │      │                    │拾取
                     Crafting│      │hotbar              │
                             ▼      ▼                    │
                    ┌──────────┐  Player ──破坏──> DropSystem
                    │Recipes 2/3│        Q ────────> DropSystem
                    └──────────┘

Chat ──> Commands ──context──> Player / Inventory / Time / Weather
```

### Inventory 单一真相源

- 36 个 slot 存在 `Inventory` 中，快捷栏只是 `slots[27..35]` 的视图，不维护独立数组。
- UI 的鼠标语义只修改 `Inventory.cursor` 和 slot 数据；DOM 每次由数据渲染。
- 合成输入使用独立 `CraftingGrid`，关闭 GUI 时把输入和 cursor 回收到 Inventory；空间不足的剩余项通过 DropSystem 返回世界。
- 存档保存 Inventory snapshot，不保存 UI DOM 状态。

### 掉落物

- 破坏方块后生成 world entity，而不是直接把产物塞进背包。
- 方块型掉落共享世界 atlas 材质，仅按 tile 缓存小型 BoxGeometry；非方块物品按 item texture 缓存 SpriteMaterial。
- 当前 DropSystem 仍是紧凑数组线性更新；v0.4 的生物已经使用 EntityStore / SpatialHash，但掉落物尚未迁移，不能把生物接入误标成全部实体统一完成。

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

主线程 ──增量 edits + player/inventory snapshot──> IndexedDB
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
- 网格结果使用 Transferable buffers 返回。
- 主线程只把这些 buffer 包装为 Three.js `BufferAttribute`，不再执行逐 voxel 顶点构建循环。
- mesh 请求使用 `Set` 去重并通过单 Worker 串行泵发送。

## 当前仍存在的技术债

- terrain 和 mesh 目前各只有 1 个 Worker；高速移动/大面积编辑需要 Worker pool、任务优先级和取消机制。
- 水仍与实体方块共用不透明材质，没有透明 pass、流体、氧气和水下介质效果。
- IndexedDB 仍以单 world record 写回全部 edits；长期大世界应拆成按 chunk object store。
- UI 当前通过重建 slot DOM 保证简单正确，后续应局部更新减少 GC/布局。
- DropSystem 尚未迁移到 EntityStore / SpatialHash；当前统一实体基础覆盖生物，但不覆盖所有世界实体。
- 生物没有按 chunk 激活/持久化、群系/亮度/容量规则、标准动画和精确碰撞；16 被动 + 8 敌对与 48 格回收仍是临时浏览器预算。
- 僵尸导航只是直接追踪 + 地表步进，不具备真正寻路；在复杂悬崖、建筑和迷宫中行为会明显失真。
- EntityStore 当前仍使用 Map + 普通对象组件；如果实体规模明显扩大，再评估按热组件拆成 SoA TypedArray，不能提前为了“ECS 名字”做无收益复杂化。
- 第三人称玩家模型和生物模型都只是几何占位，尚未使用标准 skin UV/骨骼动画。
- 工具 durability/NBT/附魔没有进入 item stack schema。
- 战斗尚未实现完整攻击强度曲线、暴击、护甲、药水、附魔、死亡掉落和经验闭环。
- 当前 Three.js 仍从 CDN import；为了可重复部署和离线稳定性，后续应 vendor/pin 或引入构建产物，不应长期依赖运行时第三方 CDN。

这些项目必须继续拆除，不能因为“已经能跑”就固化成长期架构。
