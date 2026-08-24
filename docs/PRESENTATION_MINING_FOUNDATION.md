# PR #133 — Presentation / Mining Foundation

## Purpose

This document defines the delivery boundary for PR #133, branch `feature/presentation-mining-creative-foundation`, based on merged `main 69749b6e19ee3f7ecb4aa62e6e96a82a6d6a87cc`.

The PR intentionally closes a small set of player-presentation and mining-feedback defects before the larger Creative-mode overhaul. It must not be used to claim that Creative inventory, flight toggling, hostile-targeting rules or full Java loot tables are complete.

## First-person hand position

The existing source-backed right-arm viewmodel remains unchanged structurally. Only its neutral root anchor moves slightly farther right/down:

- X: `.56 → .61`
- Y: `-.47 → -.52`
- Z remains `-1.10`

Attack, use and sustained food-use transforms continue to layer on top of that neutral pose.

## Third-person locomotion

`src/player-locomotion-rules.js` is the pure locomotion-pose source.

Current constants:

- walk leg swing: `.62 rad`
- walk arm swing: `.52 rad`
- sprint leg swing: `1.05 rad`
- sprint arm swing: `.92 rad`
- sprint body lean: `.20 rad`

Walk and sprint differ in cycle rate, stride amplitude, body lean, yaw sway and vertical bob. The renderer consumes the pure pose instead of reimplementing a separate sine-wave gait.

Primary attack and secondary use remain higher-priority right-arm actions and override the locomotion right-arm pitch while active.

## Sprint input and actual sprint state

Desktop input supports:

- left Ctrl + W;
- right Ctrl + W;
- double-tap W.

The temporary R sprint binding is removed.

A pressed sprint intent is **not** identical to an active sprint. `playerSprintActive()` centralizes the current eligibility rule:

- sprint intent is true;
- forward input is positive;
- player is not sneaking;
- player is not swimming.

Survival also applies the existing hunger threshold: food `<= 6` disables sprint.

The same effective state is used for:

- 5.6 m/s sprint movement rather than 4.3 m/s walk movement;
- third-person sprint gait;
- sprint-jump exhaustion;
- sprint-distance exhaustion.

This prevents Ctrl+A/D or Ctrl+S from receiving sprint speed or sprint hunger cost.

## Browser shortcut boundary

`src/immersive-game-shell.js` owns browser-level shortcut containment, not `desktop-controls.js`.

While gameplay is active it:

- enters fullscreen/pointer lock through the existing immersive flow;
- calls `navigator.keyboard.lock()` when available;
- locks W plus left/right Ctrl among the gameplay keys;
- intercepts Ctrl/Meta+W in capture phase before ordinary gameplay handlers.

Keyboard Lock has limited browser availability. The project therefore does not claim universal cross-browser Ctrl+W capture. Double-W remains the non-reserved fallback sprint gesture.

## Mining crack presentation

The existing ten-stage crack rule remains the stage-selection source. PR #133 changes presentation and singleplayer routing, not mining hardness math.

### Canonical assets

`src/mining-crack-assets.js` resolves exactly:

`MC原版素材assets/minecraft/textures/block/destroy_stage_0.png` … `destroy_stage_9.png`

These are read directly from the tracked Java 1.20.1 source tree. The previous programmatically drawn `CanvasTexture` cracks are removed.

### Shared overlay ownership

`ClientGameplayRuntime` owns exactly one `MiningCrackOverlay`.

The overlay subscribes to both:

- multiplayer authoritative mining-progress presentation channel;
- singleplayer local mining-progress presentation channel.

`multiplayer-gameplay-adapter.js` reuses `runtime.miningCracks`; it must not instantiate or dispose a second overlay.

This keeps rendering lifecycle separate from mining authority and avoids duplicate transparent geometry/listeners.

### Singleplayer clear semantics

`SingleplayerMiningController` publishes inactive crack state when:

- mining starts before a valid target is accumulated;
- primary mining is cancelled;
- aim no longer resolves a block;
- mode becomes spectator/adventure;
- the block break completes.

Therefore presentation cannot retain a stale crack mesh after gameplay state has ended.

## Explosion drop semantics

Before this PR, singleplayer explosion destruction used creative block-item lookup. That is the wrong abstraction for survival drops.

`explosionDropForBlock(blockId)` now resolves the current registered `BLOCKS[blockId].drops` rule. Under the current simplified loot model:

- grass block → dirt;
- dirt → dirt;
- stone → cobblestone;
- glass / water → no item.

This is still not complete Java explosion/loot-table parity. Explosion decay, Silk Touch, Fortune and generic loot-table evaluation remain future work.

## Compatibility boundaries

PR #133 does not intentionally change:

- block IDs;
- item IDs;
- save schema v9;
- terrain generator v4;
- `CREATIVE_START` ordering;
- multiplayer wire protocol version;
- authoritative mining hardness/drop transaction rules;
- farming or hunger persistence formats.

## Regression contracts

Pure/static coverage added or expanded:

- `check-browser-safe-keymap.mjs`
- `check-desktop-sprint-controls.mjs`
- `check-immersive-game-shell.mjs`
- `check-player-motion.mjs`
- `check-player-locomotion.mjs`
- `check-singleplayer-mining-crack-channel.mjs`
- `check-mining-crack-assets.mjs`
- `check-explosion-drops.mjs`

The complete auto-discovered legacy suite and both Chromium shards remain mandatory.

## Merge gate

Only the exact final PR head may authorize merge. Required state:

1. JavaScript syntax success;
2. all auto-discovered logic/server/Worker checks success;
3. Chromium shard 1/2 success;
4. Chromium shard 2/2 success;
5. branch `behind_by=0` against current main;
6. no unresolved review/comment blocker;
7. final diff contains no CI self-modifying workflow or unrelated Creative overhaul.

Any older green head is historical evidence only.

## Explicit next PR

After #133 merges, Creative mode will be handled separately: double-Space flight toggle, grounded Creative physics, Creative HUD rules, hostile targeting exclusion and a categorized/searchable Creative inventory backed by the runtime registry.
