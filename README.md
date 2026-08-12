# Minecraft-Web-ByAI

一个面向现代浏览器的体素沙盒复刻 / 重实现项目。目标不是照搬 Minecraft Java 版的内部实现，而是在保留经典玩法和交互语义的前提下，用浏览器并行能力、流式区块、紧凑数据结构、显式 GPU 生命周期和现代持久化重新实现核心系统。

> 稳定发布基线：`v0.3.0`。当前 `main` 开发线为 `v0.4.0-dev`：实体数据层、第一批被动生物、僵尸、骷髅、苦力怕、蜘蛛、基础战斗、箭矢、爆炸、战利品/经验、基础生存死亡损失、第一版护甲装备系统、水独立透明渲染 pass，以及水下氧气/溺水闭环已经落库；游泳/浮力/流体传播、天气粒子、完整伤害公式等仍属于后续工作。

在线构建：`https://shrinkshi.github.io/Minecraft-Web-ByAI/`

## 当前可玩内容

### 世界与基础交互
- Minecraft 风格主菜单、世界创建、暂停界面、HUD、9 格快捷栏与真实 36 格背包。
- 背包左键整组拿取 / 放置 / 合并、右键拆半 / 单个放置、Shift 点击在主背包和快捷栏之间快速移动。
- 第一人称 WASD、鼠标视角、空格跳跃、Ctrl 疾跑、Shift 潜行减速。
- F5 循环第一人称、第三人称背面、第三人称正面视角。
- 生存 / 创造 / 指令切换模式；创造和旁观支持飞行式移动。
- 程序化区块世界，玩家跨区块时动态加载，离开较远区域后自动卸载。
- terrain Worker 异步生成地形；mesh Worker 异步计算暴露面和顶点缓冲。
- 区块级合并网格：不是“一个方块一个 Three.js Mesh”。
- 水已从普通不透明 chunk mesh 中拆成独立透明 pass：同水内部面会剔除，opaque/water 分别通过 TypedArray + Transferable 返回主线程；每个 chunk 最多安装一个 opaque mesh 和一个 water mesh。
- 水使用独立透明材质（当前 opacity 0.68、`depthWrite=false`）并与普通方块共享 atlas texture。
- 玩家头部/眼睛所在 voxel 为 liquid 时判定为浸水；生存/冒险拥有 15 秒空气，离水后按每秒 4 秒额度恢复；空气耗尽后每秒受到 2 HP 溺水伤害。
- 氧气 HUD 使用 10 个气泡显示，只在头部浸水或空气尚未恢复满时出现；创造/旁观不会消耗空气或溺水。
- 氧气是瞬时环境状态，不写入 IndexedDB；重生、退出世界或切换到创造/旁观会恢复满空气。
- 当前没有游泳/浮力、流体传播、水流、动态液面、水下 fog/折射或水肺/水下呼吸效果。
- 草方块、泥土、石头、圆石、沙子、木板、原木、树叶、水、工作台等基础方块。
- 左键持续挖掘、工具影响基础挖掘速度、右键放置。
- 方块掉落物实体：简单重力、漂浮旋转、拾取、5 分钟销毁。
- Q 丢弃当前选中物品。
- 2×2 合成：原木→木板、木板→木棍、4 木板→工作台。
- 3×3 工作台：当前至少可制作木镐。
- 玩家 AABB 碰撞、重力、跳跃、掉落保护重生。
- 基础生命、饱食度、经验、护甲和氧气 HUD。
- IndexedDB 自动保存玩家状态、背包、四个护甲槽、经验和方块修改；再次进入相同“世界名称 + seed”会恢复。
- T 打开聊天，`/` 直接输入指令；当前支持 `/gamemode`、`/give`、`/tp`、`/time set`、`/weather`、`/help`。
- 昼夜光照随 24000 tick 周期变化；天气指令当前只改变天空/环境光强度。
- 文本“AI 地形提示词”会影响程序化地形参数；真正扩散模型高度图生成接口尚未接入。

