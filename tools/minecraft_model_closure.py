#!/usr/bin/env python3
"""Resolve deterministic Minecraft blockstate/model/texture dependency closures.

The repository now tracks the original Java 1.20.1 asset tree directly under
``MC原版素材assets/``. Runtime/source identity stays canonicalized as
``assets/<namespace>/...`` so browser manifests do not depend on the display
name of the tracked source directory.

Archive indexing remains available for synthetic regression fixtures and old
one-off callers, but the extracted directory is the authoritative real source.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from typing import Any, Iterable, Iterator
from zipfile import BadZipFile, ZipFile

DEFAULT_SOURCE_ROOT = Path("MC原版素材assets")
DEFAULT_NAMESPACE = "minecraft"
RESOURCE_RE = re.compile(r"^[a-z0-9_.-]+:[a-z0-9_./-]+$")
CANONICAL_RE = re.compile(r"^assets/([a-z0-9_.-]+)/(.+)$")
BUILTIN_MODEL_PATHS = frozenset({"builtin/entity", "builtin/generated"})


class ClosureError(RuntimeError):
    """Raised when a declared model-source closure is unsafe or incomplete."""


def sha256_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def sha256_file(path: str | Path) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def normalize_zip_name(name: str) -> str:
    return name.replace("\\", "/")


def safe_zip_name(name: str) -> bool:
    path = PurePosixPath(name)
    return not path.is_absolute() and ".." not in path.parts


def canonical_asset_path(name: str) -> str | None:
    """Return the canonical ``assets/...`` suffix from an arbitrary ZIP entry."""
    normalized = normalize_zip_name(name)
    index = normalized.lower().rfind("assets/")
    if index == -1:
        return None
    candidate = normalized[index:]
    return candidate if CANONICAL_RE.fullmatch(candidate) else None


def normalize_resource_id(value: str, *, default_namespace: str = DEFAULT_NAMESPACE) -> str:
    if not isinstance(value, str) or not value or value.strip() != value or value.count(":") > 1:
        raise ClosureError(f"invalid Minecraft resource identifier: {value!r}")
    namespace, path = value.split(":", 1) if ":" in value else (default_namespace, value)
    result = f"{namespace}:{path}"
    if not RESOURCE_RE.fullmatch(result):
        raise ClosureError(f"invalid Minecraft resource identifier: {value!r}")
    parts = PurePosixPath(path).parts
    if (
        not path
        or path.startswith("/")
        or path.endswith("/")
        or "//" in path
        or any(part in {".", ".."} for part in parts)
    ):
        raise ClosureError(f"unsafe Minecraft resource identifier: {value!r}")
    return result


def split_resource_id(value: str) -> tuple[str, str]:
    namespace, path = normalize_resource_id(value).split(":", 1)
    return namespace, path


def blockstate_path(block_id: str) -> str:
    namespace, path = split_resource_id(block_id)
    return f"assets/{namespace}/blockstates/{path}.json"


def model_path(model_id: str) -> str:
    namespace, path = split_resource_id(model_id)
    return f"assets/{namespace}/models/{path}.json"


def texture_path(texture_id: str) -> str:
    namespace, path = split_resource_id(texture_id)
    return f"assets/{namespace}/textures/{path}.png"


@dataclass(frozen=True)
class SourceRecord:
    canonical: str
    source: str
    sha256: str
    size: int


class MinecraftArchiveIndex:
    """Canonical read-only view over an arbitrary-layout source ZIP.

    This is retained primarily for synthetic regression fixtures. Real repository
    builds should use :class:`MinecraftDirectoryIndex`.
    """

    def __init__(self, archive: ZipFile):
        self.archive = archive
        self._source_by_canonical: dict[str, str] = {}
        for info in archive.infolist():
            if info.is_dir():
                continue
            source = normalize_zip_name(info.filename)
            if not safe_zip_name(source):
                raise ClosureError(f"asset archive contains unsafe path: {source}")
            canonical = canonical_asset_path(source)
            if canonical is None:
                continue
            previous = self._source_by_canonical.get(canonical)
            if previous is not None and previous != source:
                raise ClosureError(f"ambiguous canonical source {canonical}: {previous!r}, {source!r}")
            self._source_by_canonical[canonical] = source

    def has(self, canonical: str) -> bool:
        return canonical in self._source_by_canonical

    def read(self, canonical: str) -> bytes:
        source = self._source_by_canonical.get(canonical)
        if source is None:
            raise ClosureError(f"missing source resource: {canonical}")
        return self.archive.read(source)

    def json(self, canonical: str) -> Any:
        payload = self.read(canonical)
        try:
            return json.loads(payload.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise ClosureError(f"invalid JSON resource: {canonical}: {exc}") from exc

    def record(self, canonical: str) -> SourceRecord:
        source = self._source_by_canonical.get(canonical)
        if source is None:
            raise ClosureError(f"missing source resource: {canonical}")
        payload = self.archive.read(source)
        return SourceRecord(canonical, source, sha256_bytes(payload), len(payload))


class MinecraftDirectoryIndex:
    """Canonical read-only view over the tracked extracted ``assets`` directory."""

    def __init__(self, root: str | Path):
        self.root = Path(root)
        if not self.root.is_dir():
            raise ClosureError(f"Minecraft source directory is missing: {self.root}")
        self._resolved_root = self.root.resolve()

    def _relative(self, canonical: str) -> PurePosixPath:
        if not isinstance(canonical, str) or not CANONICAL_RE.fullmatch(canonical):
            raise ClosureError(f"invalid canonical asset path: {canonical!r}")
        relative = PurePosixPath(canonical[len("assets/") :])
        if relative.is_absolute() or any(part in {"", ".", ".."} for part in relative.parts):
            raise ClosureError(f"unsafe canonical asset path: {canonical!r}")
        return relative

    def _path(self, canonical: str) -> Path:
        relative = self._relative(canonical)
        path = self.root.joinpath(*relative.parts)
        resolved = path.resolve()
        try:
            resolved.relative_to(self._resolved_root)
        except ValueError as exc:
            raise ClosureError(f"asset path escapes source directory: {canonical}") from exc
        return path

    def _source_name(self, canonical: str) -> str:
        relative = self._relative(canonical).as_posix()
        return f"{self.root.name}/{relative}"

    def has(self, canonical: str) -> bool:
        try:
            return self._path(canonical).is_file()
        except ClosureError:
            return False

    def read(self, canonical: str) -> bytes:
        path = self._path(canonical)
        if not path.is_file():
            raise ClosureError(f"missing source resource: {canonical}")
        return path.read_bytes()

    def json(self, canonical: str) -> Any:
        payload = self.read(canonical)
        try:
            return json.loads(payload.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise ClosureError(f"invalid JSON resource: {canonical}: {exc}") from exc

    def record(self, canonical: str) -> SourceRecord:
        payload = self.read(canonical)
        return SourceRecord(canonical, self._source_name(canonical), sha256_bytes(payload), len(payload))


MinecraftSourceIndex = MinecraftArchiveIndex | MinecraftDirectoryIndex


@contextmanager
def open_minecraft_source(source: str | Path) -> Iterator[MinecraftSourceIndex]:
    """Open a directory-first Minecraft source with ZIP fallback for fixtures."""
    path = Path(source)
    if path.is_dir():
        yield MinecraftDirectoryIndex(path)
        return
    if not path.exists():
        raise ClosureError(f"Minecraft source is missing: {path}")
    try:
        with ZipFile(path) as archive:
            yield MinecraftArchiveIndex(archive)
    except BadZipFile as exc:
        raise ClosureError(f"Minecraft source is neither a directory nor a valid ZIP: {path}") from exc


def source_provenance(source: str | Path) -> dict[str, str]:
    path = Path(source)
    if path.is_dir():
        return {"sourceKind": "directory", "sourceRoot": path.name}
    if path.is_file():
        return {"sourceKind": "archive", "sourceArchive": path.name, "sourceArchiveSha256": sha256_file(path)}
    raise ClosureError(f"Minecraft source is missing: {path}")


@dataclass(frozen=True)
class ClosureResult:
    roots: tuple[str, ...]
    blockstates: tuple[str, ...]
    models: tuple[str, ...]
    textures: tuple[str, ...]
    metadata: tuple[str, ...]
    builtin_models: tuple[str, ...]
    edges: tuple[tuple[str, str, str], ...]

    @property
    def files(self) -> tuple[str, ...]:
        return tuple(sorted(set(self.blockstates + self.models + self.textures + self.metadata)))


def iter_model_entries(value: Any, *, label: str) -> Iterable[dict[str, Any]]:
    entries = value if isinstance(value, list) else [value]
    if not entries:
        raise ClosureError(f"{label} must contain at least one model entry")
    for index, entry in enumerate(entries):
        if not isinstance(entry, dict):
            raise ClosureError(f"{label}[{index}] must be an object")
        model = entry.get("model")
        if not isinstance(model, str) or not model:
            raise ClosureError(f"{label}[{index}].model must be a non-empty string")
        yield entry


def blockstate_model_ids(value: Any, *, canonical: str) -> tuple[str, ...]:
    if not isinstance(value, dict):
        raise ClosureError(f"blockstate must be an object: {canonical}")
    variants = value.get("variants")
    multipart = value.get("multipart")
    if variants is None and multipart is None:
        raise ClosureError(f"blockstate has neither variants nor multipart: {canonical}")

    output: set[str] = set()
    if variants is not None:
        if not isinstance(variants, dict) or not variants:
            raise ClosureError(f"blockstate variants must be a non-empty object: {canonical}")
        for key, model_value in variants.items():
            if not isinstance(key, str):
                raise ClosureError(f"blockstate variant key must be a string: {canonical}")
            for entry in iter_model_entries(model_value, label=f"{canonical} variant {key!r}"):
                output.add(normalize_resource_id(entry["model"]))

    if multipart is not None:
        if not isinstance(multipart, list) or not multipart:
            raise ClosureError(f"blockstate multipart must be a non-empty array: {canonical}")
        for index, part in enumerate(multipart):
            if not isinstance(part, dict) or "apply" not in part:
                raise ClosureError(f"{canonical} multipart[{index}] must contain apply")
            for entry in iter_model_entries(part["apply"], label=f"{canonical} multipart[{index}].apply"):
                output.add(normalize_resource_id(entry["model"]))
    return tuple(sorted(output))


def _direct_texture_reference(reference: Any, *, label: str) -> str | None:
    if not isinstance(reference, str) or not reference:
        raise ClosureError(f"{label} must be a non-empty string")
    if reference.startswith("#"):
        if len(reference) == 1:
            raise ClosureError(f"{label} contains an empty texture variable")
        return None
    return normalize_resource_id(reference)


def model_dependencies(value: Any, *, canonical: str) -> tuple[str | None, tuple[str, ...]]:
    """Return parent + every direct texture file referenced by this model."""
    if not isinstance(value, dict):
        raise ClosureError(f"model must be an object: {canonical}")

    parent_raw = value.get("parent")
    parent = None
    if parent_raw is not None:
        if not isinstance(parent_raw, str) or not parent_raw:
            raise ClosureError(f"model parent must be a non-empty string: {canonical}")
        parent = normalize_resource_id(parent_raw)

    textures_raw = value.get("textures", {})
    if not isinstance(textures_raw, dict):
        raise ClosureError(f"model textures must be an object: {canonical}")
    textures: set[str] = set()
    for name, reference in textures_raw.items():
        if not isinstance(name, str) or not name:
            raise ClosureError(f"invalid model texture variable name in {canonical}: {name!r}")
        direct = _direct_texture_reference(reference, label=f"texture variable {name!r} in {canonical}")
        if direct is not None:
            textures.add(direct)

    elements = value.get("elements", [])
    if not isinstance(elements, list):
        raise ClosureError(f"model elements must be an array: {canonical}")
    for element_index, element in enumerate(elements):
        if not isinstance(element, dict):
            raise ClosureError(f"model element {element_index} must be an object: {canonical}")
        faces = element.get("faces", {})
        if not isinstance(faces, dict):
            raise ClosureError(f"model element {element_index}.faces must be an object: {canonical}")
        for direction, face in faces.items():
            if not isinstance(face, dict):
                raise ClosureError(f"model face {direction!r} must be an object: {canonical}")
            if "texture" not in face:
                raise ClosureError(f"model face {direction!r} is missing texture: {canonical}")
            direct = _direct_texture_reference(
                face["texture"],
                label=f"model face {direction!r}.texture in {canonical}",
            )
            if direct is not None:
                textures.add(direct)

    return parent, tuple(sorted(textures))


def resolve_block_model_closure(index: MinecraftSourceIndex, block_ids: Iterable[str]) -> ClosureResult:
    roots = tuple(sorted({normalize_resource_id(block_id) for block_id in block_ids}))
    if not roots:
        raise ClosureError("at least one block root is required")

    blockstates: set[str] = set()
    models: set[str] = set()
    textures: set[str] = set()
    metadata: set[str] = set()
    builtin_models: set[str] = set()
    edges: set[tuple[str, str, str]] = set()
    pending_models: set[str] = set()

    for block_id in roots:
        canonical = blockstate_path(block_id)
        blockstates.add(canonical)
        for model_id in blockstate_model_ids(index.json(canonical), canonical=canonical):
            pending_models.add(model_id)
            edges.add((canonical, "model", model_path(model_id)))

    visited_models: set[str] = set()
    visiting: list[str] = []

    def visit_model(model_id: str) -> None:
        normalized = normalize_resource_id(model_id)
        _, path = split_resource_id(normalized)
        if path in BUILTIN_MODEL_PATHS:
            builtin_models.add(normalized)
            return

        canonical = model_path(normalized)
        if canonical in visited_models:
            return
        if canonical in visiting:
            cycle = visiting[visiting.index(canonical) :] + [canonical]
            raise ClosureError(f"model parent cycle: {' -> '.join(cycle)}")

        visiting.append(canonical)
        value = index.json(canonical)
        parent, texture_ids = model_dependencies(value, canonical=canonical)
        models.add(canonical)

        if parent is not None:
            _, parent_path = split_resource_id(parent)
            if parent_path in BUILTIN_MODEL_PATHS:
                builtin_models.add(parent)
                edges.add((canonical, "builtin-parent", parent))
            else:
                parent_canonical = model_path(parent)
                edges.add((canonical, "parent", parent_canonical))
                visit_model(parent)

        for texture_id in texture_ids:
            tex_canonical = texture_path(texture_id)
            index.read(tex_canonical)
            textures.add(tex_canonical)
            edges.add((canonical, "texture", tex_canonical))
            mcmeta = f"{tex_canonical}.mcmeta"
            if index.has(mcmeta):
                metadata.add(mcmeta)
                edges.add((tex_canonical, "metadata", mcmeta))

        visiting.pop()
        visited_models.add(canonical)

    for model_id in sorted(pending_models):
        visit_model(model_id)

    return ClosureResult(
        roots=roots,
        blockstates=tuple(sorted(blockstates)),
        models=tuple(sorted(models)),
        textures=tuple(sorted(textures)),
        metadata=tuple(sorted(metadata)),
        builtin_models=tuple(sorted(builtin_models)),
        edges=tuple(sorted(edges)),
    )


def manifest_for(
    index: MinecraftSourceIndex,
    result: ClosureResult,
    *,
    source_path: str | Path | None = None,
    archive_path: str | Path | None = None,
) -> dict[str, Any]:
    records: dict[str, dict[str, Any]] = {}
    for canonical in result.files:
        record = index.record(canonical)
        records[canonical] = {
            "source": record.source,
            "sha256": record.sha256,
            "bytes": record.size,
        }

    manifest: dict[str, Any] = {
        "format": 1,
        "minecraftVersion": "1.20.1",
        "roots": list(result.roots),
        "counts": {
            "blockstates": len(result.blockstates),
            "models": len(result.models),
            "textures": len(result.textures),
            "metadata": len(result.metadata),
            "builtinModels": len(result.builtin_models),
            "files": len(result.files),
        },
        "blockstates": list(result.blockstates),
        "models": list(result.models),
        "textures": list(result.textures),
        "metadata": list(result.metadata),
        "builtinModels": list(result.builtin_models),
        "edges": [list(edge) for edge in result.edges],
        "files": records,
    }
    provenance_path = source_path if source_path is not None else archive_path
    if provenance_path is not None:
        manifest.update(source_provenance(provenance_path))
    return manifest


def extract_closure(index: MinecraftSourceIndex, result: ClosureResult, output: Path) -> None:
    output.mkdir(parents=True, exist_ok=True)
    for canonical in result.files:
        target = output / canonical
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(index.read(canonical))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", nargs="?", type=Path, default=DEFAULT_SOURCE_ROOT)
    parser.add_argument(
        "--block",
        action="append",
        dest="blocks",
        required=True,
        help="Block resource ID; repeat for multiple roots",
    )
    parser.add_argument("--json-out")
    parser.add_argument("--extract")
    args = parser.parse_args()

    try:
        with open_minecraft_source(args.source) as index:
            result = resolve_block_model_closure(index, args.blocks)
            manifest = manifest_for(index, result, source_path=args.source)
            if args.extract:
                extract_closure(index, result, Path(args.extract))
    except ClosureError as exc:
        raise SystemExit(f"model closure failed: {exc}") from exc

    payload = json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    if args.json_out:
        Path(args.json_out).write_text(payload, encoding="utf-8")
    else:
        print(payload, end="")
    print(
        f"resolved {len(result.roots)} block roots -> {len(result.blockstates)} blockstates, "
        f"{len(result.models)} models, {len(result.textures)} textures, "
        f"{len(result.metadata)} metadata files",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
