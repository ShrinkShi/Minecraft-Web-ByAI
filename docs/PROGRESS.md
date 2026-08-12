# 开发进度

## 当前版本口径

- 稳定发布基线：`v0.3.0`。
- 当前 `main` 开发线：`v0.4.0-dev`。
- 版本完成度只按 GitHub `main` 已落库代码和通过的质量门认定；未形成远端 commit 的临时实现不计入完成。

## 工程质量基础

- [x] Node 22 `src/*.js` 与 `scripts/*.mjs` 语法检查。
- [x] `npm run test:logic`：基础世界/实体/Worker + Equipment/Armor + Water Mesh + Oxygen/Drowning + Swimming/Buoyancy + Weather/Precipitation + Death Integration + Custom Respawn + Bed Rules + Mobile Device/Input + Unified Control Intent + Absolute View Frame + Bed Sleep/Quorum，共 13 套回归。
- [x] PC/手机输入统一：`ControlIntentBus` 为唯一 gameplay input contract；Desktop/Touch 只是适配器，Player 不再拥有 DOM 键盘监听或 mobile virtualInput。
- [x] 联机前置平台约束：同一 World/Player/Inventory/存档/玩法语义，未来 `network-peer` 与本地输入复用相同控制状态，不创建独立 mobile client protocol。
- [x] `PlayerControlFrame v1`：平台无关连续控制 wire schema；desktop/touch/network-peer 同状态编码一致且不携带设备身份。
- [x] `PlayerViewFrame v1`：平台无关绝对 yaw/pitch wire schema；yaw 规范化到 `[-π,π)`，pitch 严格限制为 Player 运行时范围，拒绝 device/source 与畸形字段。
- [x] GitHub Pages 使用 GitHub Actions，并持续验证真实 Pages Deployment。
- [x] Playwright Chromium browser smoke：主海洋世界覆盖氧气/游泳/WeatherFX/护甲 v6/虚空死亡；第二世界覆盖普通死亡物品+XP 回收；第三世界覆盖 `/spawnpoint` 持久化与精确自定义重生；第四世界覆盖真实床放置/激活与床锚点重生；第五条 Android 横屏用例覆盖移动端自动识别、旋转提示、触控 UI 和摇杆移动。
- [x] 浏览器失败保留 Playwright trace / screenshot / report。
- [ ] 将 Three.js 从运行时 jsDelivr 迁移为版本锁定的本地 vendor / 构建依赖。
- [ ] 扩展 E2E 到普通死亡掉落/拾回、真实战斗减伤、完整溺水死亡、横向游泳速度、天气像素/遮雨、存档重载。

## v0.4.0 — 实体、战斗与生存扩展（开发中）

状态：开发中。实体基础、四种敌对生物、奖励闭环、生存死亡损失、显式死亡界面/重生、持久化自定义重生点、两格床重生锚点与夜间睡眠跳夜、第一版护甲、透明水 pass、氧气/溺水、基础游泳/浮力、可见降雨 FX 和手机浏览器横屏触控底座已落库；死亡统计/床重生、完整流体/冲刺游泳、自动天气/闪电/雪、水下视觉和正式 Java 伤害/护甲公式仍未完成。

### 实体 / 战斗 / 奖励
- [x] `EntityStore` + `SpatialHash` 数据/空间索引基础及 Node 回归
- [x] 牛、羊、猪、鸡：地表生成、10 Hz 漫游、受击逃跑、距离回收
- [x] 僵尸：夜间生成、追击和近战
- [x] 骷髅：距离控制、侧移和箭矢远程攻击
- [x] 苦力怕：引信/取消/爆炸；玩家伤害/击退与附近地形破坏
- [x] 蜘蛛：16 HP、宽体视觉、近战追击、有限局部攀爬
- [x] `combat.js`：攻击冷却、受击无敌、伤害和击退纯规则
- [x] `ProjectileSystem` + projectile rules：箭矢重力、方块阻挡、segment/AABB 玩家命中
- [x] 第一批 loot、`ExperienceOrbSystem`、Java 风格 XP 等级/总经验公式与存档
- [ ] 完整寻路、亮度生成、日照燃烧、玩家弓、暴击/扫击/完整攻击强度曲线

