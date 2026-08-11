# Minecraft-Web-ByAI

一个面向现代浏览器的体素沙盒复刻/重实现项目。目标不是照搬 Minecraft Java 版的技术债，而是在保留经典玩法和交互语义的前提下，用浏览器端并行能力、区块网格化、可回收资源生命周期和现代存储方案重新实现核心系统。

> 当前版本：`v0.1.0`。这是第一个可玩的核心提交，不代表已经完成用户最初列出的全部 Minecraft 系统。

## 当前可玩内容

- Minecraft 风格主菜单、世界创建、暂停界面、HUD、快捷栏与物品栏外观。
- 第一人称 WASD、鼠标视角、空格跳跃、Ctrl 疾跑、Shift 潜行减速。
- 生存/创造两种世界创建模式；创造模式目前提供飞行式垂直移动。
- Worker 异步生成 5×5 区块地形，主线程不执行地形生成循环。
- 区块级合并网格：不是“一个方块一个 Three.js Mesh”。
- 草方块、泥土、石头、沙子、木板、原木、树叶、水等基础方块。
- 左键持续挖掘、右键放置、数字键 1~9/滚轮选择快捷栏。
- 玩家 AABB 碰撞、重力、跳跃、掉落保护重生。
- 基础生命、饱食度、经验条 UI 和简化饱食消耗。
- 文本“AI 地形提示词”会影响程序化地形参数；真正扩散模型高度图生成接口尚未接入。

## 运行

这是纯静态 Web 项目。推荐从 HTTP 服务运行，而不是直接打开 `file://`：

```bash
python -m http.server 8080
```

然后访问 `http://localhost:8080`。

## 技术方向

- 渲染：Three.js + WebGL2（后续保留 WebGPU renderer 路线）。
- 世界：16×16×64 区块，紧凑 `Uint8Array` 方块存储。
- 生成：Web Worker。
- 网格：仅生成可见面，每个区块一个合并 BufferGeometry。
- 生命周期：区块卸载时显式 `dispose()` GPU geometry；材质/纹理共享。
- 后续：动态加载/卸载区块、IndexedDB 存档、Worker 网格化、实体 ECS、多人网络层、真正 AI 地形管线。

详见 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) 和 [`docs/PROGRESS.md`](docs/PROGRESS.md)。
