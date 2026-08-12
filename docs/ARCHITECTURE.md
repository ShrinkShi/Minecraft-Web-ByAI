# 架构记录

## 设计原则

1. **数据优先**：区块用紧凑 TypedArray；Inventory、Equipment、配方、战斗、护甲、氧气、游泳和死亡规则尽量保持纯数据/纯逻辑。
2. **重活离开主线程**：terrain 与 mesh 分别运行在 Web Worker；主线程负责输入、系统编排和 GPU 对象安装。
3. **按 chunk 批处理渲染**：不是一方块一 Mesh；当前每个 chunk 最多一个 opaque mesh + 一个 water mesh。
4. **玩家位置只有一个积分器**：陆地、飞行、水中移动都必须收口在 `PlayerController.update()`，禁止在 main.js 叠第二套位置积分。
5. **GPU 生命周期显式**：chunk rebuild/unload 与 world teardown 都必须释放 geometry/material/texture。
6. **程序化世界只存差异**：seed/prompt 重建基础区块，IndexedDB 保存玩家/Inventory/Equipment/XP/voxel edits 等必要状态。
7. **瞬时环境/运动状态不滥入存档**：Oxygen 与 swimCoverage 都不进入 v5 world record。
8. **规则可离线测试**：核心纯规则和 Worker 协议必须能在 Node 22 中回归；浏览器测试负责真实 World/Player/Input/UI 集成。
9. **远端证据决定完成度**：只有进入 GitHub `main` 且通过质量门与部署验收的功能才算完成。

## 当前 v0.4 总体数据流

```text
world-worker.js -> chunk Uint8Array -> VoxelWorld.chunks -> mesh-worker.js
                                                     /          \
                                               opaque         water
                                                     \          /
                                                  GPU install

Player input -----------------------------------------------------┐
World.getBlock -> feet/torso/eye liquid samples -> swim-rules ----┤
World.getBlock -> eye liquid? -> oxygen-rules -> drowning --------┤
AI -> damage/projectile/explosion -> armor-rules ------------------┤
                                                                  v
                                                        PlayerController
                                                    one collision/integration path
                                                                  |
                                                                  v
                                                              position

Mob death -> DropSystem + ExperienceOrbSystem -> Inventory / totalXp
```

## World / Worker / Water render

- `world-worker.js` 只生成 voxel 数据；prompt 会影响地形参数与水位。
- `mesh-worker.js` 一次 chunk 扫描分别构建 `opaque` 与 `water` 两套 buffers。
- 同水内部面会剔除，包括跨 chunk 邻接；水对实体接触面剔除，实体面对透明水保留。
- opaque 旧顶层 buffers 暂时保留为迁移兼容视图；运行时只消费 `opaque/water` 子协议。
- 每 chunk GPU 记录为 `{opaque, water}`，两 pass 共用 atlas；water 当前 `transparent=true`、`opacity=.68`、`depthWrite=false`。
- rebuild/unload 时两套 geometry dispose；world teardown 时两 material 分别 dispose，共享 atlas 一次 dispose。
- 当前仍不是 Fluid System：没有 level/传播、流向、动态液面、水下折射或岸边效果。

## Player movement

### 单一积分路径

`PlayerController.update()` 仍是玩家位移的唯一真相源：

- flying：保留原创造/旁观飞行路径。
- dry：保留原陆地 `-24` 重力、grounded Space=8.2 跳跃、walk/sprint/sneak 速度语义。
- water：只替换“本帧运动参数”，随后仍调用同一 `moveAxis(x/z/y)` 和 AABB `collides()`。

这避免了把“水中移动”写进 main.js 后出现双重位移、两套碰撞或帧序依赖。

### 水覆盖率采样

Player 每帧在自身 X/Z 柱上采样三个高度：

```text
feet  = position.y + 0.2
torso = position.y + 0.9
eye   = position.y + 1.62
```

- 每个采样点通过 `World.getBlock()` + `BLOCKS[id].liquid` 转为布尔值。
- `waterCoverageFromSamples()` 将三点转为 0 / 1/3 / 2/3 / 1。
- coverage 是运行时派生值，记录在 `Player.swimCoverage` 方便观测，但不进入 snapshot。
- flying 模式直接 coverage=0，避免创造/旁观飞行被水阻力劫持。

### `swim-rules.js`

当前基础常量：

```text
full-water horizontal multiplier = 0.50
water gravity                    = 4.5
full-body buoyancy accel         = 5.5
Space extra up accel             = 12
Shift extra down accel           = 10
vertical drag                    = 3.5
max up / down speed              = +3.4 / -3.0
```

规则：

- coverage=0 返回 strict no-op：`active=false`、speed=1、vertical velocity 原样返回。
- 水中水平倍率按 coverage 从 1 线性插值到 0.5；部分浸水不会瞬间变成完整水中速度。
- 水中不使用陆地 sprint 速度，也不把 Shift 当 `.35` 水平 sneak；Shift 被解释为下潜。
- 垂直加速度 = 低重力 + coverage 浮力；完整浸水无输入时有轻微正浮力，部分浸水仍可能下沉。
- Space/Shift 分别增加向上/向下加速度；二者同时按下时额外加速度互相取消。
- 垂直速度经指数阻尼并限制为约 +3.4/-3.0。
- 水中 horizontal knockback velocity 使用比陆地稍弱的阻尼常量，但仍通过原 `velocity.x/z` + `moveAxis()` 积分。

