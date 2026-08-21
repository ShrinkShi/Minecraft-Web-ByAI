# Minecraft-Web-ByAI

面向现代浏览器重实现 Minecraft 核心玩法与交互语义的 Web 体素沙盒项目。

项目目标不是复制 Minecraft Java Edition 的内部技术实现，而是用现代 Web 架构重新实现其玩法：Worker 并行区块生成/网格构建、紧凑体素数据、显式 GPU 生命周期、IndexedDB 持久化，以及真正的 Node server-authoritative 多人运行时。

> 当前开发线：`v0.4.0-dev`。严格按 Minecraft Java 1.20.1 完整玩法/内容口径，当前规划完成度仍保守维持约 **35%**。当前 `main` 权威快照见 [`docs/PROJECT_BASELINE.md`](docs/PROJECT_BASELINE.md)；正在进行的交付见 [`docs/PROGRESS.md`](docs/PROGRESS.md)。

在线构建：https://shrinkshi.github.io/Minecraft-Web-ByAI/

完整 1.20.1 parity/roadmap authority 见 [`docs/MINECRAFT_1_20_1_FEATURE_MATRIX.md`](docs/MINECRAFT_1_20_1_FEATURE_MATRIX.md)。

## 当前已经可玩的核心

### 客户端 / 世界

- Minecraft 风格主菜单、世界创建、暂停、HUD、背包、工作台、熔炉、死亡界面和聊天/指令输入。
- 桌面：Pointer Lock + WASD，Space 跳跃，Shift 潜行，双击 W 或按住 `R` 疾跑，F5 切换视角。
- 手机：横屏触控摇杆、视角、攻击/挖掘、使用/放置、跳跃、疾跑、潜行、丢弃、背包、暂停、聊天和视角按钮；竖屏给出旋转提示。
- 桌面和手机共享同一 World/Player/Inventory/gameplay runtime，只在输入适配层分流。
- 第一人称使用真实 Three.js 3D viewmodel：source-backed Steve 右臂/sleeve 与 3D held item/block presentation；目前还不是 Java 完整 equip/attack-strength transform parity。
- 16×16×64 紧凑体素区块，按玩家位置动态加载/卸载。
- terrain Worker 与 mesh Worker 分离；chunk 使用合并 BufferGeometry，而不是一个方块一个 Three.js Mesh。
- opaque / transparent water / interpreted model layers 使用 TypedArray + Transferable 和显式资源释放。
- Three.js 已锁定并由项目 same-origin 静态资源提供。
- IndexedDB 保存单人世界 edits、玩家、Inventory、Equipment、Furnace、时间天气等当前已实现状态。

### 方块、模型与世界交互

当前 gameplay registry 仍远小于 Minecraft Java 1.20.1，但已经不再只是最初的十一类基础方块。当前交付边界包括：

- grass block、dirt、stone、sand、oak planks、oak log、oak leaves、water；
- crafting table、cobblestone、red bed；
- iron ore、glass、furnace；
- player-created farmland、dirt path、stripped oak log。

其中：

- red bed 使用 source-backed Java 1.20.1 entity texture 和两格 partial model；
- crafting table、iron ore、glass、furnace 以及当前新增 player-created states 已进入 source-backed Minecraft model/resource pipeline；
- glass 使用 translucent interpreted rendering，并处理 same-glass internal-face culling；
- generic blockstate/model resolver 已支持 parent/texture inheritance、variants、multipart、element/model rotation、`uvlock`、cull/tint 和 chunk batching，但 broad registry/state/collision parity 仍未完成。

当前支持连续挖掘、工具速度、harvest tier、破坏裂纹、普通放置、床原子放置以及当前工具 secondary actions：

- iron hoe：grass/dirt → farmland；
- iron axe：oak log → stripped oak log；
- iron shovel：grass/dirt → dirt path。

secondary action 只有真实 world mutation 成功后才消耗生存模式耐久；authoritative creative path 不 wear。

## Inventory、合成与当前 progression

当前交付边界：

