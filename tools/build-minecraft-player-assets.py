#!/usr/bin/env python3
"""Copy source-identical Minecraft Java player presentation assets.

The repository-tracked ``MC原版素材assets/`` directory is the authoritative
Minecraft 1.20.1 source. Generated runtime files are copied byte-for-byte; no
recoloring, scaling, resampling or third-party replacement is allowed.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
from pathlib import Path

DEFAULT_SOURCE = Path("MC原版素材assets")
DEFAULT_OUTPUT = Path("build/minecraft-player-assets")
STEVE_CANONICAL = "assets/minecraft/textures/entity/player/wide/steve.png"
STEVE_RELATIVE = Path("minecraft/textures/entity/player/wide/steve.png")


def sha256_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    if not args.source.is_dir():
        raise SystemExit(f"player asset build failed: source directory is missing: {args.source}")

    source_path = args.source / STEVE_RELATIVE
    if not source_path.is_file():
        raise SystemExit(f"player asset build failed: missing source resource: {source_path}")

    payload = source_path.read_bytes()
    if args.output.exists():
        shutil.rmtree(args.output)
    args.output.mkdir(parents=True, exist_ok=True)

    target = args.output / "textures/entity/player/wide/steve.png"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(payload)
    manifest = {
        "format": 1,
        "minecraftVersion": "1.20.1",
        "sourceKind": "directory",
        "sourceRoot": args.source.name,
        "files": {
            "textures/entity/player/wide/steve.png": {
                "source": f"{args.source.name}/{STEVE_RELATIVE.as_posix()}",
                "canonical": STEVE_CANONICAL,
                "sha256": sha256_bytes(payload),
                "bytes": len(payload),
            }
        },
    }
    (args.output / "player-assets-manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print(f"copied source-backed Steve skin from {source_path}")
    print(f"steve sha256: {manifest['files']['textures/entity/player/wide/steve.png']['sha256']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
