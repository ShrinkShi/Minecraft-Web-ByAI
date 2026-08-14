# 多人生存模式服务器权威放置

本阶段把多人 survival 的普通方块右键放置接入服务器权威世界与服务器 Inventory。客户端只发送带引用视角和当时 selected hotbar slot 的 `use` action；服务器决定目标、放置位置、碰撞是否合法，并且只在世界 mutation 成功后消耗物品。

## 事务顺序

成功放置必须同时满足两个事实：

1. 世界中的目标相邻格从 AIR 变成所选方块；
2. 服务器 Inventory 中该快捷栏堆叠减少 1，并推进一次 Inventory revision。

为避免“先扣物品再发现放不下”，`ServerPlayerInventoryState.commitSelected()` 提供同步事务边界：

- 先重新确认 selected slot 仍然存在、item id 与数量仍符合预期；
- 在 Inventory 尚未修改时执行世界 placement callback；
- callback 返回 `changed:false`、抛异常、选中物变化或数量不足时，Inventory 完全不动，revision 不推进；
- 只有 callback 明确返回 `changed:true`，才在同一调用栈中扣除指定数量并推进 revision。

生产 runtime 随后立即复制新的完整 Inventory snapshot。服务器世界仍是唯一世界真相，服务器 Inventory 仍是唯一物品真相。

## 放置规则

`SurvivalBlockUseController` 复用已有 `applyAuthoritativeBlockPlacement()` 与服务器 DDA raycast，因此包含已有的：

- 6 格交互距离；
- use action 自己引用的 yaw/pitch，而不是之后的新视角；
- action 接收时快照的 selected hotbar slot，而不是之后的新选择；
- stale target 检查；
- 只能放在被命中方块的相邻 AIR；
- 玩家碰撞盒占位检查；
- 液体/空气等不可作为普通放置物；
- mutation declined 时不消耗 Inventory。

当前只接受 `ITEMS[itemId].blockId` 的普通方块物品。床和工作台等交互目标仍沿用“暂不支持该交互目标”的边界；床物品自身也没有被本阶段错误地当成普通 block item。

## 模式行为

- survival：服务器放置成功后消耗 1 个物品；失败不消耗；
- creative：继续使用已有 creative controller，放置不消耗；
- adventure / spectator：本阶段不自动进入 survival 放置路径。

多人客户端的 scoped secondary interceptor 现允许 creative 与 survival 右键进入服务器 `use` action。离开多人 runtime 后 interceptor 被释放，单人右键逻辑保持原样。

## 验证

测试覆盖：

- Inventory transaction callback 拒绝/抛错/选中物变化时不扣物品、不推进 revision；
- controller 成功放置只扣 1，碰撞失败不扣；
- 真实 WebSocket：有效 use 产生 world-block-change + Inventory revision/count 变化，下一次碰撞失败时两类 revision 都保持稳定；
- Chromium：服务器先生成 2 个泥土地面物品，浏览器真实拾取到快捷栏，再真实右键放置，客户端世界更新且数量 2→1；第二次失败放置仍保持 1。

## 后续

仍未包含：

- 床的双方块方向/睡眠状态；
- 工作台、容器等交互界面的多人事务；
- 方块朝向、半砖/楼梯等 placement state；
- multiplayer mining progress/crack feedback；
- 工具耐久与更完整 harvest tier。
