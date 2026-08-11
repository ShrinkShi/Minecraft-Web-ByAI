# 测试与验证记录

## 质量门结构

`Repository quality` 现在分两层执行：

1. `static-checks`：Node 22 语法、纯逻辑和 Worker 回归。
2. `browser-smoke`：在真实 Chromium 中启动静态站、进入世界并验证浏览器集成基础链。

PR 必须先通过 `static-checks`，随后才运行 `browser-smoke`。浏览器失败会保留 Playwright trace / screenshot / HTML report 目录，避免只剩一个红叉而没有定位材料。

## Node / Worker 自动检查

仓库内 `scripts/check.mjs` 不依赖浏览器和第三方测试框架，覆盖当前最容易出现静默回归的纯逻辑与 Worker 路径：

- Inventory：堆叠、右键拆半、单个放置、cursor 回收。
- Crafting：原木→木板、2×2 工作台、3×3 木镐。
- Commands：`/gamemode`、`/give`、相对坐标 `/tp`、`/time set`、`/weather`。
- SpatialHash / EntityStore：负坐标分桶、跨 cell 移动、邻域查询、删除清理和位置封装。
- Mob rules：牛/羊/猪/鸡选择；僵尸/骷髅/苦力怕敌对选择；夜间窗口；loot min/max、零掉落、未知实体奖励和 XP roll。
- Creeper rules：fuse / explosion 关键字段和火药/经验回归。
- Combat：攻击冷却边界、受击无敌窗口、致死伤害和击退方向。
- Projectile rules：线段/AABB 命中与首次交点 `t`、平行 miss、起点位于碰撞箱内，以及有/无重力的瞄准初速度。
- Experience：Java 风格下一等级需求、累计总经验、total XP→level 反查，以及 16/17、31/32 级公式切换边界。
- Mesh Worker：孤立方块生成 6 面；跨 chunk 邻方块正确剔除 1 个边界面。
- Terrain Worker：固定 seed/prompt 生成正确长度区块，并含基础地层。

本地执行：

```bash
for file in src/*.js; do node --check "$file"; done
node scripts/check.mjs
```

## Chromium browser smoke

依赖：Node 22+、`@playwright/test` 1.62.0、Chromium。

```bash
npm install
npx playwright install chromium
npm run test:e2e
```

`scripts/serve.mjs` 是测试专用的跨平台静态服务器，避免 CI 用 Linux `python3 -m http.server`、Windows 本地又走另一套入口。

当前 `tests/e2e/smoke.spec.mjs` 验证：

- 主菜单加载且“单人游戏”按钮可交互。
- 切换到世界创建界面。
- 使用固定测试世界名和 seed 创建世界。
- 加载层消失，HUD 显示。
- WebGL Canvas 具有有效 backing/client 尺寸。
- 触发暂停路径。
- `minecraft-web-by-ai` IndexedDB 的 `worlds` store 至少写入一条世界记录。
- 浏览器运行期间没有未捕获 `pageerror` 或 console error。

CI 中固定 `workers=1`，优先稳定性而非并行吞吐；只安装 Chromium，避免为了当前单浏览器 gate 下载不需要的 Firefox/WebKit。

## GitHub Pages 部署验证

仓库 Pages Source 已设置为 **GitHub Actions**。`.github/workflows/pages.yml` 的成功条件包括：

1. checkout；
2. `actions/configure-pages`；
3. 上传 Pages artifact；
4. `actions/deploy-pages` 成功完成。

2026-08-12 已验证一次从 `main` 触发的完整 Pages Deployment 为 `success`。在线地址：

`https://shrinkshi.github.io/Minecraft-Web-ByAI/`

## 仍未覆盖的浏览器集成边界

browser smoke 只证明“核心页面可启动并能创建/保存世界”，**不等价于完整玩法无缺陷**。仍需继续覆盖：

- Pointer Lock 的真实键鼠输入组合、F5 三视角和持续移动。
- WebGL 材质/纹理完整性，以及不同 GPU/浏览器驱动下的兼容性。
- 被动生物、僵尸、骷髅、苦力怕在真实地形上的视觉/AI表现。
- 骷髅发射→箭矢轨迹→方块阻挡→玩家受伤完整链。
- 苦力怕引信取消/完成→爆炸→伤害/击退/地形修改完整链。
- 掉落物和经验球大量存在时的帧率、拾取与销毁。
- 保存页面关闭后重新打开，再次进入相同世界后的状态恢复。
- IndexedDB 事务失败、存储配额、schema 迁移和长期存档兼容性。
- CDN 不可用场景；当前 Three.js 仍从 jsDelivr 运行时加载，这是明确技术债。

下一批浏览器 E2E 优先级：

1. 世界创建→修改方块/获得物品→保存→重载恢复。
2. `/time set night`→生成敌对生物→战斗→奖励。
3. 骷髅箭矢和苦力怕爆炸两条完整伤害链。
