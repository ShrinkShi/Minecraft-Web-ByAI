# 测试与验证

`npm run test:logic` 由 `scripts/run-logic-checks.mjs` 自动发现 `check-*.mjs`。长期 contract 是“全部自动发现 regressions 通过”，不维护会漂移的固定脚本总数。

## Repository quality

### static-checks

Node 22：

```text
npm install --omit=dev --ignore-scripts --no-audit --no-fund --no-package-lock
node --check src/*.js
node --check scripts/*.mjs
node --check server/*.mjs
npm run test:logic
```

覆盖 pure rules、Workers、resources、singleplayer state、network schemas、authoritative server integration、real WebSocket runtimes 等。

### Chromium

```text
npm run test:e2e -- --shard=1/2
npm run test:e2e -- --shard=2/2
```

Browser failures 保留 trace/screenshot/report artifacts。Node pure tests 不能替代真实 DOM/Three.js/WebGL/IndexedDB/WebSocket/HTTP integration。

## Merged regression baseline

历史交付继续由 auto-discovered regressions 锁定，后续 PR 不得为了新功能降低这些断言：

- #124：Steve limb/viewmodel、canonical Workbench、footstep/mining/mob audio；
- #125：iron armor recipes/durability/mitigation、Equipment metadata 与 authoritative PvP wear；
- #126：coal harvest/fuel、terrain v3、local terrain-v2 compatibility、terrainVersion persistence；
- #127：FoodData-style hunger/saturation/exhaustion、regen/starvation/sprint gate、food/Furnace、save schema v9 与 browser eating acceptance。

## #127 hunger / food contracts（merged）

`scripts/check-hunger-food.mjs` 锁定 implemented food values、full-food no-consume、movement/action exhaustion、`>4` drain ordering、fast/normal regeneration、Normal-style 1 HP starvation floor、meat Furnace recipes 与 coal fuel。

`check-singleplayer-terrain-version.mjs` 同时锁定两条独立兼容合同：

- `TERRAIN_VERSIONED_SAVE_MIN_VERSION = 8`；
- `SINGLEPLAYER_SAVE_VERSION = 9`。

`tests/e2e/hunger-food.spec.mjs` 在真实单机 survival 页面验证 bread 2→1、满 hunger 不继续消费、regen/starvation 和 IndexedDB v9 persistence。

多人仍没有 server-owned hunger/eat transaction，因此客户端不得本地模拟 multiplayer hunger truth。

## #128 wheat farming contracts

### Pure farming rules

`scripts/check-farming-phase-1.mjs` 必须锁定：

- farmland block IDs 为 `[24,28,29,30,31,32,33,34]`，moisture 0..7 一一对应；
- wheat block IDs 为 `35..42`，age 0..7 一一对应；
- 所有 farmland/wheat ID 都解析到 canonical `minecraft:farmland` / `minecraft:wheat` blockstate；
- wheat states 必须走 `cutout` layer；
- planting 只接受 farmland + air above；
- hydrated farmland 回 moisture 7；无水每 tick 降一级；moisture 0 无 crop 回 dirt，有 crop 保持 farmland；
- current phase-1 wheat growth：wet chance 0.45，dry chance 0.20，单 tick 最多推进一级；
- immature wheat 当前掉 1 seed；mature wheat 当前掉 1 wheat + 0..3 seeds；
- nearby-water probe 保持四格水平半径；
- `wheat_seeds` / `wheat` registry 与 3-wide wheat→bread recipe 存在；
- survival 中成熟 crop 因支撑消失时仍走 mature drop table；creative support removal 不生成物品。

这些数值是当前 phase-1 gameplay contract；其中 crop growth/drop RNG 不代表完整 Java 1.20.1 精确公式。

### Model / source asset contracts

Farming 扩展后确定性 Minecraft model closure 必须保持：

- 12 blockstates；
- 58 models；
- 28 textures；
- metadata 0；
- model atlas 128×128；
- SHA-256 `b8ccd8f5273ab896386ddd1e541419488b89b341748c520521d18fcf59d2658b`。

