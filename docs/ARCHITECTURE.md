# 架构记录

## 设计原则

1. **不复制 Java 版技术债。** 浏览器项目不会模拟单线程世界生成、每方块对象模型或无边界常驻内存。
2. **数据优先。** 区块以紧凑 TypedArray 保存；背包/配方也是纯数据模型，不把 DOM 当游戏状态。
3. **并行优先。** 地形生成和区块网格计算分别运行在独立 Web Worker；主线程主要负责输入、状态协调与 GPU 对象安装。
4. **渲染批处理。** 每个区块生成一个合并 `BufferGeometry`，只提交暴露面。
5. **资源生命周期显式管理。** 区块、掉落物、经验球、投射物、玩家和生物视觉对象都有明确销毁路径；世界退出终止 Worker 并释放共享资源。
6. **存档保存差异。** 程序化区块由 seed 可重建，因此 IndexedDB 只记录玩家/背包/经验状态和被修改 voxel index。
7. **固定系统边界。** World / Player / Inventory / Crafting / Storage / UI / Commands / Entities / Combat / Projectiles / Rewards 分层，避免把玩法塞进渲染循环。
8. **规则逻辑可离线测试。** Inventory、Recipe、Command、Entity、Combat、Projectile、Loot、Experience、Worker 等核心规则应能在没有 WebGL 的 Node 环境验证关键不变量。
9. **实体查询不能依赖全表两两扫描。** 实体身份、位置和玩法组件由独立数据层维护；邻域交互先经过 Spatial Hash 缩小候选集合，再做精确规则判断。
10. **战斗/投射物/奖励与 AI 解耦。** AI 只决定“何时攻击”；伤害、轨迹碰撞、loot roll 和等级公式由独立规则/运行时处理。

## v0.4 实体、战斗、投射物与奖励基础

```text
Input / AI
    │
    ├────> combat.js ─────────────> damage / cooldown / knockback
    │
    ▼
PassiveMobSystem / HostileMobSystem
    │                │            │
    │ movement       │            └── onProjectile(...)
    ▼                │                        │
EntityStore ──> SpatialHash                  ▼
                     │                ProjectileSystem
                     │                        │ hit
                     │                        ▼
                     └──────────────> PlayerController

Mob death ── onDeath(type, position)
                    │
                    ▼
             Reward orchestration
                    │
       ┌────────────┴────────────┐
       ▼                         ▼
  DropSystem             ExperienceOrbSystem
                                  │ pickup
                                  ▼
                           experience.js
                                  │
                                  ▼
                              totalXp
```

### EntityStore / SpatialHash

- 实体由单调递增 ID 标识；类型和玩法组件记录在 `records` 中，位置独立保存在 `positions`。
- 外部位置读取返回副本；移动必须经 `setPosition()`，从而同步 Spatial Hash 所在桶。
- `despawn()` / `clear()` 同时清理 record、position 和空间索引，不允许孤儿索引。
- Spatial Hash 当前按 X/Z 平面分桶，默认 cell size 为 8；只负责候选缩减，不替代 Y 轴、碰撞体、视线或阵营精确判断。
- 该数据层不引用 DOM / Three.js，可直接由 Node 回归测试验证。

### PassiveMobSystem

- 管理牛、羊、猪、鸡；静态规则与运行时状态分离，Three.js 对象只作为视觉映射。
- 默认在玩家 12~30 格外草方块/泥土地表尝试生成；当前最多 16 只，离玩家超过 48 格回收。
- AI 固定 10 Hz 执行漫游、受击逃跑和地表步进；视觉按渲染帧插值。
- 受击使用公共 combat 规则；死亡只发 `onDeath`，不直接操作背包、掉落或经验系统。

### Combat

- `combat.js` 不引用 DOM / Three.js；当前提供 600 ms 基础攻击冷却、500 ms 默认受击无敌窗口、伤害结算和二维击退方向。
- 时间基准使用毫秒时间，不绑定渲染帧数。
- `PlayerController.takeDamage()` 负责创造/旁观免伤边界，并把成功伤害转成 HP 和速度脉冲。
- 玩家 0 HP 或掉出世界后由编排层调用 `respawn()`；当前死亡不掉背包、不损失经验，也没有死亡界面。
- 普通攻击基础伤害 1，木镐暂设 2；并不等于完整 Java 版攻击强度、暴击或武器平衡。

### HostileMobSystem / Zombie / Skeleton

- 敌对生物仍统一使用 `EntityStore` / `SpatialHash`，夜间生成池当前包含僵尸和骷髅；总上限 8，超过 48 格回收。
- 僵尸固定 10 Hz 直接追踪玩家，在约 1.55 格内通过 `onPlayerHit` 发出近战伤害请求。
- 骷髅使用 ranged attack style：远于理想距离时靠近、过近时后退、中距离进行轻量侧移；达到攻击冷却后通过 `onProjectile` 发出箭矢创建请求。
- `HostileMobSystem` 不直接创建箭矢，也不直接修改玩家 HP；这样远程 AI、投射物物理和伤害结算不会耦合成一层。
- 两种敌人目前都没有 A* / 导航网格、视线规划、日照燃烧、门交互、装备或精确亮度生成规则。

### Projectile rules / ProjectileSystem

