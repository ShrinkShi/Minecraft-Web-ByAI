# 架构记录

## 设计原则

1. **不复制 Java 版技术债。** 不模拟单线程世界生成、每方块对象模型或无边界常驻内存。
2. **数据优先。** 区块用紧凑 TypedArray；背包、Equipment、配方、战斗、护甲和死亡规则是纯数据/纯逻辑，不把 DOM 当游戏状态。
3. **并行优先。** terrain 和 mesh 分别运行在 Web Worker；主线程主要处理输入、状态协调和 GPU 对象安装。
4. **渲染批处理。** 每个区块只生成暴露面并合并为 `BufferGeometry`；当前最多一个 opaque mesh + 一个 water mesh，而不是每方块一个 Mesh。
5. **资源生命周期显式管理。** opaque/water chunk geometry、掉落、经验球、投射物和生物视觉都有销毁路径；退出世界终止 Worker 并释放共享 GPU 资源。
6. **存档保存差异。** 程序化区块按 seed 重建，IndexedDB 只保存玩家/背包/Equipment/经验快照和 voxel edits。
7. **系统边界固定。** World / Player / Inventory / Equipment / Crafting / Storage / UI / Commands / Entities / Combat / Armor / Projectiles / Rewards / Death Rules 分层。
8. **规则可离线测试。** 不依赖 WebGL 的核心规则必须能在 Node 22 中验证关键不变量；Worker 输出协议也必须有直接回归。
9. **实体查询不做全表两两扫描。** EntityStore 管身份/组件，SpatialHash 先缩小 X/Z 邻域候选，再做精确判断。
10. **AI 不直接修改核心状态。** 生物 AI 只发伤害、投射物、爆炸、死亡事件；主编排层和独立规则模块负责结算。
11. **版本完成度以远端证据为准。** 只有进入 GitHub `main` 且通过质量门的实现才算完成。

## 当前 v0.4 数据流

```text
Input / Commands / AI
        │
        ├────> combat.js ──────────────> damage / cooldown / knockback
        │
        ▼
PassiveMobSystem / HostileMobSystem
        │               │
        │ movement      ├── onPlayerHit ──────────────┐
        │               ├── onProjectile -> Arrow ----┤
        │               ├── onExplosion -> Explosion -┤
        │               └── onDeath -> Reward orchestration
        ▼                                                │
 EntityStore -> SpatialHash                              ▼
                                              armor-rules.js <- Equipment.armorPoints()
                                                        │
                                                        ▼
                                                 Player.takeDamage()

Reward orchestration -> DropSystem + ExperienceOrbSystem -> totalXp

Player death
    │ capture death position
    ▼
death-rules.js -> mode / XP / void policy
    │
    ├── CraftingGrid.drain() x2
    ├── Equipment.drain()
    ├── Inventory.drain() + cursor
    │
    ├── recoverable -> DropSystem + ExperienceOrbSystem at death point
    └── void -------> discard without spawning unreachable entities
    │
    ▼
Player.respawn()
```

## World / Worker / Render passes

```text
world-worker.js
    │ chunk Uint8Array
    ▼
VoxelWorld.chunks
    │ copied chunk + 4 neighbor snapshots
    ▼
mesh-worker.js
    │ one voxel scan / face classification
    ├── opaque -> positions/normals/uvs/colors/indices
    └── water  -> positions/normals/uvs/colors/indices
              (independent Transferable buffers)
    ▼
VoxelWorld.onMeshWorker()
    ├── opaque BufferGeometry + opaque MeshLambertMaterial
    └── water  BufferGeometry + transparent MeshLambertMaterial
```

