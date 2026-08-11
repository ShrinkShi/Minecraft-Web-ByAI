# Minecraft-Web-ByAI

一个面向现代浏览器的体素沙盒复刻 / 重实现项目。目标不是照搬 Minecraft Java 版的内部实现，而是在保留经典玩法和交互语义的前提下，用浏览器并行能力、流式区块、紧凑数据结构、显式 GPU 生命周期和现代持久化重新实现核心系统。

> 当前版本：`v0.2.0`。这是“可玩核心 + 流式世界 + 浏览器存档”阶段，不代表已经完成最初需求中的全部 Minecraft 系统。

## 当前可玩内容

- Minecraft 风格主菜单、世界创建、暂停界面、HUD、快捷栏与物品栏外观。
- 第一人称 WASD、鼠标视角、空格跳跃、Ctrl 疾跑、Shift 潜行减速。
- 生存 / 创造两种世界创建模式；创造模式当前提供飞行式垂直移动。
- 程序化区块世界，玩家跨区块时动态加载，离开较远区域后自动卸载。
- terrain Worker 异步生成地形；mesh Worker 异步计算暴露面和顶点缓冲。
- 区块级合并网格：不是“一个方块一个 Three.js Mesh”。
- 草方块、泥土、石头、沙子、木板、原木、树叶、水等基础方块。
- 左键持续挖掘、右键放置、数字键 1~9 / 滚轮选择快捷栏。
- 玩家 AABB 碰撞、重力、跳跃、掉落保护重生。
- 基础生命、饱食度、经验条 UI 和简化饱食消耗。
- IndexedDB 自动保存玩家状态和方块修改；再次进入相同“世界名称 + seed”会恢复。
- 文本“AI 地形提示词”会影响程序化地形参数；真正扩散模型高度图生成接口尚未接入。

## 运行

这是纯静态 Web 项目。推荐从 HTTP 服务运行，而不是直接打开 `file://`：

```bash
python -m http.server 8080
```

然后访问 `http://localhost:8080`。

## 技术方向

- 渲染：Three.js + WebGL2 路线，后续保留 WebGPU renderer 迁移路径。
- 世界：16×16×64 区块，紧凑 `Uint8Array` 方块存储。
- 生成：独立 terrain Web Worker。
- 网格：独立 mesh Web Worker，仅生成可见面并返回 TypedArray / Transferable buffers。
- 流式：玩家位置驱动加载；渲染距离外增加 1 chunk 滞回后卸载。
- 存档：IndexedDB，仅保存程序化世界的增量编辑和玩家快照。
- 生命周期：区块卸载时显式 `dispose()` GPU geometry；材质 / 纹理共享。
- 后续：真实物品栏与合成、实体 ECS、生物 AI、命令、维度、多人网络层、真正 AI 地形管线。

## 文档

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)：架构决策、数据流和当前技术债。
- [`docs/PROGRESS.md`](docs/PROGRESS.md)：已完成项与下一阶段任务。
- [`docs/FILE_MANIFEST.md`](docs/FILE_MANIFEST.md)：文件职责与生命周期约束。
- [`CHANGELOG.md`](CHANGELOG.md)：版本变更记录。
