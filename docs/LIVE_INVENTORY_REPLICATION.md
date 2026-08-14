# 多人 Inventory 实时服务器同步

初始 Inventory bootstrap 只能保证“进服时没有双真相”。本阶段把同一个 `inventory-snapshot v1` 扩展为 revision 驱动的实时服务器同步，使后续拾取、掉落和生存放置扣除有可靠的客户端 reconciliation 通道。

## 服务端 mutation 边界

`ServerPlayerInventoryState` 仍然是唯一物品真相。production runtime 新增明确的 mutation wrapper：

- `addInventoryItem(session,id,count)`；
- `removeInventoryItem(session,slot,count)`；
- `syncInventory(session)`。

成功 mutation 推进 Inventory revision 后，runtime 立即向该 session 发送完整 36 格 `inventory-snapshot`。no-op 不产生新 revision，也不发送伪更新。若 mutation 已提交但网络发送失败，服务器状态不会回滚；失败通过 runtime observer 报告。

## 客户端顺序规则

`MultiplayerWebSocketClient` 为 Inventory 使用独立 `NetworkSequenceGate`：

- 第一条 snapshot 建立 revision 基线；
- 后续只接受严格更新的 revision；
- 重复或陈旧 revision 属于协议错误并关闭连接；
- session、item id、stack size 和 36 格结构继续由 `inventory-snapshot v1` 严格校验。

Inventory revision 不与 player tick 或 world revision 混用。

## Movement / gameplay reconciliation

`MultiplayerSessionBootstrap` 会持续转发后续 Inventory snapshot。`MultiplayerMovementSession` 保存最新克隆状态，并支持 `attachInventoryApplier()`：

- runtime 尚未创建时收到的最新状态会保留；
- gameplay runtime attach 后立即 replay 最新状态；
- 后续 revision 实时传给 client `Inventory`；
- detach / disconnect 清理 applier，避免跨世界污染。

客户端 `Inventory.replaceSnapshot()` 会整体替换 36 格状态、清除陈旧 cursor，并通知订阅者。它不把客户端修改回传服务器。

## 当前验证

除逻辑与真实 WebSocket 回归外，Playwright 会启动 production authoritative server：浏览器以创造模式进服后初始快捷栏第 1 格由服务器同步；测试随后直接在服务器移除该格，浏览器必须从 Inventory revision 0 更新到 1，并让本地 Inventory 对应 slot 变为空。

## 下一阶段

仍未实现服务器权威地面 item entity。下一步应建立：

1. server item drop entity / id / lifetime；
2. 掉落生成与玩家附近拾取判定；
3. 拾取成功走 `addInventoryItem()`；
4. 客户端复制掉落实体；
5. 然后接 survival mining 的工具、hardness、harvest 与 drop 生成。
