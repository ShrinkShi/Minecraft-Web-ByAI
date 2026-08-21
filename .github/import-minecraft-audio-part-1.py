#!/usr/bin/env python3
from __future__ import annotations

import concurrent.futures
import csv
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import time
import urllib.request

TARGET = Path("原版Minecraft音频文件")
MANIFEST_DIR = Path(".github/import-manifests")
HASH_RE = re.compile(r"^[0-9a-f]{40}$")
BRANCH = os.environ.get("IMPORT_BRANCH") or os.environ.get("GITHUB_HEAD_REF") or "agent/import-minecraft-audio-part-1"

PART1_COUNT = 2114
PART1_BYTES = 431_521_776
PART1_SET_SHA256 = "34f8f17290a7e5637d8104aae26f217fddd29c4c216c23729ebf4e95df75d278"
PART2_COUNT = 1802
PART2_BYTES = 396_017_544
PART2_SET_SHA256 = "554e361e2f10fdd3f02eca3b11bedb7311f81545c42b01251cf99106584a3d53"

TEMP_PATHS = [
    *[f".github/import-manifests/minecraft-audio-part1-{i:02d}.txt" for i in range(1, 9)],
    *[f".github/import-manifests/minecraft-audio-part2-{i:02d}.txt" for i in range(1, 9)],
    ".github/import-minecraft-audio-part-1.py",
    ".github/import-minecraft-audio-part-1.trigger",
    ".github/workflows/import-minecraft-audio-part-1.yml",
    ".github/workflows/run-minecraft-audio-import-part-1.yml",
]


def run(*args: str) -> None:
    subprocess.run(args, check=True)


def set_digest(hashes: list[str]) -> str:
    return hashlib.sha256(("\n".join(sorted(hashes)) + "\n").encode("ascii")).hexdigest()


def validate_hashes(hashes: list[str], expected_count: int, expected_digest: str, label: str) -> list[str]:
    values = [h.strip().lower() for h in hashes if h.strip()]
    if len(values) != expected_count:
        raise SystemExit(f"{label} count mismatch: {len(values)} != {expected_count}")
    if any(not HASH_RE.fullmatch(h) for h in values):
        bad = next(h for h in values if not HASH_RE.fullmatch(h))
        raise SystemExit(f"{label} invalid SHA-1: {bad!r}")
    if len(set(values)) != len(values):
        raise SystemExit(f"{label} contains duplicate SHA-1 objects")
    values = sorted(values)
    digest = set_digest(values)
    if digest != expected_digest:
        raise SystemExit(f"{label} set digest mismatch: {digest} != {expected_digest}")
    print(f"{label} MANIFEST PASSED: objects={len(values)} set_sha256={digest}")
    return values


def read_part1() -> list[str]:
    path = TARGET / "对象清单-part1.txt"
    if not path.is_file():
        raise SystemExit(f"missing authoritative part 1 manifest: {path}")
    return validate_hashes(
        path.read_text(encoding="utf-8").splitlines(),
        PART1_COUNT,
        PART1_SET_SHA256,
        "PART1",
    )


def read_part2() -> list[str]:
    parts = sorted(MANIFEST_DIR.glob("minecraft-audio-part2-*.txt"))
    if len(parts) != 8:
        raise SystemExit(f"expected 8 part 2 manifest chunks, found {len(parts)}: {parts}")
    values: list[str] = []
    for part in parts:
        values.extend(part.read_text(encoding="utf-8").splitlines())
    return validate_hashes(values, PART2_COUNT, PART2_SET_SHA256, "PART2")


def sha1_file(path: Path) -> str:
    digest = hashlib.sha1()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def fetch_bytes(url: str) -> bytes:
    last: Exception | None = None
    for attempt in range(7):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Minecraft-Web-ByAI asset importer"})
            with urllib.request.urlopen(req, timeout=180) as response:
                return response.read()
        except Exception as exc:
            last = exc
            time.sleep(min(30, 2**attempt))
    raise RuntimeError(f"failed to fetch {url}: {last}")


