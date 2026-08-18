#!/usr/bin/env python3
"""Copy the browser runtime subset from tracked Minecraft source assets.

Legacy gameplay resources remain an explicit selective list. Generic block-model
JSON is derived by the shared model dependency closure. The authoritative real
source is ``MC原版素材assets/``; ZIP support remains only through the shared
source-index abstraction for synthetic/legacy callers.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
from pathlib import Path

from minecraft_model_acceptance import MINECRAFT_MODEL_ACCEPTANCE_BLOCKS
from minecraft_model_closure import (
    ClosureError,
    MinecraftSourceIndex,
    open_minecraft_source,
    resolve_block_model_closure,
    source_provenance,
)

DEFAULT_SOURCE = Path("MC原版素材assets")
DEFAULT_OUTPUT = Path("build/minecraft-runtime-source")
MODEL_CANONICAL_PREFIX = "assets/minecraft/"

RUNTIME_FILES = {
    "textures/block/grass_block_top.png": "assets/minecraft/textures/block/grass_block_top.png",
    "textures/block/grass_block_side.png": "assets/minecraft/textures/block/grass_block_side.png",
    "textures/block/grass_block_side_overlay.png": "assets/minecraft/textures/block/grass_block_side_overlay.png",
    "textures/block/dirt.png": "assets/minecraft/textures/block/dirt.png",
    "textures/block/stone.png": "assets/minecraft/textures/block/stone.png",
    "textures/block/sand.png": "assets/minecraft/textures/block/sand.png",
    "textures/block/oak_planks.png": "assets/minecraft/textures/block/oak_planks.png",
    "textures/block/oak_log.png": "assets/minecraft/textures/block/oak_log.png",
    "textures/block/oak_log_top.png": "assets/minecraft/textures/block/oak_log_top.png",
    "textures/block/oak_leaves.png": "assets/minecraft/textures/block/oak_leaves.png",
    "textures/block/water_still.png": "assets/minecraft/textures/block/water_still.png",
    "textures/block/water_still.png.mcmeta": "assets/minecraft/textures/block/water_still.png.mcmeta",
    "textures/block/water_flow.png": "assets/minecraft/textures/block/water_flow.png",
    "textures/block/water_flow.png.mcmeta": "assets/minecraft/textures/block/water_flow.png.mcmeta",
    "textures/block/crafting_table_top.png": "assets/minecraft/textures/block/crafting_table_top.png",
    "textures/block/crafting_table_front.png": "assets/minecraft/textures/block/crafting_table_front.png",
    "textures/block/crafting_table_side.png": "assets/minecraft/textures/block/crafting_table_side.png",
    "textures/block/cobblestone.png": "assets/minecraft/textures/block/cobblestone.png",
    "textures/block/iron_ore.png": "assets/minecraft/textures/block/iron_ore.png",
    "textures/block/white_wool.png": "assets/minecraft/textures/block/white_wool.png",
    "textures/item/stick.png": "assets/minecraft/textures/item/stick.png",
    "textures/item/wooden_pickaxe.png": "assets/minecraft/textures/item/wooden_pickaxe.png",
    "textures/item/stone_pickaxe.png": "assets/minecraft/textures/item/stone_pickaxe.png",
    "textures/item/raw_iron.png": "assets/minecraft/textures/item/raw_iron.png",
    "textures/item/iron_ingot.png": "assets/minecraft/textures/item/iron_ingot.png",
    "textures/item/leather_helmet.png": "assets/minecraft/textures/item/leather_helmet.png",
    "textures/item/leather_chestplate.png": "assets/minecraft/textures/item/leather_chestplate.png",
    "textures/item/leather_leggings.png": "assets/minecraft/textures/item/leather_leggings.png",
    "textures/item/leather_boots.png": "assets/minecraft/textures/item/leather_boots.png",
    "textures/item/beef.png": "assets/minecraft/textures/item/beef.png",
    "textures/item/leather.png": "assets/minecraft/textures/item/leather.png",
    "textures/item/mutton.png": "assets/minecraft/textures/item/mutton.png",
    "textures/item/porkchop.png": "assets/minecraft/textures/item/porkchop.png",
    "textures/item/chicken.png": "assets/minecraft/textures/item/chicken.png",
    "textures/item/feather.png": "assets/minecraft/textures/item/feather.png",
    "textures/item/rotten_flesh.png": "assets/minecraft/textures/item/rotten_flesh.png",
    "textures/item/bone.png": "assets/minecraft/textures/item/bone.png",
    "textures/item/arrow.png": "assets/minecraft/textures/item/arrow.png",
    "textures/item/gunpowder.png": "assets/minecraft/textures/item/gunpowder.png",
    "textures/item/string.png": "assets/minecraft/textures/item/string.png",
    "textures/entity/cow/cow.png": "assets/minecraft/textures/entity/cow/cow.png",
    "textures/entity/sheep/sheep.png": "assets/minecraft/textures/entity/sheep/sheep.png",
    "textures/entity/sheep/sheep_fur.png": "assets/minecraft/textures/entity/sheep/sheep_fur.png",
    "textures/entity/pig/pig.png": "assets/minecraft/textures/entity/pig/pig.png",
    "textures/entity/chicken.png": "assets/minecraft/textures/entity/chicken.png",
    "textures/entity/zombie/zombie.png": "assets/minecraft/textures/entity/zombie/zombie.png",
    "textures/entity/skeleton/skeleton.png": "assets/minecraft/textures/entity/skeleton/skeleton.png",
    "textures/entity/creeper/creeper.png": "assets/minecraft/textures/entity/creeper/creeper.png",
    "textures/entity/spider/spider.png": "assets/minecraft/textures/entity/spider/spider.png",
    "textures/entity/bed/red.png": "assets/minecraft/textures/entity/bed/red.png",
    "models/item/stick.json": "assets/minecraft/models/item/stick.json",
    "models/item/wooden_pickaxe.json": "assets/minecraft/models/item/wooden_pickaxe.json",
}


def sha256_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def runtime_model_destination(canonical: str) -> str:
    if not canonical.startswith(MODEL_CANONICAL_PREFIX):
        raise ClosureError(f"runtime model resource is outside minecraft namespace: {canonical}")
    relative = canonical[len(MODEL_CANONICAL_PREFIX) :]
    if not (relative.startswith("blockstates/") or relative.startswith("models/block/")):
        raise ClosureError(f"unexpected runtime model resource path: {canonical}")
    return relative


def write_record(output: Path, records: dict[str, dict[str, object]], destination: str, source: str, payload: bytes) -> None:
    if destination in records:
        raise ClosureError(f"duplicate runtime destination: {destination}")
    target = output / destination
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(payload)
    records[destination] = {
        "source": source,
        "sha256": sha256_bytes(payload),
        "bytes": len(payload),
    }


def copy_canonical(index: MinecraftSourceIndex, output: Path, records: dict[str, dict[str, object]], destination: str, canonical: str) -> None:
    record = index.record(canonical)
    write_record(output, records, destination, record.source, index.read(canonical))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", nargs="?", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    output = args.output
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True, exist_ok=True)

    try:
        with open_minecraft_source(args.source) as index:
            records: dict[str, dict[str, object]] = {}
            for destination, canonical in sorted(RUNTIME_FILES.items()):
                copy_canonical(index, output, records, destination, canonical)

            closure = resolve_block_model_closure(index, MINECRAFT_MODEL_ACCEPTANCE_BLOCKS)
            blockstates: list[str] = []
            models: list[str] = []
            for canonical in (*closure.blockstates, *closure.models):
                destination = runtime_model_destination(canonical)
                copy_canonical(index, output, records, destination, canonical)
                (blockstates if canonical in closure.blockstates else models).append(destination)
    except ClosureError as exc:
        raise SystemExit(f"asset import failed: {exc}") from exc

    manifest = {
        "format": 1,
        "minecraftVersion": "1.20.1",
        **source_provenance(args.source),
        "files": records,
        "modelRuntimeClosure": {
            "roots": list(closure.roots),
            "counts": {
                "blockstates": len(blockstates),
                "models": len(models),
            },
            "blockstates": blockstates,
            "models": models,
        },
    }
    manifest_path = output / "source-manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(f"copied {len(records)} Minecraft resources into {output}")
    print(f"source: {manifest.get('sourceRoot') or manifest.get('sourceArchive')}")
    print(f"model runtime closure: {len(blockstates)} blockstates, {len(models)} models")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
