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
- validation against the current authoritative inventory revision and crafting revision.

The browser renders replicated state and sends intent only. It never uploads a trusted recipe result, consumed ingredients, replacement crafting grid, or replacement cursor.

## Wire contracts

`player-crafting-snapshot` is versioned independently from inventory/equipment snapshots. It contains exactly four input slots and a server-derived result. The decoder verifies that the provided result is consistent with the local recipe table and the replicated inputs.

`player-crafting-transaction-request` carries:

- `session`;
- an independent `requestId`;
- `expectedInventoryRevision`;
- `expectedCraftingRevision`;
- one action: `input-click`, `take-result`, or `close`.

`player-crafting-transaction-result` correlates the request and reports the current inventory/crafting revisions. A stale request is rejected rather than rebased.

The WebSocket server owns an independent replay gate for player-crafting request IDs. Replayed or stale request IDs close the connection with policy violation code 1008.

## Cross-domain atomicity

Crafting shares the authoritative inventory cursor, so a crafting transaction is a cross-domain mutation. The server checks both revisions before touching either state.

A state-changing transaction advances each affected domain at most once. Shift-crafting may produce several recipe outputs in one user action, but it still advances the inventory revision once and the crafting revision once.

For a successful state-changing request the server replicates every changed domain before sending the correlated transaction result. A replication failure is treated as a connection/runtime failure rather than acknowledging a split state.

The `close` action is deliberately part of the crafting protocol. In multiplayer the UI does not send a separate inventory `return-cursor` request while closing the panel; doing so would race two revision-dependent transactions against the same inventory revision.

## Browser behavior

While the authoritative player-crafting sender is attached:

- 2x2 input clicks are sent to the server;
- taking the 2x2 result is sent to the server;
- Shift-crafting is sent to the server;
- closing the inventory sends the single cross-domain `close` transaction;
- `CraftingGrid` uses replicated result state and refuses local consumption;
- no optimistic crafting mutation is rendered.

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
- spectator read-only behavior;
- stale dual-revision rejection;
- replayed request ID rejection;
- bootstrap waiting for the crafting snapshot;
- fake-WebSocket result correlation;
- real-WebSocket runtime round trips;
- Chromium interaction through the normal inventory UI.

## Follow-up

The next crafting milestone should be an authoritative workbench container rather than enlarging this 2x2 protocol. The workbench PR should introduce explicit container open/close authority and 3x3 state instead of treating the player's permanent 2x2 grid as a generic remote container.