def fetch_json(url: str):
    return json.loads(fetch_bytes(url))


def download_one(h: str) -> tuple[str, int, bool]:
    destination = TARGET / h[:2] / h
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.is_file() and sha1_file(destination) == h:
        return h, destination.stat().st_size, True
    if destination.exists():
        destination.unlink()
    url = f"https://resources.download.minecraft.net/{h[:2]}/{h}"
    last: Exception | None = None
    for attempt in range(7):
        temp = destination.with_name(destination.name + ".part")
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Minecraft-Web-ByAI asset importer"})
            digest = hashlib.sha1()
            written = 0
            with urllib.request.urlopen(req, timeout=240) as response, temp.open("wb") as output:
                while True:
                    chunk = response.read(1024 * 1024)
                    if not chunk:
                        break
                    output.write(chunk)
                    digest.update(chunk)
                    written += len(chunk)
            actual = digest.hexdigest()
            if actual != h:
                raise RuntimeError(f"SHA-1 mismatch for {h}: {actual}")
            temp.replace(destination)
            return h, written, False
        except Exception as exc:
            last = exc
            try:
                temp.unlink()
            except FileNotFoundError:
                pass
            time.sleep(min(30, 2**attempt))
    raise RuntimeError(f"failed to download {h}: {last}")


def verify_subset(hashes: list[str], expected_bytes: int, label: str) -> int:
    total = 0
    for index, h in enumerate(hashes, start=1):
        path = TARGET / h[:2] / h
        if not path.is_file():
            raise SystemExit(f"{label} missing object: {path}")
        actual = sha1_file(path)
        if actual != h:
            raise SystemExit(f"{label} SHA-1 mismatch: {path}: {actual} != {h}")
        total += path.stat().st_size
        if index % 250 == 0:
            print(f"{label} verified {index}/{len(hashes)} objects")
    if total != expected_bytes:
        raise SystemExit(f"{label} total byte mismatch: {total} != {expected_bytes}")
    print(f"{label} BYTES PASSED: objects={len(hashes)} bytes={total}")
    return total


def commit_objects_in_batches(hashes: list[str]) -> None:
    if not hashes:
        print("No part-2-only objects to commit.")
        return
    batches: list[list[str]] = []
    current: list[str] = []
    current_bytes = 0
    max_files = 160
    max_bytes = 48 * 1024 * 1024
    for h in hashes:
        size = (TARGET / h[:2] / h).stat().st_size
        if current and (len(current) >= max_files or current_bytes + size > max_bytes):
            batches.append(current)
            current = []
            current_bytes = 0
        current.append(h)
        current_bytes += size
    if current:
        batches.append(current)

    for number, batch in enumerate(batches, start=1):
        paths = [str(TARGET / h[:2] / h) for h in batch]
        run("git", "add", "--", *paths)
        changed = subprocess.run(["git", "diff", "--cached", "--quiet"]).returncode != 0
        if changed:
            run("git", "commit", "-m", f"assets: import Minecraft audio objects part 2 batch {number}/{len(batches)}")
        print(f"prepared part 2 batch {number}/{len(batches)}: files={len(batch)}")


