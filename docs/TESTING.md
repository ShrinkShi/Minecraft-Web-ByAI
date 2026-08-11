# 测试与验证记录

## 质量门结构

`Repository quality` 分两层执行：

1. `static-checks`：Node 22 语法、纯逻辑和 Worker 回归。
2. `browser-smoke`：真实 Chromium 中启动静态站并验证跨模块集成链。

PR 必须先通过 `static-checks`，随后才运行 `browser-smoke`。浏览器失败会保留 Playwright trace / screenshot / HTML report 目录。

## Node / Worker 自动检查

`scripts/check.mjs` 当前覆盖：

- Inventory：堆叠、右键拆半、单个放置、cursor 回收，以及死亡结算用 `drain()` 的复制/清空语义。
- Crafting：原木→木板、2×2 工作台、3×3 木镐；死亡路径使用 CraftingGrid `drain()` 抽空未合成输入。
- Commands：`/gamemode`、`/give`、相对坐标 `/tp`、`/time set`、`/weather`。
- SpatialHash / EntityStore：负坐标分桶、跨 cell 移动、邻域查询、删除清理和位置封装。
- Mob rules：牛/羊/猪/鸡；僵尸/骷髅/苦力怕/蜘蛛；夜间窗口；loot 和 XP。
- Creeper rules：fuse / explosion 关键字段和火药/经验。
- Spider rules：模型/HP/近战/攀爬参数、线掉落、正常台阶、逐步攀爬、超高/过深落差阻挡。
- Death rules：survival/adventure 与 creative/spectator 损失策略；`min(100, level × 7)` 死亡经验；`y < -10` 虚空边界；普通/虚空/创造模式 death plan。
- Combat：攻击冷却、受击无敌、致死伤害和击退。
- Projectile rules：线段/AABB 首次命中和带重力瞄准。
- Experience：等级需求、累计总经验、total XP→level，以及 16/17、31/32 级公式边界。
- Mesh Worker：孤立方块 6 面和跨 chunk 邻面剔除。
- Terrain Worker：固定 seed/prompt 基础生成。

本地执行：

```bash
for file in src/*.js; do node --check "$file"; done
node scripts/check.mjs
```

## Chromium browser smoke

```bash
npm install
npx playwright install chromium
npm run test:e2e
```

`scripts/serve.mjs` 是本地/CI 共用的跨平台静态服务器。当前 `tests/e2e/smoke.spec.mjs` 使用固定世界和 seed，验证：

1. 主菜单→单人世界→生存模式创建世界。
2. HUD 与 WebGL Canvas 正常启动。
3. 通过真实聊天输入执行 `/give oak_log 3`，让背包产生可验证物品状态。
4. 执行 `/tp 0 -20 0` 进入虚空。
5. 等待 Player update → HP=0 → death plan → Inventory/Crafting drain → respawn 完整链，并确认 toast 进入“虚空死亡”路径。
6. 触发暂停/存档后直接读取 IndexedDB，确认该世界：36 格背包占用数为 0、`totalXp=0`、玩家已回到 `y > -10` 的可恢复位置。
7. 整个流程没有未捕获 `pageerror` 或 console error。

CI 固定 `workers=1`，当前只安装 Chromium。

## GitHub Pages 部署验证

仓库 Pages Source 已设置为 **GitHub Actions**。2026-08-12 已验证 `main` 的完整 Pages Deployment 为 `success`。

在线地址：`https://shrinkshi.github.io/Minecraft-Web-ByAI/`

## 仍未覆盖的浏览器集成边界

- Pointer Lock、F5 三视角和持续移动。
- 不同 GPU/浏览器驱动的 WebGL 材质/纹理兼容性。
- 被动生物与四种敌对生物在真实地形上的视觉/AI表现。
- 骷髅箭矢、苦力怕爆炸、蜘蛛追击的完整战斗链。
- **普通可恢复死亡**的物品/经验实体生成和重新拾取；当前 browser smoke 只自动验证了虚空直接损失路径。
- 掉落物和经验球大量存在时的性能。
- 死亡掉落/经验球目前不持久化；页面重载会丢失尚未回收的这些世界实体。
- IndexedDB 事务失败、配额、schema 迁移和长期兼容性。
- Three.js 仍从 jsDelivr 运行时加载，CDN 不可用仍会影响网站和 browser smoke。

下一批 E2E 优先级：

1. 普通死亡→物品/经验掉落→重新拾回。
2. 世界修改→保存→重载恢复。
3. 夜间敌对生成→战斗→奖励。
