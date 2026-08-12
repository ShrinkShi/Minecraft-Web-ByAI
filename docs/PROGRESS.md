# 开发进度

## 当前版本口径

- 稳定发布基线：`v0.3.0`。
- 当前 `main` 开发线：`v0.4.0-dev`。
- 版本完成度只按 GitHub `main` 已落库代码和通过的质量门认定；未形成远端 commit 的临时实现不计入完成。

## 工程质量基础

- [x] Node 22 `src/*.js` 与 `scripts/*.mjs` 语法检查。
- [x] `npm run test:logic`：基础世界/实体/Worker + Equipment/Armor + Water Mesh + Oxygen/Drowning + Swimming/Buoyancy + Weather/Precipitation 回归。
- [x] GitHub Pages 使用 GitHub Actions，并持续验证真实 Pages Deployment。
- [x] Playwright Chromium browser smoke：海洋世界→氧气→游泳→rain/thunder/clear WeatherFX→护甲装备/存档→虚空死亡/重生→IndexedDB 核对。
- [x] 浏览器失败保留 Playwright trace / screenshot / report。
- [ ] 将 Three.js 从运行时 jsDelivr 迁移为版本锁定的本地 vendor / 构建依赖。
- [ ] 扩展 E2E 到普通死亡掉落/拾回、真实战斗减伤、完整溺水死亡、横向游泳速度、天气像素/遮雨、存档重载。

## v0.4.0 — 实体、战斗与生存扩展（开发中）

状态：开发中。实体基础、四种敌对生物、奖励闭环、生存死亡损失、第一版护甲、透明水 pass、氧气/溺水、基础游泳/浮力和可见降雨 FX 已落库；死亡界面、完整流体/冲刺游泳、自动天气/闪电/雪、水下视觉和正式 Java 伤害/护甲公式仍未完成。

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
- [x] Chromium 虚空死亡 E2E：背包/装备/XP 清空且重生位置有效
- [ ] 普通死亡浏览器 E2E、死亡界面/统计、床/重生点、`keepInventory`
- [ ] 死亡掉落/经验球跨页面重载持久化

### Equipment / Armor
- [x] `Equipment`：head/chest/legs/feet 四槽，不占 36 格 Inventory
- [x] 皮革四件：1/3/2/1 护甲点，cursor 手动装备，错误部位拒绝
- [x] `armor-rules.js`：过渡公式每点 4%，最高 80%；完整皮革套 7 点=28%
- [x] 敌对近战、箭矢、爆炸经过基础护甲减伤；虚空/溺水绕过护甲
- [x] v5 world record 保存/恢复 Equipment；非法快照过滤
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
- [x] oxygen 是瞬时状态，不写入 v5 world record
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
