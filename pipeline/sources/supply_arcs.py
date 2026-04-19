"""Curated supply-arc passthrough.

This is the *narrative* supply layer from Phase 2 — hand-curated from public
reporting on foundry customers, HBM agreements, CHIPS Act anchor tenants.
The Phase 3 pipeline's job here is just to stamp provenance and pass through.

(The new *trade-flow* arcs from UN Comtrade live in ``supply_trade.py``.)
"""
from __future__ import annotations

import json
from pathlib import Path

from ..core.provenance import make
from ._snapshot import snapshot_path

SOURCES = [
    "Public reporting on foundry customers",
    "HBM supply agreements",
    "CHIPS Act anchor-tenant announcements",
]


def fetch_geojson_text() -> str:
    path: Path = snapshot_path("supply-arcs")
    if not path.exists():
        return ""
    data = json.loads(path.read_text())
    data.setdefault("metadata", {})
    data["metadata"]["updated"] = make(sources=[]).updated
    for feat in data.get("features", []):
        feat.setdefault("properties", {})
        feat["properties"]["provenance"] = make(sources=SOURCES, confidence=0.7).to_dict()
    return json.dumps(data, ensure_ascii=False, separators=(",", ":"))
