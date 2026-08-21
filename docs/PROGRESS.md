# Minecraft Web - 当前开发进度

更新时间：2026-08-21

当前事实以 GitHub `main`、`docs/PROJECT_BASELINE.md`、`docs/MINECRAFT_1_20_1_FEATURE_MATRIX.md` 和当前交付 PR 的 exact head 为准。本文只维护已合并基线、正在进行的交付和紧邻下一步。

## 当前主线

项目仍处于 `v0.4.0-dev`。严格按 Minecraft Java 1.20.1 完整玩法/内容口径，整体规划完成度继续保守维持约 **35%**。

当前 `main`：

`44a99994cfa743c2fc7835bdb62b2ff602908885`

当前 main 已包含 #120：source-backed iron sword + shared held-item melee profiles。铁系基础链现在已经具备石镐采铁矿 → 粗铁 → Furnace → 铁锭 → 工作台铁镐/铁斧/铁锹/铁剑；单人实体攻击与 authoritative multiplayer PvP 都从共享 melee profile 读取伤害、攻击间隔和成功命中的耐久成本。

## 当前进行中：PR #121 Combat / hostile mob presentation

PR：#121

分支：`content/v0.4-combat-mob-presentation`

当前基线：`main 44a99994cfa743c2fc7835bdb62b2ff602908885`

pre-doc 实现稳定 exact head：`3e1b2f8fc8965ca342235b35b324e44c743576de`

### #121 交付内容

1. Three.js 第一人称 viewmodel
   - 删除旧的 CSS/2D held overlay 路径；
   - 使用 source-backed wide Steve skin 构建真实 3D 右臂与 sleeve `BoxGeometry`；
   - 手持普通 item 使用薄 3D box，方块继续使用 3D block presentation；
   - 左键 attack / 右键 use 和移动端对应按钮通过统一 action channel 驱动 viewmodel 动画；
   - F5 切第三人称时 viewmodel 正确隐藏，返回第一人称后恢复；
   - keyboard-lock / shortcut / first-person pose 规则拆成 Node-safe pure modules，Three.js/WebAudio 只留在 browser presentation 边界。

2. Wooden / stone sword progression
   - 新增 `wooden_sword`：4 damage、1.6 attack speed、59 durability、成功命中 wear 1；
   - 新增 `stone_sword`：5 damage、1.6 attack speed、131 durability、成功命中 wear 1；
   - 两者都有标准纵向 2 material + 1 stick 的 3×3 workbench recipe；
   - 直接绑定 tracked Java 1.20.1 canonical `wooden_sword.png` / `stone_sword.png`；
   - 当前 runtime item registry 增至 **39 IDs**，recipe 增至 **13 条**；
   - `bow.png` 同样以 audited canonical asset 进入 skeleton equipment presentation，但当前没有把 bow 注册为玩家可用 gameplay item。

3. Hostile / combat presentation
   - zombie / skeleton 在白天、clear weather 且头部暴露于天空时点燃；
   - rain / thunder / head submerged 会阻止或扑灭该简化 daylight burn；
   - 点燃后先等待首个 1 秒伤害节拍，不再出现“见光首个 0.1s tick 立即扣血”；
   - passive/hostile mob 受击使用逐实体 cloned material 做 red flash / scale pulse，不会因为共享 template material 把同类全部染红；
   - skeleton 右臂持 source-backed bow，并使用 source-backed arrow texture 构造交叉 3D projectile visual；
   - creeper fuse 过程中持续膨胀与闪白；
   - 爆炸增加中心 flash、火花/余烬和 smoke presentation。

4. Explosion gameplay closure
   - singleplayer/client explosion 实际破坏的普通方块会通过现有 `DropSystem` 生成可拾取掉落，而不是只从 world 消失；
   - 两格 bed 按成对 block 处理，爆炸移除 partner 但只产生一个 bed drop event，避免复制物品。

5. Interim audio layer
   - 新增轻量 procedural WebAudio profiles，当前接入 swing/use、skeleton shoot、undead burn、creeper prime、explosion 等事件；
   - 这只是临时反馈层，**不是 Minecraft 原版音频复刻**；
   - 当前 supplied Java resource tree 没有 sound object set / `sounds.json`，因此 source-backed 原版 sound registry、music 与完整 SFX parity 仍明确 blocked。

### pre-doc 实现稳定证据

exact head `3e1b2f8fc8965ca342235b35b324e44c743576de` 已通过 Repository quality run #899：