- `world-worker.js`：程序化 chunk 生成；主线程通过 Transferable 接收紧凑方块数据。
- `mesh-worker.js`：仍在 Worker 中完成暴露面扫描、顶点/法线/UV/索引构建，不把水拆分工作退回主线程。
- 每次 mesh 请求返回 `opaque` 和 `water` 两个子 payload；每个非空 payload 都有自己精确长度的 TypedArray buffers，并一起放入 Transferable list。
- 水与同 ID 水相邻时内部面不生成；这个规则也使用四个邻 chunk snapshot 跨 chunk 工作。
- 水对实体方块的接触面不生成；实体方块面对透明水仍生成，防止实体边界缺面。
- opaque 旧顶层 `positions/normals/uvs/colors/indices` 暂时保留为兼容视图，让旧 Worker 消费者/回归可以渐进迁移；`VoxelWorld` 只读取新 `opaque/water` 协议。
- `VoxelWorld.meshes` 每个 chunk 保存 `{opaque, water}` 记录；任一 pass 可为空。
- opaque 与 water 共用一张 atlas `Texture`；opaque 使用原不透明材质，water 使用独立 `transparent=true, opacity=.68, depthWrite=false` 材质并设更高 render order。
- chunk 重建或卸载时旧 opaque/water geometry 都显式 `dispose()`；世界退出时两套材质分别 dispose，共享 atlas texture 只 dispose 一次。
- 当前 `renderDistance=3`、额外一圈卸载滞回；玩家位置驱动 chunk streaming 逻辑没有因双 pass 改变。
- IndexedDB 当前只保存世界增量 edits 和玩家状态，不保存完整程序化 chunk，也不保存 GPU mesh。
- 这一层只是**渲染 pass 基础**，不是流体系统：当前没有流向/水位传播、动态表面高度、动画、折射、岸边泡沫、水下 fog 或介质后处理。

## Inventory / Equipment / Crafting

### Inventory

- `Inventory` 固定 36 格，快捷栏是 `slots[27..35]` 的视图；cursor 独立存在。
- `Inventory` 不保存护甲槽，避免背包 schema 和装备语义耦合。

### Equipment

- `Equipment` 固定四槽：`head / chest / legs / feet`。
- 每个槽只接受 `ITEMS` 中 `armorSlot` 与槽位一致、stack=1 的物品。
- `snapshot()` / `restore()` 独立于 Inventory；旧快照缺 Equipment 时自然得到四个空槽。
- `restore()` 会拒绝错误部位或非护甲 item，并将合法装备 count 归一为 1，避免恶意/旧数据制造堆叠护甲。
- `armorPoints()` 只从当前四槽的静态 item metadata 汇总，不缓存派生值，避免装备变化后状态不同步。
- UI 通过 Inventory cursor 与 Equipment `click()` 交换物品；错误部位不修改任一状态。

### Armor rules

- `armor-rules.js` 与 Equipment/UI/Player 分离。
- 当前过渡公式：`reduction = min(0.8, armorPoints * 0.04)`。
- 皮革套 1/3/2/1，共 7 点，即 28% 减伤。
- Hostile melee、arrow 和 explosion 的 **damage amount** 在进入 `Player.takeDamage()` 前经过该规则。
- Explosion knockback 暂不按护甲缩放；虚空死亡通过 Player 位置规则直接令 HP=0，也不会被护甲错误保护。
- 这不是 Java 版正式 armor+toughness/附魔公式；后续替换 `armor-rules.js` 即可，不需要迁移 Equipment 槽结构。

### Crafting / death interaction

- `CraftingGrid` 独立维护 2×2 / 3×3 输入；普通关闭 GUI 时通过 `clearTo()` 回收到背包。
- 死亡不能复用普通 `closePanels()`：背包满时普通关闭会产生 overflow world drop，虚空死亡会因此提前制造不可回收实体。
- 因此死亡路径依次使用 CraftingGrid / Equipment / Inventory 的 `drain()`，先无副作用抽空所有临时/携带状态，再由 death plan 决定是否生成世界掉落。

## Drops / Rewards

- `DropSystem` 当前使用受控数组；方块掉落复用方块材质，非方块物品可使用纹理 Sprite 或临时纯色图标。
- `ExperienceOrbSystem` 负责经验球重力、吸附、拾取和销毁。
- DropSystem / ExperienceOrbSystem / ProjectileSystem 尚未统一进 EntityStore；只有规模数据证明线性更新成为瓶颈时才迁移，避免过早抽象。

