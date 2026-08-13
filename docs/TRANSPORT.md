# 实时输入传输层约束

本文定义 `PlayerControlFrame` / `PlayerViewFrame` / `PlayerActionFrame` 外面的输入封装、顺序语义，以及当前第一版浏览器 WebSocket hello/welcome 客户端边界。它仍不代表多人世界同步已经完成。

## 1. v1 传输假设

`ClientInputEnvelope v1` 只面向**可靠、有序、单流**的客户端→服务器输入通道。当前第一版连接实现采用浏览器 WebSocket，子协议固定为：

```text
minecraft-web-v1
```

不要直接把本协议放到 WebTransport datagram / UDP 风格无序通道上。全局 `packetSeq` 的设计依赖消息按发送顺序到达；未来如果需要 datagram，应另定义 channel-specific ordering、缺包处理和依赖缓存策略，而不是偷偷复用 v1。

## 2. ClientInputEnvelope v1

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

`session` 是服务端为一次成功握手分配的**非秘密 epoch 标识**，不是身份认证凭证，也不是 bearer token。

约束：

- 1..64 个安全 ASCII 字符；
- 当前允许字母、数字、`.`、`_`、`:`、`-`；
- reconnect / 重新加入时必须通过新的握手获得新 session；
- 服务端处理实时输入前必须把 envelope session 与当前连接绑定的 expected session 比较；
- auth token、cookie、密码、refresh token 不进入 ClientInputEnvelope。

未来认证必须存在于独立身份/连接建立层，不能把 `session` 字符串误当安全凭证。

### packetSeq

`packetSeq` 是**当前 session 内、跨 control/view/action 的全局 uint32 发送序号**。

它与内层 frame 的 `seq` 不是一回事：

- `packetSeq`：传输层全局消息顺序、重复/陈旧 envelope 检测；
- `PlayerControlFrame.seq`：连续控制帧自己的语义序号；
- `PlayerViewFrame.seq`：绝对视角帧自己的语义序号；
- `PlayerActionFrame.seq`：离散 gameplay action 自己的语义序号；
- `PlayerActionFrame.viewSeq`：use/drop 对某个 absolute view 的显式依赖。

不要为了“少一个数字”把这些序号合并。它们分别服务于 transport replay detection、prediction/reconciliation 和 action→view 关联。

## 3. uint32 顺序比较

`src/network-sequence.js` 使用模 2^32 半区间比较：

- 相同序号：duplicate，不是 newer；
- `0xffffffff -> 0`：合法回绕，0 是更新值；
- forward distance 在 `1..0x7fffffff`：newer；
- forward distance 为 `0x80000000`：恰好半圈，顺序歧义，不能当 newer；
- 更大的 forward distance：视为 stale/older。

`NetworkSequenceGate` 只在消息被接受时推进 `last`。session 重置会同时重置 gate。这防止简单的 `candidate > last` 在 uint32 回绕后失效。

## 4. ClientInputSessionGate

`ClientInputSessionGate` 是未来 server connection state 的纯逻辑输入 gate：

1. 先严格 decode envelope；
2. envelope session 必须等于当前连接的 expected session；
3. 用全局 `packetSeq` gate 拒绝 duplicate / stale envelope；
4. 通过后才把嵌套 control/view/action 交给 authoritative gameplay 校验。

当前 gate 不做用户认证、rate limiting、权限/模式、reach/raycast/cooldown/inventory、view history、prediction 或断线恢复。

## 5. WebSocket hello / welcome v1

`src/multiplayer-handshake.js` 与 `src/websocket-client.js` 实现第一版**客户端连接/握手骨架**。

连接状态：

```text
idle
  -> connecting
  -> handshaking
  -> ready
```

失败/退出状态：

```text
rejected | closed | error
```

### WebSocket 子协议

客户端创建 WebSocket 时必须请求：

```text
minecraft-web-v1
```

`open` 事件出现后仍要检查服务器实际协商的 `socket.protocol`。为空或不是 `minecraft-web-v1` 时按协议错误关闭，不能“连上了就算兼容”。

