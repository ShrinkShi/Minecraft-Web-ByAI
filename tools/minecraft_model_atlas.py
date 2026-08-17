#!/usr/bin/env python3
"""Deterministic atlas packing for interpreted Minecraft block-model textures."""

from __future__ import annotations

import argparse
import json
import math
import shutil
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from typing import Any, Iterable

from PIL import Image, UnidentifiedImageError

from minecraft_model_acceptance import MINECRAFT_MODEL_ACCEPTANCE_BLOCKS
from minecraft_model_closure import (
    ClosureError,
    MinecraftSourceIndex,
    normalize_resource_id,
    open_minecraft_source,
    resolve_block_model_closure,
    sha256_file,
    source_provenance,
)

DEFAULT_SOURCE = Path("MC原版素材assets")
DEFAULT_OUTPUT = Path("build/minecraft-model-atlas")
DEFAULT_BLOCKS = MINECRAFT_MODEL_ACCEPTANCE_BLOCKS
ATLAS_FILE = "model-texture-atlas.png"
MANIFEST_FILE = "model-texture-atlas.json"
PACKING_FORMAT = "power-of-two-shelf-v1"
GUTTER_PX = 1
MAX_ATLAS_SIDE = 4096


class AtlasError(RuntimeError):
    """Raised when a model texture closure cannot be packed safely."""


@dataclass(frozen=True)
class TextureSource:
    resource_id: str
    canonical: str
    source: str
    sha256: str
    size_bytes: int
    width: int
    height: int
    pixels: Image.Image

    @property
    def packed_width(self) -> int:
        return self.width + GUTTER_PX * 2

    @property
    def packed_height(self) -> int:
        return self.height + GUTTER_PX * 2


@dataclass(frozen=True)
class Placement:
    texture: TextureSource
    x: int
    y: int


@dataclass(frozen=True)
class PackingResult:
    side: int
    placements: tuple[Placement, ...]


def canonical_texture_resource_id(canonical: str) -> str:
    prefix = "assets/"
    if not canonical.startswith(prefix) or not canonical.endswith(".png"):
        raise AtlasError(f"invalid canonical texture path: {canonical}")
    body = canonical[len(prefix) : -len(".png")]
    namespace, separator, remainder = body.partition("/textures/")
    if not separator or not namespace or not remainder:
        raise AtlasError(f"invalid canonical texture path: {canonical}")
    try:
        return normalize_resource_id(f"{namespace}:{remainder}")
    except ClosureError as exc:
        raise AtlasError(f"invalid canonical texture resource: {canonical}: {exc}") from exc


def _decode_texture(index: MinecraftSourceIndex, canonical: str) -> TextureSource:
    metadata = f"{canonical}.mcmeta"
    if index.has(metadata):
        raise AtlasError(
            f"animated model texture is outside the current atlas contract: {canonical}; "
            "animation support must land before this resource can be admitted"
        )

    payload = index.read(canonical)
    record = index.record(canonical)
    try:
        with Image.open(BytesIO(payload)) as image:
            if int(getattr(image, "n_frames", 1)) != 1:
                raise AtlasError(f"multi-frame model texture is unsupported: {canonical}")
            image.load()
            pixels = image.convert("RGBA")
    except (UnidentifiedImageError, OSError) as exc:
        raise AtlasError(f"invalid PNG model texture: {canonical}: {exc}") from exc

    width, height = pixels.size
    if width <= 0 or height <= 0:
        raise AtlasError(f"model texture has invalid dimensions {pixels.size}: {canonical}")
    if width != height:
        raise AtlasError(
            f"non-square model texture is outside the current 0..16 UV contract: "
            f"{canonical} is {width}x{height}"
        )

    return TextureSource(
        resource_id=canonical_texture_resource_id(canonical),
        canonical=canonical,
        source=record.source,
        sha256=record.sha256,
        size_bytes=record.size,
        width=width,
        height=height,
        pixels=pixels,
    )


def load_texture_sources(index: MinecraftSourceIndex, canonical_paths: Iterable[str]) -> tuple[TextureSource, ...]:
    paths = tuple(sorted(set(canonical_paths)))
    if not paths:
        raise AtlasError("model texture closure is empty")
    sources = tuple(_decode_texture(index, canonical) for canonical in paths)
    resource_ids = [source.resource_id for source in sources]
    if len(resource_ids) != len(set(resource_ids)):
        raise AtlasError("multiple canonical textures resolved to the same resource ID")
    return sources


def _next_power_of_two(value: int) -> int:
    return 1 if value <= 1 else 1 << (value - 1).bit_length()


def _try_shelf_pack(textures: tuple[TextureSource, ...], side: int) -> tuple[Placement, ...] | None:
    placements: list[Placement] = []
    x = 0
    y = 0
    row_height = 0
    for texture in textures:
        width = texture.packed_width
        height = texture.packed_height
        if width > side or height > side:
            return None
        if x + width > side:
            x = 0
            y += row_height
            row_height = 0
        if y + height > side:
            return None
        placements.append(Placement(texture=texture, x=x, y=y))
        x += width
        row_height = max(row_height, height)
    return tuple(placements)


