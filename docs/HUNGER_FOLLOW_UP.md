# Hunger follow-up — status effects and multiplayer authority

## Status

PR #136 was squash-merged on 2026-08-26.

- Base used for final review: `main 3bdf713d44de15e47dd2d8a731b2832dea7fca33`
- Final reviewed head: `80cc188fd9deaec104c4a86ab8e952965f4759f1`
- Merge commit: `6a56c33d79c074f95f2be750f9d25ec246766b1b`
- Repository quality: run #1271 (`32924502937`) — static checks and both Chromium shards succeeded.

This slice closes the explicit deferrals left by the merged hunger core and timed-food-use work. It does not redefine terrain generation, block/item IDs, or the historical Creative starter ordering.

## Delivered scope

### Food status effects

- Adds reusable finite-duration status-effect state instead of hard-coding food poisoning into the player loop.
- Raw chicken carries a 30% chance of Hunger I for 30 seconds.
- Rotten flesh carries an 80% chance of Hunger I for 30 seconds.
- Effect rolls happen only after a completed successful food transaction; cancelled or rejected use cannot apply an effect.
- Active Hunger effects add exhaustion through the same hunger state used by ordinary movement/combat exhaustion.

### Difficulty and regeneration boundary

The hunger rules model the Java 1.20.1 difficulty boundary used by this project:

- Peaceful: no starvation damage; food/health recovery follows the implemented natural-regeneration boundary.
- Easy: starvation stops at 10 HP.
- Normal: starvation stops at 1 HP.
- Hard: starvation may reduce HP to 0.
- `naturalRegeneration=false` disables hunger-driven natural healing.

These rules remain pure and testable independently of browser/UI code.

### Singleplayer persistence

Singleplayer save schema advances from v9 to v10 because active status effects are persisted. The migration keeps pre-v10 worlds loadable while preserving the existing terrain-version contract:

- terrain generator remains v4;
- the terrain-version requirement introduced by the earlier save schema remains intact;
- status effects restore as normalized finite-duration records;
- transient active food-use input is not persisted.

### Multiplayer server authority

Multiplayer Hunger is a separate revisioned authoritative state owned by the server.

`ServerPlayerHungerHub` and `HungerRuntimeController` own:

- food, saturation, exhaustion and hunger timer;
- active status effects;
- active 1.6-second food-use state;
- sprint eligibility at the Survival food threshold;
- movement, swimming, jump, successful attack and successful-damage exhaustion;
- natural regeneration and starvation damage through the Combat authority API;
- respawn reset and mode/session lifecycle.

The client does not run a competing multiplayer hunger simulation.

## Food-use transaction contract

A multiplayer food use follows the same user-facing held/cancelable boundary as singleplayer:

1. client sends one authoritative `use` edge for the selected hotbar slot;
2. server validates mode, held item and food profile and starts the 1.6-second use state;
3. `use-release`, attack, drop, respawn, mode change, death, or selected-stack change can cancel the pending use;
4. completion revalidates the selected stack;
5. hunger/effect mutation and selected-stack decrement commit through the authoritative inventory transaction boundary;
6. inventory and Hunger snapshots are replicated after a successful commit.

Workbench and Furnace interaction retain priority over eating so holding food does not prevent opening those containers.

## Network/bootstrap contract

- Hunger replication uses `player-hunger-snapshot` with its own revision gate.
- Live multiplayer bootstrap explicitly requires an initial Hunger snapshot before `MultiplayerMovementSession` becomes ready.
- The generic bootstrap remains opt-in for the Hunger barrier so lower-level/custom transport tests are not falsely forced to emulate the full live-world client.
- The authoritative Hunger snapshot is applied to `PlayerController`, first-person food-use presentation and Hunger HUD only as presentation/cache state; the server remains the source of truth.
- The action frame includes `use-release`; player action frame is v3 and the incompatible handshake/subprotocol is v5 / `minecraft-web-v5`.

## Combat boundary

Hunger does not mutate Combat HP internals directly. `CombatRuntimeController` exposes explicit healing and environment-damage entry points; hunger regeneration/starvation call those authority APIs. Successful PvP attack/damage outcomes feed exhaustion back into Hunger exactly once.

## Validation contract

Logic/runtime regression covers:

- food metadata and effect probabilities;
- status-effect normalization, ticking and persistence;
- difficulty starvation floors and `naturalRegeneration` behavior;
- 1.6-second server food use, cancellation and atomic inventory commit;
- sprint gate and movement/jump/attack/damage exhaustion;
- regeneration, starvation and respawn reset;
- Hunger snapshot wire validation/revision ordering;
- use-release input/action compatibility;
- bootstrap Hunger barrier and remote-player buffering compatibility.

Chromium acceptance covers both authority modes:

- singleplayer timed/cancelable food use and save schema v10;
- real browser → real authoritative Node server multiplayer Hunger bootstrap;
- early right-button release leaves food and inventory unchanged;
- uninterrupted 1.6-second use commits bread count and Hunger together;
- authoritative Hunger snapshots update the browser HUD (`10 → 15`) without a client-side competing simulation.

## Compatibility invariants

- terrain generator stays v4;
- block IDs and item IDs are not reordered by this slice;
- historical `CREATIVE_START` ordering/slot mapping is unchanged;
- active food use remains transient and is not stored in singleplayer saves;
- multiplayer Hunger has one server source of truth;
- singleplayer save schema is v10;
- multiplayer handshake/subprotocol is v5 / `minecraft-web-v5`.

## Merge record

Final exact-head gate before merge:

- JavaScript syntax: success;
- full logic/worker regression: success;
- Chromium shard 1/2: success;
- Chromium shard 2/2: success;
- base drift: zero;
- unresolved review threads/comments: none.

PR #136 was then squash-merged as `6a56c33d79c074f95f2be750f9d25ec246766b1b`.
