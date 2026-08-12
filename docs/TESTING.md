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
scripts/check-weather.mjs
scripts/check-death.mjs
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
- 脚/躯干/眼睛三点布尔采样得到 0、1/3、2/3、1 的覆盖率。
- coverage=0 严格 no-op，防止水规则污染陆地路径。
- coverage 从 0→1 时水平倍率从 1 平滑插值到 0.5。
- 完整浸水有轻微正浮力；Space 上游、Shift 下潜。
- +3.4 / -3.0 垂直限速；冲突输入与非法参数均有回归。

### Weather / Precipitation

`scripts/check-weather.mjs` 覆盖：

- 唯一天气类型为 `clear / rain / thunder`，未知类型拒绝。
- 固定默认容量 `WEATHER_MAX_SEGMENTS=720`。
- clear 激活 0 条；rain 激活 `floor(720×.62)=446`；thunder 激活 720 条。
- rain 必须具有正的 fallSpeed、length、opacity；thunder 的数量、下落速度、雨线长度、透明度和总风偏强度必须高于 rain。
- 自定义小容量也按 ratio 计算，例如 rain 10 条容量时激活 6，thunder 1 条容量时激活 1。
- 非正整数容量拒绝。

Node 层只验证 profile，不导入 Three.js WeatherSystem；后者由 Chromium 实际创建/更新，避免在 Node 中伪造 WebGL 对象。

### Death integration contract

`scripts/check-death.mjs` 验证 `index.html` 必须加载 `death.css` 并包含 `#death-menu/#death-reason/#death-detail` 与显式重生/返回标题动作；`main.js` 必须构造 `DeathScreen`、持有 `deathState`、提供 `beginPlayerDeath()`/`completeRespawn()`、在死亡时阻断键盘与世界更新，并禁止旧 `respawnPlayer()` 立即重生路径。该检查同时拒绝历史一次性 death patch workflow/script 出现在交付树。

该 contract 是针对主线 `7e2a4920...` 的真实回归新增：当时 static-checks 仍为绿色，但 Chromium 因 `#death-menu` 不存在而两条死亡用例同时失败。此后死亡 UI 的 DOM、状态机和工具清理不再只依赖浏览器阶段发现。

## Chromium browser smoke

```bash
npm install
npx playwright install chromium
npm run test:e2e
```

当前 smoke 使用固定世界名、seed `ci-browser-smoke-2026` 和 terrain prompt `海`，验证：

1. 主菜单→生存世界，HUD 与 WebGL Canvas 启动。
2. 世界经过 mesh Worker opaque/water 双 pass。
3. 真实水体触发 Oxygen HUD，`data-air` 明显下降。
4. 从 debug HUD 解析玩家 Y；Space 后上升、Shift 后下降。
5. `/tp 0 35 0` 离水，Oxygen HUD 恢复后隐藏。
6. 执行 `/weather rain`，debug 必须变为 `WeatherFX rain:446`。
7. 执行 `/weather thunder`，debug 必须变为 `WeatherFX thunder:720`。
8. 执行 `/weather clear`，debug 必须变为 `WeatherFX clear:0`。
9. WeatherSystem 在上述切换和逐帧 update 期间不得产生 pageerror / console error。
10. `/give minecraft:leather_chestplate 1`→真实 Equipment 拖放→护甲 HUD。
11. 暂停读取新鲜 IndexedDB：`version=5`、chest 正确、weather=`clear`，且没有持久化 oxygen。
12. 恢复→给予原木→传送虚空；`#death-menu` 必须进入 active，原因包含“虚空”，损失摘要包含“无法回收”。
13. 等待约 450 ms 后死亡界面必须仍然 active；发送 Escape 后也必须继续停在死亡界面，`#pause-menu` 不得 active，证明没有自动重生或暂停菜单绕过。
14. 点击“重生”后死亡界面关闭；随后 Escape 才能打开暂停菜单。
15. 读取重生后的新鲜 IndexedDB：Inventory=0、Equipment=0、XP=0、Player hp=20，位置回到可恢复出生点。
16. 全程无 pageerror / console error。

当前天气 browser smoke 验证的是命令→profile→固定池数量→主循环/Three.js 生命周期，不做截图像素比较；屋顶遮雨、雨滴碰撞、透明效果和不同 GPU 的实际像素结果仍是未覆盖边界。


### Recoverable death / pickup browser regression

第二条独立 Chromium 用例使用世界 `CI Recoverable Death`：

1. 创建 survival 世界并 `/tp 0 35 0` 到固定可恢复坐标。
2. `/give oak_log 3`，再 `/xp add 16`；当前总经验正好对应等级 2，然后执行标准 `/kill`。
3. `#death-menu` 必须 active，死亡原因包含“被杀死”，摘要必须同时包含“3 个物品”“14 点经验”和“死亡点”；14 来自 `Lv.2 × 7` 的现有死亡 XP 公式。
4. 显式点击“重生”，而不是依赖自动重生。
5. 记录拾取阶段时间，再 `/tp 0 35 0` 返回同一死亡坐标。
6. 等待真实 `DropSystem.update()` 运行；测试不直接写 Inventory 或 IndexedDB。
7. 暂停触发保存，只接受 `updatedAt >= pickupPhaseStartedAt` 的新鲜 world record。
8. 新快照中 `block:6` 总数必须重新达到 3，`totalXp=14`，Player hp=20 且位置仍有效；这证明 DropSystem 与 ExperienceOrbSystem 都通过真实更新链完成回收。
9. 全程无 pageerror / console error。

这条用例现在关闭“普通死亡物品 + XP 掉落→显式重生→返回死亡点→重新拾取/吸收”集成链。装备作为普通死亡掉落物的单独拾回断言仍未覆盖。

## GitHub Pages 部署验证

仓库 Pages Source 为 **GitHub Actions**。每个主线 squash 后必须同时核对 `Repository quality` 与 `Deploy GitHub Pages` 最终 success。

在线地址：`https://shrinkshi.github.io/Minecraft-Web-ByAI/`

## 仍未覆盖的浏览器集成边界

- 自动天气周期和 weather duration。
- 群系降水/雪、屋顶遮雨、雨线 world collision、地面 splash/湿润、闪电 flash/bolt/damage/sound。
- 天气粒子的像素级密度、blending、不同 GPU/浏览器表现。
- 完整 15 秒耗尽→真实 drowning damage→死亡/重生。
- 横向水中速度与陆地速度的浏览器定量对比。
- 冲刺游泳姿态、三维视线方向推进、爬行过渡、实体游泳 AI、水流/流体传播。
- Water surface blending、透明排序、深度冲突和水下 fog/折射。
- 真实敌对生物有/无护甲 HP 差值。
- Pointer Lock/F5/持续陆地移动的专门 E2E。
- 普通可恢复死亡的物品和 XP 球回收均已覆盖；装备掉落的单独可恢复死亡拾回断言仍未覆盖。
- 死亡界面“返回标题画面”按钮的专门 browser E2E；运行时会 force-save 已结算的 hp=0 状态，重新进入世界时由现有 startup fallback 自动回出生点。
- 死亡世界实体跨页面持久化、IndexedDB 配额/schema 迁移。
- Three.js 运行时仍依赖 jsDelivr。
