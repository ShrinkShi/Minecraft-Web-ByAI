# Hunger Phase 2 — timed food use

## Scope

This delivery slice upgrades singleplayer food from an instantaneous secondary-click transaction to a held, interruptible use action.

- Java-style food use duration: **1.6 seconds**.
- Desktop right mouse and mobile Use expose press/release edges through a dedicated secondary channel.
- The existing multiplayer movement snapshot/protocol remains `CONTROL_INTENT_VERSION = 1`; secondary hold state is deliberately not serialized into movement input.
- A food item is consumed and hunger/saturation are applied only after the full use duration completes.
- Releasing Use, opening a panel/pausing/losing gameplay control, changing hotbar item, dropping the selected stack, changing out of survival mode, or beginning a primary attack cancels an active food use without consuming the item.
- First-person presentation receives continuous food-use progress so the hand/item remains in an eating pose for the full action instead of playing only the short generic use pulse.

## Time-domain contract

Player physics intentionally clamps simulation `dt` to protect collision and movement stability. A use-duration interaction is different: the player expects 1.6 seconds of real held input, even when rendering is temporarily slow.

`SingleplayerFoodUseRuntime` therefore keeps the pure `stepFoodUse(state, dt)` state machine, but its browser runtime also tracks a monotonic wall clock and advances by `max(simulationDt, wallElapsed)`. This prevents a 5 FPS browser from stretching a nominal 1.6 s eat into 6+ real seconds while keeping deterministic rules independently testable.

Active use is never advanced while the game is paused because the control reset cancels it before the paused frame loop stops gameplay updates.

## Authority boundary

Singleplayer food completion is local-authoritative. Multiplayer food/hunger remains disabled until the server owns hunger, use duration, inventory consumption, and resulting player state in one authoritative transaction.

The **secondary input edge itself** remains multiplayer-compatible: `installMultiplayerSecondaryRouting()` intercepts the new held-secondary press and sends exactly one server `use` action; release is consumed locally and does not produce a second wire action. Survival and creative can send use, spectator cannot. This preserves existing authoritative placement/tool/container interactions without adding secondary state to movement protocol v1.

## Completion transaction

At completion the runtime revalidates:

1. mode is still survival;
2. selected stack still matches the started food item and has at least one item;
3. `player.eat()` accepts the food;
4. selected-stack removal succeeds.

If inventory removal unexpectedly fails after hunger application, the prior hunger state is restored. This avoids a partial client-side commit.

## Persistence

No save-schema bump is required. Active use is transient input state and is never persisted. Only the already-persisted hunger/saturation/exhaustion fields and inventory state change after successful completion. Current singleplayer save schema remains v9 and current terrain remains v4.

## Validation contract

Pure/runtime checks lock:

- 1.6 s completion threshold;
- no early consumption;
- release cancellation;
- selected-item and mode cancellation;
- exactly one completion callback per started use;
- wall-clock completion under clipped simulation dt;
- secondary input staying outside the multiplayer movement snapshot;
- multiplayer held-secondary press producing one authoritative use while release produces none.

Browser acceptance additionally proves:

1. two breads are present in the selected hotbar slot;
2. holding Use for less than 1.6 s leaves count and hunger unchanged while runtime and first-person food-use states are active;
3. releasing early cancels the use and waiting afterward cannot consume the item;
4. a new uninterrupted hold reaches completion, changes count `2 → 1`, hunger `10 → 15`, and saturation `0 → 6`;
5. full hunger rejects a new use and leaves the final bread intact;
6. bed and bone-meal interactions still behave as complete right-click edges after the input migration;
7. the final world save remains schema v9 / terrain v4.

## Explicitly deferred

- food status effects such as raw-chicken Hunger and rotten-flesh Hunger;
- difficulty/gamerule variants;
- server-authoritative multiplayer hunger/use transactions;
- continuous stack auto-repeat while the button remains held after one item finishes.
