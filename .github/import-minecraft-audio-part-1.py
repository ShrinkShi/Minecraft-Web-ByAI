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
EXPECTED_COUNT = 2114
EXPECTED_TOTAL_BYTES = 431_521_776
EXPECTED_SET_SHA256 = "34f8f17290a7e5637d8104aae26f217fddd29c4c216c23729ebf4e95df75d278"
HASH_RE = re.compile(r"^[0-9a-f]{40}$")
BRANCH = os.environ.get("IMPORT_BRANCH") or os.environ.get("GITHUB_HEAD_REF") or "agent/import-minecraft-audio-part-1"


def run(*args: str) -> None:
    subprocess.run(args, check=True)


def fetch_bytes(url: str) -> bytes:
    last: Exception | None = None
    for attempt in range(7):
        try:
            request = urllib.request.Request(url, headers={"User-Agent": "Minecraft-Web-ByAI asset importer"})
            with urllib.request.urlopen(request, timeout=180) as response:
                return response.read()
        except Exception as exc:
            last = exc
            time.sleep(min(30, 2**attempt))
    raise RuntimeError(f"failed to fetch {url}: {last}")


def fetch_json(url: str):
    return json.loads(fetch_bytes(url))


def read_exact_manifest() -> list[str]:
    parts = sorted(MANIFEST_DIR.glob("minecraft-audio-part1-*.txt"))
    if len(parts) != 8:
        raise SystemExit(f"expected 8 manifest chunks, found {len(parts)}: {parts}")
    hashes: list[str] = []
    for part in parts:
        for raw in part.read_text(encoding="utf-8").splitlines():
            value = raw.strip().lower()
            if not value:
                continue
            if not HASH_RE.fullmatch(value):
                raise SystemExit(f"invalid SHA-1 in {part}: {value!r}")
            hashes.append(value)
    if len(hashes) != EXPECTED_COUNT:
        raise SystemExit(f"manifest count mismatch: {len(hashes)} != {EXPECTED_COUNT}")
    if len(set(hashes)) != len(hashes):
        raise SystemExit("manifest contains duplicate SHA-1 objects")
    hashes = sorted(hashes)
    digest = hashlib.sha256(("\n".join(hashes) + "\n").encode("ascii")).hexdigest()
    if digest != EXPECTED_SET_SHA256:
        raise SystemExit(f"manifest set digest mismatch: {digest} != {EXPECTED_SET_SHA256}")
    print(f"EXACT MANIFEST PASSED: objects={len(hashes)} set_sha256={digest}")
    return hashes


def sha1_file(path: Path) -> str:
    digest = hashlib.sha1()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


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
            request = urllib.request.Request(url, headers={"User-Agent": "Minecraft-Web-ByAI asset importer"})
            digest = hashlib.sha1()
            written = 0
            with urllib.request.urlopen(request, timeout=240) as response, temp.open("wb") as output:
                while True:
                    chunk = response.read(1024 * 1024)
                    if not chunk:
                        break
                    output.write(chunk)
                    digest.update(chunk)
                    written += len(chunk)
            if digest.hexdigest() != h:
                raise RuntimeError(f"SHA-1 mismatch for {h}: {digest.hexdigest()}")
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


def commit_objects_in_batches(hashes: list[str]) -> None:
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
            run("git", "commit", "-m", f"assets: import Minecraft audio objects part 1 batch {number}/{len(batches)}")
        print(f"prepared batch {number}/{len(batches)}: files={len(batch)}")


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


