# Minecraft Java 1.20.1 asset import pipeline

## Purpose

This project keeps gameplay/simulation data independent from art files while allowing the browser runtime to use the user-supplied Minecraft Java 1.20.1 resources instead of programmatic placeholders.

The source of truth is the tracked archive:

- file: `MC原版素材assets.zip`
- SHA-256: `b65a2211175af90664de9f41ea422f4869eee855f0da4bf6fe0715434ebe9c69`
- audited shape: client resource tree
- audited entries: 7,623

The archive's outer folder name is not treated as stable. Import tools resolve canonical `assets/minecraft/...` suffixes, which also avoids depending on ZIP filename-encoding behavior across Windows/Linux.

## Pipeline

### 1. Audit, do not trust the filename

Run:

```bash
python tools/audit-minecraft-assets.py --json-out minecraft-assets-audit.json
```

The audit checks path safety and records resource-family counts, selected probes, archive checksum and whether `.bbmodel`, sound registry/object-store data, models and blockstates are actually present.

### 2. Selectively extract runtime source inputs

Run:

```bash
python tools/import-minecraft-assets.py
```

Output: `build/minecraft-runtime-source/`.

Only resources required by implemented gameplay or an immediately declared runtime binding are extracted. This avoids committing thousands of unused files while retaining exact per-file source/checksum provenance in `source-manifest.json`.

### 3. Build browser-ready resources

Install the pinned build dependency and run:

```bash
python -m pip install -r tools/requirements-assets.txt
python tools/build-minecraft-runtime-assets.py
```

Output: `build/minecraft-runtime-assets/`.

The build creates:

- a stable 4×4 / 64×64 terrain atlas compatible with current chunk UV indices;
- original item PNGs for implemented inventory/drop resources;
- tint-baked item/block resources where vanilla normally applies runtime tint;
- selected model/blockstate/animation/entity references;
- `runtime-manifest.json` with generated checksums and source mappings.

### 4. CI proves checked-in files are reproducible

`.github/workflows/asset-source-audit.yml` is read-only. It rebuilds the assets from the tracked ZIP and compares generated output byte-for-byte against the checked-in runtime files.

The workflow must not auto-push generated content in normal operation.

`scripts/check-minecraft-runtime-assets.mjs` independently validates the tracked runtime manifest, archive provenance, atlas dimensions/tile bindings and file checksums as part of the normal Repository quality logic suite.

## Current atlas contract

| Tile | Resource | Treatment |
|---:|---|---|
| 0 | grass block top | Plains grass tint |
| 1 | grass block side + overlay | Plains grass tint on overlay |
| 2 | dirt | original pixels |
| 3 | stone | original pixels |
| 4 | sand | original pixels |
| 5 | oak planks | original pixels |
| 6 | oak log side | original pixels |
| 7 | oak log top | original pixels |
| 8 | oak leaves | Plains foliage tint |
| 9 | water still, first frame | Plains water tint |
| 10 | crafting table top | original pixels |
| 11 | crafting table side | original pixels |
| 12 | crafting table front | original pixels |
| 13 | cobblestone | original pixels |
| 14 | iron ore | original pixels |
| 15 | white wool | original pixels |

`src/blocks.js` may supply a `faces` map for directional blocks. The current crafting-table mapping is derived from the supplied vanilla model JSON rather than guessed from the old generic `side` field.

## Tint boundary

Vanilla Minecraft uses tint indices rather than permanently colored source PNGs for several resources. The current runtime has no biome-color data, so this import stage uses stable Plains/default colors at build time. This is intentionally reversible: the untouched source inputs and tint profile are recorded so future biome-aware rendering can move tinting back to runtime.

## Item boundary

Most implemented drops/materials now use file-backed original item textures. The bed is an explicit exception: this archive contains the red bed entity sheet but not a standalone `textures/item/red_bed.png`, and the current browser renderer does not yet render the bed item from its block/entity model. Its small inventory SVG remains a declared temporary UI placeholder while `entity.bed.red` is already bound for the later geometry pass.

## Model boundary

The archive contains thousands of Minecraft block/item JSON models and blockstates, but no Blockbench `.bbmodel` project files. Do not invent `.bbmodel` paths or treat entity textures as complete entity models.

The next model work should interpret Minecraft JSON for supported non-cube block/item cases, and handle entity geometry from the appropriate vanilla model definitions/model-layer data as a separate system.

## Audio boundary

This source ZIP contains no `assets/minecraft/sounds/` files and no `assets/minecraft/sounds.json`. Therefore no audio in this PR may claim provenance from this archive.

A future sound import needs the actual sound registry/object data (for example the corresponding Minecraft asset-index/object-store material) and should use lazy browser decoding/caching rather than loading all sounds up front.

## Change rules

When changing imported resources:

1. modify the importer/builder first, not generated PNG bytes by hand;
2. regenerate and stage the resulting runtime files;
3. keep `sourceArchiveSha256` tied to the exact tracked ZIP;
4. update logical asset keys instead of embedding new filesystem paths throughout gameplay code;
5. preserve nearest-neighbor pixel rendering;
6. make missing source data explicit instead of silently drawing or downloading substitutes;
7. require the asset audit and Repository quality suites to pass on the exact PR head before merge.
