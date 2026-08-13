# 多人服务器运行与部署边界

当前仓库的 `npm run server` 已不再只是裸 WebSocket listener。它会启动一份真实的**单世界 authoritative runtime**：

```text
HTTP / WebSocket Upgrade
  -> ClientHello / ServerWelcome
  -> ServerWorldInfo
  -> authoritative world join
  -> tick-0 self player snapshot
  -> validated control/view/action input state
  -> 20 Hz terrain-backed player simulation
  -> self-authoritative player snapshots
```

权威玩家运动使用与浏览器同源的移动、朝向、AABB 碰撞、水体采样和确定性地形生成规则；服务器不会接受客户端提交的最终 position/velocity/block target。

这仍然**不是完整多人 Minecraft**。目前尚未完成远端玩家 identity/broadcast、玩家模型插值、客户端 prediction/reconciliation、可变方块权威与持久化、实体/战斗/库存权威、账号认证、房间系统和断线恢复。

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
worldId: main
world seed: 1
terrain prompt: <empty>
player mode: survival
server tick: 20 Hz
terrain cache: 256 chunks
```

浏览器本地开发默认只允许：

```text
http://localhost:4173
http://127.0.0.1:4173
```

## 环境变量

### 监听与 Origin

`MCWEB_WS_HOST`：监听地址，默认 `127.0.0.1`。容器/远程服务器常用 `0.0.0.0`。

`MCWEB_WS_PORT`：默认 `8080`，生产入口要求 1..65535。`HOST` / `PORT` 作为次级兼容回退，但已有 `MCWEB_WS_*` 优先。

`MCWEB_ALLOWED_ORIGINS`：逗号分隔浏览器 Origin allowlist，例如：

```text
https://shrinkshi.github.io,https://example.com
```

也支持显式 `*`，但生产环境不应为了省事使用全放行。

`MCWEB_ALLOW_MISSING_ORIGIN`：默认关闭。仅接受 `1/0/true/false`。普通浏览器连接应携带 Origin；只有明确需要非浏览器客户端时才考虑打开。

### 权威世界

`MCWEB_WORLD_ID`：公开世界标识，默认 `main`。它与每次 WebSocket 连接的 `session` 是两个概念；session 不能当作世界或玩家长期 identity。

`MCWEB_WORLD_SEED`：确定性地形 seed，默认 `1`。

`MCWEB_TERRAIN_PROMPT`：地形提示词，默认空字符串。浏览器收到 world-info 后必须使用服务器给出的 seed/prompt 与 terrain version，不能自行猜测。

`MCWEB_WORLD_MODE`：默认 `survival`，当前允许 `survival / adventure / creative / spectator`。

`MCWEB_SPAWN_X`、`MCWEB_SPAWN_Z`：默认 `0`。服务器将其落到对应整数方块列中心，并用 `highestSolid + 1.001` 决定权威出生 Y。

`MCWEB_PREFETCH_RADIUS`：出生点周围同步预生成 chunk 半径，默认 `1`，范围 0..16。

`MCWEB_TERRAIN_CACHE_CHUNKS`：服务器确定性基础地形 LRU 缓存上限，默认 `256`，范围 1..4096。缓存淘汰后 chunk 会由同一 seed/prompt 确定性重建。

所有 world-info 相关配置在服务器启动时就按 wire contract 校验。非法 `worldId`、控制字符 seed/prompt 或不支持的模式不会拖到第一个玩家连接时才失败。

## 生产 HTTPS / WSS

GitHub Pages 只部署静态网页，不会运行 Node authoritative server。

正式部署应让 Node runtime 运行在独立服务器/容器，并由 Nginx、Caddy、Cloudflare Tunnel 或其他受控反向代理终止 TLS。浏览器正式连接应使用：

```text
wss://your-server.example/ws
```

不要让 HTTPS 前端默认降级到明文 `ws://`。当前 Node runtime 自身提供 HTTP/WS listener；TLS 终止层仍放在反向代理。

## Upgrade 安全边界

真正升级 WebSocket 前检查：

1. path 必须是 `/ws`；
2. Origin 必须满足 allowlist；
3. `Sec-WebSocket-Protocol` 必须包含 `minecraft-web-v1`；
4. 不满足时直接 HTTP 404 / 403 / 426。

WebSocketServer：

```text
perMessageDeflate = false
maxPayload = 16384 bytes
```

## 连接与世界加入顺序

连接成功后的正式顺序是：

```text
ClientHello
  -> ServerWelcome(session)
  -> ServerWorldInfo(session, worldId, terrainVersion, seed, prompt, tickRate)
  -> tick-0 ServerPlayerSnapshot
  -> realtime input / authoritative snapshots
```

ClientHello 默认必须在 5000 ms 内到达：

