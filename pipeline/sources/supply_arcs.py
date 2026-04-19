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

# Best-public-announcement year for each curated supply edge. Used by the
# Phase 4 time scrubber (an arc is hidden until the announcement year).
_ARC_ANNOUNCED: dict[str, int] = {
    "arc-tsmc-f18-openai":            2022,
    "arc-tsmc-f18-anthropic":         2023,
    "arc-tsmc-f12-nvidia":            2017,
    "arc-tsmc-f18-google-tw":         2020,
    "arc-tsmc-f21-msft-az":           2022,
    "arc-tsmc-f21-aws-useast":        2023,
    "arc-tsmc-f23-google-tokyo":      2023,
    "arc-samsung-pyeongtaek-aws-seoul": 2018,
    "arc-samsung-hwaseong-nvidia":    2020,
    "arc-samsung-taylor-aws-useast":  2024,
    "arc-samsung-austin-azure-tx":    2018,
    "arc-intel-ohio-azure-east":      2025,
    "arc-intel-leixlip-aws-dub":      2014,
    "arc-intel-ocotillo-azure-az":    2018,
    "arc-gf-malta-aws-east":          2015,
    "arc-gf-dresden-azure-de":        2017,
    "arc-smic-shanghai-damo":         2019,
    "arc-smic-beijing-baidu":         2020,
    "arc-skhynix-icheon-nvidia":      2022,
    "arc-micron-taichung-nvidia":     2023,
    "arc-tsmc-nanjing-tencent":       2019,
    "arc-infineon-dresden-azure-de":  2016,
    "arc-stm-crolles-azure-fr":       2018,
}


def fetch_geojson_text() -> str:
    path: Path = snapshot_path("supply-arcs")
    if not path.exists():
        return ""
    data = json.loads(path.read_text())
    data.setdefault("metadata", {})
    data["metadata"]["updated"] = make(sources=[]).updated
    for feat in data.get("features", []):
        feat.setdefault("properties", {})
        props = feat["properties"]
        if props.get("id") in _ARC_ANNOUNCED:
            props["year"] = _ARC_ANNOUNCED[props["id"]]
        props["provenance"] = make(sources=SOURCES, confidence=0.7).to_dict()
    return json.dumps(data, ensure_ascii=False, separators=(",", ":"))
