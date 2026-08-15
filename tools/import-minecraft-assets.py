#!/usr/bin/env python3
"""Extract the runtime subset used by Minecraft-Web-ByAI from the source ZIP.

The source archive may have an arbitrary top-level folder. Files are therefore
resolved by unique Minecraft resource suffix rather than by trusting that root.
The output tree is deterministic and includes a checksum manifest so generated
runtime files remain traceable to the exact user-supplied archive.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
from zipfile import BadZipFile, ZipFile

DEFAULT_ARCHIVE = "MC原版素材assets.zip"
DEFAULT_OUTPUT = "build/minecraft-runtime-source"

# Destination relative to output -> canonical suffix inside a Minecraft client
# resource tree. Keep this list limited to gameplay already present in the repo
# plus the next explicitly declared missing resources.
RUNTIME_FILES = {
    # Core world textures / atlas inputs.
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

    # Inventory / hotbar / drops already represented by gameplay definitions.
    "textures/item/stick.png": "assets/minecraft/textures/item/stick.png",
    "textures/item/wooden_pickaxe.png": "assets/minecraft/textures/item/wooden_pickaxe.png",
    "textures/item/stone_pickaxe.png": "assets/minecraft/textures/item/stone_pickaxe.png",
    "textures/item/raw_iron.png": "assets/minecraft/textures/item/raw_iron.png",
    "textures/item/red_bed.png": "assets/minecraft/textures/item/red_bed.png",
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

    # JSON resources needed for later model/blockstate interpretation.
    "models/block/grass_block.json": "assets/minecraft/models/block/grass_block.json",
    "models/block/crafting_table.json": "assets/minecraft/models/block/crafting_table.json",
    "models/item/stick.json": "assets/minecraft/models/item/stick.json",
    "models/item/wooden_pickaxe.json": "assets/minecraft/models/item/wooden_pickaxe.json",
    "blockstates/grass_block.json": "assets/minecraft/blockstates/grass_block.json",
    "blockstates/crafting_table.json": "assets/minecraft/blockstates/crafting_table.json",
}


def sha256_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def sha256_file(path: str) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def normalize_name(name: str) -> str:
    return name.replace("\\", "/")


def safe_name(name: str) -> bool:
    path = PurePosixPath(name)
    return not path.is_absolute() and ".." not in path.parts


def resolve_unique(names: list[str], suffix: str) -> str:
    needle = suffix.lower()
    matches = sorted(name for name in names if name.lower().endswith(needle))
    if not matches:
        raise KeyError(f"missing source resource: {suffix}")
    if len(matches) != 1:
        raise KeyError(f"ambiguous source resource {suffix}: {matches[:5]}")
    return matches[0]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("archive", nargs="?", default=DEFAULT_ARCHIVE)
    parser.add_argument("--output", default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)

    try:
        with ZipFile(args.archive) as archive:
            names = [normalize_name(info.filename) for info in archive.infolist() if not info.is_dir()]
            unsafe = [name for name in names if not safe_name(name)]
            if unsafe:
                raise SystemExit(f"asset archive contains unsafe paths: {unsafe[:5]}")

            records = {}
            for destination, suffix in sorted(RUNTIME_FILES.items()):
                source = resolve_unique(names, suffix)
                payload = archive.read(source)
                target = output / destination
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(payload)
                records[destination] = {
                    "source": source,
                    "sha256": sha256_bytes(payload),
                    "bytes": len(payload),
                }
    except (FileNotFoundError, BadZipFile) as exc:
        raise SystemExit(f"asset import failed: {exc}") from exc
    except KeyError as exc:
        raise SystemExit(f"asset import failed: {exc.args[0]}") from exc

    manifest = {
        "format": 1,
        "minecraftVersion": "1.20.1",
        "sourceArchive": args.archive,
        "sourceArchiveSha256": sha256_file(args.archive),
        "files": records,
    }
    manifest_path = output / "source-manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(f"imported {len(records)} Minecraft resources into {output}")
    print(f"source archive sha256: {manifest['sourceArchiveSha256']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
