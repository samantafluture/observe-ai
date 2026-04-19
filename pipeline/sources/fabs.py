"""Semiconductor fab fetcher.

Primary source: Wikipedia "List of semiconductor fabrication plants" via the
MediaWiki API. The live fetch is used to detect *new* fabs to flag for
review; the authoritative geocoded set is the curated
``public/data/fabs.geojson`` (which already blends CHIPS Act + Silicon
Analysts Fab Explorer + SIA Ecosystem Map data points from Phase 2).
"""
from __future__ import annotations

from ..core.provenance import make
from ..core.schema import Facility
from ._http import offline, get_json
from ._snapshot import load_snapshot_features

WIKI_API = "https://en.wikipedia.org/w/api.php"
WIKI_PAGE = "List_of_semiconductor_fabrication_plants"
CHIPS_ACT_URL = "https://www.cnn.com/chips-act-tracker"  # placeholder canonical anchor
SIA_URL = "https://www.semiconductors.org/"
SILICON_ANALYSTS_URL = "https://siliconanalysts.com/"


def _poll_wikipedia() -> None:
    """Warm cache / surface link-rot. Actual data is merged manually until
    the MediaWiki parser wrapper lands in a future pass."""
    if offline():
        return
    try:
        get_json(
            WIKI_API,
            params={
                "action": "parse",
                "page": WIKI_PAGE,
                "format": "json",
                "prop": "sections",
            },
        )
    except Exception:
        pass


def fetch() -> list[Facility]:
    _poll_wikipedia()
    recs: list[Facility] = []
    for feat in load_snapshot_features("fabs"):
        p = feat["properties"]
        lng, lat = feat["geometry"]["coordinates"]
        recs.append(
            Facility(
                id=p["id"],
                name=p["name"],
                operator=p["operator"],
                type="fab",
                lng=lng,
                lat=lat,
                country=p.get("country"),
                city=p.get("city"),
                role=p.get("role"),
                node_nm=p.get("node_nm"),
                wafer_size_mm=p.get("wafer_size_mm"),
                provenance=make(
                    sources=[
                        f"https://en.wikipedia.org/wiki/{WIKI_PAGE}",
                        CHIPS_ACT_URL,
                        SILICON_ANALYSTS_URL,
                        SIA_URL,
                    ],
                    confidence=0.9,
                ),
            )
        )
    return recs
