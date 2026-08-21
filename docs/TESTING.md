# 测试与验证

本文描述当前质量门，不维护手工列举的 `check-*.mjs` 执行顺序。`npm run test:logic` 由 `scripts/run-logic-checks.mjs` 自动发现/执行逻辑回归；新增 check script 不需要修改一条持续膨胀的 package script。

## 1. Repository quality

`.github/workflows/quality.yml` 在 PR / relevant branch events 上执行当前代码质量门。

### static-checks

环境：Node 22。

主要执行：

```text
npm install --omit=dev --ignore-scripts --no-audit --no-fund --no-package-lock
node --check src/*.js
node --check scripts/*.mjs
node --check server/*.mjs
npm run test:logic
```

`npm run test:logic` 的入口是：

```text
node scripts/run-logic-checks.mjs
```

因此长期 contract 是“**所有自动发现的 regression scripts 全部通过**”，不是某个历史版本固定的脚本数量。

当前 logic/server/Worker coverage 已涉及：

- blocks/items/Inventory/Crafting/Equipment；
- item-instance durability；
- mining/effectiveness/harvest/tool tiers；
- iron/stone progression 与 recipes；
- tool secondary actions：till/strip/flatten；
- combat/armor/death/respawn/bed/sleep；
- oxygen/swimming/weather；
- EntityStore/SpatialHash/mob rules/projectiles/explosions/XP；
- deterministic terrain / ore injection / mesh Worker / world edits；
- Minecraft resource-id、blockstate/model inheritance/variants/multipart/geometry/atlas/batching；
- desktop/mobile control intent；
- network control/view/action frames；
- sequence/session/handshake/WebSocket contracts；
- authoritative server movement/world/mining/placement/item entities；
- Inventory/Equipment/player crafting/Workbench/Furnace authority；
- authoritative tool secondary-use paths；
- chat/commands/PvP authority；
- asset manifest/import/provenance contracts；
- mob/bed/first-person presentation pure rules；
- source-backed tool/block sound mapping and object hashes；
- local block-audio transition/footstep/disposal semantics。

### #123 source-audio logic contracts

原版声音不能只验证 event 字符串：

- `scripts/check-vanilla-tool-sounds.mjs` 打开当前映射的 tracked OGG object，重算 SHA-1 并与 Java 1.20.1 logical path/event mapping 对齐；
- `scripts/check-vanilla-block-audio.mjs` 验证 ordinary air↔block transition、block→block secondary-action suppression、`sound:false`、paired-bed de-duplication、footstep distance cadence、flying/swimming/teleport suppression 和 dispose restoration；
- break/place playback contract 使用 `(SoundType.volume + 1) / 2` + `SoundType.pitch × 0.8`；normal step 使用 `volume × 0.15` + original pitch。

## 2. Chromium browser gate

Browser jobs 依赖 static gate，并拆成两个 Playwright Chromium shards：

```text
npm run test:e2e -- --shard=1/2
npm run test:e2e -- --shard=2/2
```

`fail-fast:false`，一个 shard 失败时仍保留另一 shard 的结果。Browser failures 上传：

- `test-results/`；
- `playwright-report/`；
- 对应 trace/screenshot/context artifacts。

当前 browser layer 已经不只是“页面能打开”，覆盖多条真实 integration path：

- 主菜单 → 创建世界 → WebGL runtime；
- Pointer Lock、camera/movement、mobile touch；
- first-person 3D viewmodel / F5 hide/restore；
- Inventory/Equipment/Crafting/Workbench/Furnace UI；
- durability presentation；
- water/oxygen/swimming/weather；
- death/respawn/custom spawn/bed sleep；
- command completion/Jade；
- same-origin Three.js；
- source-backed Minecraft HTTP resource loading；
- texture-backed mob/bed/model runtime lifecycle；
- generic model rendering acceptance including current translucent glass path；
- real multiplayer movement/remote player；
- authoritative chat/commands/item pickup/mining/placement；
- Inventory/Equipment/Crafting/Workbench/Furnace transactions；
- PvP damage/knockback/death/respawn；
- #123 iron hoe craft/till/durability；
- real original OGG HTTP response/decode boundary。

### #123 pre-doc evidence

Pre-doc implementation head `c9bd6b9eba8bcf02272d2d7844bad64895fd0440` passed Repository quality run #941：

- static-checks：success；
- Chromium shard 1：**24/24 pass**，无 retry；
- Chromium shard 2：**23/23 pass**，无 retry；
- failure artifact upload skipped because there were no browser failures。

这只是历史稳定证据。文档/代码继续变化后，最终 Ready 必须重新验证当前 exact HEAD。

## 3. Minecraft asset source / generated output audit

Minecraft resource import 使用 deterministic/read-only audit rules。目标不是证明“ZIP 存在”，而是证明：

1. source archive/input identity 符合 contract；
2. selective importer / dependency closure 能重建 current runtime subset；
3. generated tracked files 与重建 bytes 一致；
4. source/runtime manifest checksum/provenance 对齐；
5. logical asset key 只指向 tracked/declared resources；
6. direct canonical binding 显式登记并可审计；
7. representative PNG/model metadata/atlas bounds 合法；
8. generated model atlas 与 legacy terrain atlas contract 不互相污染。

