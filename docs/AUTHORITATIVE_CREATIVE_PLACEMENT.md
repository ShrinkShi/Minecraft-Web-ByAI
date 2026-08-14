# 创造模式服务器权威方块放置

这一增量建立多人服务器的 `use -> block placement` 执行边界。它先完成后端权威语义，客户端右键入口将在独立窄 PR 中启用，避免把大体量 `src/main.js` 的 UI 改动混入服务端规则审查。

## 输入时序

`use` action 已经引用一个服务端接受过的 view。现在 `ServerPlayerInputState` 在 action 通过 sequence gate 并进入队列时，还会内部快照当时的 `selectedSlot`。

因此，如果同一个 20 Hz tick 之间发生：

1. 玩家看向北方并选择方块；
2. 发送 `use`；
3. 马上转向东方；
4. 马上切到镐子；
5. 服务器才执行下一 tick；

该 `use` 仍使用第 1/2 步时被冻结的 view 与 hotbar slot，而玩家移动模拟本身可以使用更新后的 live view。后来的输入不能改写旧 action 的语义。

## 执行链路

- production runtime 每个权威 tick 最多消费 4 个 queued interaction actions；
- 当前只有 `use` 被实现，其他 action 被安全消费并标记 unsupported；
- 仅 `creative` 模式允许放置；
- item 必须来自服务器自有 Inventory，并且 item 定义必须拥有普通 `blockId`；
- bed 等特殊 placeKind 暂不通过普通方块路径放置；
- target 由服务器使用当前权威 position + action 冻结的 view 做 6 格 voxel DDA；
- placement cell 必须是 target 的相邻 previous cell、仍为空气、且不能与玩家碰撞体重叠；
- anchor 必须仍与 raycast target 的 block id 一致，防止陈旧 target；
- mutation 只能经过 runtime replicated `setBlock` 边界，因此 revision 和 `world-block-change` 广播继续由同一通道负责。

## 暂不包含

- survival/adventure 放置与物品扣除；
- bed 双格放置；
- 工作台/床等 use 行为；
- inventory 网络同步；
- 客户端右键入口（下一独立 PR）；
- placement prediction/reconciliation。

## 回归重点

真实 WebSocket 集成测试会在一个 tick 内依次发送：旧 view、use、新 view、hotbar-select 到镐子。下一 tick 的 player snapshot 应反映新 view，但 world mutation 必须仍按旧 view 与 use 当时的方块槽放置，用来防止 action 被后来的输入重解释。
