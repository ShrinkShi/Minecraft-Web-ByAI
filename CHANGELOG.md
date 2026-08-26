# Changelog

## [Unreleased]

> 2026-08-26 merged baseline: `main 6a56c33d79c074f95f2be750f9d25ec246766b1b` includes PR #136. Merged facts live in `docs/PROJECT_BASELINE.md`; the next active delivery is Registry breadth as recorded in `docs/PROGRESS.md`.

### 2026-08-26 — PR #136 Hunger status effects and multiplayer authority (merged)

- 新增 reusable finite-duration status-effect foundation；raw chicken 为 30% Hunger I / 30 秒，rotten flesh 为 80% Hunger I / 30 秒，且只在完整 food transaction 成功提交后 roll/apply。
- difficulty boundary 扩展为 Peaceful/Easy/Normal/Hard starvation 规则，并加入 `naturalRegeneration` 开关；Hunger effect 与移动/战斗共享同一 exhaustion state。
- singleplayer save schema 从 **v9 升到 v10** 持久化 normalized active status effects；active food-use input 仍为 transient，terrain generator 保持 v4，旧 world 继续走显式 compatibility path。
- multiplayer 新增独立 revisioned Hunger authority：服务器持有 food/saturation/exhaustion/timer、status effects、1.6 秒 active food use、sprint gate、regen/starvation 与 respawn/mode/session lifecycle。
- `use-release`、attack、drop、respawn、mode/death、selected-stack change 可在完成前取消 food use 且不扣物；完成时重新校验 selected stack，并通过 authoritative inventory boundary 原子提交 Hunger/effect mutation 与物品扣除。
- Workbench/Furnace interaction 优先于 eating；移动/游泳/跳跃/成功攻击/成功受伤 exhaustion 接入服务器 Hunger。
- Hunger-driven heal/starvation 通过 Combat authority API 修改 HP，不直接篡改 Combat internals；浏览器只应用 authoritative Hunger snapshot 到 cache/HUD/viewmodel，不运行 competing multiplayer Hunger simulation。
- player action frame 升到 **v3**；因 `use-release` 改变 wire semantics，multiplayer handshake/subprotocol 升到 **v5 / `minecraft-web-v5`**，legacy v4 不伪装兼容。
- final exact head `80cc188fd9deaec104c4a86ab8e952965f4759f1` 通过 Repository quality #1271：static checks、Chromium 1/2、Chromium 2/2 全绿；最终无 base drift、review/thread/comment blocker，随后 squash merge 为 `6a56c33d79c074f95f2be750f9d25ec246766b1b`。

### 2026-08-25 — PR #134 Creative mode overhaul (merged)

- Creative 不再进入模式即永久飞行；desktop Space 与 mobile Jump 共用同一 rising-edge detector，double-Jump 切换 Creative flight，Spectator 继续 forced-flying。
- multiplayer flight 只发送 `flight-toggle` intent；服务器持有 `flying` 真值并通过 self-authoritative snapshot 复制，客户端不建立 competing truth。
- Creative/Spectator HUD 隐藏 hearts+hunger、armor、XP、oxygen，只保留 hotbar；底层 HP/hunger/armor/XP/oxygen gameplay state 不因 presentation 被伪造或重置。
- hostile target eligibility 收紧为 Survival/Adventure；Creative/Spectator 不再被追击、近战或作为骷髅射击目标，Creeper 在目标失效时清空 fuse，同时保留 knockback 衰减等物理状态。
- Creative inventory 从当前 `ITEMS` registry 派生分类/搜索 catalog，不扩展或重排历史 `CREATIVE_START`；Creative UI 隐藏 Survival equipment/2×2 crafting/27-slot main 区并保留真实 9-slot hotbar。
- singleplayer catalog selection 写入真实 cursor；multiplayer 使用 server-owned inventory transaction v2 `creative-pick`，客户端只提交 `itemId`，server 校验 mode/dead/registry/revision/replay 并按 `maxStack()` 创建 authoritative cursor。
- inventory transaction action semantics 扩展不兼容，因此 multiplayer handshake/subprotocol 升级为 **v4 / `minecraft-web-v4`**，legacy v3 不伪装兼容。
- 新增 pure/runtime、real WebSocket 与 Chromium 回归，覆盖 flight、HUD、hostile target、catalog、server Creative pick 以及真实 browser catalog→server inventory round trip。
- block/item IDs、singleplayer save schema v9、terrain generator v4、历史 `CREATIVE_START` ordering/slot mapping 保持不变。
- final exact head `e2dd61ae5603839ed4590f2a58121a4aad296a13` 在合并前通过 exact-head Repository quality 与无漂移/review blocker 门禁。

