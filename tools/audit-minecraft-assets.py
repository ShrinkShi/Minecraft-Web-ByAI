#!/usr/bin/env python3
"""Inspect the tracked Minecraft 1.20.1 asset directory deterministically."""

from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path, PurePosixPath

DEFAULT_SOURCE = Path("MC原版素材assets")

FAMILIES = {
    "block_textures": "assets/minecraft/textures/block/",
    "item_textures": "assets/minecraft/textures/item/",
    "entity_textures": "assets/minecraft/textures/entity/",
    "gui_textures": "assets/minecraft/textures/gui/",
    "particle_textures": "assets/minecraft/textures/particle/",
    "block_models": "assets/minecraft/models/block/",
    "item_models": "assets/minecraft/models/item/",
    "blockstates": "assets/minecraft/blockstates/",
    "sounds": "assets/minecraft/sounds/",
}

PROBES = {
    "sounds_json": "assets/minecraft/sounds.json",
    "stone": "assets/minecraft/textures/block/stone.png",
    "dirt": "assets/minecraft/textures/block/dirt.png",
    "grass_top": "assets/minecraft/textures/block/grass_block_top.png",
    "grass_side": "assets/minecraft/textures/block/grass_block_side.png",
    "sand": "assets/minecraft/textures/block/sand.png",
    "oak_planks": "assets/minecraft/textures/block/oak_planks.png",
    "oak_log": "assets/minecraft/textures/block/oak_log.png",
    "oak_log_top": "assets/minecraft/textures/block/oak_log_top.png",
    "oak_leaves": "assets/minecraft/textures/block/oak_leaves.png",
    "crafting_table_top": "assets/minecraft/textures/block/crafting_table_top.png",
    "crafting_table_side": "assets/minecraft/textures/block/crafting_table_side.png",
    "cobblestone": "assets/minecraft/textures/block/cobblestone.png",
    "water_still": "assets/minecraft/textures/block/water_still.png",
    "water_flow": "assets/minecraft/textures/block/water_flow.png",
    "stick": "assets/minecraft/textures/item/stick.png",
    "wooden_pickaxe": "assets/minecraft/textures/item/wooden_pickaxe.png",
    "stone_pickaxe": "assets/minecraft/textures/item/stone_pickaxe.png",
    "raw_iron": "assets/minecraft/textures/item/raw_iron.png",
    "iron_ore": "assets/minecraft/textures/block/iron_ore.png",
    "entity_cow": "assets/minecraft/textures/entity/cow/cow.png",
    "entity_sheep": "assets/minecraft/textures/entity/sheep/sheep.png",
    "entity_sheep_fur": "assets/minecraft/textures/entity/sheep/sheep_fur.png",
    "entity_pig": "assets/minecraft/textures/entity/pig/pig.png",
    "entity_chicken": "assets/minecraft/textures/entity/chicken.png",
    "entity_zombie": "assets/minecraft/textures/entity/zombie/zombie.png",
    "entity_skeleton": "assets/minecraft/textures/entity/skeleton/skeleton.png",
    "entity_creeper": "assets/minecraft/textures/entity/creeper/creeper.png",
    "entity_spider": "assets/minecraft/textures/entity/spider/spider.png",
    "player_steve": "assets/minecraft/textures/entity/player/wide/steve.png",
}


def canonical_name(source: Path, path: Path) -> str:
    relative = path.relative_to(source).as_posix()
    pure = PurePosixPath(relative)
    if pure.is_absolute() or any(part in {"", ".", ".."} for part in pure.parts):
        raise ValueError(f"unsafe source path: {relative}")
    return f"assets/{relative}"


def suffix_match(names: list[str], suffix: str) -> list[str]:
    suffix = suffix.lower()
    return sorted(name for name in names if name.lower().endswith(suffix))


def family_matches(names: list[str], family: str) -> list[str]:
    needle = family.lower()
    return sorted(name for name in names if needle in name.lower())


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", nargs="?", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--json-out", default=None)
    args = parser.parse_args()

    if not args.source.is_dir():
        raise SystemExit(f"asset directory audit failed: source directory is missing: {args.source}")

    paths = sorted(path for path in args.source.rglob("*") if path.is_file())
    if not paths:
        raise SystemExit("asset directory is empty")
    names = [canonical_name(args.source, path) for path in paths]
    sizes = {name: path.stat().st_size for name, path in zip(names, paths, strict=True)}

    top_level = Counter(PurePosixPath(name[len("assets/") :]).parts[0] for name in names)
    extensions = Counter(PurePosixPath(name).suffix.lower() or "<none>" for name in names)
    bbmodels = suffix_match(names, ".bbmodel")

    families = {}
    for key, needle in FAMILIES.items():
        matches = family_matches(names, needle)
        families[key] = {"count": len(matches), "samples": matches[:5]}

    probes = {}
    for key, suffix in PROBES.items():
        matches = suffix_match(names, suffix)
        probes[key] = matches[0] if matches else None

    report = {
        "sourceKind": "directory",
        "sourceRoot": args.source.name,
        "classification": "client-resource-tree",
        "entry_count": len(paths),
        "bytes": sum(sizes.values()),
        "top_level": dict(sorted(top_level.items())),
        "extensions": dict(sorted(extensions.items())),
        "families": families,
        "probes": probes,
        "bbmodel_count": len(bbmodels),
        "bbmodel_samples": bbmodels[:5],
    }

    payload = json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True)
    print(payload)
    if args.json_out:
        Path(args.json_out).write_text(payload + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
