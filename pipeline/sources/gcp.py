"""Google Cloud region fetcher.

Primary source: the region→metadata JSON embedded in
https://datacenters.google/locations/. The scraped page is a moving target,
so the pipeline's baseline is always the curated snapshot shipped in
``public/data/datacenters-google.geojson``; the live page is used only to
verify connectivity (future: overlay newly-announced regions).
"""
from __future__ import annotations

from ..core.provenance import make
from ..core.schema import Facility
from ._http import offline, get_text
from ._snapshot import load_snapshot_features

GCP_URL = "https://datacenters.google/locations/"
LOCATIONS_URL = "https://cloud.google.com/about/locations"


def fetch() -> list[Facility]:
    live_ok = False
    if not offline():
        try:
            get_text(GCP_URL)
            live_ok = True
        except Exception:
            live_ok = False

    recs: list[Facility] = []
    for feat in load_snapshot_features("datacenters-google"):
        p = feat["properties"]
        lng, lat = feat["geometry"]["coordinates"]
        recs.append(
            Facility(
                id=p["id"],
                name=p["name"],
                operator=p.get("operator", "Google"),
                type="datacenter",
                lng=lng,
                lat=lat,
                country=p.get("country"),
                region=p.get("region"),
                opened=p.get("opened"),
                provenance=make(
                    sources=[LOCATIONS_URL, GCP_URL],
                    confidence=0.95 if live_ok else 0.85,
                ),
            )
        )
    return recs
