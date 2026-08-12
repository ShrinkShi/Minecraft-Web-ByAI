# 架构记录

## 设计原则

1. **数据优先**：区块用紧凑 TypedArray；Inventory、Equipment、配方、战斗、护甲、氧气和死亡规则尽量保持纯数据/纯逻辑。
2. **重活离开主线程**：terrain 与 mesh 分别运行在 Web Worker；主线程负责输入、系统编排和 GPU 对象安装。
3. **按 chunk 批处理渲染**：不是一方块一 Mesh；当前每个 chunk 最多一个 opaque mesh + 一个 water mesh。
4. **GPU 生命周期显式**：chunk rebuild/unload 与 world teardown 都必须释放 geometry/material/texture。
5. **程序化世界只存差异**：seed/prompt 重建基础区块，IndexedDB 保存玩家/Inventory/Equipment/XP/voxel edits 等必要状态。
6. **瞬时环境状态不滥入存档**：Oxygen 当前属于短时状态，重进世界/重生恢复满空气，不写入 v5 world record。
7. **规则可离线测试**：核心纯规则和 Worker 协议必须能在 Node 22 中回归；浏览器测试负责跨模块集成。
8. **远端证据决定完成度**：只有进入 GitHub `main` 且通过质量门与部署验收的功能才算完成。

## 当前 v0.4 总体数据流

```text
world-worker.js -> chunk Uint8Array
                       |
                       v
                 VoxelWorld.chunks
                       |
                       v
                 mesh-worker.js
                  /           \
           opaque buffers   water buffers
                  \           /
                   VoxelWorld GPU install

Input / Commands -------------------------------> Player / World
AI -> damage/projectile/explosion -> armor-rules -> Player.takeDamage
                         drowning ---------------> Player.takeDamage
Mob death -> DropSystem + ExperienceOrbSystem -> Inventory / totalXp

Player eye voxel -> liquid? -> oxygen-rules -> Oxygen HUD
                                      |
                                drowning events
                                      |
                                      v
                              Player.takeDamage
```

## World / Worker / Render passes

- `world-worker.js` 只生成 voxel 数据；prompt 会影响地形参数与水位。
- `mesh-worker.js` 一次 chunk 扫描分别构建 `opaque` 与 `water` 两套 positions/normals/uvs/colors/indices。
- 两套非空 payload 使用独立 TypedArray buffers 并作为 Transferable 返回。
- 同水内部面会剔除，包括跨 chunk 邻接面；水对实体方块接触面剔除，而实体方块面对透明水保留。
- opaque 旧顶层 buffers 暂时保留为迁移兼容视图；`VoxelWorld` 运行时只消费新 `opaque/water` 子协议。
- 每 chunk 的 GPU 记录为 `{opaque, water}`；任一 pass 都可为空。
- 两 pass 共用 atlas texture；water material 当前 `transparent=true`、`opacity=.68`、`depthWrite=false`，renderOrder 高于 opaque。
- chunk rebuild/unload 时两套 geometry 都 dispose；world teardown 时两套 material 分别 dispose，共享 atlas 只 dispose 一次。
- 当前仍不是流体模拟：没有水流传播、动态液面高度、流向、岸边泡沫或折射。

## Player / 水下检测 / Oxygen

### 浸水判定

- 玩家物理主体仍由 `PlayerController` 管理；水不参与 solid AABB 碰撞。
- 主编排层每帧取 `Player.eyePosition()`，对其 XYZ floor 后调用 `VoxelWorld.getBlock()`。
- 只有 `BLOCKS[id].liquid === true` 才认为 `headSubmerged=true`。
- 这比“脚进入水就扣空气”更接近头部真正浸没的语义，也避免把水体渲染状态当生存状态源。

### Oxygen state

`oxygen-rules.js` 是纯规则模块，当前常量：

```text
MAX_AIR_SECONDS = 15
AIR_RECOVERY_PER_SECOND = 4
DROWN_INTERVAL_SECONDS = 1
DROWN_DAMAGE = 2 HP
```

- survival / adventure 使用氧气。
- creative / spectator 每次 step 都恢复满空气且不产生溺水事件。
- 浸水时空气按真实 `dt` 下降；离水按 4x 速度恢复。
- 跨越空气 0 点时，只把真正处于 0 空气后的剩余 `dt` 累入 drown timer，避免提前伤害。
- 空气耗尽后每累计 1 秒产生一个 drowning damage event。
- 主编排层把该事件直接送入 `Player.takeDamage(DROWN_DAMAGE, now, null)`；**不经过 `armor-rules.js`**，所以皮革护甲不会错误减免溺水。
- Oxygen 不进入 `Player.snapshot()` 或 world record。respawn、world dispose 和切换到 creative/spectator 时调用 reset。

### Oxygen HUD

- `UI.renderOxygen()` 接收 air/maxAir/visible，不持有规则状态。
- `#oxygen[data-air]` 提供稳定的浏览器集成观测点。
- 10 个气泡根据空气比例显示；仅 headSubmerged 或空气尚未恢复满时显示。
- `oxygen.css` 只负责视觉，不参与规则。

