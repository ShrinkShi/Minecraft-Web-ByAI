#!/usr/bin/env python3
"""Extract the browser runtime subset from the tracked Minecraft source ZIP.

Legacy gameplay resources remain an explicit selective list. Generic block-model
JSON is different: its blockstate/model parent closure is derived by the shared
minecraft_model_closure resolver so the runtime cannot drift from the dependency
set already proven by the atlas/source audits.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
from pathlib import Path, PurePosixPath
from zipfile import BadZipFile, ZipFile

from minecraft_model_acceptance import MINECRAFT_MODEL_ACCEPTANCE_BLOCKS
from minecraft_model_closure import ClosureError, MinecraftArchiveIndex, resolve_block_model_closure

DEFAULT_ARCHIVE = "MC原版素材assets.zip"
DEFAULT_OUTPUT = "build/minecraft-runtime-source"
MODEL_CANONICAL_PREFIX = "assets/minecraft/"

# Destination relative to output -> canonical suffix inside a Minecraft client
# resource tree. Generic blockstates/models are intentionally NOT hand-listed;
# they are appended from the deterministic model dependency closure below.
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

    # Vanilla 1.20.1 HUD/hotbar/inventory sheets used by the browser UI.
    "textures/gui/icons.png": "assets/minecraft/textures/gui/icons.png",
    "textures/gui/widgets.png": "assets/minecraft/textures/gui/widgets.png",
    "textures/gui/container/inventory.png": "assets/minecraft/textures/gui/container/inventory.png",

    # Inventory / hotbar / drops already represented by gameplay definitions.
    "textures/item/stick.png": "assets/minecraft/textures/item/stick.png",
    "textures/item/wooden_pickaxe.png": "assets/minecraft/textures/item/wooden_pickaxe.png",
    "textures/item/stone_pickaxe.png": "assets/minecraft/textures/item/stone_pickaxe.png",
    "textures/item/raw_iron.png": "assets/minecraft/textures/item/raw_iron.png",
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

    # Entity sheets for every mob type already implemented by gameplay.
    "textures/entity/cow/cow.png": "assets/minecraft/textures/entity/cow/cow.png",
    "textures/entity/sheep/sheep.png": "assets/minecraft/textures/entity/sheep/sheep.png",
    "textures/entity/sheep/sheep_fur.png": "assets/minecraft/textures/entity/sheep/sheep_fur.png",
    "textures/entity/pig/pig.png": "assets/minecraft/textures/entity/pig/pig.png",
    "textures/entity/chicken.png": "assets/minecraft/textures/entity/chicken.png",
    "textures/entity/zombie/zombie.png": "assets/minecraft/textures/entity/zombie/zombie.png",
    "textures/entity/skeleton/skeleton.png": "assets/minecraft/textures/entity/skeleton/skeleton.png",
    "textures/entity/creeper/creeper.png": "assets/minecraft/textures/entity/creeper/creeper.png",
    "textures/entity/spider/spider.png": "assets/minecraft/textures/entity/spider/spider.png",

    # Beds render from an entity sheet in vanilla; this archive does not expose
    # a standalone textures/item/red_bed.png resource.
    "textures/entity/bed/red.png": "assets/minecraft/textures/entity/bed/red.png",

    # Item JSON is still an explicit current-runtime subset.
    "models/item/stick.json": "assets/minecraft/models/item/stick.json",
    "models/item/wooden_pickaxe.json": "assets/minecraft/models/item/wooden_pickaxe.json",
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


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("archive", nargs="?", default=DEFAULT_ARCHIVE)
    parser.add_argument("--output", default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    output = Path(args.output)
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True, exist_ok=True)

    try:
        with ZipFile(args.archive) as archive:
            names = [normalize_name(info.filename) for info in archive.infolist() if not info.is_dir()]
            unsafe = [name for name in names if not safe_name(name)]
            if unsafe:
                raise ClosureError(f"asset archive contains unsafe paths: {unsafe[:5]}")

            records: dict[str, dict[str, object]] = {}
            for destination, suffix in sorted(RUNTIME_FILES.items()):
                source = resolve_unique(names, suffix)
                write_record(output, records, destination, source, archive.read(source))

            index = MinecraftArchiveIndex(archive)
            closure = resolve_block_model_closure(index, MINECRAFT_MODEL_ACCEPTANCE_BLOCKS)
            blockstates: list[str] = []
            models: list[str] = []
            for canonical in (*closure.blockstates, *closure.models):
                destination = runtime_model_destination(canonical)
                record = index.record(canonical)
                write_record(output, records, destination, record.source, index.read(canonical))
                (blockstates if canonical in closure.blockstates else models).append(destination)
    except (FileNotFoundError, BadZipFile) as exc:
        raise SystemExit(f"asset import failed: {exc}") from exc
    except (KeyError, ClosureError) as exc:
        message = exc.args[0] if isinstance(exc, KeyError) else str(exc)
        raise SystemExit(f"asset import failed: {message}") from exc

    manifest = {
        "format": 1,
        "minecraftVersion": "1.20.1",
        "sourceArchive": args.archive,
        "sourceArchiveSha256": sha256_file(args.archive),
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
    print(f"imported {len(records)} Minecraft resources into {output}")
    print(f"source archive sha256: {manifest['sourceArchiveSha256']}")
    print(f"model runtime closure: {len(blockstates)} blockstates, {len(models)} models")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