`check-minecraft-model-runtime.mjs` 锁定所有 opt-in farming block IDs；`check-minecraft-model-texture-binding.mjs` 锁定 closure、atlas SHA/regions 与 farmland/wheat texture presence；Minecraft asset source audit 必须证明生成物来自仓库跟踪的 Java 1.20.1 canonical source。

旧 terrain atlas 必须继续保持 4×4 和既有 SHA；新增 crop presentation 不允许挤占/重排 terrain atlas tile。

`wheat_seeds` 与 `wheat` item texture 使用 asset manifest 的 direct-canonical 路径并参与 asset audit。

### Runtime ownership / persistence

`SingleplayerFarmingRuntime` 的测试边界：

- 只追踪 sparse edited farming cells；
- `world.exportEdits()` 可恢复 tracked farmland/crop；
- edit event 会增量维护 tracked set；
- 10 秒 accumulator 才触发自动 farming tick；
- player mode 决定 support-break drop semantics；
- farming state 通过现有 sparse block edits 持久化，不新增 save schema；schema 继续是 v9。

### Browser farming acceptance

`tests/e2e/farming-phase-1.spec.mjs` 必须走真实 browser action path：

1. 创建 survival world；
2. `/give wheat_seeds 2`；
3. 通过真实 Inventory Shift-click 把 seeds 移入 hotbar；
4. 构造可 raycast farmland target；
5. Pointer Lock 后真实右键触发 `secondaryAction`；
6. 验证 toast、seed 2→1、world cell 为 wheat age 0；
7. 通过 E2E-only deterministic tick hook 逐级验证 age 1→7；
8. 使用真实 primary mining 破坏 mature wheat；
9. ground item 经正常 pickup 后 Inventory 出现 wheat；
10. pageerror / console error 必须为空。

E2E-only hook 只控制测试前置和确定性 tick，不得绕过 planting/mining/inventory/drop 的生产路径。

### Multiplayer authority boundary

PR #128 不声明 multiplayer farming complete。直到 server 拥有 planting、crop tick、drop 与 inventory transaction：

- 客户端不得在 multiplayer 本地跑 `SingleplayerFarmingRuntime`；
- multiplayer secondary use 继续走现有 authority rejection；
- 不允许用视觉 crop 或 local timer 制造 competing world truth。

## #128 明确不覆盖

测试不得暗示以下内容已经完成：

- short grass 自然获得 wheat seeds；
- exact Java random-tick frequency / light / neighbor crop growth-speed formula；
- farmland trampling/fall conversion；
- exact seed drop RNG / Fortune；
- bone meal；
- carrot/potato/beetroot/melon/pumpkin/cocoa/sugar cane/cactus/nether wart 等其它 crops；
- server-authoritative farming；
- #127 仍未完成的 eating duration/status effects/difficulty/gamerule breadth。

## Asset policy

Source-backed claims必须证明 declared source path/provenance。Direct canonical item/block/GUI bindings require explicit allowlist + exact path audit。文件存在于 `MC原版素材assets/` 本身不等于 runtime feature 已实现。

## Exact-head delivery rule

PR Ready / merge 前只认最终 branch HEAD：

1. code/tests/generated outputs/docs complete；
2. final diff self-review；
3. `behind_by=0` or explicit drift handling；
4. exact HEAD static-checks PASS；
5. exact HEAD both Chromium shards PASS；
6. exact HEAD Minecraft asset source audit PASS；
7. reviews / review threads / conversation comments checked；
8. guarded merge uses expected head SHA。

任何 commit after a green run 都会让旧结果失效。

## Current known testing debt

- physical Android/iOS/WebKit breadth；
- long-session memory/GPU leak tracking；
- formal FPS/chunk-generation budgets；
- multiplayer latency/jitter/loss/load soak；
- durable server restart tests；
- server-authoritative hunger/farming/PvE/XP；
- broad status-effect suite；
- broad sound registry / remote SFX / true positional audio / music；
- visual screenshot-diff baseline；
- broad crops, scheduled-tick and redstone suites。
