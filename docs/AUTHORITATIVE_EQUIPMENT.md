# Authoritative multiplayer equipment

## Scope

Multiplayer armor slots are a separate server-owned state domain from the 36-slot player inventory.

The server owns four fixed equipment slots:

- `head`
- `chest`
- `legs`
- `feet`

Each slot is either empty or contains exactly one armor item whose `armorSlot` matches that slot. The browser never submits a trusted equipped item or resulting cursor state.

This layer does **not** make multiplayer combat authoritative. It only makes equipment state and the inventory-cursor exchange authoritative. Combat damage/mitigation must consume server-owned equipment later when the combat authority layer exists.

## Equipment snapshot

`equipment-snapshot` version 1 contains:

- session id;
- independent equipment revision;
- the exact four equipment slots.

The equipment revision is independent from the inventory revision because both domains can also change separately.

A multiplayer session is not ready until world info, initial world edits, inventory, equipment and the initial player snapshot have all passed bootstrap validation.

## Transaction request

`equipment-transaction-request` version 1 contains only intent:

- session id;
- independent equipment request id;
- `expectedInventoryRevision`;
- `expectedEquipmentRevision`;
- target equipment slot;
- mouse button (`0` or `2`).

The request does not contain replacement equipment state, a replacement inventory cursor, an armor-point total or a trusted result stack.

Equipment requests have their own replay gate and do not consume gameplay packet sequence numbers, inventory transaction request IDs, command IDs or chat sequences.

The browser currently allows one pending equipment transaction at a time.

## Cross-domain atomicity

An equipment click can exchange an armor item with the authoritative inventory cursor. Therefore validating only the equipment revision would be unsafe.

The server reads both current revisions and rejects the operation with `stale-revision` unless both expected values match.

For a state-changing transaction the server mutates the equipment slot and inventory cursor as one server-side operation and advances both revisions exactly once. Supported outcomes are:

- `equipped`: valid cursor armor moves into an empty matching equipment slot;
- `unequipped`: an equipped item moves to an empty cursor;
- `swapped`: valid matching cursor armor swaps with the equipped item;
- `invalid-item`: cursor item cannot occupy the target slot;
- `spectator-read-only`: spectator equipment mutation is rejected;
- `no-change`: no state can change.

Because armor items currently have stack size one, equipment never trusts or creates a multi-item equipped stack.

## Replication ordering

For a successful state-changing transaction the server sends, in order:

1. the new authoritative inventory snapshot, including the cursor;
2. the new authoritative equipment snapshot;
3. the correlated equipment transaction result containing both resulting revisions.

The browser changes neither cursor nor equipment optimistically.

If server state changes but either required snapshot cannot be delivered, the handler fails the connection instead of sending a false success result. A client may therefore briefly have received the first snapshot before a transport failure, but the session terminates rather than continuing with an acknowledged split state.

## UI behavior

When the multiplayer equipment sender is attached, equipment-slot clicks are routed to the server and local `Equipment.click()` is not called.

Normal singleplayer equipment behavior remains local and unchanged.

Crafting remains deliberately fail-closed in multiplayer. Equipment authority must not be used as a shortcut to trust the existing local crafting grid.

## Validation

Coverage includes:

- strict equipment snapshot schema and armor-slot validation;
- strict dual-revision request/result wire contracts;
- direct authoritative equipment + inventory cursor state-machine tests;
- fake-WebSocket request serialization and result correlation;
- real WebSocket dual-revision stale rejection and replay disconnect;
- bootstrap and movement-session equipment snapshot propagation;
- Chromium E2E using the normal inventory UI to equip and unequip armor through server authority;
- continued Chromium coverage proving crafting remains fail-closed.

## Follow-up

Crafting should be the next inventory-adjacent state domain, but it should remain separate from this protocol. A correct crafting layer needs server-owned 2x2/3x3 container state, recipe matching, ingredient consumption, output generation, Shift-crafting behavior and explicit close/disconnect item-return policy.
