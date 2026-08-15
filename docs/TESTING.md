# 测试与验证

本文描述当前质量门，不再维护一份手工列举的 `check-*.mjs` 执行顺序。`npm run test:logic` 已由 `scripts/run-logic-checks.mjs` 自动发现/执行逻辑回归；新增 check script 不应依赖人工修改一条越来越长的 package script。

## Repository quality

`.github/workflows/quality.yml` 在 PR 和 `main` push 上运行。

### 1. static-checks

环境：Node 22。

执行：

```text
npm install --omit=dev --ignore-scripts --no-audit --no-fund --no-package-lock
node --check src/*.js
node --check scripts/*.mjs
node --check server/*.mjs
npm run test:logic
```

`npm run test:logic` 实际入口：

```text
node scripts/run-logic-checks.mjs
```

因此当前质量门关注“全部被发现的 regression scripts 都通过”，而不是旧文档中已经失真的固定 12/15 套测试列表。

PR #94 delivery baseline：static gate 成功执行 **131 个 logic/worker regression scripts**。

这些测试目前覆盖的主要领域包括：

- blocks/items/Inventory/Crafting/Equipment；
- item-stack instance/durability；
- mining/harvest/tool tiers；
- combat/armor/death/respawn/bed/sleep；
- oxygen/swimming/weather；
- EntityStore/SpatialHash/mob rules/projectiles/explosions/XP；
- deterministic terrain generator/mesh Worker/world edit rules；
- desktop/mobile control intent；
- network control/view/action frames；
- sequence/session/handshake/WebSocket contracts；
- authoritative server player simulation/world session；
- world-info/bootstrap/interpolation/remote-player replication；
- authoritative world edits/mining/placement/item entities；
- Inventory/Equipment/player crafting/Workbench authority；
- chat/commands/PvP authority；
- asset manifest/import contracts；
- mob model specs and bed model specs/lifecycle。

## 2. Browser smoke

`browser-smoke` 依赖 `static-checks`，使用 Playwright Chromium，并拆成两个 shard：

```text
npm run test:e2e -- --shard=1/2
npm run test:e2e -- --shard=2/2
```

两个 shard `fail-fast:false`，用于在一个 shard 失败时仍保留另一个 shard 的结果。

失败时上传：

- `test-results/`
- `playwright-report/`

artifact 保留 7 天。

当前浏览器层不只是“页面能打开” smoke。它已覆盖多条真实跨模块路径，包括：

- 主菜单 → 创建世界 → WebGL runtime；
- Pointer Lock/方向/移动；
- mobile touch landscape/portrait 路径；
- Inventory/Equipment/Crafting UI；
- durability bar；
- water/oxygen/swimming/weather；
- death/respawn/custom spawn/bed sleep；
- command completion/Jade；
- self-hosted Three.js runtime；
- Minecraft imported asset HTTP fetch/decode；
- texture-backed mob model construction/lifecycle；
- red bed model construction/chunk lifecycle；
- real multiplayer authoritative movement/remote player；
- chat/commands；
- item pickup/mining/placement；
- Inventory/Equipment/Crafting/Workbench transactions；
- PvP damage/knockback/death/respawn 等真实 server/browser 链。

## 3. Minecraft asset source audit

Minecraft 原版资源导入使用独立 read-only audit workflow。

该 workflow 的目标不是证明“ZIP 存在”，而是证明：

1. tracked source archive identity/checksum 符合预期；
2. selective importer 能从该 source 重建 runtime subset；
3. committed generated files 与重建 bytes 一致；
4. source/runtime manifest checksum/provenance 一致；
5. runtime logical asset key 只指向实际 tracked resource；
6. 代表性 PNG/model metadata 满足尺寸/contract。

普通 CI 不拥有 self-push 权限；用于一次性转移生成 binary 的临时 workflow/write step 不允许留在最终 delivery tree。

## 4. Exact-head 交付规则

PR 合并前必须使用最终 delivery head 的验证结果，不接受“较早 commit 绿过”作为最终证据。

推荐顺序：

1. 完成代码和文档；
2. self-review diff；
3. 确认 branch `behind_by=0` 或重新处理 base drift；
4. 等待 exact-head `Repository quality`；
5. asset 变更时同时等待 source audit；
6. 检查 reviews / review threads / conversation findings；
7. 所有交付门清晰后再 squash merge。

如果 `main` 在 exact-head validation 后发生会影响组合树的变化，不能直接假设旧 CI 仍代表最终 merge tree。需要重新同步/构造实际组合树并验证。

## 5. 回归设计原则

### Pure rules first

能脱离 Three.js/DOM/Socket 的逻辑应优先成为纯模块并由 Node 覆盖。例如：

- mining progress/harvest；
- armor/damage；
- sleep/respawn；
- item stack/durability；
- model/blockstate parser（下一阶段）；
- server transaction validation。

### Browser proves integration

以下问题不能用 Node mock 假装已经覆盖：

- Three.js texture/geometry/UV；
- HTTP resource loading；
- Pointer Lock/input DOM；
- IndexedDB；
- real WebSocket browser flow；
- GPU/resource disposal integration；
- CSS/UI state。

### Authority tests must use real state owners

Multiplayer 回归必须验证：

- 客户端只发送 intent/request；
- server 是最终 state owner；
- stale/replay/invalid request 被拒绝；
- browser presentation 来自 authoritative snapshot/result；
- client 不能通过 optimistic local mutation 伪造已 server-owned 的状态。

### Resource tests must prove provenance

导入 Minecraft resource 时，测试不仅验证“能显示”，还应验证：

- resource 来自指定 source archive；
- runtime manifest key 稳定；
- derived output 可重建；
- texture/model dimensions/UV 不越界；
- 不用无关 placeholder 冒充 source-backed 资源。

## 6. 下一阶段测试要求：blockstate/model interpreter

Minecraft JSON model interpreter 必须先建立 pure fixtures，再接 runtime。

最低 Node coverage：

- resource identifier resolution；
- model parent inheritance；
- texture variable chain；
- missing parent/texture；
- parent cycle rejection；
- elements + per-face UV/texture/cullface/tintindex；
- element rotation；
- blockstate variants；
- weighted alternatives；
- x/y rotation + uvlock；
- multipart AND/OR conditions；
- deterministic selection；
- representative original 1.20.1 model fixtures。

最低 browser coverage：

- 从真实 HTTP runtime asset/model 路径构建 representative block models；
- normalized UV 合法；
- full cube fast path 未回退成一 block 一 Mesh；
- transparent/cutout layer contract；
- chunk remesh/unload 后 model resources/geometry 不泄漏；
- representative slab/stairs/door/fence/torch/tint blocks 可见且方向/state 正确。

## 7. 当前已知测试欠账

- real iOS Safari device matrix；
- real Android device matrix；
- long-session memory regression / GPU resource leak tracking；
- formal FPS/chunk-generation performance budgets；
- multiplayer soak/load testing；
- packet latency/jitter/loss simulation；
- durable multiplayer save/restart tests（功能尚未实现）；
- server-authoritative PvE tests（功能尚未实现）；
- audio tests（source/AudioEngine 尚未实现）。

这些欠账跟随 feature matrix，不再靠在旧测试文档中保留过时“下一步列表”。