- 36 格 Inventory + 9 格 hotbar；
- 左/右键 cursor、拆分、单个放置、合并、Shift 转移；
- Equipment head/chest/legs/feet 四槽；
- 2×2 player crafting + 3×3 Workbench；
- **40 个 runtime item IDs**；
- **14 条当前 recipes**；
- wooden / stone / iron pickaxe；
- wooden / stone / iron sword；
- iron axe / shovel / hoe；
- raw iron / iron ingot；
- furnace / glass 等当前 block items。

stone→iron progression 已形成真实闭环：

`stone pickaxe → iron ore → raw iron → Furnace → iron ingot → iron pickaxe / axe / shovel / sword / hoe`

当前 damageable tools/weapons 使用 item-instance durability，并在 hotbar/Inventory/Crafting 中显示耐久状态。

完整 gold/diamond/netherite progression、iron armor、shield、玩家 bow/crossbow 等仍未完成。

## 生存 / 熔炼 / 战斗

当前已形成的生存切片包括：

- HP、伤害、受击无敌、击退；
- 经验球、总经验/等级；
- survival/adventure 死亡清算、死亡界面、显式重生；
- 普通死亡 item/XP 可回收，虚空死亡不可回收；
- `/spawnpoint` 与持久化 respawn point；
- 红床重生锚点、夜间跳夜和附近敌对生物阻止睡眠；
- leather Equipment foundation 与第一版护甲减伤；
- 水下氧气、溺水、基础游泳/浮力；
- 昼夜、天气命令和 rain/thunder presentation；
- shared Furnace core：raw iron → iron ingot、燃料/烹饪 timer、stored XP；singleplayer 有持久化 runtime，多人有 authoritative container/process runtime；
- wooden/stone/iron swords 与现有 tool melee profiles；成功命中才 wear；
- 第一人称 attack/use animation、mob hurt feedback、skeleton arrow、creeper fuse/explosion presentation；
- zombie/skeleton 简化 daylight burning 与 wet extinguish。

仍不能称为完整 Minecraft survival：完整 hunger/saturation、food、crop/farmland hydration、animal breeding、armor durability、完整 Java attack-strength/critical/sweep/shield、enchanting、brewing/status effects 等仍是大缺口。

## 生物与 PvE

当前 gameplay mobs：

- passive：cow、sheep、pig、chicken；
- hostile：zombie、skeleton、creeper、spider。

八种生物均使用 Minecraft Java 1.20.1 source texture sheets + project-side compatible cuboid geometry。纹理来源是原版资源；geometry 是兼容重建，不伪称从 `.bbmodel` 或 Java model-layer geometry 中提取。

当前单人包含 simplified wander/flee/chase/melee/ranged/fuse、loot 和 XP。完整 mob roster、vanilla pathfinding、spawn caps/light/biome rules、breeding/taming/riding 等仍未完成。

## 真正的多人服务器

项目拥有 Node WebSocket server-authoritative runtime，而不是“客户端上报位置”的伪联机。

当前已实现的 authority domains 包括：

- strict handshake/session/input protocol 和 sequence/replay guards；
- 20 Hz server-authoritative movement/collision；
- remote player snapshot replication/rendering；
- deterministic shared terrain；
- initial + live authoritative world edits；
- creative/survival mining 和普通 placement；
- authoritative ground items/drop/pickup；
- authoritative Inventory + cursor + item damage；
- authoritative Equipment；
- authoritative 2×2 crafting、3×3 Workbench；
- authoritative Furnace container/process runtime；
- authoritative chat/controlled command；
- server-owned PvP HP、targeting、armor mitigation、knockback、death drops、respawn；
- current till/strip/flatten authoritative block-use rules。

真实双浏览器 Chromium E2E 覆盖多条多人关键路径。

当前最大的 multiplayer authority 缺口仍是 **mobs/PvE/projectiles/explosions 和 XP/levels 尚未迁移为 server-owned domain**。durable server world/container persistence、accounts/rooms/operators、reconnect/resume 和 Realms-like product layer 也未完成。

## 世界生成现状

当前生成器是 browser/server 共用的 deterministic 简化基础：

- fBm heightmap；
- stone/dirt/grass/sand surface；
- sea/water；
- oak tree；
- simplified deterministic underground iron ore；
- prompt keywords 调整 amplitude/sea/forest/sand 等粗参数；
- terrain version 是 multiplayer compatibility boundary。

