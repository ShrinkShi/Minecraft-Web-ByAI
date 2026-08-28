# Minecraft-Web-ByAI

项目正在从浏览器 / Three.js 客户端迁移到 **Godot 4.7.2 原生桌面客户端**。

这次迁移的目标不是简单更换渲染 API，而是解除浏览器对输入、文件系统、窗口控制和运行时能力的硬限制，同时保留已经形成兼容性契约的 Minecraft Java 1.20.1 玩法数据、资源、存档和多人语义。

> 当前迁移阶段：**G0 — Godot Native Foundation**。现有 Web 实现仍保留在仓库中作为功能对照和迁移来源，但新的客户端功能开发以 Godot 原生实现为主。

## 为什么迁移到 Godot

浏览器版已经证明了大量玩法与数据模型，但仍受制于：

- 浏览器保留快捷键和标签页生命周期；
- Pointer Lock / Keyboard Lock 等 API 的兼容性差异；
- Web 文件系统、音频、线程和网络沙箱；
- DOM/CSS UI 与 3D 游戏输入焦点之间的额外复杂度；
- 浏览器部署目标对桌面游戏能力的反向约束。

Godot 原生客户端不再把这些浏览器限制作为游戏设计边界。未来如保留 Godot Web 导出，也只作为次级构建目标。

## 当前 Godot 基础

G0 已建立以下原生架构：

- Godot 4.7.2 根工程；
- 原生窗口、Forward+ 3D 渲染；
- CharacterBody3D 第一人称控制；
- WASD、跳跃、Ctrl 疾跑、鼠标捕获和滚轮快捷栏；
- 使用仓库现有 Minecraft Java 1.20.1 原版方块纹理；
- 合并体素表面网格，而不是每个方块一个 Node3D；
- 隐藏面剔除；
- ConcavePolygonShape3D 静态世界碰撞；
- 保留现有 append-only block ID `0..53`；
- 保留 `{id, stateKey}` 方块身份和 canonical stateKey 语义；
- 启动时迁移契约自检。

这只是迁移地基，不代表现有 Web 版约 35% 的玩法已经全部移植完成。

## 运行 Godot 原生客户端

安装官方 Godot 4.7.2 stable 后，在仓库根目录执行：

```bash
godot --editor project.godot
```

直接运行：

```bash
godot --path .
```

Windows 如果使用独立可执行文件，也可以把 `godot` 替换为实际的 `Godot_v4.7.2-stable_win64.exe` 路径。

## 迁移原则

已经影响持久化或多人协议的数据契约不能因为换引擎而重排，包括：

- block ID append-only 顺序；
- `{id, stateKey}`；
- singleplayer save schema v11 语义；
- terrain generator version pinning；
- `minecraft-web-v6` / world-edit replication v2；
- 已持久化或复制的 item / starter inventory 顺序；
- `MC原版素材assets/` 中 Java 1.20.1 资源路径。

详细迁移计划见 [`docs/GODOT_NATIVE_MIGRATION.md`](docs/GODOT_NATIVE_MIGRATION.md)。

## 迁移顺序

1. **G0**：原生可运行地基、输入、体素网格、兼容契约；
2. **G1**：方块 registry / schema / sparse state sidecar 对齐；
3. **G2**：16×16 chunk streaming、terrain v4、后台生成与 state-aware mesh；
4. **G3**：挖掘/放置、背包、合成、熔炉、生存、战斗、实体等逐系统迁移；
5. **G4**：`user://` 原生存档与旧 v11 世界导入；
6. **G5**：Godot 客户端接入现有 Node authoritative v6 server；
7. **G6**：达到约定功能基线后退役浏览器生产入口。

## Legacy Web 运行方式

迁移期间旧 Web 客户端和 Node authoritative server 暂时保留，用于行为对照、协议兼容和回归验证。

```bash
npm install
npm run serve
```

多人服务器：

```bash
npm run server
```

原有逻辑和浏览器回归：

```bash
npm run test:logic
npm run test:e2e
```

不要在 Godot 尚未获得对应子系统 parity 前删除旧实现。同步重写客户端、服务器和持久化会失去唯一可工作的行为基准。

## 关键文档

- [`docs/GODOT_NATIVE_MIGRATION.md`](docs/GODOT_NATIVE_MIGRATION.md)
- [`docs/PROJECT_BASELINE.md`](docs/PROJECT_BASELINE.md) — 迁移前 merged Web 基线事实
- [`docs/MINECRAFT_1_20_1_FEATURE_MATRIX.md`](docs/MINECRAFT_1_20_1_FEATURE_MATRIX.md)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/TESTING.md`](docs/TESTING.md)
- [`CHANGELOG.md`](CHANGELOG.md)
