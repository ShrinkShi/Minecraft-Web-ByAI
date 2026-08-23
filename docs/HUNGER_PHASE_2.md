# Hunger Phase 2 — timed food use

## Scope

This delivery slice upgrades singleplayer food from an instantaneous secondary-click transaction to a held, interruptible use action.

- Java-style food use duration: **1.6 seconds**.
- Desktop right mouse and mobile Use expose press/release edges through a dedicated secondary channel.
- The existing multiplayer movement snapshot/protocol remains `CONTROL_INTENT_VERSION = 1`; secondary hold state is deliberately not serialized into movement input.
- A food item is consumed and hunger/saturation are applied only after the full use duration completes.
- Releasing Use, opening a panel/pausing/losing gameplay control, changing hotbar item, changing out of survival mode, or beginning a primary attack cancels an active food use without consuming the item.
- First-person presentation receives continuous food-use progress so the hand/item can remain in an eating pose for the full action instead of playing only the short generic use pulse.

## Authority boundary

This slice remains singleplayer-authoritative. Multiplayer food use stays disabled until the server owns hunger, use duration, inventory consumption, and resulting player state in one authoritative transaction.

## Persistence

No save-schema bump is required. Active use is transient input state and is never persisted. Only the already-persisted hunger/saturation/exhaustion fields and inventory state change after successful completion.

## Validation contract

Pure/runtime checks lock:

- 1.6 s completion threshold;
- no early consumption;
- release cancellation;
- selected-item and mode cancellation;
- exactly one completion callback per started use;
- secondary input staying outside the multiplayer movement snapshot.

Browser acceptance must additionally prove:

1. two breads are present in the selected hotbar slot;
2. holding Use for less than 1.6 s leaves count and hunger unchanged while the first-person food-use state is active;
3. releasing early cancels the use and waiting afterward cannot consume the item;
4. a new uninterrupted hold reaches completion, changes the count from 2 to 1, and applies the bread hunger/saturation values;
5. the final world save remains schema v9 / terrain v4 and persists the completed hunger state.

## Explicitly deferred

- food status effects such as raw-chicken Hunger and rotten-flesh Hunger;
- difficulty/gamerule variants;
- server-authoritative multiplayer hunger/use transactions;
- continuous stack auto-repeat while the button remains held after one item finishes.
