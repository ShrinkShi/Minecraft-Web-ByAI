# Vegetation / Farming phase 1.1

This document defines the delivery boundary after merged PR #128.

## Goal

Close the first-seed bootstrap gap without faking full Java 1.20.1 vegetation/worldgen parity:

1. add the Java 1.20.1 `minecraft:grass` block resource as the project's short-grass vegetation block;
2. generate deterministic short grass in **new** worlds through terrain generator v4;
3. breaking short grass in survival has the Java base 1/8 chance to drop one wheat seed (Fortune is deferred with enchantments);
4. add source-backed bone meal and the shapeless `bone -> 3 bone_meal` recipe;
5. bone meal advances non-mature wheat by 2..5 ages;
6. bone meal used on a grass block spreads short grass over nearby valid grass surfaces using a bounded 128-attempt phase-1.1 spread;
7. survival consumes bone meal only when it actually changes the world; creative does not consume it.

## Java 1.20.1 naming

The canonical 1.20.1 resource is `minecraft:grass`, not the later `short_grass` resource name. Runtime presentation may call it short grass / 矮草 to distinguish it from the full grass block, but source paths and model roots stay version-correct.

Canonical source roots used by this slice:

- `minecraft/blockstates/grass.json`
- `minecraft/models/block/grass.json`
- `minecraft/models/block/tinted_cross.json` through model inheritance
- `minecraft/textures/block/grass.png`
- `minecraft/models/item/bone_meal.json`
- `minecraft/textures/item/bone_meal.png`

## Terrain compatibility

Terrain generator v4 adds deterministic short-grass decoration above suitable grass surfaces.

Compatibility rules:

- explicit v2 worlds remain v2;
- explicit v3 worlds remain byte-stable v3 and do not gain grass in unexplored chunks;
- new singleplayer worlds use v4;
- the existing save schema remains v9 because `terrainVersion` is already a persisted compatibility field;
- multiplayer continues to require the exact current terrain generator version, so browser/server agree on v4 base terrain;
- tests must prove that normalizing v4 short grass back to AIR yields the same base chunk bytes as explicit v3 for the same seeds/chunks.

This is intentionally the same compatibility pattern used when coal introduced terrain v3.

## Rendering

Short grass is routed through the existing canonical blockstate/model interpreter as a cutout cross model. Java 1.20.1 `grass.json` inherits `tinted_cross`, so the runtime preserves tint metadata.

The project does not yet have biome-correct grass colormaps. Phase 1.1 therefore uses one documented fallback grass tint instead of claiming biome tint parity.

## Drops

Survival breaking short grass:

- base chance: 1/8;
- success: one `wheat_seeds`;
- failure: no item;
- creative: no drop through the existing creative mining rule.

Fortune changes are deferred until the enchantment system exists. Shears / short-grass item acquisition are also outside this slice, so short grass is not inserted into historical starter inventory slots.

## Bone meal

### Wheat

Bone meal targets wheat age 0..6 and advances it by a random 2..5 ages, capped at age 7. Mature wheat is a no-op and does not consume bone meal.

### Grass block

The full Java biome vegetation feature system is not present. The current foundation performs 128 bounded candidate attempts around the clicked grass block and places short grass only where:

- the supporting surface is a grass block;
- the destination is AIR;
- the destination is inside world height bounds.

At least one successful placement counts as a successful use. Flowers, biome feature selection and tall-grass promotion are deferred.

## Authority boundary

Singleplayer owns bone-meal mutations and vegetation drops in this slice.

Multiplayer receives terrain v4 through the existing shared deterministic generator, but client-side bone-meal edits are **not** allowed to become competing world truth. Bone-meal use remains unavailable in multiplayer until a server-authoritative vegetation/farming transaction is implemented.

## Explicit non-parity

This slice does not claim:

- Java biome decoration density/distribution;
- biome grass tint / colormap parity;
- flower feature selection;
- tall grass conversion;
- Fortune or shears behavior;
- bone meal particles/sound timing parity;
- server-authoritative farming/vegetation edits;
- broad plants/crops.

## Acceptance gate

Before merge, exact final HEAD must prove:

1. v2/v3 terrain compatibility plus deterministic v4 vegetation;
2. natural grass -> wheat seed acquisition through real mining/drop/pickup flow;
3. bone -> 3 bone meal recipe and direct canonical bone-meal texture provenance;
4. wheat bone-meal growth and grass-block vegetation spread with success-only consumption;
5. canonical grass blockstate/model/texture closure and cutout rendering;
6. all historical model-runtime browser goldens updated to the exact new registry/closure;
7. full logic/server/Worker suite, both Chromium shards and Minecraft asset source audit green on the same final HEAD;
8. `behind_by=0` and no review/comment blockers.
