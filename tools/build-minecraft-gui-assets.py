#!/usr/bin/env python3
"""Build compact browser GUI sprites from tracked Minecraft Java 1.20.1 assets.

The authoritative source is the repository-tracked ``MC原版素材assets/`` tree.
Archive support lives only in the shared source-index layer for synthetic tests.
"""

from __future__ import annotations

import argparse
import json
import shutil
from io import BytesIO
from pathlib import Path

from PIL import Image, UnidentifiedImageError

from minecraft_model_closure import ClosureError, MinecraftSourceIndex, open_minecraft_source, source_provenance

DEFAULT_SOURCE = Path("MC原版素材assets")
DEFAULT_OUTPUT = Path("build/minecraft-gui-assets")
MINECRAFT_VERSION = "1.20.1"
ICONS = "assets/minecraft/textures/gui/icons.png"
WIDGETS = "assets/minecraft/textures/gui/widgets.png"
INVENTORY = "assets/minecraft/textures/gui/container/inventory.png"

GUI_SPRITES = {
    "crosshair.png": (ICONS, (0, 0, 15, 15)),
    "hud-icons.png": (ICONS, (16, 0, 70, 36)),
    "xp-background.png": (ICONS, (0, 64, 182, 69)),
    "xp-progress.png": (ICONS, (0, 69, 182, 74)),
    "hotbar-left-cap.png": (WIDGETS, (0, 0, 1, 22)),
    **{
        f"hotbar-slot-{index}.png": (WIDGETS, (1 + index * 20, 0, 21 + index * 20, 22))
        for index in range(9)
    },
    "hotbar-right-cap.png": (WIDGETS, (181, 0, 182, 22)),
    "hotbar-selector.png": (WIDGETS, (0, 22, 24, 46)),
    "inventory-panel.png": (INVENTORY, (0, 0, 176, 166)),
    "inventory-slot.png": (INVENTORY, (7, 83, 25, 101)),
}
EXPECTED_SOURCE_SIZE = {ICONS: (256, 256), WIDGETS: (256, 256), INVENTORY: (256, 256)}


class GuiAssetError(RuntimeError):
    """Raised when the supplied GUI source cannot satisfy the current contract."""


def load_png(index: MinecraftSourceIndex, canonical: str) -> Image.Image:
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


def validate_hotbar_partition(widgets: Image.Image) -> None:
    rebuilt = Image.new("RGBA", (182, 22), (0, 0, 0, 0))
    rebuilt.paste(widgets.crop((0, 0, 1, 22)), (0, 0))
    for index in range(9):
        x = 1 + index * 20
        rebuilt.paste(widgets.crop((x, 0, x + 20, 22)), (x, 0))
    rebuilt.paste(widgets.crop((181, 0, 182, 22)), (181, 0))
    if rebuilt.tobytes() != widgets.crop((0, 0, 182, 22)).tobytes():
        raise GuiAssetError("widgets.png hotbar partition does not reconstruct the exact 182x22 source region")


def build_gui_assets(source_path: Path, output: Path) -> dict[str, object]:
    try:
        with open_minecraft_source(source_path) as index:
            images = {canonical: load_png(index, canonical) for canonical in EXPECTED_SOURCE_SIZE}
            validate_hotbar_partition(images[WIDGETS])

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
                    "size": [sprite.width, sprite.height],
                }

            sources: dict[str, dict[str, object]] = {}
            for canonical in sorted(EXPECTED_SOURCE_SIZE):
                record = index.record(canonical)
                sources[canonical] = {"source": record.source, "sha256": record.sha256, "bytes": record.size}
    except ClosureError as exc:
        raise GuiAssetError(f"cannot build Minecraft GUI assets: {exc}") from exc

    slot_names = [f"hotbar-slot-{index}.png" for index in range(9)]
    manifest: dict[str, object] = {
        "format": 1,
        "minecraftVersion": MINECRAFT_VERSION,
        **source_provenance(source_path),
        "sources": sources,
        "sprites": sprites,
        "hotbar": {
            "width": 182,
            "height": 22,
            "leftCap": "hotbar-left-cap.png",
            "slots": slot_names,
            "slotWidth": 20,
            "slotCount": 9,
            "rightCap": "hotbar-right-cap.png",
            "selector": "hotbar-selector.png",
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
    parser.add_argument("source", nargs="?", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    try:
        manifest = build_gui_assets(args.source, args.output)
    except GuiAssetError as exc:
        raise SystemExit(str(exc)) from exc
    print(f"built {len(manifest['sprites'])} deterministic Minecraft GUI sprites into {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
