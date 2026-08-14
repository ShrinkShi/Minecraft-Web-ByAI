# 创造模式服务器权威方块破坏

`v0.4.0-dev` 的这一增量让多人服务器第一次真正执行方块交互，同时继续拒绝客户端提供方块坐标。

执行链路：客户端沿用现有 `PlayerControlFrame.primary` 和绝对视角；primary 按下/释放边沿会立即 flush，避免在浏览器帧内被连续状态合并；服务器在已校验 control 输入到达时锁存 primary 上升沿；下一次权威 tick 完成玩家模拟后，`CreativeBlockBreakController` 使用服务器 position/yaw/pitch 计算 `raycastAuthoritativeBlock()`；破坏再由 `applyAuthoritativeBlockBreak()` 校验，并且只能经过 runtime 的 replicated `setBlock` 边界提交与广播。

控制器为每个 session 保存 held latch 和有上限的 pending press 队列。一次 `false -> true -> false` 即使完整发生在两个 20 Hz tick 之间，也会保留一次待消费操作；持续按住不会按 tick 连续删除方块；释放后才能形成新的上升沿。待处理队列有固定上限，避免输入洪泛转化为无界内存增长。断开连接或 runtime 关闭会同时清理 latch 与 pending press。

只有权威玩家模式为 `creative` 时，消费到的 press 才能执行方块破坏。survival/adventure/spectator 不执行；一次在非 creative 状态下已经消费的按下不会因为之后切换模式而重新出现。

当前明确不包含 survival/adventure 挖掘计时、hardness/工具效率、正确工具与掉落、服务端 Inventory/Equipment、方块放置/使用、实体战斗以及客户端 prediction/reconciliation。这些能力后续仍必须以服务器权威状态为基础，不能通过接受客户端 target 坐标绕过。

回归覆盖包括：creative 服务器射线破坏、持续按住去重、tick 间短点击锁存、模式限制、session 清理、pending 队列上限、畸形输入，以及客户端 primary 边沿立即发送而普通连续移动仍保持 coalescing。
