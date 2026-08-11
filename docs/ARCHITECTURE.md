# 架构记录

## 设计原则

1. **不复制 Java 版技术债。** 浏览器项目不会模拟单线程世界生成、每方块对象模型或无边界常驻内存。
2. **数据优先。** 区块以紧凑 TypedArray 保存；背包/配方也是纯数据模型，不把 DOM 当游戏状态。
3. **并行优先。** 地形生成和区块网格计算分别运行在独立 Web Worker；主线程主要负责输入、状态协调与 GPU 对象安装。
4. **渲染批处理。** 每个区块生成一个合并 `BufferGeometry`，只提交暴露面。
5. **资源生命周期显式管理。** 区块、掉落物、经验球、玩家和生物视觉对象都有明确销毁路径；世界退出终止 Worker 并释放共享资源。
6. **存档保存差异。** 程序化区块由 seed 可重建，因此 IndexedDB 只记录玩家/背包/经验状态和被修改 voxel index。
7. **固定系统边界。** World / Player / Inventory / Crafting / Storage / UI / Commands / Entities / Combat / Rewards 分层，避免把玩法塞进渲染循环。
8. **规则逻辑可离线测试。** Inventory、Recipe、Command、Entity、Combat、Loot、Experience、Worker 等核心规则应能在没有 WebGL 的 Node 环境验证关键不变量。
9. **实体查询不能依赖全表两两扫描。** 实体身份、位置和玩法组件由独立数据层维护；邻域交互先经过 Spatial Hash 缩小候选集合，再做精确规则判断。
10. **战斗与奖励数值和视觉/AI 解耦。** 攻击冷却、伤害窗口、击退、loot roll 和等级公式属于纯规则；运行时系统只负责触发事件和表现结果。

## v0.4 实体、战斗与奖励基础

