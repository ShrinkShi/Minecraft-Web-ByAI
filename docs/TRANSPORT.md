# 实时输入传输层约束

本文只定义 `PlayerControlFrame` / `PlayerViewFrame` / `PlayerActionFrame` 外面的传输封装与顺序语义，不定义真实 WebSocket/WebTransport 连接、认证、房间、服务器世界模拟或 replication。

## 1. v1 传输假设

`ClientInputEnvelope v1` 只面向**可靠、有序、单流**的客户端→服务器输入通道。首个真实 transport 默认应使用 WebSocket 或等价的可靠有序 stream。

不要直接把本协议放到 WebTransport datagram / UDP 风格无序通道上。全局 `packetSeq` 的设计依赖消息按发送顺序到达；未来如果需要 datagram，应另定义 channel-specific ordering、缺包处理和依赖缓存策略，而不是偷偷复用 v1。

## 2. Wire schema

`src/client-input-envelope.js` 定义：

```text
{
  v: 1,
  session: "server-issued-epoch",
  packetSeq: uint32,
  kind: "control" | "view" | "action",
  payload: PlayerControlFrame | PlayerViewFrame | PlayerActionFrame
}
```

v1 顶层只能出现这 5 个字段。未知字段、版本、kind、类型伪装或不匹配的嵌套 payload 都必须拒绝。

### session

`session` 是服务端为一次 join/reconnect/world-session 分配的**非秘密 epoch 标识**，不是身份认证凭证，也不是 bearer token。

约束：

- 1..64 个安全 ASCII 字符；
- 当前允许字母、数字、`.`、`_`、`:`、`-`；
- reconnect / 重新加入世界时服务端分配新的 session；
- 服务端处理实时输入前必须把 envelope session 与当前连接绑定的 expected session 比较；
- auth token、cookie、密码、refresh token 不进入 ClientInputEnvelope。

认证应由未来独立 handshake/session establishment 层完成，不能把 `session` 字符串误当安全边界。

### packetSeq

`packetSeq` 是**当前 session 内、跨 control/view/action 的全局 uint32 发送序号**。

它与内层 frame 的 `seq` 不是一回事：

- `packetSeq`：传输层全局消息顺序、重复/陈旧 envelope 检测；
- `PlayerControlFrame.seq`：连续控制帧自己的语义序号；
- `PlayerViewFrame.seq`：绝对视角帧自己的语义序号；
- `PlayerActionFrame.seq`：离散 gameplay action 自己的语义序号；
- `PlayerActionFrame.viewSeq`：use/drop 对某个 absolute view 的显式依赖。

不要为了“少一个数字”把这些序号合并。它们解决的问题不同，后续 prediction/reconciliation、action→view 关联和 transport replay detection 都会依赖这种分层。

## 3. uint32 顺序比较

`src/network-sequence.js` 使用标准模 2^32 半区间比较：

- 相同序号：duplicate，不是 newer；
- `0xffffffff -> 0`：合法回绕，0 是更新值；
- forward distance 在 `1..0x7fffffff`：newer；
- forward distance 为 `0x80000000`：恰好半圈，顺序歧义，不能当 newer；
- 更大的 forward distance：视为 stale/older。

`NetworkSequenceGate` 只在消息被接受时推进 `last`。session 重置会同时重置 gate。

这套规则防止简单的数值 `candidate > last` 在 uint32 回绕后失效。

## 4. ClientInputSessionGate

`ClientInputSessionGate` 是未来 server connection state 的最小纯逻辑原型：

1. 先严格 decode envelope；
2. envelope session 必须等于当前连接的 expected session；
3. 用全局 `packetSeq` gate 拒绝 duplicate / stale envelope；
4. 通过后才把嵌套 control/view/action 交给后续 authoritative gameplay 校验。

当前 gate 不做：

- 用户身份认证；
- rate limiting；
- 权限/游戏模式验证；
- reach/raycast/cooldown/inventory 检查；
- action 的 view history 缓存；
- movement prediction/reconciliation；
- 网络断线重连策略。

这些职责必须留在后续层，而不是塞进 codec。

## 5. 为什么 envelope 不能携带 target/auth/device

v1 顶层以及既有嵌套 frame 都拒绝：

- `device` / `source` / User-Agent；
- client-supplied block/entity target；
- auth token / password / cookie；
- DOM/PointerEvent/TouchEvent 数据。

平台无关性已经由 control/view/action codec 保证；authoritative target 必须由服务端基于 authoritative position + accepted view 自行 raycast；认证凭证应存在于连接建立阶段。

## 6. 发送顺序建议

未来可靠有序客户端发送器应维护一个 session-scoped `packetSeq`，每发出一个 realtime envelope 加 1 并允许 uint32 回绕。

同一逻辑 tick 内，如果 action 依赖刚变化的视角，发送顺序应为：

```text
view envelope
control envelope（如有变化/采样）
action envelope（引用前面的 viewSeq）
```

由于 v1 transport 是可靠有序流，服务器会先收到被 action 引用的 view。若未来迁移到无序 datagram，这个假设立即失效，必须设计 view cache / dependency buffering / channel sequence；不能仅修改底层 socket 类型。

## 7. 当前完成边界

已完成：

- strict ClientInputEnvelope v1 codec；
- strict session id；
- uint32 modular sequence utilities；
- session packet gate；
- control/view/action 嵌套 schema 复用；
- duplicate/stale/session mismatch/extra field/client target/auth-field 注入回归。

尚未完成：

- 真实 WebSocket server/client；
- handshake / server-issued session 创建；
- authentication / room / world join；
- server-authoritative simulation；
- state snapshot/delta replication；
- reconnect/resume；
- rate limit / abuse protection；
- latency compensation；
- WebTransport datagram 协议。

因此本阶段仍然是**transport contract foundation**，不能宣称“多人联机已经实现”。
