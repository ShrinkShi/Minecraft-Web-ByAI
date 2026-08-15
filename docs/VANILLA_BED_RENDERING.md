# Vanilla red bed rendering boundary

## Source authority

The tracked Minecraft Java 1.20.1 source archive provides the exact red-bed entity texture used by this renderer:

`assets/minecraft/textures/entity/bed/red.png`

That file is checksum-traceable through the existing source/runtime manifests. The archive does not contain a Blockbench project or entity-geometry JSON for the bed, so geometry provenance must not be conflated with texture provenance.

## Rendering model

The browser renders a bed as two independent half-block visuals, one for the existing foot block and one for the existing head block. Each half contains:

- one 16×16×6 mattress/blanket cuboid from Y=3/16 to Y=9/16;
- two 3×3×3 outer legs;
- face-specific UVs into the 64×64 red-bed entity sheet;
- a rotation derived from the existing north/south/east/west bed metadata.

The half geometry is a vanilla-compatible reconstruction for the supplied classic sheet. It is not claimed to have been extracted from the ZIP.

## Why halves are rendered independently

The gameplay bed is already represented by two block IDs and may cross a 16×16 chunk boundary. Rendering one full-bed object owned by only the foot chunk would create lifecycle ambiguity when the head chunk loads/unloads independently.

Instead, `mesh-worker.js` emits one special visual descriptor for every bed block in the chunk. `VoxelWorld` creates those visuals under the same versioned chunk-mesh lifecycle used by terrain. This means placement, removal, saved edits, remeshing and chunk unload all converge on the same source of truth and cannot leave a separate special-object registry behind.

## Full-cube vs collision boundary

Bed blocks now declare:

- `renderKind: "bed"`
- `fullCube: false`
- `solid: true`

`fullCube: false` is a rendering/occlusion fact: an adjacent terrain block must keep its face because the bed does not fill a one-meter cube. `solid: true` deliberately preserves the existing gameplay/collision contract in this rendering-only PR.

Therefore the current player collision still behaves as a full solid block even though the visual is 9/16 block tall. Bringing collision/standing height to vanilla parity is a separate gameplay change and should be tested independently rather than smuggled into an asset PR.

## Resource ownership

`BedModelRenderer` owns one shared red-bed texture, one shared material and cached half-template geometries. Chunk rebuilds only remove cloned scene groups. Shared GPU resources are disposed once with the world renderer; a chunk unload must never dispose resources another chunk still uses.

## Current item limitation

The source archive does not contain a standalone `textures/item/red_bed.png`. The inventory/hotbar bed icon remains the explicitly declared temporary SVG placeholder. A later item-model pass may generate/render a bed item from the available model/entity resources, but this PR does not pretend the entity sheet is a ready-made item sprite.

## Validation contract

The delivery CI must prove:

1. all eight bed IDs retain their existing facing/foot/head semantics;
2. every bed half UV stays within the 64×64 sheet;
3. the visual height stays 9/16 block;
4. bed blocks remain gameplay-solid but are excluded from the ordinary cube mesh;
5. neighboring full cubes keep all six faces when adjacent to a bed;
6. mesh-worker descriptors preserve part/facing identity;
7. Chromium loads the tracked red-bed texture and constructs all four facings × both halves;
8. chunk/world disposal leaves no separately owned bed GPU resources behind.