## EntityStore / SpatialHash

- 实体用单调递增 ID；类型/组件与 position 分开维护。
- 外部读取位置返回副本；移动必须经 `setPosition()`，保证 SpatialHash 桶同步。
- `despawn()` / `clear()` 同时清理 record、position、空间索引。
- SpatialHash 当前只按 X/Z 分桶，默认 cell size 8；它只做候选缩减，不替代 Y 轴、碰撞体、视线或阵营规则。
- 这层不引用 DOM / Three.js，可在 Node 中独立回归。

## 生物与 AI

### 被动生物

- 牛、羊、猪、鸡由 `PassiveMobSystem` 管理。
- 静态属性在 `mobs.js`；运行时状态在 EntityStore；Three.js 对象只做视觉映射。
- AI 固定 10 Hz：地表生成、漫游、受击逃跑、距离回收。
- 死亡只发事件，不直接操作背包/经验/存档。

### 敌对生物

当前夜间生成池：

- 僵尸：直接地表追击 + 近战。
- 骷髅：距离控制/侧移 + `onProjectile` 发射箭矢请求。
- 苦力怕：接近、fuse、取消范围 + `onExplosion`。
- 蜘蛛：独立低矮宽体占位模型、近战追击、有限局部攀爬。

敌对总量当前有硬上限并按距离回收。尚没有完整 A*、导航网格、标准亮度生成、日照燃烧、门交互或生物装备系统。

### 蜘蛛局部攀爬

- `spider-rules.js` 是纯规则，不依赖 Three.js。
- 1 格左右普通台阶直接通过；约 1~3 格上升时先保持 X/Z，逐步把 Y 提升到前方地形柱顶面，再水平推进。
- 超过最大攀爬高度或超过 2 格向下落差视为阻挡。
- 这不是任意墙面附着、天花板移动或全局寻路。

## Combat / Projectiles / Explosions

- `combat.js`：基础攻击冷却、受击无敌窗口、伤害和二维击退方向；以时间而不是帧数为基准。
- `PlayerController.takeDamage()` 负责创造/旁观免伤边界和受击速度脉冲；它不持有 Equipment。
- 主编排层在调用 `takeDamage()` 前读取 Equipment 派生护甲点并调用 `mitigateArmorDamage()`。
- `projectile-rules.js` 用线段/AABB 和方块 raycast 避免高速箭矢只检查终点产生穿透。
- `ProjectileSystem` 当前共享箭矢 geometry/material；敌对箭矢有有限生命周期。
- `ExplosionSystem` 处理苦力怕基础距离伤害、击退和附近地形破坏；暂未做完整遮挡射线、TNT、火焰和实体连锁爆炸。
- 当前战斗仍不是完整 Java 版公式：缺攻击强度曲线、暴击、扫击、toughness、耐久、药水和附魔。

## Loot / Experience

- `mobs.js` 保存 loot/xp 静态规则，roll 函数支持注入 RNG 以便确定性测试。
- 当前基础 loot 包括牛/羊/猪/鸡、腐肉、骨头/箭、火药、线。
- `experience.js` 只把 `totalXp` 作为真相源，level 和条内进度派生；覆盖 16/17、31/32 级公式边界。
- `ExperienceOrbSystem` 负责重力、弹跳、吸附、拾取和销毁；经验球本身当前不持久化。

## 玩家死亡结算

`death-rules.js` 只输出策略，不直接修改世界：

- survival / adventure：执行物品和经验损失。
- creative / spectator：不执行这套损失规则。
- 死亡经验：`min(100, currentLevel × 7)`。
- `y >= -10`：可恢复死亡，在原死亡点生成背包/cursor/Equipment/合成输入掉落和经验球。
- `y < -10`：虚空死亡，直接清空携带内容和总经验，不生成位于世界底部的不可回收实体。

主编排顺序固定为：

