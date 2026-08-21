# 测试与验证

本文描述当前质量门。`npm run test:logic` 由 `scripts/run-logic-checks.mjs` 自动发现 `check-*.mjs`，不维护会漂移的手工脚本数量/执行列表。

## 1. Repository quality

`.github/workflows/quality.yml` 在相关 PR/ref 上执行：

### static-checks

环境：Node 22。

```text
npm install --omit=dev --ignore-scripts --no-audit --no-fund --no-package-lock
node --check src/*.js
node --check scripts/*.mjs
node --check server/*.mjs
npm run test:logic
```

长期 contract 是“所有自动发现 regressions 全部通过”，不是某个历史固定数量。

当前 logic/server/Worker coverage 包括：

- blocks/items/Inventory/Crafting/Equipment；
- item-instance durability；
- mining/effectiveness/harvest/tool tiers；
- stone→iron progression、recipes、Furnace；
- till/strip/flatten secondary actions；
- combat/armor/death/respawn/bed/sleep/oxygen/swim/weather；
- EntityStore/SpatialHash/current mob/projectile/explosion/XP rules；
- deterministic terrain/ore/mesh Worker/world edits；
- Minecraft resource/model/blockstate/atlas/batching pipeline；
- desktop/mobile control intents；
- network frames/session/handshake/sequence；
- authoritative movement/world/mining/placement/items/Inventory/Equipment/Crafting/Workbench/Furnace/PvP；
- source-backed asset/audio provenance；
- player/bed/mob presentation pure rules。

## 2. PR #124 regression contracts

### Player hand-side contract

`player-model-specs.js` 的 side contract 必须证明：

- local model yaw=0 面向 -Z；
- anatomical `rightArm/rightLeg` 位于 +X；
- `leftArm/leftLeg` 位于 -X；
- attack/use animation channel 继续驱动 `rightArm`，不通过把动画改到错误 limb 来掩盖几何 bug。

第一人称 contract 必须证明 arm base/sleeve/item anchor 是 shoulder→hand 的正确方向，并保持右侧 viewmodel presentation。

### Workbench contract

PR #124 的 Workbench 不是 legacy grey-panel CSS 微调，而是 canonical Java 1.20.1 `textures/gui/container/crafting_table.png` presentation。验证要求：

- logical asset manifest 明确登记 `gui.crafting_table_panel`；
- direct canonical GUI binding 只能命中审计过的 exact source path；
- browser computed panel 为 352×332（2×）；
- 3×3 grid / result / inventory / hotbar 的 fixed coordinates 与当前 contract 一致；
- presentation 变化不能改变 CraftingGrid 或 authoritative Workbench state owner。

### Footstep contract

`scripts/check-vanilla-block-audio.mjs` 继续验证：

- ordinary air↔block break/place；
- block→block tool mutation suppression；
- `sound:false`；
- paired-bed de-duplication；
- PR #124 grounded horizontal cadence 为 1.6 blocks；
- flying/spectator/airborne/swimming/teleport-sized frame movement reset/suppress；
- dispose restoration。

### Mining audio contract

`scripts/check-mining-audio-cadence.mjs` 验证：

- survival mining target acquisition 立即产生 hit；
- 持续挖掘约每 200 ms 一个 hit；
- target switch 立即重启 cadence；
- creative instant break 不进入 survival hit loop；
- hit playback profile 为当前 Java-style `0.25 volume / 0.5 playbackRate`；
- browser event bridge 能从 `minecraft:mining-hit` 解析 block ID。

`vanilla-mining-audio.js` 在 mining hit 时预取对应 break OGG bytes，以避免最终 break 才首次冷启动网络请求。prefetch 不能被描述成完整 audio scheduler/decode pipeline。

### Mob sound contract

`scripts/check-vanilla-mob-sounds.mjs` 对当前八种生物验证：

- ambient/hurt/death 中已声明事件有真实 source-backed variants；
- creeper 没有普通 ambient voice，不伪造该事件；
- variant SHA-1/object path/logical path 合法；
- tracked sound object 实际存在且非空；
- local 24-block attenuation contract 正确；
- source availability 不自动提升未接入的 attack/step/shoot/fuse/splash 等事件。

## 3. Chromium browser gate

Browser jobs 在 static gate 之后拆成两个 Playwright Chromium shards：

```text
npm run test:e2e -- --shard=1/2
npm run test:e2e -- --shard=2/2
```

Browser failures 保留 `test-results/`、`playwright-report/`、trace/screenshot 等 artifacts。

