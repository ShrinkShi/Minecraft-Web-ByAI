# Minecraft Web - 当前开发进度

更新时间：2026-08-25

## 当前主线

项目处于 `v0.4.0-dev`。严格按 Minecraft Java 1.20.1 完整玩法/内容口径，整体完成度仍保守维持约 **35%**。浏览器渲染/资源管线、单机生存基础与 authoritative multiplayer 骨架已形成，但完整 registry、原版 worldgen、redstone、dimensions、enchanting/brewing、status effects 与 server-authoritative PvE 仍是主要缺口。

当前 merged `main`：`ad12dd143263628aac856a1538d6093a7614dae3`，已包含 PR #134 `feat: overhaul creative mode foundations`。

`docs/PROJECT_BASELINE.md` 只描述 merged main；未合并功能必须放在 active delivery 中。

## 最近完成：PR #134 Creative mode overhaul

PR #134 已于 2026-08-25 squash merge。

### Creative flight

- Creative 默认 grounded，不再进入模式就永久飞行。
- double-Jump 在 Creative 中切换飞行；desktop Space 与 mobile Jump 共用 rising-edge detector。
- Spectator forced-flying；Survival/Adventure 禁止该 flight toggle。
- multiplayer 客户端只提交 `flight-toggle` intent；服务器持有 `flying` 真值并通过 authoritative self snapshot 下发。
- self player snapshot v2 严格要求 boolean `flying`；共享 interpolator 仅在字段存在时严格校验，以兼容 remote player state 无该字段的情况。

### Creative HUD

- Creative/Spectator 隐藏 hearts+hunger、armor、XP、oxygen；hotbar 保留。
- gameplay HP/hunger/armor/XP/oxygen 不因 presentation 改造而被改写。
- 后续 status render 不能把 Creative 中已隐藏的 Survival HUD 重新显示。

### Hostile target eligibility

- Survival/Adventure 可被 hostile mob 锁定；Creative/Spectator 不可成为主动目标。
- zombie/spider 不再追击近战，skeleton 不再向 Creative/Spectator 主动射击。
- Creeper 目标失效时立即清除 fuse；knockback 衰减、daylight、ambient、spawn/despawn 继续运行。

### Registry-backed Creative catalog

- 历史 `CREATIVE_START` 13 项顺序保持不变；starter bootstrap 不再冒充完整创造物品栏。
- catalog 从当前 `ITEMS` registry 自动派生，当前覆盖 56 个注册 item entry。
- 提供全部、建筑、工具、战斗、食物、自然、材料、其他分类，并支持名称/ID 搜索。
- Creative 背包隐藏 Survival equipment / 2×2 crafting / 27-slot main 区，保留真实 9-slot hotbar。
- 单机 catalog 点击写入真实 inventory cursor，再复用既有 slot-click 放置/交换；模式切换不重建物理库存。
- Creative 与 Survival presentation 明确隔离；被替换的 Survival UI 在 Creative 中退出布局和 pointer hit-testing。

### Multiplayer Creative item creation

- Inventory transaction protocol 为 **v2**，包含 `creative-pick`。
- 客户端只提交 `itemId`，不能声明可信 `count`。
- server 检查 mode/dead/registry item/expected revision/replay；堆叠数量由 server-side `maxStack()` 决定。
- 成功时服务器替换 authoritative cursor、推进 inventory revision，并复制权威 snapshot；non-Creative、unknown item、stale/replay 请求不产生非法库存 mutation。
- 因 action semantics 不兼容，handshake/subprotocol 已升级到 **v4 / `minecraft-web-v4`**，不伪装兼容 legacy v3。

## 当前兼容性边界

- block/item IDs 不变；
- singleplayer save schema **v9** 不变；
- terrain generator **v4** 不变，local v2/v3 compatibility path 不变；
- historical `CREATIVE_START` 顺序/slot mapping 不变；
- browser presentation 不成为 gameplay authority；
- multiplayer Creative flight/item creation 不允许 client-side competing truth。

## 下一阶段：Hunger follow-up

下一连续开发切片聚焦：

1. food status effects，优先补 raw chicken / rotten flesh 的 Hunger 效果，并建立可扩展的通用 status-effect 基础；
2. difficulty / gamerule boundary，把 starvation、natural regeneration 等规则从当前固定 Normal-style 行为中拆出；
3. server-authoritative hunger/use，让 multiplayer 食物使用、food/saturation/exhaustion/timer 不再缺失 server truth；
4. 继续保持 held 1.6 s use、cancel/complete transaction 与 singleplayer save v9 的兼容边界；
5. 为新增多人状态扩展独立 wire/version contract，禁止 client-side fake authority。

## 后续连续开发顺序

1. Hunger follow-up：food status effects、difficulty/gamerule boundary、server-authoritative hunger/use；
2. Registry breadth：stone variants、wood species、slab/stair/fence/door 等通用 families；
3. Worldgen：biomes → caves/aquifers → ores/features → structures；
4. Server gameplay breadth：server-authoritative PvE/XP、durable world/block-entity persistence；
5. Farming 后续：farmland trampling、exact crop random tick/light/neighbor formula、Fortune/loot tables、其它 crops/breeding。

## 工程规则

- 只认 exact-head CI；旧 head 的绿灯不授权新 head 合并；
- source asset availability ≠ runtime implementation；
- gameplay pure rules、browser presentation、server authority 分层；
- persistence / terrain version / starter slots / network state 是独立兼容性表面；
- 多人缺失 authority 必须保持禁用，不通过 client-side fake authority 伪造完成度；
- 不通过降低测试、静默升级旧存档或删除失败覆盖来换绿色门禁。
