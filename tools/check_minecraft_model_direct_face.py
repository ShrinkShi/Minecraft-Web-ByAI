#!/usr/bin/env python3
"""Regression for direct (non-#variable) model face texture dependencies."""

from __future__ import annotations

import json
import tempfile
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

from minecraft_model_closure import MinecraftArchiveIndex, resolve_block_model_closure


def main() -> int:
    with tempfile.TemporaryDirectory() as temp:
        archive_path = Path(temp) / "direct-face.zip"
        with ZipFile(archive_path, "w", ZIP_DEFLATED) as archive:
            prefix = "outerassets/assets/minecraft/"
            archive.writestr(
                prefix + "blockstates/direct_face.json",
                json.dumps({"variants": {"": {"model": "block/direct_face"}}}),
            )
            archive.writestr(
                prefix + "models/block/direct_face.json",
                json.dumps(
                    {
                        "elements": [
                            {
                                "from": [0, 0, 0],
                                "to": [16, 16, 16],
                                "faces": {
                                    "north": {"texture": "minecraft:block/direct_texture"},
                                    "south": {"texture": "#indirect"},
                                },
                            }
                        ],
                        "textures": {"indirect": "block/indirect_texture"},
                    }
                ),
            )
            archive.writestr(prefix + "textures/block/direct_texture.png", b"direct")
            archive.writestr(prefix + "textures/block/indirect_texture.png", b"indirect")

        with ZipFile(archive_path) as archive:
            result = resolve_block_model_closure(MinecraftArchiveIndex(archive), ["direct_face"])

        assert result.textures == (
            "assets/minecraft/textures/block/direct_texture.png",
            "assets/minecraft/textures/block/indirect_texture.png",
        )
        assert (
            "assets/minecraft/models/block/direct_face.json",
            "texture",
            "assets/minecraft/textures/block/direct_texture.png",
        ) in result.edges

    print("Minecraft direct face texture dependency closure: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
