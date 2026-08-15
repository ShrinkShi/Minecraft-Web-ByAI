# Minecraft-Web-ByAI

面向现代浏览器重实现 Minecraft 核心玩法与交互语义的 Web 体素沙盒项目。

项目目标不是复制 Minecraft Java Edition 的内部技术实现，而是用现代 Web 架构重新实现其玩法：Worker 并行区块生成/网格构建、紧凑体素数据、显式 GPU 生命周期、IndexedDB 持久化，以及真正的 Node server-authoritative 多人运行时。

> 当前开发线：`v0.4.0-dev`。2026-08-16 的权威项目基线以 `main` commit `dbdd6a2b632b6a14b9232806bcbf6a9ccea74113` 为起点。严格按 Minecraft Java 1.20.1 完整玩法/内容口径，当前规划完成度约 **35%**；Web Minecraft 引擎/基础玩法底座本身约 **75–80%**。

在线构建：https://shrinkshi.github.io/Minecraft-Web-ByAI/

完整当前事实见 [`docs/PROJECT_BASELINE.md`](docs/PROJECT_BASELINE.md)，完整 1.20.1 功能矩阵见 [`docs/MINECRAFT_1_20_1_FEATURE_MATRIX.md`](docs/MINECRAFT_1_20_1_FEATURE_MATRIX.md)。这两份文档优先于历史 PR/CHANGELOG 中的阶段性描述。

## 当前已经可玩的核心

### 客户端 / 世界

- Minecraft 风格主菜单、世界创建、暂停、HUD、背包、工作台、死亡界面和聊天/指令输入。
- 桌面：Pointer Lock + WASD，Space 跳跃，Shift 潜行，双击 W 或按住 `R` 疾跑，F5 切换视角。
- 手机：自动识别触控优先设备，横屏提供摇杆、拖动视角、攻击/挖掘、使用/放置、跳跃、疾跑、潜行、丢弃、背包、暂停、聊天和视角按钮；竖屏显示旋转提示。
- 桌面和手机共享同一 World/Player/Inventory/玩法 runtime，只在输入适配层分流。
- 16×16×64 紧凑体素区块，按玩家位置动态加载/卸载。
- terrain Worker 生成区块，mesh Worker 构建可见面；不是一个方块一个 Three.js Mesh。
- opaque / transparent water 独立 chunk pass，TypedArray + Transferable 返回主线程。
- Three.js 版本已锁定并由项目本地静态资源提供，不依赖历史运行时 CDN。
- IndexedDB 保存单人世界增量编辑和已实现的玩家状态。

### 方块、挖掘与合成

当前正式玩法方块族仍然很少，主要包括：

- 草方块、泥土、石头、沙子、橡木木板、橡木原木、橡树树叶、水；
- 工作台、圆石；
- 四方向两格红床。

床已经不是旧版粉色整方块占位视觉。当前 chunk mesh 会输出特殊床描述，`BedModelRenderer` 使用已导入的 Minecraft Java 1.20.1 红床 entity texture 构建半高床视觉；逻辑碰撞仍是后续需要进一步贴近 vanilla 的独立问题。

当前支持：

- 连续挖掘、工具速度、基础 harvest tier、破坏裂纹反馈；
- 普通方块放置和两格床原子放置；
- 36 格背包 + 9 格热栏；
- 左/右键 cursor 操作、拆分、单个放置、合并、Shift 转移；
- 2×2 player crafting 和 3×3 workbench；
- 当前五个配方：原木→木板、木板→木棍、工作台、红床、木镐；
- 木镐 item-instance 耐久及耐久条。

## 生存系统

当前已经形成的生存切片包括：

- HP、伤害、受击无敌、击退；
- 经验球、总经验/等级；
- 生存/冒险死亡清算、死亡界面、显式重生；
- 普通死亡物品/经验可回收，虚空死亡不可回收；
- 自定义 `/spawnpoint` 与持久化 respawnPoint；
- 红床重生锚点、夜间跳夜和附近敌对生物阻止睡眠；
- 皮革四件装备槽和第一版护甲减伤；
- 水下氧气、溺水、基础游泳/浮力；
- `/weather clear|rain|thunder` + 可见雨/雷雨 FX；
- 昼夜时间与 `/time`。

还不能称为完整 Minecraft 生存 progression：完整饥饿/饱和、食物、石→铁→钻石→下界合金工具链、熔炉/熔炼、农业、动物繁殖、盾牌、玩家弓、附魔、药水/状态效果等仍待实现。

## 生物与战斗

当前正式 gameplay mob：

- 被动：牛、羊、猪、鸡；
- 敌对：僵尸、骷髅、苦力怕、蜘蛛。

八种生物均已改为 Minecraft Java 1.20.1 texture-backed cuboid 模型，不再使用旧的纯色占位身体。

单人当前包括：

- 被动生物漫游/受击逃跑；
- 僵尸近战；
- 骷髅箭矢；
- 苦力怕引信/爆炸；
- 蜘蛛近战和有限局部攀爬；
- 第一批 loot 和 XP。

