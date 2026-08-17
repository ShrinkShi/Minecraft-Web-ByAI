#!/usr/bin/env python3
"""Regression checks for the deterministic Minecraft model texture atlas."""

from __future__ import annotations

import json
import tempfile
from io import BytesIO
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

from PIL import Image

from minecraft_model_atlas import (
    ATLAS_FILE,
    DEFAULT_BLOCKS,
    MANIFEST_FILE,
    AtlasError,
    build_model_texture_atlas,
)

ROOT = Path(__file__).resolve().parent.parent
SOURCE_ROOT = ROOT / "MC原版素材assets"


def png_bytes(width: int, height: int, pixels: list[tuple[int, int, int, int]]) -> bytes:
    image = Image.new("RGBA", (width, height))
    image.putdata(pixels)
    output = BytesIO()
    image.save(output, format="PNG", compress_level=9, optimize=False)
    return output.getvalue()


def write_json(archive: ZipFile, path: str, value: object) -> None:
    archive.writestr(path, json.dumps(value, sort_keys=True).encode("utf-8"))


def build_synthetic_archive(path: Path, *, animated: bool = False, non_square: bool = False) -> None:
    with ZipFile(path, "w", ZIP_DEFLATED) as archive:
        prefix = "arbitrary/assets/minecraft/"
        write_json(
            archive,
            prefix + "blockstates/demo.json",
            {"variants": {"": {"model": "minecraft:block/demo"}}},
        )
        write_json(
            archive,
            prefix + "models/block/demo.json",
            {
                "textures": {"small": "minecraft:block/small", "large": "block/large"},
                "elements": [
                    {
                        "from": [0, 0, 0],
                        "to": [16, 16, 16],
                        "faces": {
                            "north": {"texture": "#small"},
                            "south": {"texture": "#large"},
                        },
                    }
                ],
            },
        )

        small_pixels = [
            (255, 0, 0, 255),
            (0, 255, 0, 255),
            (0, 0, 255, 255),
            (255, 255, 0, 255),
        ]
        archive.writestr(prefix + "textures/block/small.png", png_bytes(2, 2, small_pixels))

        large_height = 2 if non_square else 4
        large_pixels = [(20 + index, 40 + index, 60 + index, 255) for index in range(4 * large_height)]
        archive.writestr(prefix + "textures/block/large.png", png_bytes(4, large_height, large_pixels))
        if animated:
            write_json(archive, prefix + "textures/block/small.png.mcmeta", {"animation": {"frametime": 2}})


def boxes_overlap(a: dict[str, int], b: dict[str, int]) -> bool:
    return not (
        a["x"] + a["width"] <= b["x"]
        or b["x"] + b["width"] <= a["x"]
        or a["y"] + a["height"] <= b["y"]
        or b["y"] + b["height"] <= a["y"]
    )


