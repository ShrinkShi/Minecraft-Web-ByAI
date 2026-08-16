#!/usr/bin/env python3
"""Build browser-ready art from selectively imported Minecraft resources.

The legacy 4x4 terrain atlas stays byte-compatible. Generic blockstate/model JSON
is passed through from the deterministic runtime closure so browser loaders can
resolve model parents without duplicating the dependency graph here. Vanilla GUI
sheets are cropped into compact deterministic runtime sprites so the browser does
not load unused 256x256 pixels while provenance remains tied to the source ZIP.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
from pathlib import Path

from PIL import Image

DEFAULT_SOURCE = Path("build/minecraft-runtime-source")
DEFAULT_OUTPUT = Path("build/minecraft-runtime-assets")
TILE_SIZE = 16
ATLAS_COLS = 4
ATLAS_ROWS = 4

PLAINS_GRASS = (145, 189, 89)
PLAINS_FOLIAGE = (119, 171, 47)
PLAINS_WATER = (63, 118, 228)
DEFAULT_LEATHER = (160, 101, 64)

ATLAS_TILES = {
    0: ("grass_block_top.png", "grass"),
    1: ("grass_block_side.png", "grass-side"),
    2: ("dirt.png", None),
    3: ("stone.png", None),
    4: ("sand.png", None),
    5: ("oak_planks.png", None),
    6: ("oak_log.png", None),
    7: ("oak_log_top.png", None),
    8: ("oak_leaves.png", "foliage"),
    9: ("water_still.png", "water"),
    10: ("crafting_table_top.png", None),
    11: ("crafting_table_side.png", None),
    12: ("crafting_table_front.png", None),
    13: ("cobblestone.png", None),
    14: ("iron_ore.png", None),
    15: ("white_wool.png", None),
}

ITEM_FILES = {
    "stick.png": ("stick.png", None),
    "wooden_pickaxe.png": ("wooden_pickaxe.png", None),
    "stone_pickaxe.png": ("stone_pickaxe.png", None),
    "raw_iron.png": ("raw_iron.png", None),
    "leather_helmet.png": ("leather_helmet.png", "leather"),
    "leather_chestplate.png": ("leather_chestplate.png", "leather"),
    "leather_leggings.png": ("leather_leggings.png", "leather"),
    "leather_boots.png": ("leather_boots.png", "leather"),
    "raw_beef.png": ("beef.png", None),
    "leather.png": ("leather.png", None),
    "raw_mutton.png": ("mutton.png", None),
    "raw_porkchop.png": ("porkchop.png", None),
    "raw_chicken.png": ("chicken.png", None),
    "feather.png": ("feather.png", None),
    "rotten_flesh.png": ("rotten_flesh.png", None),
    "bone.png": ("bone.png", None),
    "arrow.png": ("arrow.png", None),
    "gunpowder.png": ("gunpowder.png", None),
    "string.png": ("string.png", None),
}

GUI_SPRITES = {
    # x/y bounds are from the tracked Java 1.20.1 source sheets. The HUD crop
    # retains normal hearts, armor and hunger sprites with their original 9px grid.
    "hud-icons.png": ("textures/gui/icons.png", (16, 0, 70, 36)),
    # widgets.png hotbar layout is exactly: 1px left cap + nine identical 20x22
    # slots + 1px right cap. CI/source tests reconstruct it pixel-for-pixel.
    "hotbar-left-cap.png": ("textures/gui/widgets.png", (0, 0, 1, 22)),
    "hotbar-slot.png": ("textures/gui/widgets.png", (1, 0, 21, 22)),
    "hotbar-right-cap.png": ("textures/gui/widgets.png", (181, 0, 182, 22)),
    "hotbar-selector.png": ("textures/gui/widgets.png", (0, 22, 24, 46)),
    # Survival inventory GUI is the upper-left 176x166 region of inventory.png.
    "inventory.png": ("textures/gui/container/inventory.png", (0, 0, 176, 166)),
}

PASS_THROUGH = [
    "source-manifest.json",
    "models/item/stick.json",
    "models/item/wooden_pickaxe.json",
    "textures/entity/bed/red.png",
    "textures/entity/cow/cow.png",
    "textures/entity/sheep/sheep.png",
    "textures/entity/sheep/sheep_fur.png",
    "textures/entity/pig/pig.png",
    "textures/entity/chicken.png",
    "textures/entity/zombie/zombie.png",
    "textures/entity/skeleton/skeleton.png",
    "textures/entity/creeper/creeper.png",
    "textures/entity/spider/spider.png",
    "textures/block/water_still.png.mcmeta",
    "textures/block/water_flow.png.mcmeta",
]
MODEL_REFERENCE_ROOTS = ("models/block", "blockstates")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def first_square_frame(image: Image.Image) -> Image.Image:
    image = image.convert("RGBA")
    side = image.width
    if image.height < side:
        raise ValueError(f"texture is shorter than one frame: {image.size}")
    return image.crop((0, 0, side, side))


def tint(image: Image.Image, color: tuple[int, int, int]) -> Image.Image:
    src = image.convert("RGBA")
    output = Image.new("RGBA", src.size)
    output.putdata([
        (
            round(r * color[0] / 255),
            round(g * color[1] / 255),
            round(b * color[2] / 255),
            a,
        )
        for r, g, b, a in src.getdata()
    ])
    return output


def load_block(source: Path, name: str) -> Image.Image:
    with Image.open(source / "textures/block" / name) as image:
        frame = first_square_frame(image)
    if frame.size != (TILE_SIZE, TILE_SIZE):
        frame = frame.resize((TILE_SIZE, TILE_SIZE), Image.Resampling.NEAREST)
    return frame


def atlas_tile(source: Path, name: str, treatment: str | None) -> Image.Image:
    image = load_block(source, name)
    if treatment == "grass":
        return tint(image, PLAINS_GRASS)
    if treatment == "foliage":
        return tint(image, PLAINS_FOLIAGE)
    if treatment == "water":
        return tint(image, PLAINS_WATER)
    if treatment == "grass-side":
        overlay = tint(load_block(source, "grass_block_side_overlay.png"), PLAINS_GRASS)
        return Image.alpha_composite(image, overlay)
    return image


def build_atlas(source: Path, output: Path) -> dict[str, object]:
    atlas = Image.new("RGBA", (ATLAS_COLS * TILE_SIZE, ATLAS_ROWS * TILE_SIZE), (0, 0, 0, 0))
    tile_manifest = {}
    for index, (name, treatment) in sorted(ATLAS_TILES.items()):
        tile = atlas_tile(source, name, treatment)
        x = (index % ATLAS_COLS) * TILE_SIZE
        y = (index // ATLAS_COLS) * TILE_SIZE
        atlas.alpha_composite(tile, (x, y))
        tile_manifest[str(index)] = {"source": f"textures/block/{name}", "treatment": treatment}
    target = output / "textures/atlas.png"
    target.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(target, format="PNG", compress_level=9, optimize=False)
    return {"path": str(target.relative_to(output)), "sha256": sha256_file(target), "tiles": tile_manifest}


def build_items(source: Path, output: Path) -> dict[str, object]:
    records = {}
    target_dir = output / "items"
    target_dir.mkdir(parents=True, exist_ok=True)
    for destination, (source_name, treatment) in sorted(ITEM_FILES.items()):
        source_path = source / "textures/item" / source_name
        target = target_dir / destination
        if treatment == "leather":
            with Image.open(source_path) as image:
                tint(image, DEFAULT_LEATHER).save(target, format="PNG", compress_level=9, optimize=False)
        else:
            shutil.copyfile(source_path, target)
        records[destination] = {
            "source": f"textures/item/{source_name}",
            "treatment": treatment,
            "sha256": sha256_file(target),
        }
    return records


def build_gui(source: Path, output: Path) -> dict[str, object]:
    records = {}
    target_dir = output / "gui"
    target_dir.mkdir(parents=True, exist_ok=True)
    for destination, (source_name, crop_box) in sorted(GUI_SPRITES.items()):
        source_path = source / source_name
        with Image.open(source_path) as image:
            rgba = image.convert("RGBA")
            left, top, right, bottom = crop_box
            if left < 0 or top < 0 or right > rgba.width or bottom > rgba.height or right <= left or bottom <= top:
                raise ValueError(f"GUI crop {destination} is outside source dimensions {rgba.size}: {crop_box}")
            sprite = rgba.crop(crop_box)
        target = target_dir / destination
        sprite.save(target, format="PNG", compress_level=9, optimize=False)
        records[destination] = {
            "source": source_name,
            "crop": list(crop_box),
            "width": sprite.width,
            "height": sprite.height,
            "sha256": sha256_file(target),
        }
    return records


def reference_file_list(source: Path) -> list[str]:
    relatives = set(PASS_THROUGH)
    for root_name in MODEL_REFERENCE_ROOTS:
        root = source / root_name
        if not root.is_dir():
            raise FileNotFoundError(f"missing runtime model closure directory: {root}")
        for path in root.rglob("*"):
            if path.is_file():
                relatives.add(path.relative_to(source).as_posix())
    return sorted(relatives)


def copy_reference_files(source: Path, output: Path) -> dict[str, str]:
    records = {}
    for relative in reference_file_list(source):
        origin = source / relative
        target = output / "minecraft" / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(origin, target)
        records[f"minecraft/{relative}"] = sha256_file(target)
    return records


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    source_manifest_path = args.source / "source-manifest.json"
    if not source_manifest_path.exists():
        raise SystemExit(f"missing selective source manifest: {source_manifest_path}")
    source_manifest = json.loads(source_manifest_path.read_text(encoding="utf-8"))
    model_runtime_closure = source_manifest.get("modelRuntimeClosure")
    if not isinstance(model_runtime_closure, dict):
        raise SystemExit("selective source manifest is missing modelRuntimeClosure")

    if args.output.exists():
        shutil.rmtree(args.output)
    args.output.mkdir(parents=True, exist_ok=True)

    atlas = build_atlas(args.source, args.output)
    items = build_items(args.source, args.output)
    gui = build_gui(args.source, args.output)
    reference_files = copy_reference_files(args.source, args.output)

    runtime_manifest = {
        "format": 1,
        "minecraftVersion": source_manifest["minecraftVersion"],
        "sourceArchiveSha256": source_manifest["sourceArchiveSha256"],
        "modelRuntimeClosure": model_runtime_closure,
        "tintProfile": {
            "grass": PLAINS_GRASS,
            "foliage": PLAINS_FOLIAGE,
            "water": PLAINS_WATER,
            "leather": DEFAULT_LEATHER,
        },
        "atlas": atlas,
        "items": items,
        "gui": gui,
        "referenceFiles": reference_files,
    }
    manifest_path = args.output / "minecraft/runtime-manifest.json"
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(runtime_manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(f"built terrain atlas + {len(items)} item icons + {len(gui)} GUI sprites from Minecraft source")
    print(f"runtime atlas sha256: {atlas['sha256']}")
    print(
        "runtime model JSON:",
        f"{model_runtime_closure['counts']['blockstates']} blockstates,",
        f"{model_runtime_closure['counts']['models']} models",
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