这些 AI/spawn/战斗规则仍是简化实现，离完整 vanilla mob roster、寻路、亮度/群系生成、繁殖/驯服/骑乘等还有明显距离。

## 真正的多人服务器

项目已经拥有 Node WebSocket server-authoritative runtime，而不是“客户端上报位置”的伪联机。

目前已落库：

- 严格 handshake/session/input wire protocol 和序列/replay 防护；
- server-authoritative 玩家移动、碰撞、20 Hz simulation；
- 远端玩家 identity、snapshot replication 和插值渲染；
- 世界初始 edit 同步和 live authoritative block revisions；
- 创造/生存挖掘与放置；
- authoritative ground item/drop/pickup；
- authoritative Inventory + cursor transaction；
- authoritative Equipment；
- authoritative 2×2 player crafting；
- authoritative 3×3 Workbench container；
- authoritative chat 与受控 command channel；
- server-owned PvP HP、近战命中、护甲减伤、击退、死亡掉落和重生。

真实双浏览器 E2E 已覆盖多人关键路径。

当前最大的 multiplayer gameplay authority 缺口是 **mob/PvE/projectile/explosion 仍未迁移到服务器权威**；服务器持久化世界、账号/房间/OP/白名单、重连恢复、共享持久容器以及 Realms 类产品层也仍未完成。

## 世界生成现状

当前生成器是可重复的简化基础：

- fBm/heightmap；
- stone/dirt/grass/sand；
- sea/water；
- oak tree；
- “山/平原/海/森林/沙漠”等提示词调整 amplitude/sea/forest/sand 参数；
- 浏览器和 Node authoritative world 共用相同 deterministic generator。

它还不是 Minecraft 1.20.1 worldgen：biome pipeline、caves、aquifers、ores、surface rules、features、villages/mineshafts/dungeons/strongholds 等 structures、扩展高度、Nether 和 End 都属于后续阶段。

## Minecraft 1.20.1 资源

仓库跟踪了用户提供的 `MC原版素材assets.zip`。确定性审计发现 7,623 个资源文件，约包含：

- 977 block textures；
- 582 item textures；
- 497 entity textures；
- 2,016 block-model JSON；
- 1,675 item-model JSON；
- 1,005 blockstates。

当前 runtime 只选择性接入了已经实现的 terrain/item/entity/bed 资源。因此“资源在仓库里”不等于“玩法已经接入”。

下一阶段最高优先级是实现通用 **Minecraft JSON blockstate/model interpreter**，让现有大量 JSON/texture 能批量进入游戏，而不是继续为普通方块逐个手工写 renderer。

当前资源 ZIP 内没有 sound files，也没有 `sounds.json`，因此完整音效/音乐需要单独补充音频源后再建设 AudioEngine。

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

具体服务器环境变量和安全边界见 [`docs/SERVER.md`](docs/SERVER.md)。

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

PR #94 基线的 `Repository quality` 为全绿：static gate 包含 131 个 logic/worker regression scripts，Chromium smoke 已拆为两个 shard。Minecraft 资源导入另有确定性 source audit，验证来源 ZIP、生成结果和 runtime manifest 的 checksum/provenance。

## 下一阶段路线

1. 维护权威 baseline + 1.20.1 功能矩阵；
2. Minecraft JSON blockstate/model interpreter；
3. 批量 block/item registry 与原版资源接入；
4. 工具/矿石/熔炉/食物/农业/繁殖等完整 survival progression；
5. biome → caves → ores → features → structures worldgen；
6. server-authoritative mobs/PvE/projectiles/explosions；
7. chest/furnace 等 persistent shared containers；
8. neighbor updates + scheduled ticks + redstone；
9. Nether → portal → brewing/enchanting → End → bosses；
10. AudioEngine、lighting、particles、animated textures、biome tint、skins/nameplates，以及剩余 server/product shell。

## 文档

- [`docs/PROJECT_BASELINE.md`](docs/PROJECT_BASELINE.md)：当前 `main` 的权威实现事实。
- [`docs/MINECRAFT_1_20_1_FEATURE_MATRIX.md`](docs/MINECRAFT_1_20_1_FEATURE_MATRIX.md)：完整复刻目标、完成度与 roadmap authority。
- [`docs/PROGRESS.md`](docs/PROGRESS.md)：当前正在进行/下一步工作。
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)：架构决策与技术边界。
- [`docs/NETWORKING.md`](docs/NETWORKING.md)：多人协议与 authority 原则。
- [`docs/SERVER.md`](docs/SERVER.md)：Node authoritative server 运行边界。
- [`docs/TESTING.md`](docs/TESTING.md)：验证策略。
- [`docs/FILE_MANIFEST.md`](docs/FILE_MANIFEST.md)：文件职责。
- [`CHANGELOG.md`](CHANGELOG.md)：历史变更记录。