# 架构记录

## 设计原则

1. **数据优先**：区块用紧凑 TypedArray；Inventory、Equipment、配方、战斗、护甲、氧气、游泳、天气 profile 和死亡规则尽量保持纯数据/纯逻辑。
2. **重活离开主线程**：terrain 与 mesh 分别运行在 Web Worker；主线程负责输入、系统编排和 GPU 对象安装。
3. **批处理渲染**：chunk 不是一方块一 Mesh；天气也不是一雨滴一 Mesh。可重复大量元素优先固定 Buffer 池。
4. **玩家位置只有一个积分器**：陆地、飞行、水中移动都收口在 `PlayerController.update()`。
5. **GPU 生命周期显式**：chunk rebuild/unload 与 world teardown 必须释放 geometry/material/texture；WeatherSystem 同样显式 dispose。
6. **程序化世界只存差异**：seed/prompt 重建基础区块，IndexedDB 保存必要 world record。
7. **瞬时状态不滥入存档**：Oxygen 与 swimCoverage 不持久化；weather 本身是长期世界状态，继续使用既有 weather 字段。
8. **规则可离线测试**：核心纯规则/Worker 协议在 Node 22 回归；真实 Three.js/WebGL 生命周期由 Chromium 覆盖。
9. **远端证据决定完成度**：只有进入 GitHub `main` 且质量门和 Pages 通过才算完成。

## 当前 v0.4 总体数据流

```text
world-worker -> chunk data -> mesh-worker -> opaque/water -> VoxelWorld GPU

Player input + World liquid samples -> swim-rules -> PlayerController -> position
Player eye liquid -> oxygen-rules -> drowning -> Player.takeDamage
AI damage/projectile/explosion -> armor-rules -> Player.takeDamage

/weather command -> main weather state -> applySky()
                               \-> WeatherSystem.setWeather()
                                      |
                                      v
                               fixed LineSegments pool
                                      |
                               player-relative recycle

Mob death -> DropSystem + ExperienceOrbSystem -> Inventory / totalXp
```

## World / Water render

- `world-worker.js` 生成 voxel 数据；`mesh-worker.js` 一次 chunk 扫描分别构建 opaque / water buffers。
- 同水内部面含跨 chunk 邻接会剔除；水对实体接触面剔除，实体面对透明水保留。
- 每 chunk GPU 记录 `{opaque, water}`；两 pass 共用 atlas，water 当前 `transparent=true / opacity=.68 / depthWrite=false`。
- opaque 顶层旧 buffers 暂作兼容视图；运行时只消费新 `opaque/water` 协议。
- 当前仍不是 Fluid System：没有 level/传播、水流、动态液面或水下后处理。

## Player / Swimming / Oxygen

- `PlayerController.update()` 是唯一位移积分路径。
- dry 保留原陆地重力/跳跃/疾跑/潜行；flying 保留创造/旁观飞行。
- water coverage 采样 `position.y+0.2 / +0.9 / +1.62` 三点，得到 0 / 1/3 / 2/3 / 1。
- `swim-rules.js` 在 coverage>0 时提供水平速度插值、低重力、coverage 浮力、Space 上游、Shift 下潜、垂直阻尼和约 +3.4/-3.0 限速；coverage=0 strict no-op。
- Oxygen 只采样 eye voxel，脚/躯干入水但头未入水不会扣空气。
- survival/adventure 15 秒空气，离水 4x 恢复；0-air 每秒一个 2 HP drowning event；creative/spectator 满空气。
- drowning 直接进入 Player.takeDamage，不经过 armor-rules。
- Oxygen/swimCoverage 都是环境派生瞬时状态，不进入 v5 world record。

## Weather / Precipitation

### 状态边界

- `weather` 仍是世界长期状态，合法值 `clear / rain / thunder`，继续写入既有 v5 world record。
- `/weather` 通过 Commands context 调用主编排层；main 同时更新 `weather`、`WeatherSystem.setWeather()`、`applySky()` 并标记存档 dirty。
- 世界载入时从 saved weather 恢复天空光照和 WeatherSystem profile，不引入新数据库 schema。

### `weather-rules.js`

默认固定池上限：

```text
WEATHER_MAX_SEGMENTS = 720
clear   ratio 0     ->   0 segments
rain    ratio .62   -> 446 segments
thunder ratio 1     -> 720 segments
```

profile 还提供 fallSpeed、line length、windX/windZ、opacity。thunder 的下落速度、线长、风偏和 opacity 均高于 rain。该模块纯逻辑，不依赖 Three.js。

### `WeatherSystem`

- 只创建一个 `THREE.LineSegments`、一个 `BufferGeometry`、一个 `LineBasicMaterial` 和一块固定 `Float32Array(maxSegments*2*3)` position buffer。
- `geometry.setDrawRange()` 控制 activeCount；clear 为 0，不销毁/重建资源。
- 每条雨线只维护 x/y/z、speedScale 和 generation 等 TypedArray 状态。
- update 时直接原地修改 position buffer 并 `needsUpdate=true`，不逐帧创建 Vector3/Mesh/Geometry。
- 雨线围绕玩家约 16 格半径分布；落到玩家下方或玩家移动/传送导致超出范围时，使用确定性 hash 重新放回玩家上方。
- rain 当前 446 条，thunder 720 条；雷雨更快、更长、更斜、更明显。
- `depthWrite=false`，renderOrder 高于主要世界 pass；这是轻量视觉 FX，不参与 world collision。
- world teardown 时 main 先 `weatherSystem.dispose()`，显式从 scene 移除并释放 geometry/material。

