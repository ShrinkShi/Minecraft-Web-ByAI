# Minecraft Java 1.20.1 interpreted block-model runtime

## Scope

PR #108 connects the source-backed Java 1.20.1 blockstate/model pipeline already present in the repository to the real browser world-rendering hot path.

The runtime is deliberately **opt-in**. A block continues to use the legacy terrain-atlas full-cube path unless its internal block ID is explicitly registered in `src/minecraft-model-registry.js`.

The first live proof is the existing crafting table. This proves the end-to-end architecture without claiming that the rest of the tracked acceptance roots are already gameplay-complete.

## Runtime stages

### 1. Source-backed JSON preload

`src/minecraft-model-runtime.js` loads registered blockstates and recursive model parents from tracked `assets/minecraft/...` JSON.

Loading is cached during initialization. A chunk rebuild does not recursively fetch or parse the model dependency graph again.

### 2. Template compilation

The existing resolver stack remains authoritative:

- blockstate variants / multipart resolution;
- parent and texture-variable model resolution;
- element geometry compilation;
- blockstate x/y transform and `uvlock`;
- chunk-batch generation.

The preload phase compiles model alternatives into structured-clone-safe templates. Weighted alternatives remain alternatives rather than being collapsed at startup.

### 3. Deterministic per-block selection

Worker model selection uses world-space integer coordinates plus internal block ID and model-part index. The selection hash is explicitly unsigned 32-bit.

Mesh positions remain chunk-local while weighted selection uses world coordinates. This prevents the same local coordinate in every chunk from choosing the same weighted alternative while preserving chunk-local geometry buffers.

### 4. Worker initialization barrier

`VoxelWorld` does not send ordinary mesh jobs until the model runtime has either:

- initialized successfully in `mesh-worker.js`; or
- entered explicit fallback mode because preload/validation failed.

Worker messages:

- `minecraft-model-runtime-init`;
- `minecraft-model-runtime-ready`;
- `minecraft-model-runtime-error`.

This avoids races where early chunks would be meshed through one renderer and later chunks through another merely because model resources had not finished loading yet.

## Legacy fast path and fallback

The existing terrain-atlas renderer remains the default path.

When the interpreted runtime is not installed, all ordinary blocks—including the crafting table—continue through the legacy path. Therefore a failed model-resource preload does not silently turn existing blocks into air.

After successful initialization, only explicitly registered block IDs are removed from the legacy opaque batch and routed through the interpreted path.

## Worker output

Interpreted models reuse `buildMinecraftModelMeshBatches()` and return three chunk-level layers:

- `opaque`;
- `cutout`;
- `translucent`.

Each non-empty layer contains transferable position, normal, UV, color and index buffers. Only buffers referenced by the outgoing message are transferred.

This preserves the project rule that block-model expansion must not regress to one Three.js Mesh/material per block.

## Cullface and tint boundary

Model `cullface` tests use current chunk data plus available neighbor-chunk edge data.

A neighboring full, solid, opaque cube can cull the matching model face. Non-full, non-solid or transparent neighbors do not.

Tint remains renderer policy. A compiled face with no `tintindex` is white. A face with `tintindex` can consume the existing block tint metadata. Full biome color-map parity is still TODO.

## Texture binding and layers

The Worker receives the tracked deterministic model-atlas manifest and builds the existing strict model texture binding.

A visual registry descriptor owns the default render layer and may supply canonical per-texture layer overrides. The only accepted layers are `opaque`, `cutout`, and `translucent`.

The browser renderer owns one shared model-atlas Texture and one shared material per layer.

## VoxelWorld ownership

`src/minecraft-model-world-renderer.js` owns interpreted-model presentation resources outside the large `world.js` module:

- model-atlas Texture;
- shared opaque material;
- shared cutout material;
- shared translucent material;
- interpreted chunk geometry creation/removal;
- Worker runtime status.

`VoxelWorld` owns the lifetime of that renderer.

Chunk unload disposes interpreted chunk geometries. World disposal releases remaining chunk geometries, all three shared materials and the model-atlas Texture.

## Visual model vs gameplay state

The visual model registry is intentionally separate from `blocks.js` gameplay rules.

A JSON model cuboid is **not** automatically a collision cuboid. Slabs, stairs, doors, fences and other stateful blocks require explicit gameplay state, placement/update rules and collision shapes even when their source JSON models already render correctly.

Likewise, generic multipart support in the renderer does not by itself provide neighbor-derived fence state, door half synchronization, waterlogging, redstone state, or scheduled updates.

## Current live proof

The crafting table is currently the only explicit interpreted-model registry entry.

The real Chromium regression verifies that an isolated crafting table:

- is excluded from the old opaque terrain mesh after runtime initialization;
- produces an interpreted opaque model with 6 faces, 24 vertices and 36 indices;
- binds the tracked `block.model_atlas` through a shared material;
- reaches a real `VoxelWorld` chunk mesh;
- disposes chunk/model resources correctly.

This is an architecture proof, not a broad block-content completion claim.

## Next content sequence

After this runtime lands, content should expand through independent gameplay-delivery PRs rather than adding more renderer abstractions first:

1. iron ore — registry + mining/harvest + worldgen proof;
2. glass — transparent full-cube behaviour;
3. oak slab — state + partial collision;
4. oak stairs — state + multi-cuboid collision;
5. oak door — paired two-block state;
6. oak fence — neighbor-derived multipart state;
7. torch — non-full/cutout + later lighting integration;
8. grass/foliage biome tint contract.

Each content PR must distinguish source/model availability from actual gameplay parity.