它还不是 Minecraft Java 1.20.1 worldgen：biome/climate pipeline、caves、aquifers、完整 ore distribution、features、structures、扩展高度、Nether 和 End 都属于后续阶段。

## Minecraft Java 1.20.1 资源

### Client textures/models

仓库跟踪 `MC原版素材assets.zip` 及当前 selective/generated runtime outputs。确定性审计识别 7,623 个 Java client resource files，约包含：

- 977 block textures；
- 582 item textures；
- 497 entity textures；
- 2,016 block-model JSON；
- 1,675 item-model JSON；
- 1,005 blockstates。

runtime 只接入当前实现所需的 subset，因此“资源在仓库里”不等于“玩法已经实现”。

### Original audio

`MC原版素材assets.zip` 本身没有 Minecraft sound-object store；但 PR #122 已从单独提供的 Java 1.20.1 音频输入导入并跟踪 `原版Minecraft音频文件/` object corpus、映射表和来源说明。

当前 #123 首批运行时接入：

- `item.hoe.till`；
- `item.axe.strip`；
- `item.shovel.flatten`；
- current grass / gravel / stone / sand / wood / glass gameplay sound types 的 break/place/step；
- local player material-aware footsteps。

这些事件使用真实 OGG object SHA-1，并由 CI 读取/re-hash；浏览器 acceptance 会等待真实 OGG HTTP response/decode。

当前还**没有**完整 sound registry、multiplayer replicated block-edit SFX、remote footsteps、完整 entity/ambient/weather source audio、positional attenuation/HRTF 或 music scheduling。#121 的 procedural WebAudio fallback 仍服务尚未迁移的部分 combat/presentation events。

## 运行

推荐通过 HTTP 运行，不要直接打开 `file://`：

```bash
npm install
npm run serve
```

多人 authoritative server：

```bash
npm run server
```

服务器环境变量和安全边界见 [`docs/SERVER.md`](docs/SERVER.md)。

## 自动检查

逻辑/协议/Worker/server integration：

```bash
npm run test:logic
```

Chromium E2E：

```bash
npx playwright install chromium
npm run test:e2e
```

`Repository quality` 在 PR exact HEAD 上执行 Node syntax、自动发现的 logic/server/Worker regressions 和两个 Chromium shards。Minecraft 资源另有 deterministic source/runtime provenance audits；浏览器失败保留 trace/screenshot/report artifacts。

质量规则：**只认当前 exact branch HEAD 的完整质量门**，不能拿旧 commit 的绿灯替新 commit 背书。

## 下一阶段路线

1. iron armor + recipes；
2. coal ore / coal item / fuel，作为显式 terrain-version compatibility delivery；
3. 扩展 source-backed sound-event registry，迁移更多 player/entity/environment sounds，并建设 spatial audio / music scheduling；
4. server-owned XP/levels；
5. durable multiplayer world/container persistence + generic block-entity/loaded-chunk tick lifecycle；
6. chest/barrel、farming、food 等生存 breadth；
7. biome → caves → ores → features → structures worldgen；
8. server-authoritative mobs/PvE/projectiles/explosions；
9. neighbor updates + scheduled ticks + redstone；
10. Nether → portal → enchanting/brewing → End → bosses。

## 文档

- [`docs/PROJECT_BASELINE.md`](docs/PROJECT_BASELINE.md)：当前 merged `main` 的权威实现事实。
- [`docs/MINECRAFT_1_20_1_FEATURE_MATRIX.md`](docs/MINECRAFT_1_20_1_FEATURE_MATRIX.md)：完整复刻目标、完成度与 roadmap authority。
- [`docs/PROGRESS.md`](docs/PROGRESS.md)：当前 active delivery / 下一步。
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)：架构决策与技术边界。
- [`docs/NETWORKING.md`](docs/NETWORKING.md)：多人协议与 authority 原则。
- [`docs/SERVER.md`](docs/SERVER.md)：Node authoritative server 运行边界。
- [`docs/TESTING.md`](docs/TESTING.md)：验证策略。
- [`docs/FILE_MANIFEST.md`](docs/FILE_MANIFEST.md)：重要文件/subsystem 职责。
- [`CHANGELOG.md`](CHANGELOG.md)：版本/Unreleased 历史。