### 明确未实现

- 没有自动天气周期/duration。
- 没有 biome precipitation/snow。
- 没有屋顶/方块遮雨与雨线 collision。
- 没有地面 splash、湿润、积雪。
- thunder 目前只是更强降雨 + 原有暗光，没有闪电 flash/bolt/damage/sound。
- 没有像素级降水视觉 E2E；Chromium 当前验证 profile/实例/逐帧更新无运行时错误。

## Inventory / Equipment / Armor

- Inventory 固定 36 格；Equipment 固定 head/chest/legs/feet 四槽。
- 皮革护甲 1/3/2/1 点，共 7；当前 armor-rules 为 `min(0.8, armorPoints*0.04)`，整套 28%。
- melee/arrow/explosion 经过护甲；void/drowning 绕过。
- v5 world record 保存 Equipment，非法快照过滤。

## Death / Rewards / Explicit Respawn

- `death-rules.js` 仍只负责策略：survival/adventure 按 death plan drain Crafting/Equipment/Inventory/cursor；creative/spectator 不执行这套损失。
- `beginPlayerDeath()` 捕获原死亡坐标和旧 totalXp，在**原坐标**完成掉落/经验或虚空直接损失，然后设置 `deathState`、退出 Pointer Lock、写入死亡原因/损失摘要并显示 `DeathScreen`；它不会调用 `Player.respawn()`。
- 普通死亡在死亡点生成 drops/orbs；`y < -10` 虚空直接损失；死亡 XP 为 `min(100, currentLevel*7)`。
- deathState 激活时 `pointer()/canControl()/pause/inventory/workbench/key handler` 均有显式 guard，主 animate 的普通世界更新块也停止，避免尸体继续被移动、攻击或自动重生。
- `completeRespawn()` 只由“重生”按钮调用：`Player.respawn(0,0)` → reset oxygen → 清 deathState → 返回游戏 → 标记存档 dirty。
- “返回标题画面”会先 force-save 已清算的 hp=0 死亡状态再 dispose world；DeathScreen 本身不持久化。下次载入 hp<=0 的世界时，现有 `startWorld()` fallback 会直接 `player.respawn(0,0)`，因此不会把死亡 UI 跨页面保存。
- `beginPlayerDeath()` 还会 fire-and-forget 启动一次强制 IndexedDB 保存，降低停留在死亡界面后直接关闭页面造成结算丢失的风险。
- DropSystem / ExperienceOrbSystem 当前仍不跨页面持久化。

## Entities / Combat

- EntityStore + SpatialHash 管实体与邻域候选。
- Passive：牛/羊/猪/鸡；Hostile：僵尸/骷髅/苦力怕/蜘蛛。
- AI 通过 callback 发伤害/投射物/爆炸/死亡事件。
- Projectile 使用 segment/AABB + world raycast；Explosion 为基础距离伤害/击退/地形破坏。

## Storage

- IndexedDB object-store schema version 1；world record 逻辑快照 v5。
- 保存 Player、Inventory、Equipment、totalXp、gameTime、weather、voxel edits。
- weather 是持久状态；Oxygen/swimCoverage 是瞬时状态。
- 程序化 chunk 由 seed/prompt 重建，不存完整 chunk。

## CI / Browser integration

`Repository quality`：

1. static-checks：语法 + base/armor/water/oxygen/swim/weather 六套回归。
2. browser-smoke：固定海洋世界验证 water/oxygen/swimming；随后真实执行 `/weather rain → thunder → clear`，debug 必须出现 446 → 720 → 0；再验证 Equipment v5 存档和虚空死亡。

Weather browser test 不访问隐藏 WeatherSystem 实例，只读公开 debug HUD，并同时捕获 pageerror/console error，因此覆盖真实命令→main→Three.js 系统链。

## 当前技术债

- Three.js 仍从 jsDelivr runtime import。
- terrain/mesh 各只有一个 Worker，高速探索需要 pool/优先级/取消。
- water 仍是静态透明 pass；swimming 仍是基础直立移动。
- WeatherSystem 没有世界遮挡/碰撞、自动周期、雪、闪电、音效和像素级视觉回归。
- 固定 720 条 LineSegments 适合当前渲染距离；后续若增加视距/高密度天气，应以 GPU profiling 决定是否迁 instancing/shader precipitation，而不是盲目增大池。
- Oxygen 没有 Respiration/Water Breathing/Conduit/气泡柱。
- opaque Worker 顶层兼容 buffers 应在消费者迁移后删除。
- Equipment 无快捷装备、耐久、正式穿戴模型和标准 armor+toughness。
- 生物无 chunk 持久化、正式寻路/亮度生成/动画。
- 死亡统计、床/重生点、keepInventory、死亡世界实体持久化尚未完成。

这些项目继续按独立可验证单元拆除，不能因为“已经能跑”就固化成长期架构。