### 死亡
- [x] `death-rules.js`：模式损失策略、`min(100, level × 7)` 死亡 XP、虚空边界
- [x] survival/adventure 死亡统一 drain Inventory/cursor/Crafting/Equipment
- [x] 普通死亡在原地生成物品/经验；`y < -10` 虚空死亡直接损失
- [x] creative/spectator 不执行上述死亡损失
- [x] `DeathScreen`：死亡原因/损失摘要、显式“重生”和“返回标题画面”；死亡状态下普通输入和本地世界帧被阻断
- [x] 死亡结算与重生分离：`beginPlayerDeath()` 先在原位置清算并保存，`completeRespawn()` 仅由显式重生动作调用
- [x] Chromium 虚空死亡 E2E：死亡界面必须持续存在，Escape 不得打开暂停菜单，点击“重生”后才恢复 hp=20；背包/装备/XP 仍保持清空
- [x] 标准 `/kill` self 指令通过正式 `beginPlayerDeath()` 进入死亡流程；额外参数拒绝
- [x] Chromium 普通可恢复死亡物品闭环：给予 3 原木→`/kill`→死亡界面确认 3 物品掉落→显式重生→返回死亡坐标→DropSystem 真实拾回→IndexedDB 再次持有 3 原木
- [x] self `/xp add <points>` / `/experience` points 指令，通过现有 `addExperience()` 接入，不支持 levels/目标选择器
- [x] Chromium 普通死亡 XP 闭环：16 total XP（Lv.2）→`/kill`→摘要确认 14 XP→显式重生→返回死亡点→ExperienceOrbSystem 真实吸收→IndexedDB `totalXp=14`（恢复后派生 Lv.1）
- [x] `respawn-rules.js` + `Player.respawnAt()`：精确点/周边候选、安全位置解析和世界出生点 fallback
- [x] self `/spawnpoint [x y z]`：当前点或 `~` 相对坐标；v6 world record 持久化 `respawnPoint`
- [x] Chromium 自定义重生 E2E：非原点设置并保存 `/spawnpoint`→移动到异地 `/kill`→显式重生必须回到持久化精确安全点
- [x] `bed-rules.js`：四方向 foot/head 配对、任一端 partner 解析与统一床锚点纯规则
- [x] 生存床物品/配方：3 白色羊毛 + 3 橡木木板→1 床；羊既有 loot 提供 `white_wool`
- [x] 两格床 runtime：真实朝向原子放置、任一端右键设置共享 respawnPoint、破坏任一端联动清理并只掉 1 床
- [x] Chromium 床 E2E：`/give bed`→真实背包槽 0→热栏 27→Pointer Lock/准星→右键放置→右键床设重生点→`/time set night`→再次使用同一床跳到约 1000 tick 清晨→v6 同时保存两端 edits/respawnPoint→异地死亡回床锚点
- [x] `sleep-rules.js`：晴天/雨天睡眠窗口、雷暴例外、清晨目标和多人 sleeper percentage/quorum 纯规则；当前单人 runtime 使用 1/1 quorum，未来服务端直接传真实睡眠人数
- [ ] 装备掉落的普通死亡单独拾回断言、死亡统计、床占用/怪物限制/半高模型、`keepInventory`
- [ ] 死亡掉落/经验球跨页面重载持久化

### Mobile browser / Landscape touch
- [x] `device-profile.js`：Mobile UA / UA-CH + touch/coarse/no-hover 回退；iPadOS 桌面 UA 与 touchscreen laptop false-positive 边界回归
- [x] portrait 手机全屏旋转提示；landscape 自动启用 safe-area-aware 触控 HUD
- [x] 左模拟摇杆 + 右侧拖动视角；`DesktopControls` / `MobileControls` 只翻译设备事件并统一写入 `ControlIntentBus`，Player 仅消费 canonical control state/look intent
- [x] 攻击/持续挖掘、使用/放置、跳跃、疾跑、潜行、丢弃、背包、暂停、聊天、视角切换与触控热栏
- [x] 手机控制不依赖 Pointer Lock；桌面 Pointer Lock/键鼠路径保持原语义
- [x] Android Chromium 844×390 + touch + Mobile UA：横竖屏、背包、暂停、视角、摇杆位移、热栏选择 E2E
- [ ] 真实 iOS Safari / Android 设备矩阵、可选全屏/方向锁定、震动反馈、控件尺寸/位置自定义、PWA 安装与离线缓存

### Equipment / Armor
- [x] `Equipment`：head/chest/legs/feet 四槽，不占 36 格 Inventory
- [x] 皮革四件：1/3/2/1 护甲点，cursor 手动装备，错误部位拒绝
- [x] `armor-rules.js`：过渡公式每点 4%，最高 80%；完整皮革套 7 点=28%
- [x] 敌对近战、箭矢、爆炸经过基础护甲减伤；虚空/溺水绕过护甲
- [x] v6 world record 保存/恢复 Equipment；非法快照过滤
- [x] `scripts/check-armor.mjs` + Chromium 真实装备/存档/死亡清空
- [ ] 正式 armor+toughness、耐久、更多材质、附魔、Armor Trim、装备配方/快捷装备