def resolve_java_1201_mapping():
    manifest = fetch_json("https://piston-meta.mojang.com/mc/game/version_manifest_v2.json")
    version = next(v for v in manifest["versions"] if v["id"] == "1.20.1")
    version_json = fetch_json(version["url"])
    asset_index_url = version_json["assetIndex"]["url"]
    asset_index = fetch_json(asset_index_url)

    logical_by_hash: dict[str, list[str]] = {}
    for logical, obj in asset_index["objects"].items():
        logical_by_hash.setdefault(obj["hash"].lower(), []).append(logical)
    for values in logical_by_hash.values():
        values.sort()

    sounds_object = asset_index["objects"].get("minecraft/sounds.json")
    if not sounds_object:
        raise RuntimeError("Java 1.20.1 asset index has no minecraft/sounds.json")
    sounds_hash = sounds_object["hash"].lower()
    sounds_json = json.loads(fetch_bytes(f"https://resources.download.minecraft.net/{sounds_hash[:2]}/{sounds_hash}"))

    direct: dict[str, set[str]] = {}
    references: dict[str, set[str]] = {}
    for event, definition in sounds_json.items():
        direct.setdefault(event, set())
        references.setdefault(event, set())
        for item in definition.get("sounds", []):
            if isinstance(item, str):
                name, item_type = item, "file"
            else:
                name = item.get("name", "")
                item_type = item.get("type", "file")
            if not name:
                continue
            namespace, sep, value = name.partition(":")
            if not sep:
                namespace, value = "minecraft", namespace
            if item_type == "event":
                references[event].add(value)
            else:
                direct[event].add(f"{namespace}/sounds/{value}.ogg")

    cache: dict[str, set[str]] = {}

    def resolve(event: str, stack: tuple[str, ...] = ()) -> set[str]:
        if event in cache:
            return cache[event]
        if event in stack:
            return set()
        result = set(direct.get(event, set()))
        for ref in references.get(event, set()):
            result.update(resolve(ref, stack + (event,)))
        cache[event] = result
        return result

    events_by_logical: dict[str, list[str]] = {}
    for event in sounds_json:
        for logical in resolve(event):
            events_by_logical.setdefault(logical, []).append(event)
    for events in events_by_logical.values():
        events[:] = sorted(set(events))
    return asset_index_url, logical_by_hash, events_by_logical


def detect_type(path: Path) -> str:
    with path.open("rb") as stream:
        head = stream.read(32)
    if head.startswith(b"OggS"):
        return "ogg"
    if head.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if head.startswith(b"PK\x03\x04"):
        return "zip"
    if head.startswith(b"icns"):
        return "icns"
    if head.startswith(b"RIFF"):
        return "riff"
    stripped = head.lstrip()
    if stripped.startswith((b"{", b"[")):
        return "json/text"
    return "other"


