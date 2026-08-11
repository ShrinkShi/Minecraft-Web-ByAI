# 测试与验证记录

## 自动检查

仓库内 `scripts/check.mjs` 不依赖浏览器和第三方测试框架，覆盖当前最容易出现静默回归的纯逻辑与 Worker 路径：

- Inventory：堆叠、右键拆半、单个放置、cursor 回收。
- Crafting：原木→木板、2×2 工作台、3×3 木镐。
- Commands：`/gamemode`、`/give`、相对坐标 `/tp`、`/time set`、`/weather`。
- SpatialHash / EntityStore：负坐标分桶、跨 cell 移动、邻域查询、删除清理和位置封装。
- Mob rules：牛/羊/猪/鸡选择、僵尸/骷髅敌对选择、夜间窗口、loot min/max、零掉落、未知实体奖励和 XP roll。
- Combat：攻击冷却边界、受击无敌窗口、致死伤害和击退方向。
- Projectile rules：线段/AABB 命中与首次交点 `t`、平行 miss、起点位于碰撞箱内，以及有/无重力的瞄准初速度。
- Experience：Java 风格下一等级需求、累计总经验、total XP→level 反查，以及 16/17、31/32 级公式切换边界。
- Mesh Worker：孤立方块生成 6 面；跨 chunk 邻方块正确剔除 1 个边界面。
- Terrain Worker：固定 seed/prompt 生成正确长度区块，并含基础地层。

GitHub Actions：`.github/workflows/quality.yml` 在 `main` push 和 PR 时执行所有 `src/*.js` 语法检查，以及 `node scripts/check.mjs`。

## 当前验证边界

Node 检查能验证规则不变量，但**不能证明 Three.js / DOM / IndexedDB 的浏览器集成已经正确**。当前仍需 GitHub Pages 或本地浏览器端到端验证的部分包括：

- 菜单点击、Pointer Lock、第一/第三人称控制和真实键鼠组合。
- WebGL 材质/纹理加载，以及 loot 内联 SVG data URI 是否在目标浏览器正常解码。
- 被动生物、僵尸、骷髅视觉和 10 Hz AI 在真实地形上的移动/侧移表现。
- 骷髅发射事件→箭矢创建→重力轨迹→方块阻挡→玩家受伤这一整条 Three.js 集成链。
- 高速箭矢接近墙角、玩家贴墙、不同帧率下的命中先后顺序；纯规则测试只能证明线段/AABB 算法本身。
- 掉落物和经验球的 Three.js 物理表现、吸附距离、拾取手感和大量实体时的帧率。
- HUD 经验条/等级刷新以及从 IndexedDB 保存、关闭页面、重新进入后的 `totalXp` 恢复。
- 浏览器 IndexedDB 权限、事务失败路径和真实长期存档兼容性。

因此，Repository quality 成功只意味着“模块语法 + 当前纯逻辑/Worker 回归通过”，不等价于完整游戏运行无缺陷。浏览器 E2E 基础设施可用后，应优先补两条关键链：

1. 世界创建→击杀实体→掉落/经验拾取→保存→重载。
2. `/time set night`→骷髅生成→箭矢被方块阻挡→玩家命中/受伤→死亡/重生。
