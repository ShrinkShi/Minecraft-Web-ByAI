#!/usr/bin/env python3
"""Regression checks for minecraft_model_closure.py.

Covers a synthetic archive for exact dependency/error semantics and the tracked
Minecraft Java 1.20.1 source archive for the approved first block-model
acceptance set.
"""

from __future__ import annotations

import json
import tempfile
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

from minecraft_model_closure import (
    ClosureError,
    MinecraftArchiveIndex,
    extract_closure,
    manifest_for,
    resolve_block_model_closure,
)

ROOT = Path(__file__).resolve().parent.parent
SOURCE_ARCHIVE = ROOT / "MC原版素材assets.zip"
ACCEPTANCE_BLOCKS = (
    "minecraft:iron_ore",
    "minecraft:glass",
    "minecraft:oak_slab",
    "minecraft:oak_stairs",
    "minecraft:oak_door",
    "minecraft:oak_fence",
    "minecraft:torch",
    "minecraft:grass_block",
    "minecraft:crafting_table",
)


def write_json(archive: ZipFile, path: str, value: object) -> None:
    archive.writestr(path, json.dumps(value, sort_keys=True).encode("utf-8"))


def synthetic_archive(path: Path) -> None:
    with ZipFile(path, "w", ZIP_DEFLATED) as archive:
        prefix = "arbitrary-outer-folder/assets/minecraft/"
        write_json(
            archive,
            prefix + "blockstates/demo.json",
            {
                "variants": {
                    "": [
                        {"model": "minecraft:block/demo_child", "weight": 2},
                        {"model": "block/demo_alt", "weight": 1},
                    ]
                }
            },
        )
        write_json(
            archive,
            prefix + "models/block/demo_child.json",
            {
                "parent": "block/demo_parent",
                "textures": {"base": "#parent_base", "overlay": "block/overlay"},
            },
        )
        write_json(
            archive,
            prefix + "models/block/demo_alt.json",
            {"parent": "minecraft:block/demo_parent", "textures": {"all": "block/alt"}},
        )
        write_json(
            archive,
            prefix + "models/block/demo_parent.json",
            {"parent": "builtin/entity", "textures": {"parent_base": "block/stone"}},
        )
        archive.writestr(prefix + "textures/block/overlay.png", b"overlay-png")
        archive.writestr(prefix + "textures/block/overlay.png.mcmeta", b'{"animation":{"frametime":2}}')
        archive.writestr(prefix + "textures/block/alt.png", b"alt-png")
        archive.writestr(prefix + "textures/block/stone.png", b"stone-png")


