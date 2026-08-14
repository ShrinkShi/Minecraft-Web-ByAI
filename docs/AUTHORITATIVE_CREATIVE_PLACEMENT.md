# 创造模式服务器权威方块放置

多人创造模式的普通方块右键放置已经形成完整客户端到服务器链路。客户端不提交目标坐标，也不在本地先修改世界；它只提交现有 `use` action，最终世界变化仍来自服务器广播的 `world-block-change`。

## 输入时序

`use` action 引用一个服务端接受过的 view。`ServerPlayerInputState` 在 action 通过 sequence gate 并进入队列时，还会内部快照当时的 `selectedSlot`。

因此，如果同一个 20 Hz tick 之间发生：

1. 玩家看向北方并选择方块；
2. 发送 `use`；
3. 马上转向东方；
4. 马上切到镐子；
5. 服务器才执行下一 tick；

该 `use` 仍使用第 1/2 步时被冻结的 view 与 hotbar slot，而玩家移动模拟本身可以使用更新后的 live view。后来的输入不能改写旧 action 的语义。

## 客户端路由

`ControlIntentBus` 支持可注册、可注销的 action interceptor。多人 gameplay adapter 在自己的生命周期内安装一个仅处理创造模式 `secondary` 的 interceptor：

- 桌面鼠标右键和移动端 use 按钮继续产生同一个 `secondary` intent；
- 创造模式下，该 intent 调用现有 `movement.sendUse()`，并使用当前本地 yaw/pitch 建立 action 引用 view；
- 已处理的 intent 不再进入 `main.js` 中旧的“联机放置尚未接入” fallback，也不会执行单机 `secondaryAction()`；
- 非创造模式继续落回旧 fallback，直到 survival/adventure 放置语义完成；
- multiplayer runtime dispose 时 interceptor 会幂等注销，防止离开服务器后污染单机输入。

## 服务端执行链路

- production runtime 每个权威 tick 最多消费 4 个 queued interaction actions；
- 当前只有 `use` 被实现，其他 action 被安全消费并标记 unsupported；
- 仅 `creative` 模式允许放置；
- item 必须来自服务器自有 Inventory，并且 item 定义必须拥有普通 `blockId`；
- bed 等特殊 placeKind 暂不通过普通方块路径放置；
- target 由服务器使用当前权威 position + action 冻结的 view 做 6 格 voxel DDA；
- placement cell 必须是 target 的相邻 previous cell、仍为空气、且不能与玩家碰撞体重叠；
- anchor 必须仍与 raycast target 的 block id 一致，防止陈旧 target；
- 工作台和床属于交互型目标。在其 use 语义尚未服务端化前，右键这些目标会被明确拒绝，而不是错误退化成在旁边放置方块；
- mutation 只能经过 runtime replicated `setBlock` 边界，因此 revision 和 `world-block-change` 广播继续由同一通道负责。

## 暂不包含

- survival/adventure 放置与物品扣除；
- bed 双格放置；
- 工作台/床等 use 行为；
- inventory 网络同步；
- placement prediction/reconciliation。

## 回归重点

真实 WebSocket 集成测试在一个 tick 内依次发送：旧 view、use、新 view、hotbar-select 到镐子。下一 tick 的 player snapshot 应反映新 view，但 world mutation 必须仍按旧 view 与 use 当时的方块槽放置，用来防止 action 被后来的输入重解释。

客户端侧逻辑回归同时覆盖 interceptor 的创造模式拦截、非创造 fallback、transport 不可用、当前视角快照、生命周期注销以及多个 interceptor 的透传语义；服务端另有交互型目标 guard 回归。