```json
{"v":1,"kind":"hello"}
```

welcome 示例：

```json
{"v":1,"kind":"welcome","session":"s:..."}
```

world-info 只允许每个 transport session 出现一次。浏览器如果看到 terrain generator version 不兼容，应在创建世界前拒绝连接，而不是进入一个视觉地形和服务器碰撞地形不同的世界。

权威 world join 只有在 world-info 下行成功后才执行；join 产生 tick-0 玩家快照。如果初始 snapshot 无法下发，服务器回滚该玩家的 world/simulation membership，避免半加入状态。

## 输入与权威物理

客户端 control/view/action 首先经过：

```text
ClientInputEnvelope session + packetSeq gate
  -> control/view/action 独立 semantic seq gate
  -> bounded view history / action dependency validation
  -> ServerPlayerInputState
```

20 Hz world loop随后读取这一已经验证的 input state，调用共享物理：

```text
absolute yaw/pitch
  + control state
  + deterministic terrain solid/liquid queries
  -> shared motion planner
  -> X -> Z -> Y AABB collision
  -> authoritative position / velocity
  -> ServerPlayerSnapshot
```

最初修复的 camera-relative WASD 规则同样被服务器使用：yaw `+90°` 时 W 的权威方向是 `-X`，不是世界固定北方。

服务器地形按需同步生成，未生成 chunk **不会冒充 AIR**。基础 terrain cache 是私有且有界的；对外 chunk snapshot 为复制数据，不能通过引用修改权威缓存。

## Runtime 生命周期

`server/runtime.mjs` 负责一份 runtime 的组合：

```text
1. validate config
2. create ServerTerrainWorld
3. create AuthoritativeWorldSession
4. create WebSocket transport server
5. listen
6. start 20 Hz authoritative scheduler
```

停止顺序：

```text
stop world tick + remove authoritative players
  -> close WebSocket server/connections
```

运行中重复 `start()` 不会建立第二个 scheduler；`stop()` 幂等；已经 stopped 的 runtime 不会被悄悄重新启动。

`server/start.mjs` 为 SIGINT / SIGTERM 使用同一幂等 shutdown 路径。

## Close code 口径

常见关闭码：

- `1002`：协议/schema/session/realtime message 错误；
- `1003`：不支持 binary realtime message；
- `1008`：重复/陈旧 envelope 或 semantic sequence、未知 action view 等策略违规；
- `1011`：服务器 session/input/world callback 内部失败；
- `4001`：服务端等待 ClientHello 超时。

应用 callback 异常必须隔离受影响 session，不能直接击穿 Node 进程。world-session input/simulation/snapshot 阶段也分别做 session 级错误隔离。

## Health check

```text
GET /healthz
```

返回：

```json
{"ok":true,"protocol":"minecraft-web-v1"}
```

health endpoint 不公开在线 session、IP、玩家位置、seed 或其他世界状态。

## 当前关键测试

服务器测试不只使用 FakeSocket：

- `check-websocket-server.mjs`：真实 localhost Upgrade、Origin、subprotocol、hello/session、严格输入和 snapshot 下行；
- `check-authoritative-input-state.mjs`：outer/inner 双层 replay guard、view history、bounded action queue；
- `check-server-player-simulation.mjs`：20 Hz 共享物理、WASD/跳跃/飞行/水体/碰撞；
- `check-terrain-generator.mjs`：旧 Worker 的硬编码字节 golden；
- `check-server-terrain-world.mjs`：真实确定性 terrain + bounded LRU + 权威物理；
- `check-authoritative-world-session.mjs`：真实 WebSocket 输入到 terrain-backed tick/snapshot 环路；
- `check-server-world-info.mjs` / `check-websocket-world-info.mjs`：世界 identity 和 terrain compatibility；
- `check-server-runtime.mjs`：真实 production runtime 的 `welcome -> world-info -> tick0 -> input -> 50ms tick -> tick1`、health、配置和 shutdown。

每个服务器 PR 仍需通过完整 Chromium browser-smoke，确保单机/移动端/床/游泳/WASD 等现有客户端路径没有被服务器工程污染。

## 下一阶段

下一步优先是**浏览器 Multiplayer runtime 接线**，而不是先做房间列表皮肤：

```text
多人服务器地址
  -> MultiplayerWebSocketClient
  -> world-info
  -> create matching VoxelWorld(seed,prompt)
  -> initial authoritative snapshot
  -> MultiplayerInputBridge at bounded network tick
  -> controlled self-correction / reconciliation
```

此后才进入公开 player identity、remote player snapshot/broadcast、插值渲染。

在远端玩家复制和服务器 gameplay authority 完成前，不能把当前状态描述成“完整多人联机”。