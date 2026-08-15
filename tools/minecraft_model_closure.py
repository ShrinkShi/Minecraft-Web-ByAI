#!/usr/bin/env python3
"""Resolve a deterministic Minecraft blockstate/model/texture dependency closure.

The tracked source ZIP may have an arbitrary outer directory. This module indexes
canonical ``assets/<namespace>/...`` paths from every safe ZIP entry, then walks
blockstate -> model -> parent/texture references without hard-coding vanilla
parent geometry.

It is intentionally independent from the runtime atlas builder. The output is a
provenance manifest / optional extracted closure that later asset stages can use
as their exact source set.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from typing import Any, Iterable
from zipfile import BadZipFile, ZipFile

DEFAULT_ARCHIVE = "MC原版素材assets.zip"
DEFAULT_NAMESPACE = "minecraft"
RESOURCE_RE = re.compile(r"^[a-z0-9_.-]+:[a-z0-9_./-]+$")
CANONICAL_RE = re.compile(r"^assets/([a-z0-9_.-]+)/(.+)$")
BUILTIN_MODEL_PATHS = frozenset({"builtin/entity", "builtin/generated"})


class ClosureError(RuntimeError):
    """Raised when the declared source closure is malformed or incomplete."""


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
    """Return the canonical ``assets/...`` suffix from an arbitrary ZIP entry.

    The supplied archive's historical outer folder is named
    ``MC原版素材assets`` rather than containing a literal top-level ``assets``
    directory.  The original selective importer therefore resolves resources by
    canonical suffix.  Mirror that proven contract here by taking the *last*
    ``assets/`` occurrence, whether it starts a path segment or is the suffix of
    an arbitrary outer-folder name.
    """
    normalized = normalize_zip_name(name)
    lowered = normalized.lower()
    index = lowered.rfind("assets/")
    if index == -1:
        return None
    candidate = normalized[index:]
    if not CANONICAL_RE.fullmatch(candidate):
        return None
    return candidate


def normalize_resource_id(value: str, *, default_namespace: str = DEFAULT_NAMESPACE) -> str:
    if not isinstance(value, str) or not value or value.strip() != value:
        raise ClosureError(f"invalid Minecraft resource identifier: {value!r}")
    if value.count(":") > 1:
        raise ClosureError(f"invalid Minecraft resource identifier: {value!r}")
    if ":" in value:
        namespace, path = value.split(":", 1)
    else:
        namespace, path = default_namespace, value
    result = f"{namespace}:{path}"
    if not RESOURCE_RE.fullmatch(result):
        raise ClosureError(f"invalid Minecraft resource identifier: {value!r}")
    parts = PurePosixPath(path).parts
    if not path or path.startswith("/") or path.endswith("/") or "//" in path or any(part in {".", ".."} for part in parts):
        raise ClosureError(f"unsafe Minecraft resource identifier: {value!r}")
    return result


def split_resource_id(value: str) -> tuple[str, str]:
    normalized = normalize_resource_id(value)
    return tuple(normalized.split(":", 1))  # type: ignore[return-value]


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
        return SourceRecord(canonical=canonical, source=source, sha256=sha256_bytes(payload), size=len(payload))


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
    output: set[str] = set()
    variants = value.get("variants")
    multipart = value.get("multipart")
    if variants is None and multipart is None:
        raise ClosureError(f"blockstate has neither variants nor multipart: {canonical}")
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


def model_dependencies(value: Any, *, canonical: str) -> tuple[str | None, tuple[str, ...]]:
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
        if not isinstance(name, str) or not isinstance(reference, str) or not reference:
            raise ClosureError(f"invalid model texture reference in {canonical}: {name!r}={reference!r}")
        if reference.startswith("#"):
            continue
        textures.add(normalize_resource_id(reference))
    return parent, tuple(sorted(textures))


def resolve_block_model_closure(index: MinecraftArchiveIndex, block_ids: Iterable[str]) -> ClosureResult:
    roots = tuple(sorted({normalize_resource_id(block_id) for block_id in block_ids}))
    if not roots:
        raise ClosureError("at least one block root is required")

    blockstates: set[str] = set()
    models: set[str] = set()
    textures: set[str] = set()
    metadata: set[str] = set()
    builtin_models: set[str] = set()
    edges: set[tuple[str, str, str]] = set()
    pending_models: list[str] = []

    for block_id in roots:
        canonical = blockstate_path(block_id)
        blockstates.add(canonical)
        for model_id in blockstate_model_ids(index.json(canonical), canonical=canonical):
            pending_models.append(model_id)
            edges.add((canonical, "model", model_path(model_id)))

    visited_models: set[str] = set()
    visiting: list[str] = []

    def visit_model(model_id: str) -> None:
        normalized = normalize_resource_id(model_id)
        _namespace, path = split_resource_id(normalized)
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
            _parent_namespace, parent_path = split_resource_id(parent)
            if parent_path in BUILTIN_MODEL_PATHS:
                builtin_models.add(parent)
                edges.add((canonical, "builtin-parent", parent))
            else:
                parent_canonical = model_path(parent)
                edges.add((canonical, "parent", parent_canonical))
                visit_model(parent)
        for texture_id in texture_ids:
            tex_canonical = texture_path(texture_id)
            index.read(tex_canonical)  # fail closed before adding to the closure
            textures.add(tex_canonical)
            edges.add((canonical, "texture", tex_canonical))
            mcmeta = f"{tex_canonical}.mcmeta"
            if index.has(mcmeta):
                metadata.add(mcmeta)
                edges.add((tex_canonical, "metadata", mcmeta))
        visiting.pop()
        visited_models.add(canonical)

    for model_id in sorted(set(pending_models)):
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


def manifest_for(index: MinecraftArchiveIndex, result: ClosureResult, *, archive_path: str | Path | None = None) -> dict[str, Any]:
    records = {}
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
    if archive_path is not None:
        manifest["sourceArchive"] = str(archive_path)
        manifest["sourceArchiveSha256"] = sha256_file(archive_path)
    return manifest


def extract_closure(index: MinecraftArchiveIndex, result: ClosureResult, output: Path) -> None:
    output.mkdir(parents=True, exist_ok=True)
    for canonical in result.files:
        target = output / canonical
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(index.read(canonical))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("archive", nargs="?", default=DEFAULT_ARCHIVE)
    parser.add_argument("--block", action="append", dest="blocks", required=True, help="Block resource ID; repeat for multiple roots")
    parser.add_argument("--json-out")
    parser.add_argument("--extract")
    args = parser.parse_args()

    try:
        with ZipFile(args.archive) as archive:
            index = MinecraftArchiveIndex(archive)
            result = resolve_block_model_closure(index, args.blocks)
            manifest = manifest_for(index, result, archive_path=args.archive)
            if args.extract:
                extract_closure(index, result, Path(args.extract))
    except (FileNotFoundError, BadZipFile) as exc:
        raise SystemExit(f"model closure failed: {exc}") from exc
    except ClosureError as exc:
        raise SystemExit(f"model closure failed: {exc}") from exc

    payload = json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    if args.json_out:
        Path(args.json_out).write_text(payload, encoding="utf-8")
    else:
        print(payload, end="")
    print(
        f"resolved {len(result.roots)} block roots -> {len(result.blockstates)} blockstates, "
        f"{len(result.models)} models, {len(result.textures)} textures, {len(result.metadata)} metadata files",
        file=__import__("sys").stderr,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