### 2026-08-24 — PR #133 presentation / mining foundation (merged)

- 第一人称右手 neutral anchor 轻微向右下调整，不改变既有 attack/use/food-use action hierarchy。
- 新增 pure walk/sprint locomotion pose；第三人称 Steve 的 sprint 使用更大 stride、arm swing、body lean、bob/sway，不再与 walk 共用单一正弦摆动。
- desktop sprint 改为 Ctrl+W 或 double-W；移除历史临时 R sprint binding。沉浸式外壳在支持 Keyboard Lock 的浏览器锁定 W/左右 Ctrl，并继续拦截 Ctrl/Meta+W。
- active sprint 统一要求 forward、非 sneak、非 swimming，并继续受 survival food>6 限制；movement speed、第三人称 gait、jump exhaustion 与 movement exhaustion 使用同一有效条件。
- singleplayer mining 新增 presentation progress channel，cancel/target loss/mode restriction/completion 都显式清理状态。
- mining crack overlay 改为直接使用 Java 1.20.1 canonical `destroy_stage_0..9.png`，singleplayer 与 multiplayer 共用一个 runtime-owned overlay/lifecycle，移除程序生成 crack texture 与 multiplayer duplicate overlay。
- local explosion destruction 改走 block drop metadata：当前 grass→dirt、stone→cobblestone，glass/water 无 drop；仍不声明完整 Java loot-table/explosion-decay parity。
- 新增/扩展 desktop sprint、immersive browser shortcut、player motion/gait、singleplayer crack channel、canonical crack asset、explosion drop 回归。
- save schema v9、terrain generator v4、block/item IDs、`CREATIVE_START`、multiplayer wire schema 均不变。

### 2026-08-23 — PR #131 timed interruptible food use (merged)

- 将单机食物使用从 press-edge 即时消费升级为 **1.6 s** held / interruptible action。
- desktop right mouse 与 mobile Use 都暴露真实 secondary press/release 生命周期；held-secondary 不进入 multiplayer movement wire snapshot。
- release、失去 gameplay control、pause/container、hotbar change、drop、primary attack、mode/item change 都会取消，且不消费物品。
- completion 才一次性提交 hunger/saturation 与 selected-stack consume；低 FPS 使用 monotonic wall-clock compensation，不把 1.6 s 动作拉长。
- first-person viewmodel 在整个动作期间获得 continuous food-use progress。
- multiplayer held-secondary press 重新路由到既有 authoritative use action；multiplayer hunger/eating transaction 仍未 server-owned，因此不在客户端伪造。
- save schema 保持 v9，terrainVersion 保持 v4。

### 2026-08-22/23 — PR #129 vegetation farming phase 1.1 (merged)

- terrain generator 升级到 v4，为新/current-v4 worlds 加入 deterministic short grass；显式 v2/v3 local compatibility path 保持不变。
- short grass 使用 canonical Java 1.20.1 blockstate/model/texture，并提供基础 1/8 wheat-seed acquisition path。
- 新增 canonical bone meal、bone→3 bone meal shapeless recipe；singleplayer bone meal 可推进 wheat 2..5 ages，并在有效 grass surfaces 周围扩散 short grass。
- survival 只有成功改变世界才消耗 bone meal；creative 不消费。
- multiplayer farming/bone meal 继续等待 server-owned transaction，不允许 client-side competing truth。

### 2026-08-22 — PR #130 first-person / Workbench presentation repair (merged)

- 缩小第一人称右臂，viewmodel camera 调整为 70°，建立 shoulder→arm→wrist→held-item hierarchy，持有物锚定到 wrist。
- held-item presentation 区分 block/tool/food/flat；普通纹理物品使用透明双面平面，方块保留 3D preview。
- Inventory/Workbench 打开时隐藏 world crosshair、Jade、HP/hunger/XP/hotbar、oxygen、break meter 与 first-person viewmodel，并直接以 DOM modal hidden state 为真值，避免 stale presentation flag。

### 2026-08-22 — PR #128 wheat farming phase one

