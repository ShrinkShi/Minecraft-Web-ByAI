# 多人服务器权威 Inventory 初始同步

这一阶段消除多人客户端启动时最后一处明显的背包“双真相”：客户端不再根据 mode 自己生成初始创造背包，而是在进入 gameplay runtime 前等待服务器发来严格的 36 格 Inventory snapshot。

## Wire contract

`server-inventory-snapshot.js` 定义 `inventory-snapshot v1`：

- `session`：必须与当前 WebSocket session 一致；
- `revision`：uint32 Inventory revision；
- `mode`：survival / creative / adventure / spectator；
- `slots`：严格 36 格；
- 每格只能是 `null` 或 `[itemId,count]`；
- item id 必须来自当前 `ITEMS`；
- count 必须是正整数且不能超过该物品 `maxStack`；
- 拒绝额外字段。

初始创造背包由服务器的 `ServerPlayerInventoryState` 生成，初始 revision 为 0。服务端成功 `add/remove` 时 revision 才推进；no-op mutation 不推进。

## Bootstrap barrier

多人 bootstrap 现在必须同时拿到四部分状态才能进入 ready：

1. `world-info`；
2. 完整 `world-edit-sync`；
3. `inventory-snapshot`；
4. 初始 `player-snapshot`。

四者的 session 必须一致，world edit 的 world id 必须匹配，Inventory mode 还必须与初始 player mode 一致。缺少 Inventory 时即使玩家位置和世界已经同步，也不能启动 gameplay runtime。

## Client runtime

`createAuthoritativeMultiplayerGameplay()` 将服务器 Inventory snapshot 直接作为 `Inventory` 恢复状态，不再传 `inventoryState:null` 让 creative 客户端自行 seed。

这意味着后续工具判定、放置消耗、掉落拾取可以围绕服务器 revision 继续扩展，而不需要再处理“客户端启动背包和服务器启动背包碰巧相同”的隐含假设。

## 当前边界

本阶段只做初始 snapshot 与 revision 基础，暂不实现：

- mutation 后的 live Inventory snapshot/delta；
- 服务器权威地面掉落实体；
- multiplayer 拾取；
- survival 挖掘掉落；
- survival 放置扣除；
- crafting / equipment transaction。

下一阶段应先建立服务器权威 item drop / pickup 与 Inventory revision reconciliation，再接 survival mining/tool/harvest。