# Authoritative multiplayer player crafting

This document defines the multiplayer authority boundary for the player's built-in 2x2 crafting grid.

## Scope

The server owns:

- the four 2x2 crafting input slots;
- the current recipe result derived from those slots;
- the player-crafting revision;
- all input-slot left/right/Shift click mutations;
- result pickup and Shift-crafting;
- closing the inventory panel, including returning crafting inputs and the inventory cursor;
- validation against the current authoritative inventory revision and crafting revision for state-selecting crafting actions.

The browser renders replicated state and sends intent only. It never uploads a trusted recipe result, consumed ingredients, replacement crafting grid, or replacement cursor.

## Wire contracts

`player-crafting-snapshot` is versioned independently from inventory/equipment snapshots. It contains exactly four input slots and a server-derived result. The decoder verifies that the provided result is consistent with the local recipe table and the replicated inputs.

`player-crafting-transaction-request` carries:

- `session`;
- an independent `requestId`;
- `expectedInventoryRevision`;
- `expectedCraftingRevision`;
- one action: `input-click`, `take-result`, or `close`.

`player-crafting-transaction-result` correlates the request and reports the current inventory/crafting revisions. `input-click` and `take-result` requests with stale revisions are rejected rather than rebased.

The WebSocket server owns an independent replay gate for player-crafting request IDs. Replayed or stale request IDs close the connection with policy violation code 1008.

## Cross-domain atomicity

Crafting shares the authoritative inventory cursor, so a crafting transaction is a cross-domain mutation. For `input-click` and `take-result`, the server checks both revisions before touching either state.

A state-changing transaction advances each affected domain at most once. Shift-crafting may produce several recipe outputs in one user action, but it still advances the inventory revision once and the crafting revision once.

For a successful state-changing request the server replicates every changed domain before sending the correlated transaction result. A replication failure is treated as a connection/runtime failure rather than acknowledging a split state.

### Ordered close cleanup

`close` is intentionally different from state-selecting crafting actions. It does not ask the server to apply client-authored state; it asks the server to return whatever crafting inputs and inventory cursor the server currently owns.

The request still carries both expected revision fields and still passes the independent request-ID replay gate, but the runtime does not reject `close` merely because those expected revisions are stale. WebSocket message ordering makes it an ordered cleanup barrier: if an inventory/equipment/crafting mutation from the same connection was sent immediately before `close`, the server processes that mutation first and then cleans up the resulting current state.

The browser therefore allows one `close` cleanup request to queue behind one pending player-crafting mutation while ordinary crafting mutations remain serialized. The queue is bounded.

This exception prevents the high-latency failure mode where the user clicks an inventory/crafting slot and immediately presses `E`, the panel hides, and a stale close would otherwise leave an authoritative cursor or crafting input stranded behind the hidden panel.

In multiplayer the UI never sends a separate inventory `return-cursor` request while closing the panel; doing so would create two independent cleanup requests racing the same inventory state.

## Browser behavior

While the authoritative player-crafting sender is attached:

- 2x2 input clicks are sent to the server;
- taking the 2x2 result is sent to the server;
- Shift-crafting is sent to the server;
- closing the inventory sends the single cross-domain `close` transaction;
- one close cleanup may queue behind one pending crafting mutation;
- `CraftingGrid` uses replicated result state and refuses local consumption;
- releasing the multiplayer sender resets the presentation grid back to local mode so a later singleplayer session cannot inherit authoritative crafting state;
- late crafting snapshots without an active multiplayer sender do not mutate local presentation;
- no optimistic crafting mutation is rendered.

If the inventory is completely full, `close` may return `closed-partial` without advancing either revision when no item can move. The server retains the unreturned state and the UI surfaces the partial-cleanup condition instead of silently claiming success.

## Explicit boundary

This work does **not** make the 3x3 workbench container authoritative.

A workbench needs a separate server-owned container lifecycle: authoritative right-click/open, container identity, 3x3 slots, recipe state, concurrent open/close semantics, item return on close/disconnect, and validation that the player may continue using that block. Multiplayer workbench interaction remains fail-closed until that domain is implemented.

Combat and persistence are also outside this crafting authority boundary.

## Validation expectations

The repository quality gate should cover:

- strict request/result/snapshot schemas;
- forged or inconsistent snapshot results rejected;
- input left/right/Shift behavior;
- normal result pickup;
- Shift-crafting with one revision advance per affected domain;
- close-time input/cursor return;
- completely blocked close reporting `closed-partial` without false revision changes;
- immediate `click -> E` cleanup while earlier state is still in flight;
- multiplayer-to-singleplayer presentation reset;
- spectator read-only behavior;
- stale dual-revision rejection for input/result mutations;
- stale expected revisions tolerated only for the server-current `close` cleanup barrier;
- replayed request ID rejection;
- bootstrap waiting for the crafting snapshot;
- fake-WebSocket result correlation and bounded cleanup queue;
- real-WebSocket runtime round trips;
- Chromium interaction through the normal inventory UI.

## Follow-up

The next crafting milestone should be an authoritative workbench container rather than enlarging this 2x2 protocol. The workbench PR should introduce explicit container open/close authority and 3x3 state instead of treating the player's permanent 2x2 grid as a generic remote container.