普通 CI 不拥有 self-push 权限；一次性生成/转移 binary 的 write workflow 不允许作为长期 delivery 机制遗留。

## 4. Source-backed audio validation

PR #122 提供 tracked Java 1.20.1 sound-object corpus 后，audio 不再是“无 source 可测”。但 source availability 与 runtime implementation 分开验证。

### Node 需要证明

- event → variants 映射明确；
- 每个 current variant 的 SHA-1/object path/logical path 一致；
- tracked object 文件实际存在并 hash match；
- SoundType family 和当前 block mapping 正确；
- playback volume/pitch rule 正确；
- ordinary transition / secondary mutation / explosion silence / paired bed / footstep cadence 语义正确。

### Browser 需要证明

至少对 representative source-backed action：

- 用户实际 gameplay action 触发 event；
- 浏览器从 `原版Minecraft音频文件/` 请求真实 object；
- HTTP 200 / non-empty OGG body；
- `decodeAudioData` 不失败；
- failed gameplay action 不伪发 success sound；
- source audio warning/error 为零。

未来扩展 entity/ambient/music/spatial audio 时必须增加对应 real-browser acceptance，而不能因为 corpus 中已有文件就提升 parity。

## 5. Exact-head 交付规则

PR Ready / merge 前只认**最终 branch HEAD**：

1. 完成代码、generated outputs 和文档；
2. self-review final diff；
3. branch 相对 base `behind_by=0`，或显式处理 base drift；
4. 等待 exact-head Repository quality；
5. asset-generated changes 需要相应 source/rebuild audit；
6. 检查 PR reviews / review threads / conversation findings；
7. 所有门清晰后才允许 Ready；
8. merge 必须使用 expected head SHA / guarded squash，避免 head 移动后误合并。

如果 `main` 在 exact-head validation 后发生会改变组合树的变化，不能把旧 branch CI 直接当成 merge-tree 证据；需要同步或重新验证实际组合。

## 6. 回归设计原则

### Pure rules first

能脱离 Three.js/DOM/Socket/WebAudio 的逻辑优先抽 pure module/contract，例如：

- mining/harvest/tool behavior；
- armor/damage/death；
- sleep/respawn；
- item stack/durability；
- blockstate/model resolution/geometry；
- Furnace state transition；
- secondary tool actions；
- SoundType mapping/playback parameters；
- server transaction validation。

### Browser proves integration

以下问题不能用 Node mock 代替：

- Three.js texture/geometry/UV/translucent rendering；
- HTTP resource loading；
- real OGG fetch/decode；
- Pointer Lock/input DOM；
- IndexedDB；
- real WebSocket browser flow；
- GPU/resource disposal integration；
- CSS/UI state。

### Authority tests use real owners

Multiplayer regressions需要证明：

- client 只发送 intent/request；
- server 是最终 state owner；
- stale/replay/invalid request 被拒绝；
- browser presentation 来自 authoritative snapshot/result；
- client 不能通过 optimistic local mutation 伪造 server-owned state；
- cross-domain transaction 明确验证涉及的 revisions。

### Resource tests prove provenance

Source-backed claim 必须证明：

- resource 来自声明 source；
- logical runtime key 稳定；
- generated output 可重建；
- hashes/dimensions/UV/atlas bounds 不越界；
- 不使用 unrelated placeholder 冒充 source-backed resource。

## 7. Generic model runtime 现行测试要求

Generic Minecraft JSON model interpreter 已经是现行 runtime foundation，不再是“下一阶段才开始”。持续回归至少应覆盖：

- safe resource identifier；
- parent inheritance / texture variable chain；
- missing/cyclic dependency fail-closed；
- elements / faces / UV / cullface / tintindex；
- element/model rotation；
- variants / weighted alternatives；
- `uvlock`；
- multipart AND/OR；
- deterministic selection；
- source dependency closure；
- model atlas provenance/packing/bounds；
- chunk-level opaque/cutout/translucent batching；
- representative real Java 1.20.1 gameplay roots；
- chunk remesh/unload lifecycle。

未来新增 stairs/fences/doors/panes 等复杂 families 时，在这一 foundation 上补 state/collision/browser acceptance，不回到 per-block manual renderer。

## 8. 当前已知测试欠账

- broad real Android device matrix；
- iOS Safari / WebKit matrix；
- long-session memory/GPU leak tracking；
- formal FPS/chunk-generation budgets；
- multiplayer soak/load；
- latency/jitter/loss simulation；
- durable multiplayer save/restart（功能尚未完成）；
- server-authoritative PvE/XP（功能尚未完成）；
- broad sound-event registry tests；
- remote/spatial audio tests；
- ambient/music scheduling tests；
- full farming/scheduled-tick/redstone tests（对应功能尚未完成）。

这些欠账跟随 feature matrix，不再在测试文档中保存过时的“下一阶段”清单。
