# Wheat Farming Phase 1

Status: PR #128 delivery contract. This document describes the farming implementation on `feature/farming-phase-1`; merged-main facts remain in `PROJECT_BASELINE.md`.

## Scope

This slice closes the first playable wheat loop in singleplayer:

`hoe dirt/grass → farmland → wheat seeds → wheat age 0..7 → mature harvest → wheat → 3× wheat → bread → hunger loop`

The existing iron-hoe till action remains the entry point for creating farmland. Natural short-grass seed acquisition is not yet implemented, so the first seed currently comes from `/give wheat_seeds`; harvested crops then provide a renewable seed loop.

## State encoding

The current chunk payload stores one unsigned block ID per voxel and does not carry arbitrary Java block-state properties. Farming therefore keeps the existing compact format and maps the required states to append-only IDs:

- `24`: farmland moisture 0 (existing ID, preserved);
- `28..34`: farmland moisture 1..7;
- `35..42`: wheat age 0..7.

No historical block ID is renumbered. Terrain generation does not generate these new IDs; they are player/runtime-created states and persist through the existing sparse world-edit format.

## Canonical presentation

Farming does not add hand-authored crop geometry or replacement textures.

All farmland/wheat states opt into the existing Minecraft Java 1.20.1 blockstate/model interpreter:

- `minecraft:farmland`, state `moisture=0..7`;
- `minecraft:wheat`, state `age=0..7`;
- wheat uses the cutout render layer;
- dependency closure now includes canonical farmland/wheat blockstates, models and textures from `MC原版素材assets/`;
- deterministic model atlas closure is 12 blockstates / 58 models / 28 textures, packed into the tracked 128×128 atlas;
- the legacy 4×4 terrain atlas remains byte-stable.

`wheat_seeds.png` and `wheat.png` are direct canonical Java 1.20.1 item textures through the logical asset manifest.

## Runtime ownership

`SingleplayerFarmingRuntime` owns crop timing only in singleplayer. It tracks farming cells from sparse player edits and subsequent edit events instead of scanning every voxel in every loaded chunk.

A farming tick currently runs every 10 seconds. On each tick:

- farmland becomes moisture 7 when water is within four horizontal blocks (same level or one block above in the current probe) or current weather is non-clear;
- unhydrated farmland dries one moisture level per farming tick;
- dry moisture-0 farmland without a crop returns to dirt;
- farmland under wheat is retained at moisture 0 instead of reverting to dirt;
- wheat advances at most one age per tick;
- the current simplified growth chance is 0.45 on moist farmland and 0.20 on dry farmland;
- a crop whose supporting farmland disappears is removed immediately/at the next tracked tick and uses its crop drop table in survival; creative support removal produces no drops.

## Planting and harvesting

Holding `wheat_seeds` and using secondary action on farmland whose upper cell is air plants wheat age 0.

- survival consumes one seed only after the world mutation succeeds;
- creative does not consume a seed;
- spectator/adventure planting remains blocked by the existing interaction boundary;
- invalid targets do not consume inventory.

Mining a wheat crop uses the normal singleplayer mining controller. The controller now has an optional `resolveDrops` extension point; blocks without special drop behavior retain the historical one-stack default.

Current wheat drops:

- age 0..6: 1 wheat seed;
- age 7: 1 wheat plus 0..3 seeds.

The mature seed distribution is a deliberately simplified phase-1 rule and does not claim Java Fortune/drop-RNG parity.

## Bread recipe

The crafting registry now includes the Java-shaped horizontal recipe:

`wheat + wheat + wheat → bread`

It requires a 3-wide crafting grid, so it is available through the Workbench rather than the 2×2 player grid. Bread retains the hunger values introduced in PR #127.

## Persistence and compatibility

No new save schema version is required for farming state. Farmland moisture and wheat age are encoded directly in the existing sparse `edits` block IDs, so schema v9 remains current.

Compatibility rules preserved:

- block IDs are append-only;
- `CREATIVE_START` order is unchanged;
- terrain generator v2/v3 behavior is unchanged;
- the `terrainVersion`-required-since-schema-v8 boundary is unchanged;
- existing non-farming mining drops keep their previous default behavior.

## Multiplayer authority boundary

PR #128 does not create client-owned multiplayer crops. Multiplayer farming remains unavailable until the server owns planting, random ticks, crop drops and inventory transactions. This avoids two competing crop timelines for the same authoritative world.

## Java 1.20.1 parity boundary

This slice is `PARTIAL`, not complete farming parity. Important missing or simplified behavior includes:

- natural wheat-seed acquisition from short grass/vegetation;
- exact Java random-tick rate and crop growth formula, including light and neighboring-crop growth-speed rules;
- exact farmland rain/random-tick semantics and farmland trampling/falling conversion;
- exact wheat seed RNG/Fortune behavior;
- bone meal;
- other crops (carrot, potato, beetroot, melon, pumpkin, cocoa, sugar cane, cactus, nether wart, etc.);
- crop-related villager behavior;
- server-authoritative multiplayer farming.

## Validation

Required before merge:

1. JavaScript syntax and the auto-discovered logic/server/Worker regression suite;
2. farming pure/runtime rules, including support-break survival drops and creative no-drop behavior;
3. deterministic canonical model closure/atlas regeneration and source audit;
4. browser E2E covering real secondary-action planting, age 0→7 deterministic growth and real mature-crop mining/pickup;
5. both Chromium shards on the exact final HEAD;
6. final `behind_by=0` and review/thread/comment blocker check.
