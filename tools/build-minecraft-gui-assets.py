#!/usr/bin/env python3
"""Build compact browser GUI sprites from the tracked Minecraft Java 1.20.1 ZIP.

GUI assets are intentionally separate from the terrain/item/model runtime subset:
they have their own provenance manifest and byte-reproducibility gate. Only the
pixels consumed by the current browser HUD/Inventory are emitted.
"""

from __future__ import annotations

import argparse
import json
import shutil
from io import BytesIO
from pathlib import Path
from zipfile import BadZipFile, ZipFile

from PIL import Image, UnidentifiedImageError

from minecraft_model_closure import ClosureError, MinecraftArchiveIndex, sha256_file

DEFAULT_ARCHIVE = Path("MC原版素材assets.zip")
DEFAULT_OUTPUT = Path("build/minecraft-gui-assets")
MINECRAFT_VERSION = "1.20.1"

GUI_SPRITES = {
    "hud-icons.png": ("assets/minecraft/textures/gui/icons.png", (16, 0, 70, 36)),
    "hotbar-left-cap.png": ("assets/minecraft/textures/gui/widgets.png", (0, 0, 1, 22)),
    "hotbar-slot.png": ("assets/minecraft/textures/gui/widgets.png", (1, 0, 21, 22)),
    "hotbar-right-cap.png": ("assets/minecraft/textures/gui/widgets.png", (181, 0, 182, 22)),
    "hotbar-selector.png": ("assets/minecraft/textures/gui/widgets.png", (0, 22, 24, 46)),
    "inventory-slot.png": ("assets/minecraft/textures/gui/container/inventory.png", (7, 83, 25, 101)),
}
EXPECTED_SOURCE_SIZE = {
    "assets/minecraft/textures/gui/icons.png": (256, 256),
    "assets/minecraft/textures/gui/widgets.png": (256, 256),
    "assets/minecraft/textures/gui/container/inventory.png": (256, 256),
}


class GuiAssetError(RuntimeError):
    """Raised when the supplied GUI source cannot satisfy the current contract."""


def load_png(index: MinecraftArchiveIndex, canonical: str) -> Image.Image:
    payload = index.read(canonical)
    try:
        with Image.open(BytesIO(payload)) as image:
            image.load()
            result = image.convert("RGBA")
    except (UnidentifiedImageError, OSError) as exc:
        raise GuiAssetError(f"invalid GUI PNG {canonical}: {exc}") from exc
    expected = EXPECTED_SOURCE_SIZE[canonical]
    if result.size != expected:
        raise GuiAssetError(f"GUI source {canonical} must be {expected[0]}x{expected[1]}, got {result.size}")
    return result


def validate_hotbar_repetition(widgets: Image.Image) -> None:
    reference = widgets.crop((1, 0, 21, 22)).tobytes()
    for index in range(9):
        x = 1 + index * 20
        if widgets.crop((x, 0, x + 20, 22)).tobytes() != reference:
            raise GuiAssetError(f"widgets.png hotbar slot {index} no longer matches the 20x22 repetition contract")


def build_gui_assets(archive_path: Path, output: Path) -> dict[str, object]:
    try:
        with ZipFile(archive_path) as archive:
            index = MinecraftArchiveIndex(archive)
            images = {canonical: load_png(index, canonical) for canonical in EXPECTED_SOURCE_SIZE}
            validate_hotbar_repetition(images["assets/minecraft/textures/gui/widgets.png"])

            if output.exists():
                shutil.rmtree(output)
            output.mkdir(parents=True, exist_ok=True)

            sprites: dict[str, dict[str, object]] = {}
            for destination, (canonical, crop_box) in sorted(GUI_SPRITES.items()):
                image = images[canonical]
                left, top, right, bottom = crop_box
                if left < 0 or top < 0 or right > image.width or bottom > image.height or right <= left or bottom <= top:
                    raise GuiAssetError(f"GUI crop {destination} is outside {canonical}: {crop_box}")
                sprite = image.crop(crop_box)
                target = output / destination
                sprite.save(target, format="PNG", compress_level=9, optimize=False)
                sprites[destination] = {
                    "source": canonical,
                    "crop": list(crop_box),
                    "width": sprite.width,
                    "height": sprite.height,
                    "sha256": sha256_file(target),
                }

            sources: dict[str, dict[str, object]] = {}
            for canonical in sorted(EXPECTED_SOURCE_SIZE):
                record = index.record(canonical)
                sources[canonical] = {
                    "source": record.source,
                    "sha256": record.sha256,
                    "bytes": record.size,
                    "width": images[canonical].width,
                    "height": images[canonical].height,
                }
    except (FileNotFoundError, BadZipFile, ClosureError) as exc:
        raise GuiAssetError(f"cannot build Minecraft GUI assets: {exc}") from exc

    manifest: dict[str, object] = {
        "format": 1,
        "minecraftVersion": MINECRAFT_VERSION,
        "sourceArchive": archive_path.name,
        "sourceArchiveSha256": sha256_file(archive_path),
        "sources": sources,
        "sprites": sprites,
        "hotbar": {
            "width": 182,
            "height": 22,
            "leftCapWidth": 1,
            "slotWidth": 20,
            "slotCount": 9,
            "rightCapWidth": 1,
            "selectorWidth": 24,
            "selectorHeight": 24,
        },
    }
    (output / "gui-manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    return manifest


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("archive", nargs="?", type=Path, default=DEFAULT_ARCHIVE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    try:
        manifest = build_gui_assets(args.archive, args.output)
    except GuiAssetError as exc:
        raise SystemExit(str(exc)) from exc
    print(f"built {len(manifest['sprites'])} deterministic Minecraft GUI sprites into {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