## Inventory / Equipment / Armor

- Inventory 固定 36 格，快捷栏映射 slots 27..35；cursor 独立。
- Equipment 固定 head/chest/legs/feet 四槽，不占用 Inventory。
- Equipment restore 会过滤错误部位/非护甲快照，合法装备 count 归一为 1。
- 当前皮革护甲点：1/3/2/1，共 7。
- `armor-rules.js` 当前过渡公式：`min(0.8, armorPoints * 0.04)`；7 点 = 28%。
- Hostile melee、arrow、explosion 的 damage amount 在进入 Player 前经过护甲规则。
- 虚空与 drowning 不经过 armor-rules。

## Crafting / Death settlement

- `CraftingGrid` 维护 2x2 / 3x3 输入；普通关闭 GUI 使用 `clearTo()` 回收。
- 死亡不能复用普通 closePanels，因为 overflow 会在虚空死亡时制造不可回收实体。
- 死亡顺序：记录死亡位置 -> death plan -> drain CraftingGrid/Equipment/Inventory/cursor -> 可恢复位置生成 drops/orbs 或虚空直接丢弃 -> 清 XP -> respawn。
- survival/adventure 执行损失；creative/spectator 不执行。
- 可恢复死亡 XP：`min(100, currentLevel * 7)`。
- `y < -10` 是不可恢复虚空死亡边界。

## Entities / Combat

- `EntityStore` 管实体记录，`SpatialHash` 按 X/Z 缩小邻域候选；不做全表两两扫描。
- Passive：牛、羊、猪、鸡，当前为 10 Hz 漫游/逃跑基础 AI。
- Hostile：僵尸近战、骷髅远程/侧移、苦力怕 fuse/explosion、蜘蛛近战/有限局部攀爬。
- AI 通过 callback 发伤害、投射物、爆炸、死亡事件，不直接改 HUD/存档。
- `ProjectileSystem` 用 segment/AABB 玩家命中 + world raycast 方块阻挡。
- `ExplosionSystem` 当前提供基础距离伤害、击退、附近地形破坏。
- 尚无完整 Java 攻击强度曲线、暴击、扫击、toughness、耐久、药水、附魔等。

## Loot / Experience

- `mobs.js` 保存简化 loot/xp 数据，roll 支持注入 RNG 供确定性测试。
- `ExperienceOrbSystem` 负责重力、吸附、拾取和销毁。
- `experience.js` 以 totalXp 为单一真相源，level/progress 均派生。
- 掉落物/经验球目前不跨页面重载持久化。

## Storage

- IndexedDB object-store schema 仍为 version 1；world record 逻辑快照当前为 v5。
- v5 保存：Player snapshot、36 格 Inventory、Equipment、totalXp、gameTime、weather、voxel edits 等。
- **不保存 Oxygen**。短时空气值不会造成旧存档迁移负担，也避免玩家重新载入后处于不可解释的半窒息状态。
- 程序化 chunk 由 seed/prompt 重建，不保存完整 chunk。
- 长期技术债：voxel edits 仍集中在单 world record，后续大世界应按 chunk/page 拆 store。

## CI / Browser integration

`Repository quality`：

1. `static-checks`：Node 22 对 `src/*.js`、`scripts/*.mjs` 语法检查，并运行 base + armor + water + oxygen 四套逻辑/Worker 回归。
2. `browser-smoke`：真实 Chromium 启动世界、走 opaque/water 双 pass；固定 seed + `海` prompt 验证 eye voxel 浸水与 `data-air` 下降/离水恢复；再验证护甲 v5 存档和虚空死亡清算。

完整 15 秒窒息不在浏览器 CI 里硬等，而由 `check-oxygen.mjs` 精确验证；浏览器层只验证真实地形/Player/World/UI 接线。

## 当前技术债

- Three.js 仍从 jsDelivr runtime import，CDN 是运行时单点依赖，应 vendor/pin 或引入构建产物。
- terrain/mesh 各只有一个 Worker，高速探索最终需要 pool、优先级和取消机制。
- water 只有透明静态 pass；没有游泳/浮力、流体传播、水面高度/动画、水下 fog/折射。
- Oxygen 没有 Respiration、Water Breathing、Conduit、气泡柱等状态效果交互。
- 当前 drowning 共用 Player 的受击无敌窗口；更精确的伤害类型/免疫规则需要统一 DamageType 层。
- opaque Worker 顶层 buffer 兼容层应在所有消费者迁移后删除。
- Equipment 只有手动 cursor 拖放；无 Shift-click 自动装备、快捷右键、耐久、正式材质/模型穿戴。
- 当前护甲是过渡公式，不等于 Java armor+toughness。
- 生物没有 chunk 持久化、正式寻路、亮度生成规则和正式动画。
- 死亡界面、床/重生点、keepInventory、死亡实体持久化尚未完成。

这些项目必须继续按独立可验证单元拆除，不能因为“已经能跑”就固化为长期架构。