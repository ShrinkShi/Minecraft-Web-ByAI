# Minecraft Web - 当前开发进度

更新时间：2026-08-24

## 当前主线

项目处于 `v0.4.0-dev`。严格按 Minecraft Java 1.20.1 完整玩法/内容口径，整体完成度仍保守维持约 **35%**。浏览器渲染/资源管线、单机生存基础与 authoritative multiplayer 骨架已经形成，但完整 registry、原版 worldgen、redstone、dimensions、enchanting/brewing、status effects 与 server-authoritative PvE 仍是主要缺口。

当前 merged `main`：

`69749b6e19ee3f7ecb4aa62e6e96a82a6d6a87cc`

该 main 已包含：

- PR #128：Wheat Farming Phase 1；
- PR #129：Vegetation / Farming Phase 1.1，terrain generator v4、short grass、自然小麦种子获取与 bone meal；
- PR #130：第一人称 viewmodel / Workbench 模态表现修复；
- PR #131：1.6 s timed / interruptible food use，含 desktop/mobile held-secondary 生命周期与持续进食姿势。

`docs/PROJECT_BASELINE.md` 只描述 merged main；当前未合并功能必须明确放在 active delivery 中。

## 当前进行中：PR #133 presentation / mining foundation

分支：`feature/presentation-mining-creative-foundation`

基线：`main 69749b6e19ee3f7ecb4aa62e6e96a82a6d6a87cc`

PR：#133 `feat: improve locomotion and mining presentation`

本 PR 保持 Draft，合并资格只认 **最终 exact-head CI**。

### 已实现

#### 第一人称与第三人称表现

- 第一人称右手静止锚点从 `x=.56 / y=-.47` 调整到 `x=.61 / y=-.52`，轻微向右下移动；攻击、使用、进食动画仍在该基准上叠加。
- 第三人称 Steve 不再使用单一刚性正弦摆动；新增纯 `playerLocomotionPose()`：walk 与 sprint 分别拥有不同腿摆幅、手臂摆幅、节奏、身体前倾、bob 与 sway。
- attack/use 仍覆盖右臂 locomotion pose，不改变既有攻击/使用动作优先级。

#### Desktop sprint

- 直接冲刺键从历史临时 `R` 改为左/右 `Ctrl`；保留 double-W sprint。
- `Ctrl+W` 与 `double-W` 最终都进入同一 `sprint` control intent；`R` 不再是冲刺键。
- 真实冲刺速度只在 **向前、非潜行、非游泳** 时生效；`Ctrl+A/D` 与 `Ctrl+S` 保持 walk speed。
- hunger `<= 6` 的 survival sprint gate 同时约束物理速度、第三人称跑步姿势、jump exhaustion 和 movement exhaustion，避免“走路速度却扣冲刺饥饿/播放跑步动画”的状态分裂。
- 沉浸式外壳继续在 capture phase 阻止 gameplay 中的 `Ctrl/Meta+W` 浏览器快捷键，并通过 Keyboard Lock 在支持该 API 的 Chromium 类浏览器中锁定 `W` 与左右 `Ctrl`。Keyboard Lock 并非所有浏览器都支持，因此 double-W 仍是跨浏览器的可靠备用操作。

#### 挖掘裂纹

- 单机 `SingleplayerMiningController` 新增 presentation-only progress channel；开始、持续、准星移开、取消、切换到禁止挖掘模式、完成破坏都会显式发布状态，避免残留裂纹。
- `MiningCrackOverlay` 不再程序生成裂纹纹理；直接读取仓库中的 Java 1.20.1 canonical `destroy_stage_0.png` … `destroy_stage_9.png`。
- 单机与多人共用同一个 runtime-owned overlay 和生命周期，不再在 multiplayer adapter 中创建第二份 mesh/listener，避免双层透明面、深度闪烁和重复资源释放。
- 新增纯资源契约，逐一验证十张 canonical PNG 被仓库跟踪且 stage 数量与 mining-crack rules 一致。

#### Explosion drops

- 单机爆炸销毁方块不再通过 creative `itemForBlock()` 猜测掉落，而是读取 `BLOCKS[blockId].drops`。
- 因此 grass block 在当前无 Silk Touch 爆炸路径中掉 dirt，stone 掉 cobblestone，glass / water 等当前无 drop 的方块保持无掉落。
- 该修改只修正已有简化 explosion drop 语义；尚未实现 Java loot table、explosion decay、Silk Touch/Fortune 等完整掉落系统。

### 新增/扩展回归

- `scripts/check-browser-safe-keymap.mjs`
- `scripts/check-desktop-sprint-controls.mjs`
- `scripts/check-immersive-game-shell.mjs`
- `scripts/check-player-motion.mjs`
- `scripts/check-player-locomotion.mjs`
- `scripts/check-singleplayer-mining-crack-channel.mjs`
- `scripts/check-mining-crack-assets.mjs`
- `scripts/check-explosion-drops.mjs`

历史 head `095f72b4c06c874aef97934575dc54174e52c652` 已证明上述裂纹/爆炸基础进入后，Repository quality static-checks 可以完整通过；该证据只用于定位回归，**不能替代最终 exact-head 门禁**。

## 下一轮：Creative overhaul

PR #133 稳定并合并后，从新的 `main` 单独开下一 PR，避免把高风险 Creative 状态机塞进当前 presentation/mining 修复。

计划边界：

1. Creative HUD：隐藏 survival HP/hunger 等不应显示的生存状态，同时保留必要 hotbar / target feedback；
2. Creative flight：double-Space 切换飞行，而不是进入 Creative 就永久 `flying=true`；落地状态继续使用 grounded physics；
3. hostile AI：Creative 玩家不应被 hostile mobs 主动选为攻击目标；
4. Creative inventory：从历史 starter bootstrap 脱钩，提供可搜索/分类的注册内容目录，同时不破坏 `CREATIVE_START` 的兼容测试与旧存档槽位；
5. 单机与 multiplayer authority 分别实现，禁止用 client-side competing truth 伪造多人 Creative 状态。

## 后续连续开发顺序

1. Creative overhaul；
2. Hunger 后续：food status effects、difficulty/gamerule boundary、server-authoritative hunger/use；
3. Registry breadth：stone variants、wood species、slab/stair/fence/door 等通用 families；
4. Worldgen：biomes → caves/aquifers → ores/features → structures；
5. Server gameplay breadth：server-authoritative PvE/XP、durable world/block-entity persistence；
6. Farming 后续：farmland trampling、exact crop random tick/light/neighbor formula、Fortune/loot tables、其它 crops/breeding。

## 工程规则

- 只认 exact-head CI；旧 head 的绿灯不授权新 head 合并；
- source asset availability ≠ runtime implementation；
- gameplay pure rules、browser presentation、server authority 分层；
- persistence / terrain version / starter slots / network state 都是兼容性表面；
- 多人未实现的 authority 必须保持禁用，不通过 client-side fake authority 伪造完成度；
- 不通过降低测试、静默升级旧存档或删除失败覆盖来换绿色门禁。