def assert_synthetic() -> None:
    with tempfile.TemporaryDirectory() as temp:
        temp_path = Path(temp)
        archive_path = temp_path / "synthetic.zip"
        synthetic_archive(archive_path)
        with ZipFile(archive_path) as archive:
            index = MinecraftArchiveIndex(archive)
            result = resolve_block_model_closure(index, ["demo"])
            assert result.roots == ("minecraft:demo",)
            assert result.blockstates == ("assets/minecraft/blockstates/demo.json",)
            assert result.models == (
                "assets/minecraft/models/block/demo_alt.json",
                "assets/minecraft/models/block/demo_child.json",
                "assets/minecraft/models/block/demo_parent.json",
            )
            assert result.textures == (
                "assets/minecraft/textures/block/alt.png",
                "assets/minecraft/textures/block/overlay.png",
                "assets/minecraft/textures/block/stone.png",
            )
            assert result.metadata == ("assets/minecraft/textures/block/overlay.png.mcmeta",)
            assert result.builtin_models == ("minecraft:builtin/entity",)
            assert (
                "assets/minecraft/models/block/demo_child.json",
                "parent",
                "assets/minecraft/models/block/demo_parent.json",
            ) in result.edges
            assert (
                "assets/minecraft/textures/block/overlay.png",
                "metadata",
                "assets/minecraft/textures/block/overlay.png.mcmeta",
            ) in result.edges

            manifest = manifest_for(index, result, archive_path=archive_path)
            assert manifest["format"] == 1
            assert manifest["counts"] == {
                "blockstates": 1,
                "models": 3,
                "textures": 3,
                "metadata": 1,
                "builtinModels": 1,
                "files": 8,
            }
            assert list(manifest["files"]) == sorted(manifest["files"])
            assert manifest["files"]["assets/minecraft/textures/block/stone.png"]["source"].startswith(
                "arbitrary-outer-folder/assets/minecraft/"
            )
            assert len(manifest["sourceArchiveSha256"]) == 64

            output = temp_path / "closure"
            extract_closure(index, result, output)
            assert (output / "assets/minecraft/blockstates/demo.json").exists()
            assert (output / "assets/minecraft/textures/block/overlay.png").read_bytes() == b"overlay-png"
            assert (output / "assets/minecraft/textures/block/overlay.png.mcmeta").exists()

        # Missing direct texture references fail before an incomplete closure can be emitted.
        missing_path = temp_path / "missing.zip"
        with ZipFile(missing_path, "w", ZIP_DEFLATED) as archive:
            prefix = "assets/minecraft/"
            write_json(archive, prefix + "blockstates/missing.json", {"variants": {"": {"model": "block/missing"}}})
            write_json(archive, prefix + "models/block/missing.json", {"textures": {"all": "block/not_there"}})
        with ZipFile(missing_path) as archive:
            try:
                resolve_block_model_closure(MinecraftArchiveIndex(archive), ["missing"])
            except ClosureError as exc:
                assert "textures/block/not_there.png" in str(exc)
            else:
                raise AssertionError("missing direct texture did not fail closed")

        # Parent cycles are rejected deterministically.
        cycle_path = temp_path / "cycle.zip"
        with ZipFile(cycle_path, "w", ZIP_DEFLATED) as archive:
            prefix = "assets/minecraft/"
            write_json(archive, prefix + "blockstates/cycle.json", {"variants": {"": {"model": "block/a"}}})
            write_json(archive, prefix + "models/block/a.json", {"parent": "block/b"})
            write_json(archive, prefix + "models/block/b.json", {"parent": "block/a"})
        with ZipFile(cycle_path) as archive:
            try:
                resolve_block_model_closure(MinecraftArchiveIndex(archive), ["cycle"])
            except ClosureError as exc:
                assert "model parent cycle" in str(exc)
            else:
                raise AssertionError("model parent cycle did not fail closed")

        # Canonical duplicates under different outer roots are ambiguous by design.
        duplicate_path = temp_path / "duplicate.zip"
        with ZipFile(duplicate_path, "w", ZIP_DEFLATED) as archive:
            archive.writestr("one/assets/minecraft/textures/block/stone.png", b"one")
            archive.writestr("two/assets/minecraft/textures/block/stone.png", b"two")
        with ZipFile(duplicate_path) as archive:
            try:
                MinecraftArchiveIndex(archive)
            except ClosureError as exc:
                assert "ambiguous canonical source" in str(exc)
            else:
                raise AssertionError("duplicate canonical resources did not fail closed")


def assert_real_source() -> None:
    if not SOURCE_ARCHIVE.exists():
        raise AssertionError(f"tracked source archive is missing: {SOURCE_ARCHIVE}")
    with ZipFile(SOURCE_ARCHIVE) as archive:
        index = MinecraftArchiveIndex(archive)
        result = resolve_block_model_closure(index, ACCEPTANCE_BLOCKS)
        manifest = manifest_for(index, result, archive_path=SOURCE_ARCHIVE)

        assert result.roots == tuple(sorted(ACCEPTANCE_BLOCKS))
        assert len(result.blockstates) == len(ACCEPTANCE_BLOCKS)
        assert len(result.models) > len(ACCEPTANCE_BLOCKS), "stateful acceptance blocks must pull model dependencies"
        assert len(result.textures) >= 8
        assert len(result.files) == manifest["counts"]["files"]

        for block in ACCEPTANCE_BLOCKS:
            name = block.split(":", 1)[1]
            assert f"assets/minecraft/blockstates/{name}.json" in result.blockstates

        # These are known dependency relations from the tracked 1.20.1 source,
        # but they were not part of the old hand-maintained runtime subset.
        required_closure_files = {
            "assets/minecraft/models/block/cube.json",
            "assets/minecraft/models/block/cube_all.json",
            "assets/minecraft/textures/block/iron_ore.png",
            "assets/minecraft/textures/block/glass.png",
            "assets/minecraft/textures/block/oak_planks.png",
            "assets/minecraft/textures/block/oak_door_bottom.png",
            "assets/minecraft/textures/block/oak_door_top.png",
            "assets/minecraft/textures/block/torch.png",
        }
        missing = required_closure_files.difference(result.files)
        assert not missing, f"real 1.20.1 closure missed expected resources: {sorted(missing)}"

        # Every emitted file must resolve to one unique source entry and have
        # checksum/byte provenance in the deterministic manifest.
        for canonical in result.files:
            record = manifest["files"][canonical]
            assert len(record["sha256"]) == 64
            assert record["bytes"] > 0
            assert record["source"].replace("\\", "/").endswith(canonical)

        print(
            "real acceptance closure:",
            len(result.blockstates), "blockstates,",
            len(result.models), "models,",
            len(result.textures), "textures,",
            len(result.metadata), "metadata files,",
            len(result.files), "total files",
        )


def main() -> int:
    assert_synthetic()
    assert_real_source()
    print("Minecraft blockstate/model/parent/texture dependency closure: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
