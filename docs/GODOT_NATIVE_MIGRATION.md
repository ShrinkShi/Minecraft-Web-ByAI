# Godot Native Migration

## Decision

The project is migrating from the browser/Three.js client to a native Godot client. The target engine for the migration foundation is **Godot 4.7.2 stable**.

The purpose of the migration is not to mechanically translate JavaScript to GDScript. Browser-specific rendering, DOM UI, Pointer Lock, Keyboard Lock, WebAudio and IndexedDB layers are implementation details and will be replaced. Gameplay contracts that already affect save or multiplayer compatibility must be preserved.

## Native target

The authoritative target is desktop-native Godot (Windows first, then Linux/macOS where practical). A future Godot Web export may exist as a secondary build, but it is not allowed to define input, filesystem or platform capability constraints for the native client.

## Compatibility contracts that survive the engine change

The following merged-main contracts are migration inputs, not disposable implementation details:

- append-only numeric block IDs through current ID 53;
- block identity `{id, stateKey}` and canonical state-key ordering;
- terrain generator version pinning;
- singleplayer save schema v11 semantics;
- multiplayer `minecraft-web-v6` / world-edit replication v2 semantics;
- historical starter inventory / item ID ordering where already persisted or replicated;
- source-backed Minecraft Java 1.20.1 resource paths.

A Godot implementation must not renumber block/item IDs merely because the engine changed.

## Repository policy during migration

The existing browser implementation remains in the repository as the parity oracle until the native client reaches feature parity for a subsystem. It is considered **legacy/frozen for feature development** after the migration decision; browser-only fixes should not displace native migration work unless they are needed to preserve a released build.

Do not delete the JavaScript client or Node authoritative server in the foundation phase. Rewriting the renderer, client gameplay and multiplayer server simultaneously would remove the only working reference implementation and make regressions impossible to isolate.

## Migration phases

### G0 — native playable foundation

- root `project.godot` targeting Godot 4.7.2;
- native window and first-person camera;
- CharacterBody3D movement, jump, Ctrl sprint and captured mouse look;
- mouse-wheel hotbar intent without browser zoom/scroll semantics;
- source-backed Java 1.20.1 block textures;
- batched voxel surface generation with hidden-face elimination;
- a generated static collision mesh;
- Godot-side copies of stable block IDs and canonical state-key encoding.

This phase is a migration scaffold, not a parity claim.

### G1 — registry and state parity

Port the canonical block schema/registry and sparse state sidecar semantics. Add automated fixtures that feed the same identities to JavaScript and Godot and compare normalized results. No renderer-only state is allowed.

### G2 — chunk/runtime parity

Replace the foundation demo terrain with 16×16 chunk streaming, current world-height compatibility, deterministic terrain-version loading and state-aware mesh generation. Move expensive generation/meshing to WorkerThreadPool jobs or equivalent native worker tasks while keeping scene-tree mutation on the main thread.

### G3 — interaction and survival parity

Migrate raycast selection, mining/placement, inventory/hotbar, crafting/workbench/furnace, equipment, hunger/status effects, combat, mobs, drops, time/weather, bed/death/respawn and existing Creative behavior subsystem-by-subsystem. Each subsystem replaces its browser counterpart only after parity fixtures or native tests exist.

### G4 — native persistence

Implement a native save store under `user://` while preserving v11 world semantics. A one-time importer should accept exported legacy save records rather than silently abandoning existing worlds. Future schema bumps must be explicit.

### G5 — multiplayer client migration

Keep the existing Node authoritative server initially. Implement a Godot client adapter for the current v6 protocol and verify late join, state-only world edits, inventory/container revisions, movement and combat. Only after the native client is stable should server migration be considered separately.

### G6 — legacy retirement

When native Godot has parity for the agreed gameplay baseline, remove browser-only production entry points and archive any still-useful web implementation under a clearly named legacy area. Do not delete historical source resources, compatibility fixtures or migration tools.

## First foundation architecture

```text
project.godot
└─ godot/
   ├─ scenes/
   │  └─ main.tscn
   └─ scripts/
      ├─ main.gd
      ├─ player.gd
      ├─ hud.gd
      ├─ voxel_world.gd
      ├─ block_registry.gd
      └─ block_state_codec.gd
```

The Godot project root deliberately remains the repository root so `res://MC原版素材assets/...` can use the existing extracted Java 1.20.1 resource tree without duplicating thousands of assets.

## Non-goals of G0

G0 does not claim chunk streaming parity, Java-accurate movement constants, lighting parity, biome tinting, complete block models, block interaction, save loading or multiplayer connectivity. Those are follow-up migration phases and must not be inferred from the native prototype rendering a textured terrain.