现有 browser coverage 已包括菜单/世界/WebGL、Pointer Lock、camera/movement/mobile、F5/viewmodel、Inventory/Equipment/Crafting/Workbench/Furnace、durability、水/氧气/天气、death/respawn/bed、Jade/commands、same-origin Three.js、source-backed resources、mob/bed/model lifecycle、interpreted model/glass、real multiplayer authority flows、PvP 与 source-backed OGG boundaries。

### PR #124 focused browser acceptance

`tests/e2e/view-ui-audio-polish.spec.mjs` 必须在真实页面证明：

1. third-person `rightArm/rightLeg` physical side 为 +X、left side 为 -X；
2. primary animation 实际作用于 anatomical right arm；
3. first-person arm Mesh 使用修正后的实际 center/rotation，而不是只检查常量字符串；
4. installed Workbench computed style 使用 `crafting_table.png`，panel/slot container bounding boxes 满足 fixed coordinates；
5. `minecraft:mining-hit` 穿过 live browser bridge，产生 `block.stone.step` source event；
6. 同一次 flow 至少看到一个 `原版Minecraft音频文件/` object HTTP 200。

Node pure test 不能替代这些 browser integration 断言。

## 4. Source-backed audio validation policy

### Node 需要证明

- event → variants 映射明确；
- variant SHA-1/object path/logical path 与 tracked object 一致；
- SoundType family / playback parameters 正确；
- mutation/cadence/suppression semantics 正确；
- local entity attenuation pure rule 正确。

### Browser 需要证明

Representative source-backed flow 至少要覆盖：

- runtime 真实触发；
- 从 `原版Minecraft音频文件/` 请求 object；
- HTTP success / non-empty source；
- required decode/playback path 不因缺资源报错；
- failed action 不伪发 success event。

PR #124 的 focused mining test以真实 HTTP response 加 event trace证明 browser bridge；已有 tool-action E2E 继续承担真实 OGG fetch/decode acceptance。未来扩展 broad entity/environment/music/spatial audio 时必须补相应 browser acceptance。

## 5. Minecraft asset audit

Resource tests 需要证明：

1. source identity/路径 contract；
2. selective importer/dependency closure 可重建 current runtime subset；
3. generated tracked bytes 可重复；
4. source/runtime checksum/provenance 对齐；
5. logical asset keys 只指向 tracked/declared resources；
6. direct canonical item/block/GUI binding 必须显式白名单 + exact path audit；
7. model atlas 与 legacy terrain atlas contract 不互相污染。

普通 CI 保持 read-only，不允许 self-push 生成物。

## 6. Exact-head 交付规则

PR Ready / merge 前只认**最终 branch HEAD**：

1. 完成代码、tests、generated outputs（若有）和文档；
2. self-review final diff；
3. branch 相对 base `behind_by=0` 或显式处理 base drift；
4. 等待该 exact HEAD 的 Repository quality；
5. 检查 asset/source audits；
6. 检查 PR reviews / review threads / conversation findings；
7. 两路 Chromium 与 static 全绿后才允许 Ready；
8. merge 使用 expected head SHA/guarded merge，禁止 head 移动后误合并。

如果文档提交后 HEAD 改变，之前的绿灯只能作为 preliminary evidence，不能用于最终 Ready。

## 7. 回归设计原则

### Pure rules first

可脱离 Three.js/DOM/Socket/WebAudio 的逻辑优先 pure module：mining、harvest、durability、damage/death、sleep、item stack、blockstate/model resolution、Furnace、secondary actions、sound mappings/cadence/attenuation、server validation。

### Browser proves integration

必须用 browser 的问题包括：Three.js geometry/texture/UV、computed CSS layout、HTTP resources、real OGG boundaries、Pointer Lock/input DOM、IndexedDB、real browser WebSocket、WebGL/resource lifecycle。

### Authority tests use real owners

Multiplayer tests 必须证明 client 只发送 intent/request，server owns final state，stale/replay/invalid request 被拒绝，presentation 来自 authoritative snapshot/result，不允许 local optimistic state 伪装 server truth。

### Resource tests prove provenance

Source-backed claim 必须证明 resource 来自声明 source、logical key 稳定、生成物可重建、hash/dimension/UV/atlas bounds 合法，不能用 placeholder 冒充原版资源。

## 8. 当前已知测试欠账

- broad Android physical-device matrix；
- iOS Safari/WebKit；
- long-session memory/GPU leak tracking；
- formal FPS/chunk-generation budgets；
- multiplayer soak/load + latency/jitter/loss；
- durable multiplayer restart tests（功能未完成）；
- server-authoritative PvE/XP（功能未完成）；
- broad generated sound registry；
- remote SFX / true 3D positional/HRTF tests；
- ambient/weather/music scheduling；
- visual screenshot-diff baseline（当前以 geometry/computed-style contract 为主）；
- full farming/scheduled-tick/redstone tests（对应功能未完成）。
