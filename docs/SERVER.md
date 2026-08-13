# 多人服务器运行与部署边界

当前仓库已经有一个真实可运行的 Node.js WebSocket 服务器，但它目前只负责：HTTP Upgrade、WebSocket 子协议、hello/welcome、server-issued session、ClientInputEnvelope 严格校验和输入事件分发。

它**还不是完整 Minecraft 多人服务器**：没有账号认证、房间/世界加入、服务端物理、世界存档、玩家/实体/方块复制、重连恢复或延迟补偿。

## 本地启动

要求 Node.js 22+。

```bash
npm install
npm run server
```

默认：

```text
host: 127.0.0.1
port: 8080
websocket path: /ws
health: /healthz
subprotocol: minecraft-web-v1
```

浏览器本地开发默认只允许以下 Origin：

```text
http://localhost:4173
http://127.0.0.1:4173
```

## 环境变量

### MCWEB_WS_HOST

监听地址，默认：

```text
127.0.0.1
```

若部署到容器/服务器，通常需要改成：

```text
0.0.0.0
```

这只改变监听接口，不改变 Origin 安全策略。

### MCWEB_WS_PORT

默认：

```text
8080
```

必须为 1..65535 的整数。

### MCWEB_ALLOWED_ORIGINS

逗号分隔的浏览器 Origin allowlist，例如：

```text
https://shrinkshi.github.io,https://example.com
```

也支持显式：

```text
*
```

但生产环境不应为了省事使用 `*`。Origin allowlist 是浏览器 WebSocket 跨站连接的重要边界之一。

## 生产 HTTPS / WSS

GitHub Pages 只部署静态网页，不会运行本仓库的 Node WebSocket 服务。

正式部署应让 Node 服务运行在独立服务器/容器，并由 Nginx、Caddy、Cloudflare Tunnel 或其他受控反向代理终止 TLS。浏览器端正式连接使用：

```text
wss://your-server.example/ws
```

不要让 HTTPS 前端默认降级连接明文 `ws://`。

当前 Node server 本身只提供 HTTP/WS listener；TLS 终止层应放在反向代理或后续独立 HTTPS server 配置中。

## Upgrade 安全边界

服务端在真正升级为 WebSocket 前检查：

1. path 必须是 `/ws`；
2. Origin 必须在 allowlist；
3. `Sec-WebSocket-Protocol` 必须包含 `minecraft-web-v1`；
4. 不满足时直接返回 HTTP 404 / 403 / 426，而不是先建立 WebSocket 再补救。

WebSocketServer 配置：

```text
perMessageDeflate = false
maxPayload = 16384 bytes
```

当前 realtime input frame 很小，没有理由允许大 payload 或默认开启压缩。

## 握手生命周期

连接升级后状态为：

```text
await-hello
```

客户端必须在默认 5000 ms 内发送严格：

```json
{"v":1,"kind":"hello"}
```

成功后服务端生成 session：

```text
s:<uuid>
```

并返回：

```json
{"v":1,"kind":"welcome","session":"..."}
```

此后才进入：

```text
ready
```

客户端发送的 control/view/action 都必须使用这个 session，并经过 `ClientInputSessionGate` 的 packetSeq 重复/陈旧检查。

## Close code 口径

当前常见关闭码：

- `1002`：协议/schema/session 错误；
- `1003`：不支持二进制 realtime message；
- `1008`：重复或陈旧 packetSeq；
- `1011`：服务器 session/input callback 内部失败；
- `4001`：服务端等待 ClientHello 超时。

服务端应用 callback 抛异常时只关闭受影响连接并通过 `onSocketError` 报告，不能直接把整个 Node 进程打崩。

## Health check

```text
GET /healthz
```

返回：

```json
{"ok":true,"protocol":"minecraft-web-v1"}
```

health endpoint 不返回在线 session、玩家、IP、世界名或其他敏感运行状态。

## 当前测试

`scripts/check-websocket-server.mjs` 启动真实 localhost ephemeral server，不使用 FakeSocket，覆盖：

- HTTP health / 404；
- Origin 拒绝；
- 缺失 WebSocket 子协议拒绝；
- 真实 HTTP Upgrade；
- `minecraft-web-v1` 子协议协商；
- ClientHello → ServerWelcome；
- deterministic server session；
- control/view/action ClientInputEnvelope；
- 重复 packetSeq；
- 错误 session；
- 非法 hello；
- binary frame；
- hello timeout；
- application input callback 抛异常时的单 session 1011 隔离。

## 下一阶段

服务器下一阶段应建立 authoritative player session state，而不是先做 UI 房间列表：

```text
validated control/view/action
  -> server player input state
  -> fixed-step authoritative Player simulation
  -> server snapshot schema
  -> browser remote-player/interpolation
```

方块破坏/放置、实体伤害和库存修改仍不得由客户端直接提交最终结果。客户端只提交语义输入，服务端自行验证并决定 authoritative state change。