- 保留历史 `FARMLAND=24` 为 moisture 0，并 append-only 增加 farmland moisture 1..7（28..34）与 wheat age 0..7（35..42），不重排已有 block ID。
- farmland / wheat 全部接入现有 Java 1.20.1 blockstate/model interpreter；wheat 使用 cutout layer，不引入手绘 crop geometry。
- canonical model closure 扩展到 12 blockstates / 58 models / 28 textures，确定性 model atlas 为 128×128；旧 4×4 terrain atlas byte-stable。
- 新增 direct-canonical `wheat_seeds` / `wheat` item textures 与 3× wheat → bread Workbench recipe。
- 新增 `SingleplayerFarmingRuntime`：只追踪 sparse edited farming cells；10 秒 farming tick；水源半径 4 / 非 clear weather 湿润，缺水逐级干燥，空 dry farmland 回 dirt。
- wheat age 0..7 逐级生长；当前 phase-1 growth chance 为 moist 0.45 / dry 0.20，不声明 exact Java random-tick/light/neighbor growth parity。
- survival secondary-action 在 mutation 成功后才消费 seed；creative 不消费；invalid target 不消费。
- singleplayer mining 增加可选 `resolveDrops` 扩展点；普通方块保持历史默认掉落。immature wheat 掉 1 seed，mature wheat 掉 1 wheat + 0..3 seeds。
- 修复支撑破坏语义：成熟 wheat 因 farmland 消失时仍走成熟 drop table；creative support removal 不产生掉落。
- farming state 继续复用 sparse world edits，singleplayer save schema 保持 v9；terrain v2/v3、terrainVersion-since-v8、`CREATIVE_START` 均不变。
- multiplayer farming 继续明确禁用 client-side competing truth，等待 server-owned planting/random ticks/drops/inventory transactions。
- 新增 pure/runtime farming regression、canonical model/asset goldens 与 Chromium planting/growth/harvest acceptance。
- natural short-grass seed acquisition、bone meal、farmland trampling、exact seed RNG/Fortune、其它 crops 仍属于后续切片。

### 2026-08-22 — PR #127 hunger / food survival core

- 用独立 pure `hunger-rules.js` 替换旧的固定时间线性 hunger drain 占位逻辑，显式建模 food、saturation、exhaustion 与 food tick timer。
- exhaustion 按 Java FoodData 顺序处理：`>4` 时每 tick 最多消费一次，优先减 saturation，再减 food；regen 新增的 exhaustion 留到下一 tick 处理。
- sprint ground movement / swimming / jump / sprint-jump / successful attack / successful damage 接入 exhaustion；survival food `<=6` 时禁止 sprint。
- 新增 food=20+saturation 的 fast natural regeneration、food>=18 的 normal regeneration，以及当前固定 Normal-style 1 HP starvation floor。
- 新增 apple、bread、cooked beef/mutton/porkchop/chicken；现有 raw meats 与 rotten flesh 进入 food registry。新增食物纹理直接使用仓库中 audited canonical Java 1.20.1 item PNG。
- Furnace 新增四种 raw meat → cooked meat 配方，200 ticks、0.35 XP；coal 继续保持 1600-tick fuel。
- 单机右键可直接食用：满 hunger 时拒绝并不消费；目前仍是即时使用，不声明 vanilla ~1.6s eating-duration parity。
- raw chicken / rotten flesh 的 Hunger 状态效果尚未实现，因为通用 status-effect 系统仍为空白。
- singleplayer save schema 升到 v9，新增 exhaustion / foodTickTimer persistence；`terrainVersion` 从 schema v8 起必填的兼容合同拆成独立常量，避免版本升级倒退 #126 规则。
- 多人 hunger/eating 尚未 server-authoritative；客户端明确拒绝本地 multiplayer food use，避免产生 client-side competing truth。
- 新增 pure hunger/food/Furnace regression 与 real Chromium eating/regen/starvation/IndexedDB acceptance；existing smoke snapshots 升级到 save schema v9。
- CI finding closure 包括：一物品 hotbar 数字错误断言、regen/exhaustion 同 tick 顺序、food<=6 sprint gate、微小 movement / bare-hand attack exhaustion save-dirty。

### 2026-08-22 — PR #126 coal progression / terrain v3