```text
Input / AI
    │
    ├────> combat.js ─────────────> damage / cooldown / knockback
    │
    ▼
PassiveMobSystem / HostileMobSystem
    │                │
    │ movement       └── onDeath(type, position)
    ▼                                 │
EntityStore ──> SpatialHash           ▼
                                  Reward orchestration
                                      │
                    ┌─────────────────┴─────────────────┐
                    ▼                                   ▼
               DropSystem                      ExperienceOrbSystem
                                                        │ pickup
                                                        ▼
                                                 experience.js
                                                        │
                                                        ▼
                                                    totalXp
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
- 生物默认在玩家 12~30 格外的草方块/泥土地表尝试生成；当前最多 16 只，离玩家超过 48 格会回收。这是浏览器阶段性能边界，不等同于 Java 版完整实体持久化规则。
- AI 使用固定 10 Hz tick 执行漫游、地表高度查询、受击逃跑和距离回收；视觉位置按渲染帧插值。
- 玩家实体瞄准先使用 Spatial Hash 缩小候选，再执行三维近似命中测试；与方块 raycast 比较距离后只选择更靠前的目标。
- 受击使用公共 combat 规则；死亡只发出 `onDeath` 事件，不直接操作 Inventory、DropSystem 或经验系统。

### Combat 规则

- `combat.js` 不引用 DOM / Three.js；当前提供 600 ms 基础攻击冷却、500 ms 默认受击无敌窗口、伤害结算和二维击退方向。
- 战斗时间基准使用毫秒时间，不把冷却绑定到渲染帧数。
- `PlayerController.takeDamage()` 负责创造/旁观免伤边界，并把成功伤害转成 HP 变化和速度脉冲；水平速度指数衰减。
- 玩家 0 HP 或掉出世界后由编排层调用 `respawn()`。当前死亡只恢复生命/饱食并回出生点，尚未实现死亡界面、物品掉落、经验损失或死亡统计。
- 玩家普通攻击当前基础伤害为 1，木镐暂设 `attackDamage=2`；这不是完整 Java 版攻击强度、暴击或武器平衡。

### HostileMobSystem / Zombie

- 第一种敌对实体只实现僵尸，继续使用 `EntityStore` / `SpatialHash` 和共享轻量几何视觉。
- 僵尸只在全局时间 13000~23000 的夜间窗口尝试生成，当前最多 8 只；离玩家超过 48 格回收。
- AI 固定 10 Hz：24 格内直接追踪玩家，约 1.55 格内按自身攻击冷却触发近战事件；通过 `onPlayerHit` 回调把伤害交给玩家战斗层。
- 当前僵尸近战伤害为 3、攻击间隔约 1 秒，并支持被玩家击退。
- 当前没有 A* / 导航网格、视线寻路、日照燃烧、障碍绕行、门交互、装备或精确亮度生成规则。

### Loot 与死亡事件

- Loot 表定义在 `mobs.js` 的静态生物规则中；运行时死亡时只发 `{type, position, entity}`，由主编排层调用 `rollMobLoot()` / `rollMobXp()`。
- `rollMobLoot()` / `rollMobXp()` 支持注入 RNG，因此 min/max 和零掉落边界可在 Node 中确定性验证，而不是把随机结果写死在运行时对象里。
- 当前基础奖励包括：牛→生牛肉/皮革，羊→羊毛/生羊肉，猪→生猪排，鸡→生鸡肉/羽毛，僵尸→腐肉。
- 这些规则只建立第一版奖励闭环，不声称实现 Looting、火焰击杀熟食、幼体差异、稀有掉落或完整 Java loot table。
- 新 loot 图标暂时使用内联 SVG 色块；`DropSystem` 同时保留 `color` Sprite fallback，避免“物品有数据但无法生成视觉实体”。真实像素素材仍应后续替换。

### Experience

- `experience.js` 是纯逻辑模块，提供 `xpToNextLevel()`、`totalXpForLevel()`、`levelForTotalXp()` 和 `experienceState()`；边界测试覆盖 16/17、31/32 级公式切换。
- 运行时只保存 `totalXp`，level 与条内进度按公式派生，避免同时持久化三份可能互相矛盾的经验状态。
- 世界快照逻辑版本提升为 v4 并加入 `totalXp`；IndexedDB 本身仍是通用 `worlds` object store，因此无需提升数据库 schema version。
- `ExperienceOrbSystem` 使用共享低面数球体和材质，包含重力、地面弹跳、6 格内吸附、拾取和 300 秒销毁。
- 经验球本身不持久化。当前死亡也不会扣除或散落玩家已有经验，这一点与 Java 版仍不一致。

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

- 破坏方块和生物死亡后都通过 world drop 实体进入拾取链，而不是直接把奖励塞进背包。
- 方块型掉落共享世界 atlas 材质；带 texture 的非方块物品缓存 SpriteMaterial；纯色物品有受控 fallback。
- 当前 `DropSystem` 仍是紧凑数组线性更新，`ExperienceOrbSystem` 也是独立小数组。它们尚未迁移到 `EntityStore` / `SpatialHash`；在当前严格数量预算下先保留简单实现，实体规模扩大后再统一。

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

主线程 ──增量 edits + player/inventory/xp snapshot──> IndexedDB
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
- DropSystem / ExperienceOrbSystem 尚未使用 EntityStore / SpatialHash；当前数量受控，但规模扩大后线性扫描会成为技术债。
- 生物没有按 chunk 激活/持久化、群系/亮度/容量规则、标准动画和精确碰撞；16 被动 + 8 敌对与 48 格回收仍是临时浏览器预算。
- 僵尸导航只是直接追踪 + 地表步进，不具备真正寻路；在复杂悬崖、建筑和迷宫中行为会明显失真。
- EntityStore 当前仍使用 Map + 普通对象组件；如果实体规模明显扩大，再评估热组件 SoA TypedArray，不能为了“ECS 名字”提前制造复杂度。
- 第三人称玩家模型和生物模型都只是几何占位，尚未使用标准 skin UV/骨骼动画。
- 工具 durability/NBT/附魔没有进入 item stack schema。
- 战斗/死亡仍缺完整攻击强度曲线、暴击、护甲、药水、附魔、玩家死亡掉落和经验损失。
- Loot 仍是简化静态表，未实现条件化 loot table 系统。
- 当前 Three.js 仍从 CDN import；为了可重复部署和离线稳定性，后续应 vendor/pin 或引入构建产物，不应长期依赖运行时第三方 CDN。

这些项目必须继续拆除，不能因为“已经能跑”就固化成长期架构。
