# 测试与验证记录

## 自动检查

仓库内 `scripts/check.mjs` 不依赖浏览器和第三方测试框架，覆盖当前最容易出现静默回归的纯逻辑与 Worker 路径：

- Inventory：堆叠、右键拆半、单个放置、cursor 回收。
- Crafting：原木→木板、2×2 工作台、3×3 木镐。
- Commands：`/gamemode`、`/give`、相对坐标 `/tp`、`/time set`、`/weather`。
- Mesh Worker：孤立方块生成 6 面；跨 chunk 邻方块正确剔除 1 个边界面。
- Terrain Worker：固定 seed/prompt 生成正确长度区块，并含基础地层。

GitHub Actions：`.github/workflows/quality.yml` 在 `main` push 和 PR 时执行所有 `src/*.js` 语法检查，以及 `node scripts/check.mjs`。

## 当前验证边界

本执行环境可以执行 Node 逻辑/Worker 测试，但本地临时 HTTP listener 曾无法建立，因此这里**不把完整 Chromium + Pointer Lock + WebGL 交互宣称为已自动化验证**。浏览器端的菜单点击、Pointer Lock、GPU 渲染、IndexedDB 权限和真实帧率仍需要通过 GitHub Pages 或本地浏览器进行端到端检查。

这个边界必须保留在文档中：静态检查和 Worker 单测通过，不等价于完整游戏运行无缺陷。
