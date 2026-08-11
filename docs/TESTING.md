# 测试与验证记录

## 质量门结构

`Repository quality` 分两层执行：

1. `static-checks`：Node 22 语法、纯逻辑和 Worker 回归。
2. `browser-smoke`：真实 Chromium 中启动静态站并验证跨模块集成链。

PR 必须先通过 `static-checks`，随后才运行 `browser-smoke`。浏览器失败会保留 Playwright trace / screenshot / HTML report 目录。

## Node / Worker 自动检查

`npm run test:logic` 现在顺序执行：

```text
scripts/check.mjs
scripts/check-armor.mjs
```

基础套件覆盖 Inventory / Crafting / Commands / EntityStore / SpatialHash / 四种敌对生物 / Combat / Projectile / Experience / Spider / Death / Mesh Worker / Terrain Worker。

装备专用套件覆盖：

- `EQUIPMENT_SLOTS` 固定为 head/chest/legs/feet。
- 错误部位拒绝装备；正确部位可从 Inventory cursor 装入/取下。
- 皮革四件快照恢复后合计 7 护甲点。
- 非护甲或错误部位的旧/恶意快照会被过滤；stack count 强制归一为 1。
- `Equipment.drain()` 返回四槽副本并清空装备状态，用于死亡结算。
- 当前基础公式：0 点=0%，7 点=28%，20 点达到 80% 上限；10 点原始伤害在 7 点护甲下变为 7.2。
- 非法负伤害/负护甲参数拒绝。
- `/give minecraft:leather_chestplate 1` 正确进入 Inventory。

静态 CI 同时对 `src/*.js` 和 `scripts/*.mjs` 执行 `node --check`。

本地执行：

```bash
npm run test:logic
```

## Chromium browser smoke

```bash
npm install
npx playwright install chromium
npm run test:e2e
```

`scripts/serve.mjs` 是本地/CI 共用的跨平台静态服务器。当前 smoke 使用固定世界和 seed，验证：

1. 主菜单→单人世界→生存模式创建世界，HUD 与 WebGL Canvas 正常启动。
2. 真实聊天输入 `/give minecraft:leather_chestplate 1`。
3. 通过 E 打开真实背包，点击 Inventory slot 0，再点击 chest Equipment 槽完成装备。
4. Equipment chest 槽显示“皮革外套”；护甲 HUD 出现 1 个 full + 1 个 half 图标，对应 3 护甲点。
5. 关闭背包→暂停→读取 **新鲜** IndexedDB 快照，确认逻辑快照 `version=5` 且 `equipment.slots.chest.id=leather_chestplate`。
6. 恢复游戏，执行 `/give oak_log 3` 和 `/tp 0 -20 0`。
7. 等待虚空死亡/重生，再暂停并读取死亡阶段之后的新快照。
8. 最终断言：36 格背包占用=0、四个 Equipment 槽占用=0、`totalXp=0`、玩家已重生到 `y > -10`。
9. 整个流程没有未捕获 `pageerror` 或 console error。

IndexedDB 断言使用 `updatedAt >= 阶段开始时间`，防止把阶段之前的旧 autosave 误当成通过结果。

CI 固定 `workers=1`，当前只安装 Chromium。

## GitHub Pages 部署验证

仓库 Pages Source 已设置为 **GitHub Actions**。主线每个 squash 后必须同时核对 `Repository quality` 和 `Deploy GitHub Pages` 最终为 success。

在线地址：`https://shrinkshi.github.io/Minecraft-Web-ByAI/`

## 仍未覆盖的浏览器集成边界

- 真实敌对生物造成伤害时，对比无护甲/有护甲的 HP 差值；当前减伤数值由 Node 规则测试覆盖，Chromium 只验证装备/持久化/死亡清算。
- Pointer Lock、F5 三视角和持续移动。
- 不同 GPU/浏览器驱动的 WebGL 材质/纹理兼容性。
- 被动生物与四种敌对生物在真实地形上的视觉/AI表现。
- 骷髅箭矢、苦力怕爆炸、蜘蛛追击的完整战斗链。
- 普通可恢复死亡的物品/经验/护甲实体生成和重新拾取；当前 browser smoke 验证的是虚空直接损失路径。
- Armor durability、Java armor+toughness、附魔、更多材质和自动 Shift-equip。
- 掉落物和经验球大量存在时的性能。
- 死亡掉落/经验球目前不持久化；页面重载会丢失尚未回收的这些世界实体。
- IndexedDB 事务失败、配额、schema 迁移和长期兼容性。
- Three.js 仍从 jsDelivr 运行时加载，CDN 不可用仍会影响网站和 browser smoke。