- `projectile-rules.js` 是纯逻辑模块：`segmentAabbIntersectionT()` 用 slab 法求线段第一次进入 AABB 的参数 `t`；`aimVelocity()` 根据目标距离、速度和重力给出第一版抛物线补偿初速度。
- 箭矢每帧按速度/重力积分，但碰撞不是只看终点：使用“上一位置→下一位置”的线段同时检测玩家 AABB 与方块 raycast，避免高速箭矢穿过玩家。
- 当同一帧线段既可能命中玩家又可能命中方块时，以碰撞距离比较决定更靠前的命中对象，墙体可以实际挡箭。
- `ProjectileSystem` 共享一份低多边形箭矢 geometry/material；箭矢有 8 秒生命周期，离开世界时显式 `dispose()`。
- 创造/旁观玩家当前不会被敌对箭矢判定命中；生存/冒险进入玩家伤害链。
- 当前箭矢只属于敌对 AI：没有玩家弓、蓄力、箭插墙、箭回收、实体间互伤、附魔或真实箭矢模型。

### Loot 与死亡事件

- Loot 表定义在 `mobs.js` 静态规则中；运行时死亡只发 `{type, position, entity}`，主编排层调用 `rollMobLoot()` / `rollMobXp()`。
- roll 函数支持注入 RNG，因此 min/max 和零掉落边界可确定性测试。
- 当前基础奖励：牛→生牛肉/皮革，羊→羊毛/生羊肉，猪→生猪排，鸡→生鸡肉/羽毛，僵尸→腐肉，骷髅→骨头/箭。
- Looting、火焰击杀熟食、幼体差异、稀有掉落和完整条件化 loot table 仍未实现。
- 缺少正式素材的 loot 使用内联 SVG 色块图标；`DropSystem` 保留 `color` Sprite fallback，避免“有数据但无法生成世界视觉实体”。

### Experience

- `experience.js` 提供 `xpToNextLevel()`、`totalXpForLevel()`、`levelForTotalXp()` 和 `experienceState()`；边界测试覆盖 16/17、31/32 级公式切换。
- 只持久化 `totalXp`，level 和条内进度按公式派生，避免重复真相源。
- 世界快照逻辑版本为 v4；IndexedDB 仍是通用 `worlds` object store，不需要提升 DB schema version。
- `ExperienceOrbSystem` 使用共享低面数球体/材质，包含重力、弹跳、6 格内吸附、拾取和 300 秒销毁；经验球本身不持久化。

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

- 36 个 slot 存在 `Inventory` 中，快捷栏只是 `slots[27..35]` 的视图。
- 合成输入使用独立 `CraftingGrid`；关闭 GUI 时输入和 cursor 回收到 Inventory，溢出项通过 DropSystem 返回世界。
- 破坏方块和生物死亡都通过 world drop 实体进入拾取链，而不是直接塞进背包。
- `DropSystem`、`ExperienceOrbSystem`、`ProjectileSystem` 当前仍是受控小数组；只有实体规模证明线性更新成为瓶颈时，再迁移到统一 EntityStore / SpatialHash。

## v0.2 世界与 Worker 数据流

```text
                  ┌──────────────────────┐
                  │      main thread     │
输入 ────────────>│ Player / World / UI  │──────> Three.js / GPU
                  └─────┬──────────┬─────┘
                        │          │
               chunk请求│          │mesh请求
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

- `renderDistance=3`，`unloadDistance=4` 提供一圈卸载滞回。
- 程序化区块按 seed 可重建；存档只保存修改差异。
- `mesh-worker.js` 两遍扫描生成精确长度 TypedArray，通过 Transferable 返回。
- 区块卸载必须释放 `BufferGeometry`，世界退出终止 Worker 并释放共享材质/纹理。

## 当前仍存在的技术债

- terrain / mesh 各只有 1 个 Worker；高速移动或大面积编辑最终需要 Worker pool、优先级和取消机制。
- 水仍与实体方块共用不透明材质，没有独立透明 pass、流体、氧气和水下介质。
- IndexedDB 仍以单 world record 写回全部 edits；长期大世界应拆按 chunk object store。
- UI 仍通过重建 slot DOM 保证简单正确，后续应局部更新减少 GC/布局。
- DropSystem / ExperienceOrbSystem / ProjectileSystem 尚未使用 EntityStore / SpatialHash；当前数量受控，但规模扩大后线性扫描会成为技术债。
- 生物没有按 chunk 激活/持久化、群系/亮度/容量规则、标准动画和精确碰撞；16 被动 + 8 敌对与 48 格回收仍是临时浏览器预算。
- 僵尸/骷髅导航只是直接地表步进，不具备真正寻路；复杂悬崖、建筑和迷宫行为会失真。
- 骷髅目前不做攻击视线预判；它可以向墙后玩家发射箭，但箭会在物理层撞墙。这是“行为不聪明”，不是“箭穿墙”。
- EntityStore 仍使用 Map + 普通对象组件；只有规模数据证明需要时再评估热组件 SoA TypedArray。
- 玩家/生物模型和箭矢都是几何占位，尚未使用标准 skin UV、骨骼动画或正式像素素材。
- 工具 durability/NBT/附魔尚未进入 item stack schema。
- 战斗/死亡仍缺攻击强度曲线、暴击、护甲、药水、附魔、死亡掉落和经验损失。
- Loot 仍是简化静态表，没有完整条件化 loot table。
- 当前 Three.js 仍从 CDN import；长期应 vendor/pin 或引入构建产物，避免运行时第三方 CDN 依赖。

这些项目必须继续拆除，不能因为“已经能跑”就固化成长期架构。