def assert_synthetic() -> None:
    with tempfile.TemporaryDirectory() as temp:
        temp_path = Path(temp)
        archive_path = temp_path / "source.zip"
        build_synthetic_archive(archive_path)

        output_a = temp_path / "out-a"
        output_b = temp_path / "out-b"
        manifest_a = build_model_texture_atlas(archive_path, output_a, ["minecraft:demo"])
        manifest_b = build_model_texture_atlas(archive_path, output_b, ["demo"])

        assert (output_a / ATLAS_FILE).read_bytes() == (output_b / ATLAS_FILE).read_bytes()
        assert (output_a / MANIFEST_FILE).read_bytes() == (output_b / MANIFEST_FILE).read_bytes()
        assert manifest_a == manifest_b
        assert manifest_a["roots"] == ["minecraft:demo"]
        assert manifest_a["sourceKind"] == "archive"
        assert manifest_a["closure"] == {"blockstates": 1, "models": 1, "textures": 2, "metadata": 0}
        assert list(manifest_a["textures"]) == ["minecraft:block/large", "minecraft:block/small"]

        atlas = manifest_a["atlas"]
        assert atlas["width"] == atlas["height"]
        assert atlas["width"] & (atlas["width"] - 1) == 0, "atlas side must be a power of two"
        assert atlas["gutterPx"] == 1
        assert len(atlas["sha256"]) == 64

        records = list(manifest_a["textures"].values())
        assert not boxes_overlap(records[0]["pixelRegion"], records[1]["pixelRegion"])
        for record in records:
            region = record["region"]
            assert 0 <= region["u0"] < region["u1"] <= 1
            assert 0 <= region["v0"] < region["v1"] <= 1
            assert len(record["sourceSha256"]) == 64
            assert record["sourceBytes"] > 0

        small = manifest_a["textures"]["minecraft:block/small"]["pixelRegion"]
        with Image.open(output_a / ATLAS_FILE) as image:
            image = image.convert("RGBA")
            x = small["x"]
            y = small["y"]
            assert image.getpixel((x, y)) == (255, 0, 0, 255)
            assert image.getpixel((x + 1, y)) == (0, 255, 0, 255)
            assert image.getpixel((x, y + 1)) == (0, 0, 255, 255)
            assert image.getpixel((x + 1, y + 1)) == (255, 255, 0, 255)
            assert image.getpixel((x - 1, y)) == image.getpixel((x, y))
            assert image.getpixel((x + 2, y)) == image.getpixel((x + 1, y))
            assert image.getpixel((x, y - 1)) == image.getpixel((x, y))
            assert image.getpixel((x, y + 2)) == image.getpixel((x, y + 1))
            assert image.getpixel((x - 1, y - 1)) == image.getpixel((x, y))

        animated_path = temp_path / "animated.zip"
        build_synthetic_archive(animated_path, animated=True)
        try:
            build_model_texture_atlas(animated_path, temp_path / "animated-out", ["demo"])
        except AtlasError as exc:
            assert "animated" in str(exc)
        else:
            raise AssertionError("animated model texture did not fail closed")

        non_square_path = temp_path / "non-square.zip"
        build_synthetic_archive(non_square_path, non_square=True)
        try:
            build_model_texture_atlas(non_square_path, temp_path / "non-square-out", ["demo"])
        except AtlasError as exc:
            assert "non-square" in str(exc)
        else:
            raise AssertionError("non-square model texture did not fail closed")


def assert_real_source() -> None:
    if not SOURCE_ROOT.is_dir():
        raise AssertionError(f"tracked source directory is missing: {SOURCE_ROOT}")
    with tempfile.TemporaryDirectory() as temp:
        output = Path(temp) / "real"
        manifest = build_model_texture_atlas(SOURCE_ROOT, output, DEFAULT_BLOCKS)

        assert manifest["roots"] == sorted(DEFAULT_BLOCKS)
        assert manifest["sourceKind"] == "directory"
        assert manifest["sourceRoot"] == "MC原版素材assets"
        closure = manifest["closure"]
        assert closure["blockstates"] == len(DEFAULT_BLOCKS)
        assert closure["models"] >= len(DEFAULT_BLOCKS)
        assert closure["textures"] == len(manifest["textures"])
        assert closure["textures"] >= 13
        assert closure["metadata"] == 0
        required = {
            "minecraft:block/iron_ore",
            "minecraft:block/glass",
            "minecraft:block/oak_planks",
            "minecraft:block/oak_door_bottom",
            "minecraft:block/oak_door_top",
            "minecraft:block/torch",
        }
        assert required.issubset(manifest["textures"])

        for resource_id, record in manifest["textures"].items():
            assert resource_id.startswith("minecraft:")
            assert record["canonical"].startswith("assets/minecraft/textures/")
            expected_suffix = record["canonical"][len("assets/") :]
            assert record["source"].replace("\\", "/").endswith(expected_suffix)
            assert record["width"] == record["height"]
            assert record["width"] > 0

        atlas_path = output / ATLAS_FILE
        assert atlas_path.exists()
        assert (output / MANIFEST_FILE).exists()
        print(
            "real model atlas:",
            len(manifest["textures"]), "textures,",
            f"{manifest['atlas']['width']}x{manifest['atlas']['height']},",
            manifest["atlas"]["sha256"],
        )


def main() -> int:
    assert_synthetic()
    assert_real_source()
    print("Minecraft deterministic model texture atlas: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
