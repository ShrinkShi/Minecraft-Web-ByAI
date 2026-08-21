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
- mining break variants prewarm through the shared **fetch + decode** cache, not only byte fetch;
- current mob source OGG mapping + local attenuation;
- focused browser acceptance observes real source-object HTTP response.

## #125 iron armor contracts（merged baseline）

### Pure armor rules

`check-armor.mjs` / `check-iron-armor-progression.mjs` must prove:

- iron helmet/chestplate/leggings/boots values and canonical assets;
- 165/240/225/195 durability;
- full set = 15 armor points;
- leather armor durability 55/80/75/65;
- Java-style damage-dependent armor mitigation boundaries;
- armor durability damage boundaries;
- all four Workbench recipes including trimmed-grid legal vertical placement;
- armor recipes require 3×3 Workbench;
- iron armor is registered/craftable/giveable without shifting historical `CREATIVE_START`.

### Local Equipment / singleplayer ordering

Tests must prove:

- Equipment restore/snapshot/click/swap/unequip/drain preserve `damage`;
- `damageArmor` mutates all eligible equipped pieces and removes broken pieces;
- no-change/rejected damage does not create false state mutations;
- applied-damage bridge only wears after `player.takeDamage` returns `applied=true`;
- lethal applied hit wears before death cleanup;
- drowning is outside the armor-wear bridge.

### Authoritative Equipment / PvP

Server tests must prove:

- item-stack damage metadata survives authoritative Equipment state;
- each successful wear event advances Equipment revision exactly once;
- break removes the slot;
- real two-client PvP computes mitigation from pre-hit armor, applies wear only when combat damage is accepted and replicates the new Equipment snapshot;
- attack cooldown / hurt cooldown do not wear target armor;
- death cleanup sees the post-wear remaining Equipment state.

Production `CombatRuntimeController` requires an Equipment domain exposing the armor contract; tests must provide a valid test double rather than production code silently optional-chaining missing `damageArmor()`.

### Browser iron armor acceptance

`tests/e2e/iron-armor-progression.spec.mjs` covers a real page flow:

1. create survival world;
2. `/give minecraft:iron_ingot 8`;
3. open a real Workbench;
4. place the vanilla chestplate pattern;
5. craft an iron chestplate;
6. load/decode canonical `iron_chestplate.png` and verify 16×16 source dimensions;
7. move the crafted item through cursor/inventory;
8. equip chestplate;
9. verify armor HUD = 6 points;
10. exercise browser-side damaged Equipment snapshot/wear contract.

## #126 coal / terrain-version contracts

### Coal gameplay and assets

`check-coal-progression.mjs`, `check-asset-manifest.mjs` and `check-minecraft-runtime-assets.mjs` must prove:

- append-only `BLOCK.COAL_ORE = 27` and `coal` item registration;
- wooden pickaxe and above can harvest coal ore while invalid tools cannot;
- successful authoritative-style break produces exactly one coal drop;
- coal is a Furnace fuel for **1600 ticks**;
- `coal_ore.png` is the canonical source for terrain atlas tile 15;
- `coal.png` and moved `white_wool.png` item presentation resolve through audited canonical Java 1.20.1 paths;
- generated 4×4 atlas and manifests match tracked outputs byte/checksum-for-byte/checksum.

### Terrain v3 + v2 local compatibility

`check-terrain-generator.mjs` / `check-singleplayer-terrain-version.mjs` must prove:

- current generator version = 3 and supported local generator set = `[2,3]`;
- v3 coal injection never overwrites deterministic v2 iron positions;
- four golden chunks retain legacy normalized checksums;
- each explicit v2 generator chunk is byte-identical to the corresponding v3 chunk after coal→stone normalization;
- unversioned pre-#126 local save records resolve to terrain v2;
- new local worlds resolve to terrain v3;
- save schema v8 requires a valid `terrainVersion` and rejects unsupported/corrupt versions rather than silently regenerating against another base terrain.

Multiplayer uses a stricter rule: server world-info accepts only the exact current terrain generator version. Supporting v2 for local IndexedDB worlds does **not** make mixed-v2/v3 multiplayer valid.

### Browser coal acceptance

`tests/e2e/coal-progression.spec.mjs` covers a real singleplayer survival flow:

1. create world and equip a wooden pickaxe;
2. prepare a real coal-ore target through the E2E world hook;
3. Jade identifies 煤矿石 and wooden minimum tier;
4. held primary mining breaks the block and wears the wooden pickaxe;
5. canonical coal item appears in the hotbar through normal pickup;
6. no page/console errors are accepted.

## Asset policy

Source-backed claims must prove declared source path/provenance. Direct canonical item/block/GUI bindings require explicit allowlist + exact path audit. Files existing in the original asset tree do not make gameplay implemented by themselves。

## Exact-head delivery rule

PR Ready / merge前只认最终 branch HEAD：

1. code/tests/generated outputs/docs complete;
2. final diff self-review;
3. `behind_by=0` or explicit drift handling;
4. exact HEAD static-checks PASS;
5. exact HEAD both Chromium shards PASS;
6. exact HEAD Minecraft asset source audit PASS;
7. reviews / review threads / conversation comments checked;
8. guarded merge uses expected head SHA.

Any commit after a green run invalidates that run as final evidence。

## Current known testing debt

- physical Android/iOS/WebKit breadth;
- long-session memory/GPU leak tracking;
- formal FPS/chunk-generation budgets;
- multiplayer latency/jitter/loss/load soak;
- durable server restart tests;
- server-authoritative PvE/XP;
- broad sound registry / remote SFX / true positional audio / music;
- visual screenshot-diff baseline;
- full farming/scheduled-tick/redstone suites when those features exist.
