# 服务端权威输入状态

本文定义 WebSocket/session 层之后、真正玩家物理模拟之前的服务端输入边界。

当前服务器已经能够严格接收 `ClientInputEnvelope`，但仅校验 envelope 的 `packetSeq` 仍然不够。攻击者可以构造一个全新的 envelope packetSeq，同时在 payload 中重复旧的 `PlayerActionFrame.seq`，从而尝试重放同一个语义动作。

因此服务端必须同时维护两层顺序：

```text
ClientInputEnvelope.packetSeq
  -> transport/session replay gate
  -> decoded Control/View/Action payload
  -> per-kind semantic sequence gate
  -> server-owned input state / action queue
```

## 1. 三个独立语义序号

每个 session 独立维护：

- control sequence gate；
- view sequence gate；
- action sequence gate。

它们全部使用已有 uint32 模 2^32 半区间比较，因此允许：

```text
0xffffffff -> 0
```

但拒绝 duplicate / stale sequence。

不能只使用一个共享 inner sequence：control、view、action 的产生频率和用途不同，未来 prediction/reconciliation 也需要分别追踪。

## 2. 最新连续输入

服务器保存最后一个被接受的：

```text
control
view
```

control 包括规范化 side/forward 以及 jump/sneak/sprint/primary。

view 是 absolute yaw/pitch。它不是 MouseEvent/touch delta，也不含设备来源。

这些状态目前只是 authoritative simulation 的输入，还不是 authoritative position/velocity。

## 3. 有限视角历史

`use` 和 `drop` 的 `PlayerActionFrame` 引用 `viewSeq`。

服务端不能只看“当前最新 view”，否则在一个 tick 中：

```text
view A
use(view A)
view B
```

如果处理时只取最新值，use 可能错误使用 B。

因此每个 session 保存有限 view history，默认最多 64 个 accepted view。

只有 `viewSeq` 仍存在于服务器自己的 history 中，`use/drop` 才能进入动作队列。

以下情况直接拒绝：

- client 从未发送/服务端从未接受该 view；
- view 已因历史窗口上限被淘汰；
- action sequence 已经处理过；
- action queue 已满。

客户端仍然不能传 block/entity target 来绕开这条规则。

## 4. 有界离散动作队列

当前只有需要世界语义处理的：

```text
use
drop
```

进入 pending action queue。

`hotbar-select` 是服务器输入状态的一部分，直接更新 `selectedSlot`，不占世界动作队列。

动作队列默认最多 64 项。满时拒绝新动作，而不是无限增长。

未来固定步长 authoritative simulation 应主动：

```text
drainSessionActions(session)
```

处理完成的 use/drop。

## 5. resolved view

排入服务器动作队列的 use/drop 不只保存 `viewSequence`，还保存当时由服务器 history 解析出的 yaw/pitch 副本。

例如：

```text
{
  kind: "use",
  sequence: 42,
  viewSequence: 37,
  view: {
    yaw: ...,
    pitch: ...,
    sequence: 37
  }
}
```

未来 raycast 应使用这个服务器解析出的 view 与 authoritative player position，而不是再向客户端询问命中目标。

## 6. Session 生命周期

ServerWelcome 成功后创建：

```text
ServerPlayerInputState(session)
```

连接关闭后立即删除。

服务器同时拒绝重复的 active session id，避免自定义 sessionFactory 意外生成相同 ID 后形成身份/状态冲突。

读取 API：

```text
getSessionInputState(session)
```

只返回克隆后的 snapshot。

动作读取：

```text
drainSessionActions(session, limit?)
```

返回克隆后的队列项并从服务器队列移除。

调用方不能通过修改返回对象反向修改服务器内部状态。

## 7. 两层 replay guard 的区别

示例：

第一次合法消息：

```text
packetSeq = 10
action.seq = 5
```

攻击者随后发送：

```text
packetSeq = 11
action.seq = 5
```

外层 packetSeq=11 是新的，因此 transport gate 会通过。

但 action.seq=5 已经处理，所以 semantic action gate 必须拒绝。

这正是本阶段新增的安全边界。

## 8. 当前仍不是什么

`ServerPlayerInputState` 不是完整玩家实体，也不能把当前工程描述为“服务端权威多人游戏已经完成”。

当前仍未实现：

- authoritative position / velocity；
- 重力、碰撞、跳跃、游泳服务端模拟；
- 固定 tick server loop；
- player state snapshot/delta；
- remote player interpolation；
- block/entity authoritative mutation；
- inventory transaction；
- room/world join；
- authentication / persistence；
- rate limiting。

下一层应该是固定步长的最小 authoritative player simulation，并先只处理移动/视角，不要立即把整个单机 `World` 搬到服务器。
