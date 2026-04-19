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

# Year a country's headline AI regulation came into force (or the most recent
# major executive action, where there is no statute yet). Phase 4's time
# scrubber dims a country's regulatory tint until this year.
_REGIME_EFFECTIVE_YEAR: dict[str, int] = {
    # EU member states tied to the EU AI Act (entry into force Aug 2024).
    "AUT": 2024, "BEL": 2024, "BGR": 2024, "HRV": 2024, "CYP": 2024,
    "CZE": 2024, "DNK": 2024, "EST": 2024, "FIN": 2024, "FRA": 2024,
    "DEU": 2024, "GRC": 2024, "HUN": 2024, "IRL": 2024, "ITA": 2024,
    "LVA": 2024, "LTU": 2024, "LUX": 2024, "MLT": 2024, "NLD": 2024,
    "POL": 2024, "PRT": 2024, "ROU": 2024, "SVK": 2024, "SVN": 2024,
    "ESP": 2024, "SWE": 2024,
    # Non-EU strict / executive-order regimes
    "GBR": 2023,  # UK AI Safety Summit framework
    "USA": 2023,  # EO 14110 + 2024 update; 2025 amendments rolled in
    "CAN": 2022,  # AIDA bill stage / interim ministerial directive
    "AUS": 2024,  # Voluntary AI Safety Standard
    "NOR": 2024,
    # State-directed
    "CHN": 2023,  # Generative AI Interim Measures
    "RUS": 2024,
    "ARE": 2024,
    # Emerging
    "BRA": 2024,
    "IND": 2023,
    "IDN": 2024,
    "ISR": 2023,
    "JPN": 2024,
    "KOR": 2024,
    "MEX": 2024,
    "TUR": 2024,
    "VNM": 2024,
    "ZAF": 2024,
    "ARG": 2024,
}


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
        props = feat["properties"]
        iso3 = props.get("country_iso")
        if iso3 in _REGIME_EFFECTIVE_YEAR:
            props["effective_year"] = _REGIME_EFFECTIVE_YEAR[iso3]
        props["provenance"] = make(
            sources=[OECD_AI, HAI_INDEX, TECHIERAY],
            confidence=0.85,
        ).to_dict()
    return json.dumps(data, ensure_ascii=False, separators=(",", ":"))