### Water render
- [x] `mesh-worker.js` 单次 chunk 扫描分别构建 opaque / water 两套 TypedArray + Transferable
- [x] 同水内部面与跨 chunk 同水边界剔除；水/实体边界方向规则
- [x] `VoxelWorld` 每 chunk 最多一个 opaque mesh + 一个透明 water mesh
- [x] 两 pass 共享 atlas；water 当前 `transparent=true / opacity=.68 / depthWrite=false`
- [x] rebuild/unload/dispose 显式释放两套 geometry、material 与共享 texture
- [x] `scripts/check-water.mjs` 回归；opaque 旧顶层 buffers 暂留迁移兼容层
- [ ] 流体 level/传播、水流、动态水面、透明排序像素测试、水下 fog/折射

### Oxygen / Drowning
- [x] eye voxel `liquid` 头部浸水检测
- [x] survival/adventure 15 秒空气；离水 4× 恢复；creative/spectator 满空气
- [x] 0 空气后每秒产生一次 2 HP 溺水伤害，溺水绕过护甲
- [x] 10 气泡 Oxygen HUD；重生/退出/非氧气模式复位
- [x] oxygen 是瞬时状态，不写入 v6 world record
- [x] `scripts/check-oxygen.mjs` 精确时序回归
- [x] Chromium：固定 seed + `海` prompt 真实浸水→air 下降→离水恢复；并确认存档无 oxygen
- [ ] Respiration、Water Breathing、Conduit、气泡柱等扩展

### Swimming / Buoyancy
- [x] `swim-rules.js`：水体覆盖率、水平速度倍率、降低重力、浮力、上下游和垂直限速纯规则
- [x] Player 脚/躯干/眼睛三点采样；覆盖率由 0→1 时水平速度平滑趋近陆地的 50%
- [x] 水中不套用陆地 sprint/sneak 速度语义；Space 上游、Shift 下潜
- [x] 完整浸水有轻微正浮力；水中垂直阻尼并限制约 +3.4/-3.0
- [x] 水中仍复用 Player 原有 AABB 碰撞与单一轴向积分；离水自动恢复原陆地重力/跳跃
- [x] `scripts/check-swim.mjs` + Chromium 真实海洋 Space 上升 / Shift 下降
- [ ] 冲刺游泳姿态/爬行过渡、视线方向三维推进、实体游泳 AI、水流作用、Depth Strider/Dolphin's Grace

### Weather / Precipitation
- [x] 原有 `/weather clear|rain|thunder` 与 world record weather 状态保留
- [x] `weather-rules.js`：clear/rain/thunder 固定 profile，包含预算、下落速度、雨线长度、风偏和透明度
- [x] 固定天气池上限 720：clear=0、rain=`floor(720×.62)=446`、thunder=720
- [x] `WeatherSystem` 使用单一 `THREE.LineSegments` + 动态 Float32Array，不按雨滴创建 Mesh/Geometry
- [x] 降水在玩家约 16 格范围内循环 respawn/recycle；玩家移动/传送后重新围绕玩家分布
- [x] `/weather` 同时更新环境光和 WeatherSystem profile；恢复存档世界时恢复 weather FX
- [x] world teardown 显式 dispose weather geometry/material
- [x] `scripts/check-weather.mjs`：天气类型、精确预算、rain/thunder 参数强度和非法输入回归
- [x] Chromium：真实执行 `/weather rain → thunder → clear`，debug 必须出现 `WeatherFX rain:446 → thunder:720 → clear:0`
- [ ] 自动天气周期、群系降水、雪、屋顶遮雨/世界碰撞、飞溅/湿润、闪电实体/伤害/音效、像素级降雨视觉断言

## v0.3.0 — 生存闭环基础

状态：实现完成。

- [x] 36 格背包 + 9 格快捷栏映射
- [x] 左/右键、Shift、cursor stack
- [x] 2×2 基础配方与 3×3 木镐、工作台 GUI
- [x] 方块掉落/拾取/Q 丢弃/300 秒销毁
- [x] F5 三视角
- [x] `/gamemode` `/give` `/tp` `/time set` `/weather` `/help`
- [x] 昼夜环境光、IndexedDB 基础存档、GitHub Actions 质量门

## v0.2.0 — 流式世界与持久化

- [x] 动态 chunk streaming 与卸载滞回
- [x] mesh Worker、精确 TypedArray + Transferable、请求去重队列
- [x] chunk 卸载 GPU geometry 释放
- [x] IndexedDB voxel edits + 玩家状态恢复

## v0.1.0 — 可玩体素核心

- [x] 主菜单 / 世界创建 / 暂停菜单
- [x] Pointer Lock、WASD、Jump、Sprint、Sneak
- [x] 生存 / 创造基础模式
- [x] terrain Worker、chunk 合并 mesh、方块破坏/放置
- [x] AABB 碰撞、重力、跳跃、HUD、GitHub Pages workflow
