# Authoritative Multiplayer Workbench Container

## Purpose

The multiplayer crafting table is a live server-owned container, not a client-owned UI grid. The server decides whether a crafting table can be opened, owns the active 3x3 input matrix, derives recipe output, validates every mutation, and decides when the container must close.

The permanent player 2x2 crafting grid remains a separate authority domain. A workbench is deliberately **not** part of multiplayer bootstrap or movement interpolation because it exists only while a player is actively using an in-world block.

## Open lifecycle

A normal multiplayer `use` action reaches the server with a server-referenced view. Workbench interaction is evaluated before ordinary block placement.

The server raycasts from the authoritative player position and referenced yaw/pitch. If the first target is a crafting table and the player is in survival or creative mode, the server opens a workbench container and sends a `workbench-container-snapshot` containing:

- the authenticated session;
- a server-issued `containerId`;
- the crafting-table block coordinates;
- an independent container revision;
- exactly nine input slots;
- the recipe result derived from those slots.

The client does not open the multiplayer workbench optimistically. The browser panel becomes visible only after the authoritative snapshot is received.

Opening the same already-open table is idempotent. The server does not resend an unchanged snapshot revision, because the client revision gate correctly treats duplicate revisions as protocol errors.

Opening a different table first closes the previous transient container, then opens the new target.

## Transaction contract

Workbench transactions use their own request ID sequence and replay gate. They do not reuse gameplay packet sequence numbers, inventory transaction IDs, equipment IDs, or player-crafting IDs.

Normal mutations carry both:

- `expectedInventoryRevision`, because the workbench shares the authoritative player inventory cursor;
- `expectedContainerRevision`, because the nine workbench inputs have their own revision.

Normal mutation actions are:

- `input-click`: left/right/Shift click on one of nine input slots;
- `take-result`: normal or Shift result pickup.

Both expected revisions must exactly match current server state. Otherwise the request is rejected with `stale-revision` and no mutation is rebased or guessed.

Clients never submit trusted recipe output, replacement input arrays, replacement cursor state, or ingredient-consumption results. Recipe matching and consumption happen on the server.

Each successful UI transaction advances each affected authority domain at most once. Shift-crafting may internally craft multiple results, but it still commits one inventory revision and one container revision for the transaction.

## Close as an ordered cleanup barrier

`close` is different from an ordinary mutation. It carries the current container identity but is allowed to tolerate stale expected revisions. The action contains no client-authored target state; it means: clean up the server's **current** container after all earlier messages already ordered on this WebSocket.

This is required for a common latency race:

1. the player clicks a slot or result;
2. before the round trip completes, the player presses `E`;
3. the mutation reaches the server first;
4. the close reaches the server second and cleans the resulting current state.

The browser permits at most one ordinary workbench mutation in flight and at most one cleanup queued behind it. Ordinary mutations remain serialized and strict.

On close, the server:

1. returns the current 3x3 inputs and inventory cursor to the authoritative inventory where capacity exists;
2. advances the inventory revision once if inventory/cursor state changes;
3. converts any remaining overflow into authoritative world item entities;
4. removes the transient container;
5. sends a workbench close message;
6. acknowledges the correlated close transaction.

The client hides the cursor/panel immediately for user input, but final state still comes from server inventory/container messages.

## Continuous validity

An open workbench is validated on the server every authoritative tick and before every workbench transaction.

The server force-closes the container when:

- the target block is no longer a crafting table (`block-removed`);
- the authoritative player eye position is beyond block reach from the table AABB (`out-of-range`);
- the player changes to a non-interactive mode such as spectator (`mode-invalid`).

Forced close uses the same server-current cleanup path, so input items and cursor state are not stranded in a hidden container.

## Replication and UI

`LiveWorldWebSocketClient` owns workbench live messages because workbenches exist after initial world bootstrap. It maintains:

- active workbench snapshot and independent revision gate;
- independent workbench request sequence;
- correlated pending transaction records.

`multiplayer-workbench-channel.js` is the presentation boundary. While the multiplayer sender is attached it forwards authoritative snapshots/results/closes to the UI. Sender release clears the active snapshot so a later singleplayer session cannot inherit multiplayer workbench state.

The UI routes 3x3 input/result clicks to workbench transactions only while a server snapshot is active. It does not locally consume ingredients or fabricate output.

## Security properties

- Session identity is derived from the authenticated WebSocket and checked on decode.
- Container identity is server-issued and checked on every transaction.
- Request IDs are strictly increasing per connection; replay or duplicate IDs close the socket with policy violation.
- Recipe output is server-derived from authoritative input slots.
- Reach and block identity are server-validated.
- Normal transactions require exact inventory and container revisions.
- Only cleanup `close` is stale-safe, because it applies no client-authored replacement state.
- Overflow is emitted through the authoritative item-entity system rather than client-side drops.

## Current boundary

This PR covers the transient 3x3 crafting-table container only. It does not add generic persistent block inventories such as chests or furnaces. Those need shared/persistent container state, multi-viewer concurrency, locking or conflict policy, chunk lifecycle, save/load persistence, and container-specific rules.

Combat and multiplayer world/player persistence remain separate later authority domains.
