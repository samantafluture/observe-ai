"""AI-lab fetcher.

Sources are primarily public company websites, curated by hand. Phase 3 adds
provenance tags; a future pass can overlay Crunchbase HQ lookups
(paid API, gated behind ``CRUNCHBASE_API_KEY``).
"""
from __future__ import annotations

import os

from ..core.provenance import make
from ..core.schema import Facility
from ._snapshot import load_snapshot_features

CRUNCHBASE = "https://www.crunchbase.com/"


def fetch() -> list[Facility]:
    has_crunchbase = bool(os.environ.get("CRUNCHBASE_API_KEY"))
    base_sources = ["manual-curation"]
    if has_crunchbase:
        base_sources.append(CRUNCHBASE)

    recs: list[Facility] = []
    for feat in load_snapshot_features("ai-facilities"):
        p = feat["properties"]
        lng, lat = feat["geometry"]["coordinates"]
        recs.append(
            Facility(
                id=p["id"],
                name=p["name"],
                operator=p["operator"],
                type="ai_facility",
                lng=lng,
                lat=lat,
                country=p.get("country"),
                city=p.get("city"),
                role=p.get("role"),
                provenance=make(sources=base_sources, confidence=0.9),
            )
        )
    return recs
