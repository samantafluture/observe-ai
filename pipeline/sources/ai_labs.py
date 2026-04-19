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

# Founding-year backfill keyed by feature id. Used by the Phase 4 time
# scrubber so a lab "appears" only on/after its founding year. Sources are
# company About pages and Crunchbase profiles.
_FOUNDED: dict[str, int] = {
    "ai-openai": 2015,
    "ai-anthropic": 2021,
    "ai-deepmind-london": 2010,
    "ai-google-research": 2005,
    "ai-meta-fair": 2013,
    "ai-meta-fair-paris": 2015,
    "ai-msr-redmond": 1991,
    "ai-msr-cambridge": 1997,
    "ai-nvidia": 1993,
    "ai-xai": 2023,
    "ai-xai-memphis": 2024,
    "ai-mistral": 2023,
    "ai-cohere": 2019,
    "ai-stability": 2020,
    "ai-huggingface": 2016,
    "ai-inflection": 2022,
    "ai-perplexity": 2022,
    "ai-character": 2021,
    "ai-scale": 2016,
    "ai-databricks": 2013,
    "ai-runway": 2018,
    "ai-ai21": 2017,
    "ai-sakana": 2023,
    "ai-aleph-alpha": 2019,
    "ai-baidu": 2010,
    "ai-alibaba": 2017,
    "ai-tencent": 2016,
    "ai-zhipu": 2019,
    "ai-moonshot": 2023,
    "ai-damo": 2017,
}


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
                opened=p.get("opened") or _FOUNDED.get(p["id"]),
                provenance=make(sources=base_sources, confidence=0.9),
            )
        )
    return recs
