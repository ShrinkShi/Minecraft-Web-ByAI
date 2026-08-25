# Creative Mode Overhaul

Status: **merged** via PR #134 into `main ad12dd143263628aac856a1538d6093a7614dae3` on 2026-08-25.

This delivery separates Creative presentation, flight, targeting and item creation from historical bootstrap inventory behavior. It does not claim full Minecraft Java 1.20.1 Creative parity.

## Delivered scope

### Flight

- Entering Creative no longer forces permanent flight.
- A double Jump press toggles Creative flight; desktop Space and mobile Jump feed the same edge detector.
- Spectator remains forced-flying; Survival and Adventure remain non-flying.
- Multiplayer clients send only a `flight-toggle` intent. The server owns the resulting `flying` state and sends it back in the authoritative self snapshot.

### HUD

- Creative and Spectator hide survival-only hearts/hunger, armor, XP and oxygen presentation.
- The hotbar remains visible.
- HP, hunger, armor, XP and oxygen gameplay state are not overwritten or faked to implement the visual change.
- Later armor/oxygen renders are guarded so they cannot accidentally re-show survival bars while the current mode is Creative/Spectator.

### Hostile target eligibility

- Survival and Adventure players remain eligible hostile targets.
- Creative and Spectator players are not acquired/maintained as hostile targets.
- When a target becomes ineligible, chase/melee/ranged target-facing behavior stops and Creeper fuse state is cleared.
- Existing physical knockback decay remains active; daylight, ambient, spawn and despawn behavior are outside this target-eligibility change.

### Creative catalog

- `CREATIVE_START` remains the historical bootstrap compatibility surface and was not expanded into a fake full Creative inventory.
- The live Creative catalog is derived from the current `ITEMS` registry.
- Current catalog categories are building, tools, combat, food, nature, materials and misc, plus an all-items view.
- Search matches registered item names and IDs.
- The Creative inventory presentation hides the Survival equipment/2×2-crafting/main-inventory region, shows the catalog, and keeps the real nine-slot hotbar.
- Catalog selection creates/replaces the real carried cursor stack; normal inventory slot transactions then place/swap that stack.

## Multiplayer Creative item authority

Inventory transaction protocol is **v2** and adds `creative-pick`.

Client request payload:

```text
{ type: "creative-pick", itemId }
```

The client cannot provide a trusted stack count. The server:

1. checks the current authoritative inventory revision;
2. rejects dead/non-Creative sessions;
3. validates the item ID against the server registry;
4. derives the stack count from the registered item maximum stack;
5. replaces the authoritative cursor and increments the inventory revision;
6. replicates the new inventory snapshot before returning the correlated transaction result.

Unknown items and non-Creative requests do not mutate inventory revision or cursor state. Replay/stale-revision protections remain shared with ordinary inventory transactions.

Because transaction semantics changed incompatibly, the multiplayer handshake/subprotocol is **v4 / `minecraft-web-v4`**. Legacy v3 peers are rejected rather than silently treated as compatible.

## Compatibility boundaries

PR #134 preserves:

- existing block IDs;
- existing item IDs;
- singleplayer save schema **v9**;
- terrain generator **v4** and explicit local v2/v3 compatibility paths;
- historical `CREATIVE_START` ordering and starter slots.

Flight is not added to the singleplayer save schema as a new persistent field. The player mode remains the persistence boundary; runtime flight state is normalized from mode rules.

## Validation and merge gate

The delivery is covered by pure/runtime and browser tests for:

- double-Jump Creative flight and server-owned flight toggle sequencing;
- self snapshot flight transport without breaking remote-player interpolation;
- Creative/Spectator HUD visibility while preserving underlying vitals;
- hostile target exclusion, Creeper fuse reset and retained knockback decay;
- registry-complete Creative catalog classification/search and unchanged `CREATIVE_START`;
- strict inventory transaction v2 wire validation, including rejection of client-supplied Creative counts;
- authoritative Creative pick mode/item/revision semantics;
- real WebSocket Creative-pick snapshot/result ordering and replay guards;
- singleplayer browser catalog search/category/cursor/hotbar behavior;
- multiplayer browser catalog-to-server inventory round trip.

Final PR head `e2dd61ae5603839ed4590f2a58121a4aad296a13` passed Repository quality run #1212: static checks, Chromium 1/2 and Chromium 2/2 all succeeded. The branch was `behind_by=0` with no reviews, review threads or PR comments before squash merge.

## Explicit non-goals

This work does not add the complete Java 1.20.1 Creative tab ordering/search tags, operator-only tabs, saved hotbars, every registered vanilla item/block, Creative command parity, server-authoritative PvE, or the missing broader registry/worldgen/redstone/dimension/status-effect systems. Strict overall Java 1.20.1 parity therefore remains conservatively about **35%**.
