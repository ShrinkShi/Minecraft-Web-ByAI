#!/usr/bin/env python3
"""Extract source-identical Minecraft Java player presentation assets.

This intentionally reads only the repository-tracked Java 1.20.1 source archive.
The generated Steve skin is byte-for-byte source data; no recoloring, scaling,
resampling or third-party replacement is allowed.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
from pathlib import Path, PurePosixPath
from zipfile import BadZipFile, ZipFile

DEFAULT_ARCHIVE = Path("MC原版素材assets.zip")
DEFAULT_OUTPUT = Path("build/minecraft-player-assets")
STEVE_SOURCE = "assets/minecraft/textures/entity/player/wide/steve.png"


def sha256_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def safe_name(value: str) -> bool:
    path = PurePosixPath(value)
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
    parser.add_argument("--archive", type=Path, default=DEFAULT_ARCHIVE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    if args.output.exists():
        shutil.rmtree(args.output)
    args.output.mkdir(parents=True, exist_ok=True)

    try:
        with ZipFile(args.archive) as archive:
            names = [info.filename.replace("\\", "/") for info in archive.infolist() if not info.is_dir()]
            unsafe = [name for name in names if not safe_name(name)]
            if unsafe:
                raise RuntimeError(f"asset archive contains unsafe paths: {unsafe[:5]}")
            source = resolve_unique(names, STEVE_SOURCE)
            payload = archive.read(source)
    except (FileNotFoundError, BadZipFile, KeyError, RuntimeError) as exc:
        message = exc.args[0] if isinstance(exc, KeyError) else str(exc)
        raise SystemExit(f"player asset build failed: {message}") from exc

    target = args.output / "textures/entity/player/wide/steve.png"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(payload)
    manifest = {
        "format": 1,
        "minecraftVersion": "1.20.1",
        "sourceArchive": str(args.archive),
        "sourceArchiveSha256": sha256_file(args.archive),
        "files": {
            "textures/entity/player/wide/steve.png": {
                "source": source,
                "sha256": sha256_bytes(payload),
                "bytes": len(payload),
            }
        },
    }
    (args.output / "player-assets-manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print(f"extracted source-backed Steve skin from {source}")
    print(f"steve sha256: {manifest['files']['textures/entity/player/wide/steve.png']['sha256']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
