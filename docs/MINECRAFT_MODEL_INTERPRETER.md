# Minecraft Java 1.20.1 Model Interpreter

## Purpose

This subsystem is the content multiplier for the next project phase. The repository already contains thousands of original Java 1.20.1 model/blockstate resources in the tracked source archive, but the runtime still exposes only a small hand-authored block registry. The interpreter converts those resource semantics into validated, renderer-neutral data before any Three.js or mesh-worker integration.

This document describes the foundation introduced by PR #96 and the required next stages. It does **not** claim runtime block-model parity yet.

## Current foundation

### Resource identifiers

`src/minecraft-resource-id.js` owns Minecraft-style resource locations.

Supported canonical form:

```text
namespace:path
```

Missing namespace defaults to `minecraft`, so:

```text
block/stone -> minecraft:block/stone
```

The parser rejects malformed namespaces, duplicate `:` separators, empty/traversal path segments and unsafe paths. Helpers map canonical resource IDs to the project's browser asset layout for models, textures and blockstates.

### Model resolver

`src/minecraft-model-resolver.js` is intentionally independent from:

- Three.js;
- DOM;
- Web Workers;
- Node filesystem APIs;
- browser `fetch()`;
- the concrete ZIP/import implementation.

Callers inject:

```js
loadModel(canonicalResourceId)
```

which may return the model object directly or a Promise. This keeps resource acquisition separate from model semantics and lets the same resolver be used by Node validation, browser loading and future build-time compilation.

## Inheritance semantics

The resolver loads the full single-parent chain and rejects parent cycles.

Models are reduced from root parent to requested child:

- `textures` are merged; child variables override parent variables;
- `elements` are inherited only when the child does not declare its own `elements` field;
- declaring child `elements`, including an empty array, replaces inherited elements rather than appending;
- `ambientocclusion` and `gui_light` inherit unless explicitly replaced.

### Why face textures are resolved after the whole chain

Vanilla parent models commonly contain reusable geometry with faces such as:

```json
{"texture":"#all"}
```

and children bind/override `all`.

Therefore parent faces are **not** converted to a concrete texture while loading the parent. The resolver first merges the complete texture-variable environment and chooses the final inherited/replaced element array. Only then are face textures resolved.

This prevents a child of `cube_all`/similar parents from accidentally retaining a parent's earlier texture binding.

## Texture variables

The resolver supports:

- direct resource references such as `minecraft:block/stone`;
- default-namespace references such as `block/stone`;
- variable references such as `#all`;
- transitive variable chains such as `particle -> #all -> #surface -> block/dirt`.

It rejects:

- missing variables;
- variable cycles;
- malformed resource IDs.

The normalized output contains canonical namespace-qualified texture IDs.

## Elements and faces

Current normalized element support includes:

- `from` / `to` three-component coordinates;
- optional element `rotation` with origin, x/y/z axis, Java block-model angles and `rescale`;
- `shade`, defaulting to true;
- `down/up/north/south/west/east` faces;
- face `texture`;
- optional `uv` rectangle;
- optional `cullface`;
- optional non-negative `tintindex`;
- face rotation `0/90/180/270`.

The resolver deliberately keeps omitted face UVs as `null`. Vanilla automatic UV derivation belongs to the later geometry compiler, because it depends on the final element geometry and face orientation.

## Output boundary

A resolved model is frozen plain data shaped around:

```text
id
parent
lineage[]
ambientOcclusion
guiLight
textures{}
elements[]
  from/to
  rotation/shade
  faces{}
    texture
    textureReference
    uv
    cullface
    rotation
    tintIndex
```

There is no `THREE.BufferGeometry` or material in this layer.

## Current source-subset limitation

The selective runtime asset import currently passes through only a small JSON subset, including `grass_block.json` and `crafting_table.json`.

Those models can reference parent models that are not yet passed through. For example, the tracked crafting-table model references `minecraft:block/cube`.

The resolver does not invent parent definitions and does not hard-code vanilla parent geometry. A missing dependency is an explicit `missing Minecraft model` error.

The later asset-dependency expansion must add all required parent/model/texture files to the deterministic selective importer and runtime source manifest, then let the existing source audit prove that the committed files are byte-reproducible from `MC原版素材assets.zip`.

## Validation introduced with the foundation

`scripts/check-minecraft-model-resolver.mjs` is auto-discovered by `npm run test:logic` and covers:

- resource ID/path normalization and traversal rejection;
- parent inheritance;
- child texture override applied to inherited parent elements;
- transitive texture aliases;
- child element replacement;
- ambient-occlusion / GUI-light inheritance;
- face UV/cull/tint/rotation normalization;
- element rotation/shade;
- direct texture resources;
- missing model;
- parent cycle;
- missing texture variable;
- texture-variable cycle;
- malformed face/element rotation;
- the tracked original Minecraft Java 1.20.1 `grass_block.json` model, including its base + overlay elements and tint/cull metadata.

The first CI run containing this test reported 132 logic/worker/server scripts passing. Final delivery evidence still follows the exact-head PR quality gate.

## Next stages

### 1. Blockstate resolver

Add a separate pure blockstate layer for:

- `variants` property matching;
- model arrays and `weight`;
- model x/y rotation;
- `uvlock`;
- deterministic weighted selection;
- `multipart` conditions with AND/OR/property alternatives.

Blockstate selection must return model-instance descriptions, not Three.js objects.

### 2. Asset dependency expansion

Extend the deterministic importer with the required parent models and the first representative blocks. Do not bulk-copy the full archive merely because it exists; import the closure needed by declared acceptance blocks and record provenance.

### 3. Geometry compiler

Compile normalized elements/model instances into mesh-worker-consumable pure data:

- derive omitted UVs;
- apply element rotations;
- apply blockstate x/y rotations and `uvlock`;
- emit cull semantics;
- carry tint indices rather than baking arbitrary colors too early;
- classify opaque/cutout/transparent rendering.

### 4. Preserve the full-cube fast path

Ordinary complete cubes must remain on the existing chunk face mesher. The interpreter is not permission to create one Three.js Mesh per block.

A later compiler should recognize when a resolved model/state is equivalent to the optimized cube path and keep it there. Non-cube/multipart content may use compiled chunk geometry/special batches.

### 5. Collision remains independent

Visual model elements are not automatically the gameplay collision shape. Slabs, stairs, doors, fences and other blocks require explicit/state-derived collision definitions. The renderer must never make a block collidable merely because it has visual cuboids.

## Representative acceptance sequence

The approved first content set remains:

1. `iron_ore` — ordinary full-cube import/registry proof;
2. `glass` — transparent full cube;
3. `oak_slab` — partial cuboid;
4. `oak_stairs` — multiple cuboids + state;
5. `oak_door` — paired stateful block;
6. `oak_fence` — multipart/neighbor state;
7. `torch` — non-full model;
8. grass/foliage tint-index contract.

Only after these cases are covered should the project start broad block/item registry batch import.