# Minecraft-Web-ByAI

一个面向现代浏览器的体素沙盒复刻 / 重实现项目。目标不是照搬 Minecraft Java 版的内部实现，而是在保留经典玩法和交互语义的前提下，用浏览器并行能力、流式区块、紧凑数据结构、显式 GPU 生命周期和现代持久化重新实现核心系统。

> 当前版本：`v0.3.0`。现在已经形成“采集 → 掉落 → 拾取 → 背包 → 2×2 合成 → 放置工作台 → 3×3 合成工具”的基础生存闭环，但距离最初需求中的完整 Minecraft 系统仍有明显差距。

## 当前可玩内容

- Minecraft 风格主菜单、世界创建、暂停界面、HUD、9 格快捷栏与真实 36 格背包。
- 背包左键整组拿取 / 放置 / 合并、右键拆半 / 单个放置、Shift 点击在主背包和快捷栏之间快速移动。
- 第一人称 WASD、鼠标视角、空格跳跃、Ctrl 疾跑、Shift 潜行减速。
- F5 循环第一人称、第三人称背面、第三人称正面视角。
- 生存 / 创造 / 指令切换模式；创造和旁观支持飞行式移动。
- 程序化区块世界，玩家跨区块时动态加载，离开较远区域后自动卸载。
- terrain Worker 异步生成地形；mesh Worker 异步计算暴露面和顶点缓冲。
- 区块级合并网格：不是“一个方块一个 Three.js Mesh”。
- 草方块、泥土、石头、圆石、沙子、木板、原木、树叶、水、工作台等基础方块。
- 左键持续挖掘、工具影响基础挖掘速度、右键放置。
- 方块掉落物实体：简单重力、漂浮旋转、拾取、5 分钟销毁。
- Q 丢弃当前选中物品。
- 2×2 合成：原木→木板、木板→木棍、4 木板→工作台。
- 3×3 工作台：当前至少可制作木镐。
- 玩家 AABB 碰撞、重力、跳跃、掉落保护重生。
- 基础生命、饱食度、经验条 UI 和简化饱食消耗。
- IndexedDB 自动保存玩家状态、背包和方块修改；再次进入相同“世界名称 + seed”会恢复。
- T 打开聊天，`/` 直接输入指令；当前支持 `/gamemode`、`/give`、`/tp`、`/time set`、`/weather`、`/help`。
- 昼夜光照随 24000 tick 周期变化；天气指令当前会改变天空/环境光强度。
- 文本“AI 地形提示词”会影响程序化地形参数；真正扩散模型高度图生成接口尚未接入。

## 运行

这是纯静态 Web 项目。推荐从 HTTP 服务运行，而不是直接打开 `file://`：

```bash
python -m http.server 8080
```

然后访问 `http://localhost:8080`。

## 自动检查

```bash
for file in src/*.js; do node --check "$file"; done
node scripts/check.mjs
```

GitHub Actions 会在 `main` push 和 PR 时执行同一组语法与核心逻辑 / Worker 回归检查。测试边界见 [`docs/TESTING.md`](docs/TESTING.md)。

## 技术方向

- 渲染：Three.js + WebGL2 路线，后续保留 WebGPU renderer 迁移路径。
- 世界：16×16×64 区块，紧凑 `Uint8Array` 方块存储。
- 生成：独立 terrain Web Worker。
- 网格：独立 mesh Web Worker，仅生成可见面并返回 TypedArray / Transferable buffers。
- 流式：玩家位置驱动加载；渲染距离外增加 1 chunk 滞回后卸载。
- 存档：IndexedDB，仅保存程序化世界的增量编辑、玩家快照和背包状态。
- 生命周期：区块卸载时显式 `dispose()` GPU geometry；掉落物/玩家可视对象也有显式销毁路径。
- 后续：盔甲/工具耐久、实体 ECS、生物 AI、战斗、状态效果、附魔、村民交易、酿造、维度、结构、多人生存网络层、真正 AI 地形管线。

## 文档

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)：架构决策、数据流和当前技术债。
- [`docs/PROGRESS.md`](docs/PROGRESS.md)：已完成项与下一阶段任务。
- [`docs/FILE_MANIFEST.md`](docs/FILE_MANIFEST.md)：文件职责与生命周期约束。
- [`docs/TESTING.md`](docs/TESTING.md)：自动检查与验证边界。
- [`CHANGELOG.md`](CHANGELOG.md)：版本变更记录。
