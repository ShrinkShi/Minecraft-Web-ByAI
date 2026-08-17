# Single-player world selection flow

## Scope

This document records the browser-local single-player world selection layer introduced after PR #106. It replaces the old mixed `创建 / 进入世界` form with an explicit selection flow while preserving the existing IndexedDB world payload and the existing `startWorld()` gameplay bootstrap.

This is a presentation/navigation change around the existing single-player runtime. It does not introduce a second world runtime, a new save format, cloud saves, or multiplayer world management.

## User flow

`单人游戏` now opens `选择世界` first.

The list is populated from `WorldStorage.listWorlds()` and ordered by `updatedAt` descending. Each row exposes the stored world name, game mode, last-played time, seed, and save version.

From the list:

- single click selects a world;
- double click enters the selected world;
- `进入选中的世界` enters the current selection;
- `创建新的世界` opens a dedicated creation form;
- `编辑` opens the selected save in the editor;
- `取消` returns to the title screen.

The previous behaviour where one form silently meant either “create” or “load” is intentionally removed from the visible UI.

## New-world creation

Creation keeps the existing runtime inputs:

- world name;
- seed;
- game mode;
- terrain prompt.

If the seed field is empty, the existing client behaviour supplies a time-based seed before `startWorld()` runs.

Default world display names are selected without colliding with existing names: `新的世界`, `新的世界 (2)`, `新的世界 (3)`, and so on.

Before launching, the controller rejects an exact duplicate deterministic identity (`worldIdFor(name, seed)`) and tells the user to enter that save from the list instead.

## Existing-world entry

The selection layer does not reconstruct gameplay state itself. It fetches the selected IndexedDB record, copies its persisted identity fields into the existing launch controls, then enters through the same `startWorld()` path used before this change.

This preserves the established restore semantics for:

- player state;
- Inventory and item-instance durability;
- Equipment;
- world edits;
- game time/weather;
- XP;
- respawn point;
- other fields already owned by the v6 save payload.

## Edit rules

The editor currently supports:

- world rename;
- survival/creative mode change.

For an existing world, seed and terrain prompt are read-only. Changing either after chunks already exist could change deterministic generation identity or create visible seams between previously generated and newly generated chunks. That is a data-integrity boundary, not a missing text-field feature.

When game mode changes, both the world-level `mode` and an existing persisted `player.mode` are updated so the next restore does not overwrite the edit with stale player state.

### Rename migration

The repository historically derives the save key from `worldIdFor(name, seed)`. A rename therefore changes the deterministic key.

The editor uses an ordered migration:

1. read the current record;
2. compute the new id;
3. reject a collision if another record already uses it;
4. write the complete replacement record under the new id;
5. only after the write succeeds, delete the old id.

This ordering avoids deleting the only copy before a replacement record has committed.

## Storage contract

`src/storage.js` remains on database `minecraft-web-by-ai`, DB version 1, object store `worlds`, key path `id`.

The flow adds `WorldStorage.deleteWorld(id)` because rename migration needs an explicit old-key cleanup operation. No IndexedDB schema migration is required.

## Presentation boundary

`src/world-selection.js` owns state and DOM generation for the world-list / create / edit shell.

`world-selection.css` owns the full-screen menu presentation. It intentionally replaces the old centered black form with a Minecraft-style list/menu hierarchy but does not claim pixel-perfect Java Edition menu parity. The current source archive used by the project contains the GUI sheets needed by the in-game HUD/Inventory work, not a complete modern menu-widget asset pipeline for every Java Edition screen.

## Browser bootstrap

`src/browser-bootstrap.js` installs both:

- the source-backed vanilla in-game UI presentation from PR #106;
- the world-selection controller.

`main.js` remains responsible for actual gameplay startup and single-player runtime state. The world-selection controller is deliberately kept outside that large runtime module.

## Regression coverage

The delivery keeps a single reusable Playwright helper for single-player tests so tests no longer encode the removed mixed-form workflow in many files.

Coverage includes:

- world-list rendering from real IndexedDB data;
- disabled/enabled selection buttons;
- editor rename and mode update;
- seed/prompt edit guards;
- IndexedDB key migration on rename;
- double-click entry into a real world;
- create-vs-enter behaviour across page reloads;
- existing HUD, mobile, orientation, durability, death, respawn and bed browser regressions routed through the new navigation flow.

## Deliberate non-goals

This change does not yet add:

- delete-world confirmation UI;
- duplicate/copy world UI;
- filesystem export/import;
- cloud synchronization;
- world thumbnails/screenshots from the last play session;
- advanced Java 1.20.1 create-world tabs such as gamerules, datapacks, world type customization, structures toggle, bonus chest, or difficulty.

Those are separate parity work and should not be inferred as complete from this selection foundation.
