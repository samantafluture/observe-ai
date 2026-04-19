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

# Azure region general-availability years from Microsoft press releases /
# product blog. Used by the Phase 4 time scrubber.
_REGION_OPENED: dict[str, int] = {
    "east-us": 2014,
    "east-us-2": 2014,
    "central-us": 2014,
    "north-central-us": 2009,
    "south-central-us": 2008,
    "west-us": 2014,
    "west-us-2": 2017,
    "west-us-3": 2021,
    "west-central-us": 2016,
    "north-europe": 2009,
    "west-europe": 2010,
    "uk-south": 2016,
    "uk-west": 2016,
    "france-central": 2018,
    "germany-west-central": 2019,
    "switzerland-north": 2019,
    "norway-east": 2019,
    "sweden-central": 2021,
    "italy-north": 2023,
    "spain-central": 2024,
    "poland-central": 2023,
    "southeast-asia": 2010,
    "east-asia": 2010,
    "japan-east": 2014,
    "japan-west": 2014,
    "australia-east": 2014,
    "australia-southeast": 2014,
    "australia-central": 2018,
    "korea-central": 2017,
    "korea-south": 2017,
    "central-india": 2015,
    "south-india": 2015,
    "west-india": 2015,
    "uae-north": 2019,
    "south-africa-north": 2019,
    "south-africa-west": 2019,
    "brazil-south": 2014,
    "brazil-southeast": 2021,
    "canada-central": 2016,
    "canada-east": 2016,
    "qatar-central": 2022,
    "israel-central": 2023,
    "indonesia-central": 2024,
    "new-zealand-north": 2024,
    "mexico-central": 2024,
    "malaysia-west": 2024,
}


def fetch() -> list[Facility]:
    recs: list[Facility] = []
    for feat in load_snapshot_features("datacenters-azure"):
        p = feat["properties"]
        lng, lat = feat["geometry"]["coordinates"]
        region = p.get("region")
        recs.append(
            Facility(
                id=p["id"],
                name=p["name"],
                operator=p.get("operator", "Azure"),
                type="datacenter",
                lng=lng,
                lat=lat,
                country=p.get("country"),
                region=region,
                opened=p.get("opened") or _REGION_OPENED.get(region or ""),
                provenance=make(sources=[AZURE_URL], confidence=0.8),
            )
        )
    return recs