1. 复制死亡位置与原 total XP；
2. 生成 death plan；
3. 抽空 CraftingGrid、Equipment、Inventory 和 cursor；
4. 若可恢复则在死亡位置生成世界实体；
5. 清零 total XP；
6. 调 `Player.respawn()`；
7. 标记存档 dirty。

当前仍没有死亡界面、死亡统计、床/重生点、`keepInventory`，死亡掉落/经验实体也不会跨页面重载持久化。

## Storage

- IndexedDB 仍使用单一 `worlds` object store，DB schema version 仍为 1。
- world record 逻辑快照升到 **v5**：玩家状态、36 格 Inventory、Equipment 四槽、`totalXp`、时间/天气和 voxel edits。
- v4 及更早 world record 没有 `equipment` 字段时，Equipment 构造为空槽，不需要 object-store migration。
- 程序化世界可由 seed 重建，所以不存完整 chunk。
- 长期大世界中单 record 写回全部 edits 会膨胀，后续应按 chunk 拆 object store / page。

## CI / Browser integration

`Repository quality` 两层：

1. `static-checks`：Node 22 对 `src/*.js` 和 `scripts/*.mjs` 做语法检查，再执行 `npm run test:logic`（基础套件 + armor suite + water mesh suite）。
2. `browser-smoke`：Chromium 实际创建世界，因此会走 mesh Worker 新 `opaque/water` 协议和双 pass GPU 安装；随后通过 UI 装备皮革外套、验证 v5 Equipment 快照，再执行虚空死亡并核对背包/Equipment/XP 全部清空。

水专用 Node 回归直接验证孤立/相邻/跨 chunk 水面、水/实体边界和双 Transferable payload。Chromium 当前验证双 pass 不导致运行时错误，但还没有像素级透明排序/混合断言。

同一 `github.ref` 使用 `cancel-in-progress`，新 push 会取消旧质量 run，避免陈旧 HEAD 占用 runner。GitHub Pages 由独立 workflow 从 `main` 部署。

## 当前技术债

- Three.js 仍从 jsDelivr runtime import；应 vendor/pin 或引入构建产物，避免 CDN 成为运行时单点依赖。
- terrain / mesh 各只有 1 个 Worker；高速移动/大范围编辑最终需要 Worker pool、优先级和取消机制。
- 水已经有独立透明 pass，但仍是静态整方块表面：没有流体传播/液面高度、游泳/浮力、水下检测/氧气、水下 fog/折射，也没有不同 GPU 上的像素级透明排序自动验证。
- mesh Worker 的 opaque 旧顶层 buffer 字段是迁移兼容层；所有消费者迁到 `opaque/water` 协议后应删除，避免长期维护双接口。
- IndexedDB edits 仍集中在单 world record。
- UI 通过重建 slot DOM 保证简单正确；物品规模增加后需局部更新减少 GC/布局。
- Equipment 当前只支持手动 cursor 拖放；Shift-click 自动装备、右键快捷装备未实现。
- 皮革护甲图标是内联 SVG 占位；没有正式 armor texture、玩家模型穿戴渲染、durability、NBT、附魔或 Armor Trim。
- 当前护甲公式是过渡规则，不等于 Java armor+toughness；真实敌对攻击的 Chromium HP 差值尚未做自动 E2E。
- 生物没有 chunk 持久化、群系/亮度/容量标准规则、正式动画/碰撞。
- 僵尸/骷髅/蜘蛛只做局部地形移动，没有完整寻路。
- 骷髅不做攻击前视线规划；箭矢物理可以撞墙，但 AI 仍可能向墙后玩家射击。
- 玩家/生物/箭矢仍是几何占位，尚未进入标准 skin UV、骨骼动画或正式像素素材管线。
- 工具 durability/NBT/附魔尚未进入 item stack schema。
- Loot 仍是简化静态表，没有完整条件化 loot table。
- 死亡掉落与经验球不持久化；页面刷新可使尚未回收的死亡实体消失。

这些项目必须继续拆除，不能因为“已经能跑”就固化成长期架构。