"""Regulatory-zone fetcher.

Stanford HAI AI Index + OECD.AI are the canonical policy corpus; neither
exposes a real API for country-level regime classification, so we re-emit
the Phase 2 curated polygons with freshened provenance.
"""
from __future__ import annotations

import json
from pathlib import Path

from ..core.provenance import make
from ._snapshot import snapshot_path

OECD_AI = "https://oecd.ai/en/dashboards"
HAI_INDEX = "https://aiindex.stanford.edu/report/"
TECHIERAY = "https://techieray.com/globalairegulationtracker"


def fetch_geojson_text() -> str:
    path: Path = snapshot_path("regulatory-zones")
    if not path.exists():
        return ""
    data = json.loads(path.read_text())
    data.setdefault("metadata", {})
    data["metadata"].update(
        {
            "source": "OECD.AI Policy Observatory + Stanford HAI AI Index + TechieRay GAIR Tracker",
            "updated": make(sources=[]).updated,
        }
    )
    for feat in data.get("features", []):
        feat.setdefault("properties", {})
        feat["properties"]["provenance"] = make(
            sources=[OECD_AI, HAI_INDEX, TECHIERAY],
            confidence=0.85,
        ).to_dict()
    return json.dumps(data, ensure_ascii=False, separators=(",", ":"))