- 新增煤矿石（block 27）与煤炭物品，木镐及以上可采集；煤炭作为熔炉燃料燃烧 **1600 ticks**。
- terrain generator 升级到 v3：独立 deterministic coal field，铁矿优先级保持不变；回归测试锁定 coal→stone 后与显式 v2 generator 字节一致。
- 保留 terrain generator v2 作为 local save compatibility path：PR #126 前没有 `terrainVersion` 的 IndexedDB 世界按 v2 打开，不会因为升级而在原有隐式石头中凭空出现煤矿。
- singleplayer save schema 升到 v8 并持久化 `terrainVersion`；新世界固定 v3，legacy unversioned 世界首次后续保存会补写 v2，未知/损坏版本拒绝静默加载。
- multiplayer 仍要求 exact current terrain version；local v2 compatibility 不允许 v2/v3 mixed multiplayer。
- 4×4 terrain atlas 的 tile 15 从 white wool 调整为 canonical Java 1.20.1 coal ore；white wool 与 coal item 改为直接引用仓库中已审计 canonical PNG。
- 增加 coal progression、terrain-v2/v3 byte compatibility、singleplayer save pinning 与 Chromium 回归；同步 server world-info / authoritative terrain 的版本兼容断言。
- 当前煤矿分布仍是 64 高度简化 deterministic worldgen，不声明为 Java 1.20.1 原版 biome/cave/ore placement parity。

### 2026-08-21 — PR #125 iron armor progression and durability

- 新增 source-backed Java 1.20.1 iron helmet/chestplate/leggings/boots 与四个 vanilla Workbench recipes；merged boundary 44 runtime item IDs / 18 recipes。
- 铁甲数值：helmet 2/165、chestplate 6/240、leggings 5/225、boots 2/195；full set 15 armor points。
- leather armor 恢复 55/80/75/65 durability，使现有皮甲也进入 generic armor-wear contract。
- 护甲减伤从旧固定 `armorPoints × 4%` 近似改为 damage-dependent Java-style formula；当前 leather/iron toughness 为 0，未来 diamond/netherite 复用同一扩展点。
- `Equipment` snapshot/restore/click/swap/unequip/drain 保留 item-stack `damage`；local + authoritative Equipment 支持磨损与损坏。
- 新增 singleplayer applied-damage armor bridge：hostile/projectile/explosion 只有真实 `applied` 伤害才磨甲，致死一击先磨甲再死亡清理，drowning 不磨甲。
- authoritative PvP 使用受击前装备计算减伤，成功伤害后磨甲并复制 Equipment revision，再执行 death cleanup。
- `/give minecraft:<registered_item_id>` 改为 runtime registry-driven namespace resolution，减少新增物品时的手写 alias 耦合。
- 为保持兼容，iron armor 不加入历史 `CREATIVE_START`，避免挪动既有 Furnace/其他 starter slots；仍可正常合成和 `/give`。
- 新增/扩展 Node、real WebSocket two-client 与 Chromium armor regressions，覆盖配方、canonical PNG decode、装备/HUD、damage metadata、wear/break/revision 和 PvP replication。
- CI finding closure：修复 namespace `/give`、旧 Equipment test double 契约和 starter-slot compatibility 冲突，不通过降低生产校验绕过。

### 2026-08-21 — PR #124 view / Workbench / gameplay-audio repair

- 修正 wide Steve 第三人称 anatomical limb sides 与第一人称右臂 shoulder→hand 几何方向。
- Workbench 使用 canonical Java 1.20.1 `textures/gui/container/crafting_table.png`，352×332（2×）fixed coordinates。
- local footsteps 从 0.55-block 调整到 1.6-block horizontal cadence。
- survival mining 增加约 200 ms source-backed hit cadence。
- mining 在挖掘阶段通过 `vanilla-sounds` shared **fetch + decode AudioBuffer cache** 预热 break variants，最终 break 复用 decoded buffer，降低 cold-start latency。
- 当前 cow/sheep/pig/chicken/zombie/skeleton/creeper/spider 接入 source-backed ambient/hurt/death baseline，并使用简单 24-block local attenuation。
- focused Chromium acceptance 验证真实 Three.js limb/viewmodel、Workbench computed geometry 与原版 OGG HTTP 路径。

### 2026-08-21 — PR #122/#123 original audio corpus and tool-action delivery

- PR #122 导入并跟踪单独提供的 Java 1.20.1 sound-object corpus、mapping/source notes。
- PR #123 新增 iron hoe、farmland/dirt_path/stripped_oak_log、till/strip/flatten singleplayer + authoritative semantics。
- `item.hoe.till` / `item.axe.strip` / `item.shovel.flatten` 与 current grass/gravel/stone/sand/wood/glass break/place/step 使用真实 OGG objects。
- stone→iron current tool/weapon chain扩展到 iron pickaxe/axe/shovel/sword/hoe；boundary 40 IDs / 14 recipes。

