"""Utilities for loading the bundled GeoJSON snapshots.

Snapshots are the existing ``public/data/*.geojson`` files. The pipeline
treats them as a stable baseline: every fetcher merges fresh upstream data
on top of the snapshot rather than regenerating from scratch. If an upstream
API is unreachable the snapshot is emitted unchanged (with provenance marking
the data as stale but trusted).
"""
from __future__ import annotations

import json
from pathlib import Path

PUBLIC_DATA = Path(__file__).resolve().parent.parent.parent / "public" / "data"


def snapshot_path(name: str) -> Path:
    return PUBLIC_DATA / f"{name}.geojson"


def load_snapshot_features(name_or_path: str | Path) -> list[dict]:
    path = snapshot_path(name_or_path) if isinstance(name_or_path, str) else name_or_path
    if not path.exists():
        return []
    data = json.loads(path.read_text())
    return list(data.get("features", []))