- JavaScript syntax + **168** 个自动发现的 logic/server/Worker scripts：PASS；
- Chromium shard 1/2：**23/23 PASS**，无 retry；`immersive-desktop.spec.mjs` 和修正后的 `mob-models.spec.mjs` 均实际执行；
- Chromium shard 2/2：**23/23 PASS**，无 retry；覆盖 authoritative multiplayer、persistent singleplayer Furnace、tool durability、长期 smoke/world-selection 等回归；
- branch 相对 main：behind=0；
- PR reviews / review threads / comments：当前均无阻塞。

以上只作为 **pre-doc** 证据。PROGRESS、feature matrix 与 PR body 更新后会产生新的 exact head；最终 Ready / merge 不得继承旧 head 绿灯，必须重新跑完整 Repository quality。

### #121 明确不做

- Java 1.20.1 完整 continuous attack-strength / damage scaling；
- sweep attack、critical hit、shield blocking/disable；
- 玩家 bow / crossbow gameplay；
- server-authoritative multiplayer PvE / mob AI / projectile / explosion；
- generic player fire/lava/burning system；
- vanilla 完整 light/sky exposure、spawn cap、pathfinding/navigation、mob equipment/variant 规则；
- Minecraft 原版声音/音乐资源；当前 source tree 不包含这些输入。

因此第一人称 viewmodel、wood/stone sword、daylight burn、skeleton ranged presentation、creeper/explosion presentation 与 audio 都只能提升对应 PARTIAL 项，不能据此把 PvE/Combat/Audio 标成完整 parity。

## #121 最终收口门槛

只有以下条件同时满足才允许 Ready + guarded squash merge：

1. branch 仍基于 `main 44a99994…` 且 behind=0；
2. wood/stone sword/bow canonical assets 可追踪且 asset audit 不允许未声明的 runtime-boundary bypass；
3. wooden/stone sword recipe、damage、durability、attack profile 有 Node contracts；
4. Node-safe control/presentation rules 不再静态 import browser-only Three.js URL；
5. source-backed mob cuboids/equipment 与 procedural fire/effect meshes 在测试中保持 provenance 分类；
6. daylight burn / wet extinguish / first-damage cadence / hit flash / fuse presentation 有规则回归；
7. 真实 Chromium 必须覆盖 3D first-person viewmodel、attack/use、F5 hide/restore 和 mob model/effect boundary；
8. 文档后的 exact branch HEAD JavaScript syntax + 全部自动发现 logic/server/Worker scripts 全绿；
9. 文档后的 exact branch HEAD 两路 Chromium 全绿且无 retry；
10. feature matrix 与 PR body 保持严格 parity 口径，不把 procedural WebAudio 写成原版 Minecraft sound parity；
11. 无 unresolved review/thread/comment 阻塞。

## #121 合并后的下一步

### 1. Iron hoe + secondary tool actions

下一阶段需要做成行为闭环，而不是只登记一个 item：

- source-backed iron hoe + recipe + 250 durability；
- farmland tilling；
- axe log stripping；
- shovel dirt-path creation；
- world mutation + item wear；
- singleplayer 与 authoritative multiplayer secondary-use 规则保持一致；
- 再扩充 hoe/axe/shovel 的真实 effective block families。

### 2. Iron armor

在现有 Equipment / armorPoints foundation 上补 iron helmet/chestplate/leggings/boots 与 recipes。Armor durability/wear 仍是独立缺口。

### 3. Coal progression as a terrain-version delivery

独立实现 coal ore block/model/texture、coal item/fuel 与 deterministic generation。自然煤矿会改变 seeded-world bytes，必须显式处理 terrain generator version / multiplayer compatibility。

### 4. Multiplayer XP + durable block-entity infrastructure

继续推进 server-owned XP/level、durable server world/container persistence、generic block-entity storage 与 loaded-chunk/scheduled tick 生命周期，再扩展 chest/barrel 等持久容器。

## 工程规则

- 每个交付 PR 只认 exact branch HEAD 的 CI；
- feature PR 改变 parity 状态时必须在同一 PR 更新 feature matrix；
- source-backed model/equipment 与 procedural effect mesh 必须在测试和 provenance 上分开，不允许用假纹理“满足 mapped count”；
- Node-safe gameplay/presentation rules 与 browser-only Three.js/WebAudio runtime 分层；
- mining effectiveness 与 harvest/drop eligibility 是两个独立维度；
- melee damage、attack timing、hurt cooldown 与 durability wear 分层，不能用固定 cooldown 假装完整 Java combat；
- 单人/多人共用 deterministic gameplay core，但 authority backend 不混淆；
- progression 或表现闭环可运行不等于 Minecraft Java 1.20.1 全内容 parity 完成。
