# 创造模式服务器权威方块破坏

`v0.4.0-dev` 的这一增量让多人服务器第一次真正执行方块交互，同时继续拒绝客户端提供方块坐标。

执行链路：客户端沿用现有 `PlayerControlFrame.primary` 和绝对视角；服务器从已校验输入与权威玩家快照取得状态；`CreativeBlockBreakController` 只在 creative 模式的 primary 上升沿触发；目标由 `raycastAuthoritativeBlock()` 使用服务器 position/yaw/pitch 计算；破坏由 `applyAuthoritativeBlockBreak()` 重新校验，并且只能经过 runtime 的 replicated `setBlock` 边界提交与广播。

控制器为每个 session 保存 held latch。第一次 `false -> true` 只尝试一次；持续按住不会按 20 Hz tick 连续删除方块；释放后才能再次触发。断开连接或 runtime 关闭会清理 latch。survival 中按住 primary 再切到 creative 也不会凭空产生一次点击。

当前明确不包含 survival/adventure 挖掘计时、hardness/工具效率、正确工具与掉落、服务端 Inventory/Equipment、方块放置/使用、实体战斗以及客户端 prediction/reconciliation。这些能力后续仍必须以服务器权威状态为基础，不能通过接受客户端 target 坐标绕过。

回归脚本 `scripts/check-creative-authoritative-break.mjs` 覆盖 idle、按下、持续按住、释放重按、模式限制、session 清理、服务器射线目标以及畸形输入边界。