def pack_textures(textures: tuple[TextureSource, ...]) -> PackingResult:
    if not textures:
        raise AtlasError("cannot pack an empty texture set")
    minimum_side = max(max(texture.packed_width, texture.packed_height) for texture in textures)
    total_area = sum(texture.packed_width * texture.packed_height for texture in textures)
    side = _next_power_of_two(max(minimum_side, math.ceil(math.sqrt(total_area))))
    while side <= MAX_ATLAS_SIDE:
        placements = _try_shelf_pack(textures, side)
        if placements is not None:
            return PackingResult(side=side, placements=placements)
        side *= 2
    raise AtlasError(f"model texture atlas exceeds maximum side {MAX_ATLAS_SIDE}px")


def _paste_with_gutter(atlas: Image.Image, placement: Placement) -> None:
    texture = placement.texture
    pixels = texture.pixels
    x = placement.x + GUTTER_PX
    y = placement.y + GUTTER_PX
    width = texture.width
    height = texture.height
    atlas.paste(pixels, (x, y))

    atlas.paste(
        pixels.crop((0, 0, 1, height)).resize((GUTTER_PX, height), Image.Resampling.NEAREST),
        (placement.x, y),
    )
    atlas.paste(
        pixels.crop((width - 1, 0, width, height)).resize((GUTTER_PX, height), Image.Resampling.NEAREST),
        (x + width, y),
    )
    atlas.paste(
        pixels.crop((0, 0, width, 1)).resize((width, GUTTER_PX), Image.Resampling.NEAREST),
        (x, placement.y),
    )
    atlas.paste(
        pixels.crop((0, height - 1, width, height)).resize((width, GUTTER_PX), Image.Resampling.NEAREST),
        (x, y + height),
    )
    atlas.paste(pixels.getpixel((0, 0)), (placement.x, placement.y, x, y))
    atlas.paste(pixels.getpixel((width - 1, 0)), (x + width, placement.y, x + width + GUTTER_PX, y))
    atlas.paste(pixels.getpixel((0, height - 1)), (placement.x, y + height, x, y + height + GUTTER_PX))
    atlas.paste(
        pixels.getpixel((width - 1, height - 1)),
        (x + width, y + height, x + width + GUTTER_PX, y + height + GUTTER_PX),
    )


def _texture_manifest_record(placement: Placement, atlas_side: int) -> dict[str, Any]:
    texture = placement.texture
    x = placement.x + GUTTER_PX
    y = placement.y + GUTTER_PX
    x1 = x + texture.width
    y1 = y + texture.height
    return {
        "canonical": texture.canonical,
        "source": texture.source,
        "sourceSha256": texture.sha256,
        "sourceBytes": texture.size_bytes,
        "width": texture.width,
        "height": texture.height,
        "pixelRegion": {"x": x, "y": y, "width": texture.width, "height": texture.height},
        "region": {
            "u0": x / atlas_side,
            "v0": y / atlas_side,
            "u1": x1 / atlas_side,
            "v1": y1 / atlas_side,
        },
    }


def build_model_texture_atlas(
    source_path: str | Path,
    output: str | Path,
    block_ids: Iterable[str] = DEFAULT_BLOCKS,
) -> dict[str, Any]:
    source_path = Path(source_path)
    output = Path(output)
    roots = tuple(sorted({normalize_resource_id(block_id) for block_id in block_ids}))
    if not roots:
        raise AtlasError("at least one block root is required")

    try:
        with open_minecraft_source(source_path) as index:
            closure = resolve_block_model_closure(index, roots)
            if closure.metadata:
                raise AtlasError(
                    "animated texture metadata entered the model-atlas closure: " + ", ".join(closure.metadata)
                )
            textures = load_texture_sources(index, closure.textures)
            packing = pack_textures(textures)
            atlas = Image.new("RGBA", (packing.side, packing.side), (0, 0, 0, 0))
            for placement in packing.placements:
                _paste_with_gutter(atlas, placement)

            if output.exists():
                shutil.rmtree(output)
            output.mkdir(parents=True, exist_ok=True)
            atlas_path = output / ATLAS_FILE
            atlas.save(atlas_path, format="PNG", compress_level=9, optimize=False)
            texture_records = {
                placement.texture.resource_id: _texture_manifest_record(placement, packing.side)
                for placement in packing.placements
            }
            manifest: dict[str, Any] = {
                "format": 1,
                "minecraftVersion": "1.20.1",
                "roots": list(closure.roots),
                **source_provenance(source_path),
                "closure": {
                    "blockstates": len(closure.blockstates),
                    "models": len(closure.models),
                    "textures": len(closure.textures),
                    "metadata": len(closure.metadata),
                },
                "atlas": {
                    "path": ATLAS_FILE,
                    "sha256": sha256_file(atlas_path),
                    "width": packing.side,
                    "height": packing.side,
                    "gutterPx": GUTTER_PX,
                    "packing": PACKING_FORMAT,
                },
                "textures": texture_records,
            }
            (output / MANIFEST_FILE).write_text(
                json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
                encoding="utf-8",
            )
            return manifest
    except ClosureError as exc:
        raise AtlasError(f"cannot build Minecraft model texture atlas: {exc}") from exc


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", nargs="?", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument(
        "--block",
        action="append",
        dest="blocks",
        help="Block resource ID. Repeat to replace the default acceptance roots.",
    )
    args = parser.parse_args()
    try:
        manifest = build_model_texture_atlas(args.source, args.output, args.blocks or DEFAULT_BLOCKS)
    except AtlasError as exc:
        raise SystemExit(str(exc)) from exc
    atlas = manifest["atlas"]
    print(
        "built Minecraft model texture atlas:",
        f"{len(manifest['textures'])} textures,",
        f"{atlas['width']}x{atlas['height']},",
        f"sha256={atlas['sha256']}",
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
