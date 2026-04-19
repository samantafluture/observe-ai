"""Azure region fetcher.

Azure does not publish machine-readable region coordinates. The snapshot in
``public/data/datacenters-azure.geojson`` is the authoritative source for
this pipeline; we re-emit it with freshened provenance. Future: scrape
https://azure.microsoft.com/en-us/explore/global-infrastructure/geographies/.
"""
from __future__ import annotations

from ..core.provenance import make
from ..core.schema import Facility
from ._snapshot import load_snapshot_features

AZURE_URL = "https://azure.microsoft.com/en-us/explore/global-infrastructure/geographies/"


def fetch() -> list[Facility]:
    recs: list[Facility] = []
    for feat in load_snapshot_features("datacenters-azure"):
        p = feat["properties"]
        lng, lat = feat["geometry"]["coordinates"]
        recs.append(
            Facility(
                id=p["id"],
                name=p["name"],
                operator=p.get("operator", "Azure"),
                type="datacenter",
                lng=lng,
                lat=lat,
                country=p.get("country"),
                region=p.get("region"),
                provenance=make(sources=[AZURE_URL], confidence=0.8),
            )
        )
    return recs
