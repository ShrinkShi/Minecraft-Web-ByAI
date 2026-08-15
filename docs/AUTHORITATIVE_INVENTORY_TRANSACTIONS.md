# Authoritative multiplayer inventory transactions

## Goal

Multiplayer inventory slot interaction must not mutate browser-local inventory state and then wait for a later server snapshot to correct it.

This layer makes the existing 36-slot player inventory and carried cursor stack server-authoritative. The browser sends only an operation intent against the revision it has already observed. The server validates that revision, applies the operation to its own inventory state, advances the inventory revision when state changes, replicates the resulting snapshot, and finally acknowledges the request.

Equipment and crafting are deliberately outside this first transaction layer. Their multiplayer UI paths fail closed instead of reusing singleplayer-local state.

## Snapshot version 3

`inventory-snapshot` version 3 contains:

- session id;
- inventory revision;
- player mode;
- exactly 36 inventory slots;
- authoritative carried `cursor` stack or `null`.

The cursor is part of the revisioned state. Picking up, splitting, placing, merging, swapping, shift-moving, or returning a cursor stack cannot change only the browser copy.

## Client request

`inventory-transaction-request` version 1 contains:

- session id;
- independent uint32 `requestId`;
- `expectedRevision`;
- one strict action.

Supported actions:

- `slot-click`: slot index, mouse button `0` or `2`, and Shift modifier;
- `return-cursor`: request the server to merge the carried cursor back into the 36-slot inventory where capacity exists.

The request never contains a replacement slot array, resulting item stack, item count, cursor result, or equipment/crafting state. Those values remain server-owned.

Inventory request IDs use an independent replay gate. They do not consume gameplay packet sequence numbers, command request IDs, or chat sequence numbers.

## Revision guard

Every request is evaluated against the server's current inventory revision.

If `expectedRevision` differs from the current revision, the request returns:

- `ok: false`;
- `code: stale-revision`;
- the current server revision.

The operation is not partially applied or rebased.

WebSocket ordering means any earlier authoritative inventory snapshot sent by the same server connection is delivered before the stale result. The client therefore does not request or accept a duplicate same-revision snapshot just to recover from a rejected click.

The browser currently allows only one pending inventory transaction per connection. This deliberately serializes revision-dependent UI operations. Rapid extra clicks fail locally rather than queueing multiple requests against the same stale revision.

## Server operation semantics

The server owns the same basic inventory click semantics used by singleplayer:

- left click empty cursor + occupied slot: pick up full stack;
- left click cursor + empty slot: place full stack;
- left click compatible stacks: merge up to max stack size;
- left click incompatible stacks: swap;
- right click empty cursor + occupied slot: pick up the larger half;
- right click cursor + empty slot: place one;
- right click compatible stacks: merge one;
- Shift click: move between main inventory and hotbar;
- return cursor: merge the cursor back into available inventory space.

A successful state-changing transaction advances the inventory revision exactly once.

Spectator slot clicks are read-only and return `spectator-read-only` without changing revision. `return-cursor` remains available so an existing cursor stack cannot become permanently trapped by a mode transition.

## Replication ordering and failure behavior

For a state-changing transaction the server sends:

1. the new authoritative `inventory-snapshot`;
2. the correlated `inventory-transaction-result`.

The UI changes only when the snapshot is applied. It does not render an optimistic inventory mutation.

If server state changes but the authoritative snapshot cannot be delivered, the transaction handler treats that as an internal failure and the WebSocket connection is closed instead of returning a false success.

## UI boundary

When the authoritative transaction sender is attached:

- normal 36-slot inventory clicks are routed to the server;
- equipment clicks are blocked with an explicit multiplayer message;
- 2×2 and 3×3 crafting input/result clicks are blocked;
- multiplayer crafting grids are reset when the authoritative inventory is bound;
- closing a panel with a non-empty authoritative cursor sends `return-cursor` instead of mutating the client model;
- cursor rendering is shown only while an inventory/workbench panel is open.

This removes the previous transient client-side "fake inventory" behavior where multiplayer UI clicks could modify `Inventory` locally until the next server snapshot overwrote them.

## Validation

Coverage includes:

- strict transaction request/result schema checks, including rejection of client-supplied replacement inventory state;
- authoritative cursor state-machine checks for split/place/merge/Shift/return and spectator read-only behavior;
- fake WebSocket checks for one-pending-request serialization and correlated results;
- real WebSocket checks for revision-guarded mutation, stale-revision rejection, and replay disconnect;
- inventory snapshot v3 slot/cursor item-instance validation;
- Chromium E2E that clicks the real multiplayer inventory DOM, observes server-owned cursor/revision changes, and verifies equipment interaction stays fail-closed.

## Follow-up

The next inventory-related work should not expand `slot-click` into a catch-all protocol. Add separate authoritative domains for:

1. equipment slots and armor state;
2. player 2×2 crafting grid;
3. workbench 3×3 crafting grid;
4. server-side recipe matching/ingredient consumption/output creation;
5. close/disconnect policy for crafting-grid contents and cursor overflow;
6. transaction UX for latency, rejection and reconnect recovery.

Crafting requests must express intent; clients must never submit a trusted crafted result or ingredient-consumption result.
