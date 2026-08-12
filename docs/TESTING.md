# 测试与验证记录

## 质量门结构

`Repository quality` 分两层执行：

1. `static-checks`：Node 22 语法、纯逻辑和 Worker 回归。
2. `browser-smoke`：真实 Chromium 中启动静态站并验证跨模块集成链。

PR 必须先通过 `static-checks`，随后才运行 `browser-smoke`。浏览器失败会保留 Playwright trace / screenshot / HTML report 目录。

## Node / Worker 自动检查

`npm run test:logic` 当前顺序执行：

```text
scripts/check.mjs
scripts/check-armor.mjs
scripts/check-water.mjs
scripts/check-oxygen.mjs
scripts/check-swim.mjs
```

基础套件覆盖 Inventory / Crafting / Commands / EntityStore / SpatialHash / 四种敌对生物 / Combat / Projectile / Experience / Spider / Death / Mesh Worker / Terrain Worker。

### Equipment / Armor

- 四个固定 Equipment 槽、错误部位拒绝、cursor 装备/取下。
- 非法快照过滤和 stack count 归一化。
- `Equipment.drain()` 死亡清算。
- 皮革套 7 护甲点；当前 4%/点、80% 上限的减伤公式。
- `/give minecraft:leather_chestplate 1`。

### Water mesh

- 单个实体方块只产 opaque，单个水方块只产 water。
- 同水相邻内部面剔除，包括跨 chunk 边界。
- 水对实体方块接触面剔除，实体面对透明水保留。
- opaque / water 使用独立 TypedArray / Transferable buffers。
- opaque 旧顶层 buffer 字段仍作为临时兼容视图。

### Oxygen / Drowning

- survival/adventure 使用氧气；creative/spectator 满空气且不溺水。
- 15 秒耗尽、离水 4× 恢复、跨 0 点时序。
- 0 空气后 1 秒一个 drowning event；当前每个事件 2 HP。
- 非法 state/dt/submerged 输入拒绝。

### Swimming / Buoyancy

`scripts/check-swim.mjs` 覆盖：

- 脚/躯干/眼睛三点布尔采样得到 0、1/3、2/3、1 的覆盖率。
- coverage=0 时规则严格 no-op：不改 vertical velocity，speed multiplier=1，保证陆地路径不被水规则污染。
- coverage 从 0→1 时水平倍率从 1 平滑插值到 0.5；部分浸水不会瞬间跳成完整水中速度。
- 完整浸水、无输入、初始垂直速度为 0 时产生轻微正浮力。
- Space 的向上加速度必须大于被动浮力；Shift 必须产生向下速度。
- +3.4 / -3.0 的垂直水中限速。
- Space 与 Shift 同时按下时额外上下游加速度抵消，只保留基础浮力/重力。
- coverage、dt、velocityY、输入类型非法时拒绝。

这些测试验证的是独立数值规则；Player 的真实 world sampling、输入事件和碰撞积分由 Chromium 层覆盖。

## Chromium browser smoke

```bash
npm install
npx playwright install chromium
npm run test:e2e
```

当前 smoke 使用固定世界名、seed `ci-browser-smoke-2026` 和 terrain prompt `海`，验证：

1. 主菜单→生存世界，HUD 与 WebGL Canvas 启动。
2. 世界实际经过 mesh Worker opaque/water 双 pass。
3. 出生点附近真实水体使 Player eye voxel 浸水，Oxygen HUD 自动出现。
4. `#oxygen[data-air]` 在约 500 ms 内明显下降。
5. 从 debug HUD 解析真实玩家 Y。
6. 持续 Space 约 350 ms，Y 必须上升至少约 0.08，验证 Player key state→三点水采样→swim rules→moveAxis 的上游链。
7. 随后持续 Shift 约 650 ms，Y 必须相对上游后位置下降，验证下潜链。
8. `/tp 0 35 0` 离开水体，Oxygen HUD 恢复后隐藏。
9. `/give minecraft:leather_chestplate 1`→真实 Inventory/Equipment 拖放→护甲 HUD。
10. 暂停读取新鲜 IndexedDB：`version=5`、chest 正确，并确认没有持久化 oxygen。
11. 恢复→给予原木→传送虚空→死亡/重生。
12. 新鲜死亡后快照：Inventory=0、Equipment=0、XP=0、位置可恢复。
13. 全程无 pageerror / console error。

完整 15 秒窒息不在 Chromium 中硬等，由 Oxygen 纯规则精确覆盖；浏览器负责真实地形/Player/World/UI 接线。游泳浏览器链当前验证上下垂直移动，不把随机地形中的横向距离作为脆弱断言。

## GitHub Pages 部署验证

仓库 Pages Source 为 **GitHub Actions**。每个主线 squash 后必须同时核对 `Repository quality` 与 `Deploy GitHub Pages` 最终 success。

在线地址：`https://shrinkshi.github.io/Minecraft-Web-ByAI/`

## 仍未覆盖的浏览器集成边界

- 完整 15 秒耗尽→真实 drowning damage→死亡/重生的浏览器时间链。
- 横向水中速度与陆地速度的浏览器定量对比。
- 冲刺游泳姿态/三维视线方向推进、爬行过渡、实体游泳 AI、水流/流体传播。
- Water surface blending、透明排序、深度冲突和不同 GPU/浏览器差异。
- 水下 fog/折射、Respiration、Water Breathing、Conduit、Depth Strider、Dolphin's Grace。
- 真实敌对生物有/无护甲 HP 差值。
- Pointer Lock/F5/持续陆地移动的专门 E2E。
- 普通可恢复死亡的掉落/经验/护甲重新拾取。
- 死亡世界实体跨页面持久化、IndexedDB 配额/schema 迁移。
- Three.js 运行时仍依赖 jsDelivr。