这只是基础“直立游泳/漂浮”，不是现代 Minecraft 冲刺游泳：当前没有沿视线 pitch 三维推进、0.6m 游泳姿态、crawl transition 或动画状态机。

## Oxygen / Drowning

### 头部浸水

- Oxygen 与 swim coverage 分开：氧气只采样 `Player.eyePosition()` 所在 voxel。
- 只有 `BLOCKS[id].liquid` 才算 `headSubmerged=true`。
- 因此脚/躯干入水会触发水中运动，但头未入水不会扣空气。

### Oxygen state

`oxygen-rules.js` 当前：

```text
MAX_AIR_SECONDS = 15
AIR_RECOVERY_PER_SECOND = 4
DROWN_INTERVAL_SECONDS = 1
DROWN_DAMAGE = 2 HP
```

- survival/adventure 使用氧气；creative/spectator 满空气且不溺水。
- 浸水按 dt 消耗，离水 4x 恢复。
- 跨越 0 时只把真正 0-air 的剩余 dt 累入 drowning timer。
- 0-air 每 1 秒产生一个 drowning event。
- Drowning 直接送入 `Player.takeDamage()`，不经过 armor-rules。
- Oxygen 不进入 Player snapshot/world record；respawn/world dispose/非氧气模式复位。

### Oxygen HUD

- `UI.renderOxygen()` 不持有规则状态。
- `#oxygen[data-air]` 是稳定 E2E 观测点。
- 10 气泡只在 headSubmerged 或空气未恢复满时显示。

## Inventory / Equipment / Armor

- Inventory 固定 36 格；Equipment 固定 head/chest/legs/feet 四槽。
- Equipment restore 过滤错误部位/非护甲，合法 count 归一为 1。
- 皮革护甲当前 1/3/2/1 点，共 7。
- armor-rules 过渡公式：`min(0.8, armorPoints * 0.04)`；7 点=28%。
- melee/arrow/explosion 经过护甲；void/drowning 绕过。

## Crafting / Death settlement

- CraftingGrid 普通关闭使用 `clearTo()`；死亡使用 drain，避免 overflow 副作用。
- 死亡顺序：记录位置 -> death plan -> drain Crafting/Equipment/Inventory/cursor -> recoverable 生成 drops/orbs 或 void 丢弃 -> 清 XP -> respawn。
- survival/adventure 有损失；creative/spectator 无损失。
- 可恢复死亡 XP：`min(100, currentLevel * 7)`；`y < -10` 为不可恢复虚空。

## Entities / Combat

- EntityStore + SpatialHash 管实体记录与邻域候选。
- Passive：牛/羊/猪/鸡。
- Hostile：僵尸近战、骷髅远程、苦力怕爆炸、蜘蛛近战/有限攀爬。
- AI 通过 callback 发伤害/投射物/爆炸/死亡事件，不直接改 HUD/存档。
- Projectile 使用 segment/AABB + world raycast；Explosion 当前为基础距离伤害/击退/地形破坏。
- 生物目前没有水中专用 AI；Player swimming 不应被错误复用到实体系统。

## Storage

- IndexedDB object-store schema version 1；world record 逻辑快照 v5。
- 保存 Player snapshot、Inventory、Equipment、totalXp、gameTime、weather、voxel edits。
- 不保存 Oxygen 或 swimCoverage；二者都是由环境重新派生的瞬时状态。
- 程序化 chunk 由 seed/prompt 重建，不保存完整 chunk。

## CI / Browser integration

`Repository quality`：

1. `static-checks`：语法检查 + base/armor/water/oxygen/swim 五套回归。
2. `browser-smoke`：固定 seed + `海` prompt 真正启动水体世界，验证 opaque/water render、oxygen data-air、Space 上游、Shift 下潜；然后继续验证 Equipment v5 存档与虚空死亡。

Browser swimming test 从 debug HUD 解析真实 Y，不访问隐藏 Player 内部对象；因此验证的是公开运行时链而非测试专用后门。

## 当前技术债

- Three.js 仍从 jsDelivr runtime import。
- terrain/mesh 各只有一个 Worker，高速探索需要 pool/优先级/取消。
- water 仍是静态透明 pass，没有流体传播/level/水流/动态表面和水下后处理。
- swimming 只有基础直立移动：没有冲刺游泳姿态、沿 pitch 三维推进、crawl transition、动画、实体游泳 AI、水流作用。
- Oxygen 没有 Respiration、Water Breathing、Conduit、气泡柱；drowning 仍共用 Player hurt iframe。
- opaque Worker 顶层 buffer 兼容层应在消费者迁移完成后删除。
- Equipment 无快捷装备、耐久、正式穿戴模型和标准 armor+toughness。
- 生物无 chunk 持久化、正式寻路/亮度生成/动画。
- 死亡界面、床/重生点、keepInventory、死亡世界实体持久化尚未完成。

这些项目继续按独立可验证单元拆除，不能因为“已经能跑”就固化成长期架构。