def write_mapping(union_hashes: list[str], part1_hashes: list[str], part2_hashes: list[str], overlap: list[str], union_bytes: int, union_sha256: str, asset_index_url: str, logical_by_hash, events_by_logical) -> None:
    rows = []
    type_counts: dict[str, int] = {}
    resolved_objects = 0
    resolved_ogg = 0
    part1_set = set(part1_hashes)
    part2_set = set(part2_hashes)
    for h in union_hashes:
        path = TARGET / h[:2] / h
        kind = detect_type(path)
        type_counts[kind] = type_counts.get(kind, 0) + 1
        logical_paths = logical_by_hash.get(h, [])
        if logical_paths:
            resolved_objects += 1
        events: set[str] = set()
        for logical in logical_paths:
            events.update(events_by_logical.get(logical, []))
        if kind == "ogg" and logical_paths:
            resolved_ogg += 1
        if logical_paths:
            status = "已由Minecraft Java 1.20.1 asset index解析"
        elif kind == "ogg":
            status = "未在Java 1.20.1 asset index中解析（可能来自其他版本/历史缓存）"
        else:
            status = "未在Java 1.20.1 asset index中解析；本对象不是已识别OGG音频"
        source_parts = []
        if h in part1_set:
            source_parts.append("part1")
        if h in part2_set:
            source_parts.append("part2")
        rows.append({"sha1": h, "object_path": f"{h[:2]}/{h}", "size": path.stat().st_size, "type": kind, "logical_paths": logical_paths, "sound_events": sorted(events), "status": status, "source_parts": source_parts})

    (TARGET / "对象清单-part2.txt").write_text("\n".join(part2_hashes) + "\n", encoding="utf-8")
    (TARGET / "对象清单.txt").write_text("\n".join(union_hashes) + "\n", encoding="utf-8")

    with (TARGET / "音频文件映射表.csv").open("w", encoding="utf-8-sig", newline="") as stream:
        writer = csv.writer(stream)
        writer.writerow(["SHA-1", "仓库对象路径", "字节大小", "类型", "来源批次", "Java1.20.1逻辑路径", "Java1.20.1 Sound Event", "解析状态"])
        for row in rows:
            writer.writerow([row["sha1"], row["object_path"], row["size"], row["type"], ";".join(row["source_parts"]), ";".join(row["logical_paths"]), ";".join(row["sound_events"]), row["status"]])

    metadata = {
        "source": "user-supplied Minecraft assets/objects cache, complete two-part set",
        "mapping_reference_version": "Minecraft Java 1.20.1",
        "asset_index_url": asset_index_url,
        "part1": {"object_count": PART1_COUNT, "total_bytes": PART1_BYTES, "object_set_sha256": PART1_SET_SHA256},
        "part2": {"object_count": PART2_COUNT, "total_bytes": PART2_BYTES, "object_set_sha256": PART2_SET_SHA256},
        "overlap_count": len(overlap),
        "overlap_sha1": overlap,
        "union_object_count": len(union_hashes),
        "union_total_bytes": union_bytes,
        "union_object_set_sha256": union_sha256,
        "type_counts": dict(sorted(type_counts.items())),
        "resolved_objects_in_java_1_20_1": resolved_objects,
        "resolved_ogg_objects_in_java_1_20_1": resolved_ogg,
        "objects": rows,
    }
    (TARGET / "音频文件映射表.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    readme = f"""# 原版 Minecraft 音频文件

本目录保存用户分两批提供的 Minecraft `assets/objects` 完整对象集。对象文件故意保留 Mojang 内容寻址格式 `两位SHA-1前缀/40位SHA-1`，不直接重命名，以保证官方 asset index、完整性校验和后续开发引用可以稳定对应。

## 两批输入完整性

### 第一批
- 对象数量：{PART1_COUNT}
- 对象总字节数：{PART1_BYTES}
- 对象集合 SHA-256：`{PART1_SET_SHA256}`

### 第二批
- 对象数量：{PART2_COUNT}
- 对象总字节数：{PART2_BYTES}
- 对象集合 SHA-256：`{PART2_SET_SHA256}`

### 合并结果
- 两批重复对象：{len(overlap)}
- 去重后对象数量：{len(union_hashes)}
- 去重后对象总字节数：{union_bytes}
- 去重后对象集合 SHA-256：`{union_sha256}`
- 文件类型统计：{json.dumps(dict(sorted(type_counts.items())), ensure_ascii=False)}
- 能由 Java 1.20.1 asset index 解析的对象：{resolved_objects}
- 能由 Java 1.20.1 解析的 OGG 对象：{resolved_ogg}

## 开发者如何查音效

优先查看 `音频文件映射表.csv`：

- `SHA-1` / `仓库对象路径`：仓库中的真实内容寻址对象；
- `来源批次`：标识对象来自第一批、第二批或两批都存在；
- `Java1.20.1逻辑路径`：例如 `minecraft/sounds/.../*.ogg`；
- `Java1.20.1 Sound Event`：根据 Java 1.20.1 官方 `sounds.json` 解析出的事件名；
- `解析状态`：明确区分已识别对象与可能来自其他版本/历史缓存的对象。

`音频文件映射表.json` 是机器可读版本。`对象清单-part1.txt`、`对象清单-part2.txt` 分别保留两次上传的精确 SHA-1 集合，`对象清单.txt` 是最终去重并集。

对未解析对象不要根据听感、文件大小或哈希前缀猜名称；如需继续命名，应使用对应 Minecraft 版本的官方 asset index 补全。
"""
    (TARGET / "README.md").write_text(readme, encoding="utf-8")

    outputs = [TARGET / "对象清单-part2.txt", TARGET / "对象清单.txt", TARGET / "音频文件映射表.csv", TARGET / "音频文件映射表.json", TARGET / "README.md"]
    run("git", "add", "--", *map(str, outputs))
    changed = subprocess.run(["git", "diff", "--cached", "--quiet"]).returncode != 0
    if changed:
        run("git", "commit", "-m", "docs: publish complete Minecraft audio object mapping")
    print(f"MAPPING COMPLETE: types={dict(sorted(type_counts.items()))} resolved_objects={resolved_objects} resolved_ogg={resolved_ogg}")


def final_verify(union_hashes: list[str], expected_union_bytes: int, expected_union_sha256: str) -> None:
    total = 0
    for index, h in enumerate(union_hashes, start=1):
        path = TARGET / h[:2] / h
        if not path.is_file():
            raise SystemExit(f"FINAL missing object: {path}")
        actual = sha1_file(path)
        if actual != h:
            raise SystemExit(f"FINAL SHA-1 mismatch: {path}: {actual} != {h}")
        total += path.stat().st_size
        if index % 250 == 0:
            print(f"FINAL verified {index}/{len(union_hashes)} objects")
    if total != expected_union_bytes:
        raise SystemExit(f"FINAL union byte mismatch: {total} != {expected_union_bytes}")
    actual_digest = set_digest(union_hashes)
    if actual_digest != expected_union_sha256:
        raise SystemExit(f"FINAL union set digest mismatch: {actual_digest} != {expected_union_sha256}")
    print(f"FINAL VERIFICATION PASSED: objects={len(union_hashes)} bytes={total} set_sha256={actual_digest}")


def cleanup_temp_import_files() -> None:
    existing = [path for path in TEMP_PATHS if Path(path).exists()]
    if not existing:
        print("No temporary import files remain.")
        return
    run("git", "rm", "--", *existing)
    run("git", "commit", "-m", "chore: remove temporary Minecraft audio import tooling")
    print(f"Removed {len(existing)} temporary import files from final PR tree.")


def main() -> None:
    part1 = read_part1()
    part2 = read_part2()
    set1 = set(part1)
    set2 = set(part2)
    overlap = sorted(set1 & set2)
    part2_only = sorted(set2 - set1)
    union_hashes = sorted(set1 | set2)
    union_sha256 = set_digest(union_hashes)

    print(f"SET RELATION: part1={len(part1)} part2={len(part2)} overlap={len(overlap)} part2_only={len(part2_only)} union={len(union_hashes)} union_sha256={union_sha256}")

    TARGET.mkdir(parents=True, exist_ok=True)
    print("Downloading/verifying exact second-batch object set from Mojang content-addressed resource service...")
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:
        for result in pool.map(download_one, part2):
            results.append(result)
            if len(results) % 100 == 0:
                print(f"part2 downloaded/verified {len(results)}/{len(part2)}")

    verify_subset(part1, PART1_BYTES, "PART1")
    verify_subset(part2, PART2_BYTES, "PART2")

    run("git", "config", "user.name", "github-actions[bot]")
    run("git", "config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com")
    run("git", "config", "core.quotePath", "false")
    run("git", "config", "http.postBuffer", "1073741824")
    run("git", "config", "pack.compression", "0")

    commit_objects_in_batches(part2_only)

    union_bytes = sum((TARGET / h[:2] / h).stat().st_size for h in union_hashes)
    asset_index_url, logical_by_hash, events_by_logical = resolve_java_1201_mapping()
    write_mapping(union_hashes, part1, part2, overlap, union_bytes, union_sha256, asset_index_url, logical_by_hash, events_by_logical)
    final_verify(union_hashes, union_bytes, union_sha256)
    cleanup_temp_import_files()

    print("Pushing complete verified two-part import to PR branch...")
    run("git", "push", "origin", f"HEAD:{BRANCH}")
    print(f"IMPORT COMPLETE: part1={len(part1)} part2={len(part2)} overlap={len(overlap)} union={len(union_hashes)} bytes={union_bytes} set_sha256={union_sha256}")


if __name__ == "__main__":
    main()