### v0.4 accumulated foundation

- unified desktop/mobile controls and first/third-person presentation;
- deterministic terrain + terrain/mesh Workers + chunk batching/lifecycle;
- generic Minecraft blockstate/model interpretation for selected roots;
- Inventory/Equipment/Crafting/Workbench/Furnace/durability/bed/death/oxygen/weather/XP/hunger-food slices;
- current 8 mobs with source textures and compatible reconstructed geometry;
- real Node authoritative multiplayer covering movement/world/mining/placement/items/Inventory/Equipment/Crafting/Workbench/Furnace/chat/commands/PvP/Hunger;
- strict overall Java 1.20.1 parity planning estimate remains about 35% because registry/worldgen/farming breadth/redstone/dimensions/enchanting/brewing/broad status effects remain large gaps。

## [0.3.0] - 2026-08-11

### Added
- 真实 36 格 Inventory 数据模型，快捷栏直接映射背包最后 9 格。
- 背包左键、右键、Shift 点击、cursor stack 操作语义。
- 2×2 配方匹配：原木→木板、木板→木棍、工作台。
- 可放置工作台方块，以及右键工作台打开 3×3 合成界面。
- 3×3 木镐配方。
- 方块掉落物实体、重力/轻微弹跳、拾取、5 分钟销毁。
- Q 丢弃当前快捷栏物品。
- 圆石方块和“石头需要镐才能获得掉落”的基础采集规则。
- F5 第一人称 / 第三人称背面 / 第三人称正面切换，并加入轻量方块人形占位模型。
- 聊天输入与 `/gamemode`、`/give`、`/tp`、`/time set`、`/weather`、`/help`。
- 24000 tick 昼夜环境光变化和天气光照状态。
- `scripts/check.mjs` 核心逻辑/Worker 回归检查。
- `.github/workflows/quality.yml` GitHub Actions 质量门。
- `docs/TESTING.md` 自动测试能力和浏览器端验证边界记录。

### Changed
- IndexedDB 存档版本升级为 v3，加入背包、时间、天气和视角状态。
- 生存模式不再默认获得整排无限建材；创造模式保留快速测试用初始物品。
- 方块破坏会经过掉落实体再拾取，而不是只有视觉消失。

### Known limitations
- 工作台正面目前仍按统一 side 纹理渲染，没有方块朝向 blockstate。
- 木镐耐久元数据尚未进入物品栈。
- `/weather rain` 在 v0.3.0 仍只改变环境光和天空，没有降雨粒子/湿润效果。

## [0.2.0] - 2026-08-11

### Added
- 玩家移动驱动的动态 chunk streaming，世界不再固定为出生点周围 5×5 区块。
- IndexedDB 世界存档：保存玩家状态和程序化世界的增量方块修改。
- `mesh-worker.js`：将暴露面扫描、顶点/UV/法线/索引构建从渲染主线程迁出。
- Worker mesh 使用精确长度 TypedArray 与 Transferable buffers。
- mesh 请求去重队列，限制重复边界重建造成的任务堆积。
- 重新进入相同“世界名称 + seed”时恢复玩家位置和已修改方块。
- `docs/FILE_MANIFEST.md` 文件职责与生命周期记录。

### Changed
- 默认渲染距离提升为 3 chunks，并增加 1 chunk 卸载滞回区。
- 自动保存采用节流策略；暂停、页面隐藏以及“保存并返回标题”会请求保存。
- debug HUD 增加 mesh queue 指标。

### Performance
- 主线程不再执行逐 voxel 网格顶点生成循环。
- 离开活动范围的 chunk 会释放 `BufferGeometry` 和 CPU 区块数组，避免世界探索时间与常驻内存无限线性增长。
- 存档不复制完整程序化 chunk，只保存被修改 voxel 的差异。

## [0.1.0] - 2026-08-11

### Added
- 建立可直接在 GitHub Pages 运行的静态 Web 游戏入口。
- 建立 Three.js 第一人称体素渲染与世界主循环。
- 使用 Web Worker 生成区块地形，避免地形生成阻塞渲染主线程。
- 使用 TypedArray 保存区块数据，按区块合并可见面生成 BufferGeometry。
- 加入基础方块破坏/放置、AABB 碰撞、跳跃、疾跑与创造模式移动。
- 加入主菜单、世界创建、暂停、HUD、快捷栏和物品栏基础 UI。
- 从用户提供资源中抽取必要基础纹理并制作小型纹理 atlas。
- 加入架构与进度文档。