### v0.4 开发线已经落库的实体 / 战斗 / 死亡 / 护甲能力
- `EntityStore + SpatialHash`：实体身份、位置、组件和邻域查询分离，避免把所有生物交互做成全表两两扫描。
- 牛、羊、猪、鸡：基础生成、10 Hz 漫游、受击逃跑和远距离回收。
- 僵尸：夜间生成、追击和近战攻击。
- 骷髅：距离控制、侧移和箭矢远程攻击。
- 苦力怕：接近、引信、取消范围和爆炸事件；爆炸可伤害/击退玩家并破坏附近地形。
- 蜘蛛：宽体低矮占位模型、夜间敌对生成、近战追击，以及最多约 3 格高度差的局部地形攀爬；这不是完整墙面寻路。
- 公共战斗规则：攻击冷却、受击无敌窗口、击退和致死判断。
- 投射物：箭矢重力、方块阻挡、线段/AABB 玩家命中。
- 生物死亡奖励：第一批战利品、经验球、Java 风格经验等级计算和 `totalXp` 存档。
- 生存/冒险死亡：36 格背包、cursor、四个护甲槽和 2×2/3×3 合成输入统一清算；普通死亡把物品掉在死亡点，并掉落 `min(100, 当前等级 × 7)` 点经验后清零总经验。
- 虚空死亡：`y < -10` 时不制造无法回收的掉落/经验实体，携带内容直接损失；创造/旁观不执行这套损失规则。
- `Equipment` 独立维护 head/chest/legs/feet 四槽，不挤占 36 格背包；快照版本 v5 保存/恢复装备。
- 第一批皮革护甲：帽子/外套/裤子/靴子分别 1/3/2/1 点，总计 7 点；可通过背包 cursor 拖放到正确部位，错误部位会拒绝。
- 当前减伤是明确的过渡公式：每点护甲 4%，最高 80%；整套皮革为 28%。它适用于敌对近战、箭矢和爆炸，虚空与溺水不受护甲保护；Java toughness/附魔完整公式后续替换。

## 运行

这是纯静态 Web 项目。推荐从 HTTP 服务运行，而不是直接打开 `file://`。

不安装 Node 依赖时仍可使用 Python：

```bash
python -m http.server 8080
```

安装测试依赖后也可以使用仓库自带跨平台静态服务器：

```bash
npm install
npm run serve
```

## 自动检查

纯逻辑 / Worker / 护甲 / 水网格 / 氧气回归：

```bash
npm run test:logic
```

浏览器 smoke：

```bash
npm install
npx playwright install chromium
npm run test:e2e
```

`Repository quality` 在 PR 和 `main` push 时先执行 Node 规则层，再用 Chromium 真正创建海洋测试世界，验证头部浸水→氧气 HUD 下降→离水恢复，同时继续验证护甲 v5 IndexedDB 快照和虚空死亡清算。Node 层独立验证 15 秒空气、恢复速率、溺水节拍，以及 opaque/water 网格拆分。测试边界见 [`docs/TESTING.md`](docs/TESTING.md)。

## 技术方向

- 渲染：Three.js + WebGL2 路线，后续保留 WebGPU renderer 迁移路径。
- 世界：16×16×64 区块，紧凑 `Uint8Array` 方块存储。
- 生成：独立 terrain Web Worker。
- 网格：独立 mesh Web Worker；同一次 chunk 扫描分别生成 opaque / water 可见面，并返回两套 TypedArray / Transferable buffers。opaque 旧顶层字段暂时保留为兼容视图，运行时只消费新分层协议。
- 水渲染：每 chunk 最多一个透明 water mesh；与 opaque mesh 共享 atlas，独立材质与 render order；chunk 卸载和世界退出时两套 geometry 都显式释放。
- 水下生存：主线程只采样玩家 eye voxel；`oxygen-rules.js` 维护纯逻辑空气状态和溺水事件，不把短时空气值写入 world record。
- 流式：玩家位置驱动加载；渲染距离外增加 1 chunk 滞回后卸载。
- 存档：IndexedDB，仅保存程序化世界的增量编辑、玩家/背包/Equipment/经验快照，不保存 oxygen 瞬时状态。
- 实体：EntityStore 管身份与组件，SpatialHash 缩小邻域查询候选集；AI 固定低频 tick、视觉逐帧插值。
- 装备：Equipment 是独立可序列化模型；减伤公式与 UI/存档分离，便于未来替换成 Java 风格 armor+toughness 规则而不迁移槽结构。
- 生命周期：区块卸载时显式 `dispose()` opaque/water GPU geometry；掉落物、经验球、投射物、玩家和生物视觉对象都有显式销毁路径。
- 后续：死亡界面/统计与床重生、完整伤害/护甲/耐久/附魔、游泳/浮力/流体传播与水下视觉、天气粒子、状态效果、村民交易、酿造、维度、结构、多人生存网络层、真正 AI 地形管线。

## 文档

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)：架构决策、数据流和当前技术债。
- [`docs/PROGRESS.md`](docs/PROGRESS.md)：已完成项与下一阶段任务。
- [`docs/FILE_MANIFEST.md`](docs/FILE_MANIFEST.md)：文件职责与生命周期约束。
- [`docs/TESTING.md`](docs/TESTING.md)：自动检查与验证边界。
- [`CHANGELOG.md`](CHANGELOG.md)：版本变更记录。