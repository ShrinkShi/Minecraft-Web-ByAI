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

Browser failures保留 trace/screenshot/report artifacts。Node pure tests不能替代真实 DOM/Three.js/WebGL/IndexedDB/WebSocket/HTTP/OGG integration。

## #124 presentation/audio contracts（merged baseline）

- anatomical Steve limb sides and first-person Mesh direction;
- canonical Workbench computed geometry;
- 1.6-block local footstep cadence and suppression rules;
- ~200 ms mining-hit cadence;
- mining break variants prewarm through shared fetch + decode cache;
- current mob source OGG mapping + local attenuation。

## #125 iron armor contracts（merged baseline）

Pure/server/browser regressions continue to prove iron armor values/recipes/durability, damage-dependent mitigation, Equipment damage metadata, wear/break revisions, singleplayer applied-damage ordering and two-client authoritative PvP replication. #127 may not weaken those contracts。

## #126 coal / terrain-version contracts（merged baseline）

`check-coal-progression.mjs`, terrain generator checks and browser acceptance continue to prove coal harvest/fuel, terrain v3 deterministic injection, explicit local v2 byte compatibility, exact-current multiplayer terrain gating and canonical coal/coal-ore resources。

Save compatibility remains particularly important: terrain generator v3 is new-world default, but pre-#126 unversioned local worlds pin to v2 rather than silently changing unexplored base terrain。

## #127 hunger / food contracts

### Pure FoodData-style rules

`scripts/check-hunger-food.mjs` must prove：

- food level range 0..20, saturation never exceeds current food level, exhaustion is bounded；
- Java 1.20.1 nutrition/saturation values for the implemented food set；
- full food blocks ordinary food consumption and does not consume inventory；
- sprint ground movement = 0.1 exhaustion/m, swimming = 0.01/m；
- normal jump = 0.05 exhaustion, sprint-jump = 0.2, successful attack = 0.1, successful damage = 0.1；
- survival food `>6` allows sprint, food `<=6` blocks sprint；creative is not hunger-gated；
- exhaustion is processed when `>4`, one threshold per runtime tick；saturation is reduced before food；
- saturated fast regen begins at food=20 + saturation>0 and uses the 10-tick/0.5s boundary；
- normal regen uses food>=18 and the 80-tick/4s boundary；
- regeneration-added exhaustion is not drained again in the same tick；
- starvation at food=0 uses the 80-tick/4s boundary and the current Normal-style 1 HP floor；
- four meat cooking recipes produce the matching cooked food in 200 ticks at 0.35 Furnace XP；
- coal remains a 1600-tick fuel。

### Food registry / asset contracts

`check-asset-manifest.mjs` must prove the following new IDs use explicit direct-canonical Java 1.20.1 item paths：

- `apple`
- `bread`
- `cooked_beef`
- `cooked_mutton`
- `cooked_porkchop`
- `cooked_chicken`

Existing raw meats and rotten flesh remain source-backed runtime items. A file existing under `MC原版素材assets/` is not enough: every runtime food texture must resolve through a logical asset key and the asset audit must find the tracked file。

### Save schema v9 compatibility

`check-singleplayer-terrain-version.mjs` must prove two independent version contracts：

- `TERRAIN_VERSIONED_SAVE_MIN_VERSION = 8`：v8 and newer saves missing `terrainVersion` are corrupt and rejected；
- `SINGLEPLAYER_SAVE_VERSION = 9`：#127 adds persisted `exhaustion` and `foodTickTimer` without changing the terrain-version compatibility boundary。

Old player snapshots that do not contain exhaustion/timer restore them as zero. Legacy pre-#126 terrain behavior remains unchanged。

### Browser hunger/food acceptance

`tests/e2e/hunger-food.spec.mjs` covers a real singleplayer survival page：

1. create a world and `/give bread 2`；
2. move bread through the real Inventory/hotbar UI；
3. set controlled hunger state through the E2E-only test hook；
4. right-click food and verify bread raises food 10→15 and saturation 0→6 while consuming exactly one item；
5. set food=20 and verify a second use is rejected without consuming the last bread；
6. exercise saturated fast regeneration；
7. exercise food=0 starvation to the current Normal 1 HP floor；
8. pause and read IndexedDB to verify save schema v9, terrainVersion=3, hunger/saturation/exhaustion/timer persistence；
9. no pageerror/console-error is accepted。

### Exhaustion persistence acceptance

The integration review additionally requires all hunger mutations that may occur without another gameplay mutation to mark singleplayer state dirty. In particular, short sprint/swim movement and successful bare-hand attacks cannot depend on a future inventory/world edit before exhaustion becomes saveable。

### Multiplayer authority boundary

PR #127 does **not** declare multiplayer hunger complete。Until a server-owned hunger domain and eat transaction exist：

- the authoritative multiplayer runtime does not tick a local competing FoodData state；
- client secondary use explicitly rejects local multiplayer eating；
- shared Furnace recipes may be used by the authoritative Furnace because they are pure processing rules, but eating remains unavailable in multiplayer rather than becoming client truth。

## Known parity exclusions for #127

The tests must not imply the following are implemented：

- vanilla ~1.6 second food use duration / eating animation / use cancellation；
- raw chicken and rotten flesh Hunger status effects；
- difficulty selection / gamerule configuration；
- golden food, stew, cake, honey, chorus fruit and broad registry；
- wheat growth/harvest and wheat→bread crafting acquisition；
- server-authoritative multiplayer hunger/eating。

## Asset policy

Source-backed claims must prove declared source path/provenance。Direct canonical item/block/GUI bindings require explicit allowlist + exact path audit。Files existing in the original asset tree do not make gameplay implemented by themselves。

## Exact-head delivery rule

PR Ready / merge前只认最终 branch HEAD：

1. code/tests/generated outputs/docs complete；
2. final diff self-review；
3. `behind_by=0` or explicit drift handling；
4. exact HEAD static-checks PASS；
5. exact HEAD both Chromium shards PASS；
6. exact HEAD Minecraft asset source audit PASS；
7. reviews / review threads / conversation comments checked；
8. guarded merge uses expected head SHA。

GitHub Actions 使用 `GITHUB_TOKEN` 推出的 bootstrap/finding-fix commit 不会自动触发新的正式 workflow，因此这类内部 runner 的绿色只用于 finding closure，不能代替后续正常用户提交触发的 exact-head gate。任何 commit after a green run 都会让旧结果失效。

## Current known testing debt

- physical Android/iOS/WebKit breadth；
- long-session memory/GPU leak tracking；
- formal FPS/chunk-generation budgets；
- multiplayer latency/jitter/loss/load soak；
- durable server restart tests；
- server-authoritative hunger/PvE/XP；
- broad status-effect suite；
- broad sound registry / remote SFX / true positional audio / music；
- visual screenshot-diff baseline；
- full farming/scheduled-tick/redstone suites when those features exist。