def write_mapping(hashes: list[str], asset_index_url: str, logical_by_hash, events_by_logical) -> None:
    rows = []
    resolved_objects = 0
    resolved_ogg = 0
    ogg_objects = 0
    for h in hashes:
        path = TARGET / h[:2] / h
        kind = detect_type(path)
        if kind == "ogg":
            ogg_objects += 1
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
        rows.append({
            "sha1": h,
            "object_path": f"{h[:2]}/{h}",
            "size": path.stat().st_size,
            "type": kind,
            "logical_paths": logical_paths,
            "sound_events": sorted(events),
            "status": status,
        })

    TARGET.mkdir(parents=True, exist_ok=True)
    (TARGET / "对象清单-part1.txt").write_text("\n".join(hashes) + "\n", encoding="utf-8")

    with (TARGET / "音频文件映射表.csv").open("w", encoding="utf-8-sig", newline="") as stream:
        writer = csv.writer(stream)
        writer.writerow(["SHA-1", "仓库对象路径", "字节大小", "类型", "Java1.20.1逻辑路径", "Java1.20.1 Sound Event", "解析状态"])
        for row in rows:
            writer.writerow([
                row["sha1"], row["object_path"], row["size"], row["type"],
                ";".join(row["logical_paths"]), ";".join(row["sound_events"]), row["status"],
            ])

    metadata = {
        "source": "user-supplied Minecraft assets/objects cache, part 1",
        "mapping_reference_version": "Minecraft Java 1.20.1",
        "asset_index_url": asset_index_url,
        "object_count": len(hashes),
        "expected_total_bytes": EXPECTED_TOTAL_BYTES,
        "object_set_sha256": EXPECTED_SET_SHA256,
        "ogg_objects": ogg_objects,
        "resolved_objects_in_java_1_20_1": resolved_objects,
        "resolved_ogg_objects_in_java_1_20_1": resolved_ogg,
        "objects": rows,
    }
    (TARGET / "音频文件映射表.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    readme = f"""# 原版 Minecraft 音频文件\n\n本目录保存用户提供的 Minecraft `assets/objects` 第一批对象。对象文件故意保留 Mojang 内容寻址格式 `两位SHA-1前缀/40位SHA-1`，不直接重命名，以保证后续批次、官方 asset index 和完整性校验可以稳定对应。\n\n## 第一批完整性\n\n- 对象数量：{len(hashes)}\n- 对象总字节数：{EXPECTED_TOTAL_BYTES}\n- 对象集合 SHA-256：`{EXPECTED_SET_SHA256}`\n- OGG 对象：{ogg_objects}\n- 能由 Java 1.20.1 asset index 解析的对象：{resolved_objects}\n- 能由 Java 1.20.1 解析的 OGG 对象：{resolved_ogg}\n\n## 开发者如何查音效\n\n查看 `音频文件映射表.csv`：\n\n- `SHA-1` / `仓库对象路径`：仓库里的实际对象；\n- `Java1.20.1逻辑路径`：例如 `minecraft/sounds/.../*.ogg`；\n- `Java1.20.1 Sound Event`：根据官方 `sounds.json` 解析出的事件名；\n- `解析状态`：明确区分已由 1.20.1 官方索引识别的对象和历史缓存/其他版本对象。\n\n`音频文件映射表.json` 是机器可读版本，`对象清单-part1.txt` 是本批精确 SHA-1 清单。对未解析对象不要根据听感或文件大小猜名称；后续可结合其他 Minecraft 版本 asset index 继续补全映射。\n"""
    (TARGET / "README.md").write_text(readme, encoding="utf-8")
    run("git", "add", "--", str(TARGET / "对象清单-part1.txt"), str(TARGET / "音频文件映射表.csv"), str(TARGET / "音频文件映射表.json"), str(TARGET / "README.md"))
    run("git", "commit", "-m", "docs: add Minecraft audio object mapping for part 1")
    print(f"MAPPING: ogg={ogg_objects} resolved_objects={resolved_objects} resolved_ogg={resolved_ogg}")


def final_verify(hashes: list[str]) -> None:
    total = 0
    for index, h in enumerate(hashes, start=1):
        path = TARGET / h[:2] / h
        if not path.is_file():
            raise SystemExit(f"missing object after import: {path}")
        if sha1_file(path) != h:
            raise SystemExit(f"final SHA-1 mismatch: {path}")
        total += path.stat().st_size
        if index % 250 == 0:
            print(f"verified {index}/{len(hashes)} objects")
    if total != EXPECTED_TOTAL_BYTES:
        raise SystemExit(f"final total byte mismatch: {total} != {EXPECTED_TOTAL_BYTES}")
    digest = hashlib.sha256(("\n".join(hashes) + "\n").encode("ascii")).hexdigest()
    if digest != EXPECTED_SET_SHA256:
        raise SystemExit("final object set SHA-256 mismatch")
    print(f"FINAL VERIFICATION PASSED: objects={len(hashes)} bytes={total} set_sha256={digest}")


def main() -> None:
    hashes = read_exact_manifest()
    TARGET.mkdir(parents=True, exist_ok=True)
    print("Downloading exact object set from Mojang content-addressed resource service...")
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:
        for result in pool.map(download_one, hashes):
            results.append(result)
            if len(results) % 100 == 0:
                print(f"downloaded/verified {len(results)}/{len(hashes)}")
    downloaded_total = sum(size for _, size, _ in results)
    if downloaded_total != EXPECTED_TOTAL_BYTES:
        raise SystemExit(f"downloaded total byte mismatch: {downloaded_total} != {EXPECTED_TOTAL_BYTES}")

    run("git", "config", "user.name", "github-actions[bot]")
    run("git", "config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com")
    run("git", "config", "core.quotePath", "false")
    run("git", "config", "http.postBuffer", "1073741824")
    run("git", "config", "pack.compression", "0")
    commit_objects_in_batches(hashes)

    asset_index_url, logical_by_hash, events_by_logical = resolve_java_1201_mapping()
    write_mapping(hashes, asset_index_url, logical_by_hash, events_by_logical)
    final_verify(hashes)

    print("Pushing prepared batch commits to PR branch...")
    run("git", "push", "origin", f"HEAD:{BRANCH}")
    print("IMPORT PART 1 COMPLETE")


if __name__ == "__main__":
    main()
