#!/usr/bin/env python3
"""Inspect the user-supplied Minecraft 1.20.1 asset archive without extracting it.

The report is intentionally deterministic so GitHub Actions can be used as a
trusted inspection environment even when a development client cannot download
binary repository blobs directly.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter
from pathlib import PurePosixPath
from zipfile import BadZipFile, ZipFile

DEFAULT_ARCHIVE = "MC原版素材assets.zip"

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
    "hash_indexes": "indexes/",
    "hash_objects": "objects/",
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
}


def sha256_file(path: str) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def safe_name(name: str) -> bool:
    path = PurePosixPath(name)
    return not path.is_absolute() and ".." not in path.parts


def suffix_match(names: list[str], suffix: str) -> list[str]:
    suffix = suffix.lower()
    return sorted(name for name in names if name.lower().endswith(suffix))


def family_matches(names: list[str], family: str) -> list[str]:
    needle = family.lower()
    return sorted(name for name in names if needle in name.lower())


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("archive", nargs="?", default=DEFAULT_ARCHIVE)
    parser.add_argument("--json-out", default=None)
    args = parser.parse_args()

    try:
        with ZipFile(args.archive) as archive:
            infos = [info for info in archive.infolist() if not info.is_dir()]
    except (FileNotFoundError, BadZipFile) as exc:
        raise SystemExit(f"asset archive audit failed: {exc}") from exc

    names = [info.filename.replace("\\", "/") for info in infos]
    unsafe = sorted(name for name in names if not safe_name(name))
    if unsafe:
        raise SystemExit(f"asset archive contains unsafe paths: {unsafe[:5]}")

    top_level = Counter(PurePosixPath(name).parts[0] for name in names if PurePosixPath(name).parts)
    extensions = Counter(PurePosixPath(name).suffix.lower() or "<none>" for name in names)
    bbmodels = suffix_match(names, ".bbmodel")

    families = {}
    for key, needle in FAMILIES.items():
        matches = family_matches(names, needle)
        families[key] = {
            "count": len(matches),
            "samples": matches[:5],
        }

    probes = {}
    for key, suffix in PROBES.items():
        matches = suffix_match(names, suffix)
        probes[key] = matches[0] if matches else None

    has_jar_tree = any(value["count"] for key, value in families.items() if key not in {"hash_indexes", "hash_objects"})
    has_hash_store = families["hash_indexes"]["count"] > 0 or families["hash_objects"]["count"] > 0
    if has_jar_tree and has_hash_store:
        classification = "combined"
    elif has_jar_tree:
        classification = "client-resource-tree"
    elif has_hash_store:
        classification = "minecraft-assets-hash-store"
    else:
        classification = "unknown"

    report = {
        "archive": args.archive,
        "sha256": sha256_file(args.archive),
        "classification": classification,
        "entry_count": len(infos),
        "uncompressed_bytes": sum(info.file_size for info in infos),
        "compressed_bytes": sum(info.compress_size for info in infos),
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
        with open(args.json_out, "w", encoding="utf-8", newline="\n") as output:
            output.write(payload)
            output.write("\n")

    if not infos:
        raise SystemExit("asset archive is empty")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