### ClientHello

WebSocket 协商成功后客户端首先发送：

```json
{"v":1,"kind":"hello"}
```

字段必须完全匹配 schema。设备类型、User-Agent、token、用户名或本地世界状态都不进入该消息。

### ServerWelcome

服务端接受连接时返回：

```json
{"v":1,"kind":"welcome","session":"server-issued-session"}
```

只有严格通过 decoder 的 welcome 才会让客户端进入 `ready`：

- 保存 server-issued session；
- 把本 session 的 `packetSeq` 重置为 0；
- 此后才允许 `sendInput(control|view|action)`。

ready 之前调用 `sendInput()` 必须失败。

### ServerReject

当前只允许有限拒绝码：

- `protocol-mismatch`
- `server-full`
- `world-unavailable`
- `policy`

拒绝消息没有任意服务端错误文本，避免把内部异常、数据库错误或敏感状态直接变成 wire contract。

## 6. URL / 安全边界

`MultiplayerWebSocketClient` 默认只接受 `wss://`。

`ws://` 只有调用方显式设置 `allowInsecure=true` 才允许，用于受控开发环境。生产 HTTPS 页面不得默认降级到明文 WebSocket。

URL 中嵌入 `user:password@host` 一律拒绝。身份认证如果未来加入，应走单独安全握手，不应放在 URL、ClientHello 或 ClientInputEnvelope 里。

## 7. 握手超时与协议错误

默认握手超时为 5000 ms，可配置范围 250..60000 ms。

以下情况不会进入 ready：

- 子协议未协商或错误；
- welcome/reject 非 JSON 文本；
- JSON schema 错误、额外字段、版本错误；
- welcome session 非法；
- 超时未收到合法 welcome/reject。

协议错误使用 WebSocket protocol close；握手超时使用应用关闭码 4000。

当前 ready 后如果服务器继续主动发消息，客户端也会按“未定义 server→client schema”处理为协议错误。这是刻意的：在正式 replication schema 落地前，不接受未建模的服务器消息。

## 8. ready 后的输入发送

`MultiplayerWebSocketClient.sendInput(kind,payload)` 只复用已经严格定义的：

- `PlayerControlFrame`
- `PlayerViewFrame`
- `PlayerActionFrame`
- `ClientInputEnvelope`

每次发送都会使用当前 server-issued session 和当前 `packetSeq`，成功写入 socket 后再通过 `nextNetworkSequence()` 增加序号并支持 uint32 回绕。

同一逻辑 tick 内，如果 action 依赖刚变化的视角，建议发送：

```text
view envelope
control envelope（如有变化/采样）
action envelope（引用前面的 viewSeq）
```

由于当前 v1 是可靠有序 WebSocket stream，服务器可依赖发送顺序。未来切换无序 datagram 时必须重新设计 dependency buffering / channel ordering。

## 9. 当前完成边界

已完成：

- strict ClientInputEnvelope v1 codec；
- strict session id；
- uint32 modular sequence utilities；
- session packet gate；
- control/view/action 嵌套 schema 复用；
- strict ClientHello / ServerWelcome / ServerReject schema；
- WebSocket 子协议协商检查；
- 浏览器 WebSocket 客户端状态机；
- wss 默认策略与显式 insecure override；
- 握手超时与错误关闭；
- welcome 后 session/packetSeq 初始化；
- ready-state `sendInput()`；
- FakeSocket 自动回归覆盖 malformed/reject/timeout/subprotocol/URL/输入发送边界。

尚未完成：

- 真实 WebSocket server/listener；
- authentication / account identity；
- room / world join；
- server-authoritative simulation；
- server→client state snapshot/delta replication；
- remote player/entity/block rendering；
- reconnect/resume；
- heartbeat；
- rate limit / abuse protection；
- latency compensation；
- WebTransport datagram 协议；
- multiplayer 菜单/UI。

因此本阶段是**真实 WebSocket 客户端握手 foundation**，不是“多人联机已经完成”。下一步应实现最小 Node WebSocket server + 同一 handshake/session gate，再开始 authoritative player state / replication。
