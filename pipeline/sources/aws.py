"""AWS region fetcher.

Primary source: https://github.com/jsonmaur/aws-regions — a maintained JSON
with region codes and coordinates. Snapshot fallback is the curated Phase-1
file. New regions appearing upstream are merged in; the snapshot is never
down-merged (so curator-added metadata like friendly names survives).
"""
from __future__ import annotations

from ..core.provenance import make
from ..core.schema import Facility
from ._http import offline, get_json
from ._snapshot import load_snapshot_features

AWS_JSON_URL = (
    "https://raw.githubusercontent.com/jsonmaur/aws-regions/master/regions.json"
)

# Public AWS region launch years from "AWS regions and Availability Zones"
# announcements (re:Invent keynotes / blog posts). Used by the Phase 4 time
# scrubber so a region only "lights up" once it actually existed.
_REGION_OPENED: dict[str, int] = {
    "us-east-1": 2006,
    "us-west-2": 2011,
    "us-west-1": 2009,
    "us-east-2": 2016,
    "ap-southeast-1": 2010,
    "ap-northeast-1": 2011,
    "eu-west-1": 2007,
    "sa-east-1": 2011,
    "ap-southeast-2": 2012,
    "eu-central-1": 2014,
    "ap-northeast-2": 2016,
    "ap-south-1": 2016,
    "ca-central-1": 2016,
    "eu-west-2": 2016,
    "us-gov-west-1": 2011,
    "us-gov-east-1": 2018,
    "ap-northeast-3": 2018,
    "eu-west-3": 2017,
    "eu-north-1": 2018,
    "ap-east-1": 2019,
    "me-south-1": 2019,
    "af-south-1": 2020,
    "eu-south-1": 2020,
    "ap-southeast-3": 2022,
    "me-central-1": 2022,
    "eu-south-2": 2022,
    "eu-central-2": 2022,
    "ap-south-2": 2022,
    "ap-southeast-4": 2023,
    "il-central-1": 2023,
    "ca-west-1": 2023,
    "ap-southeast-5": 2024,
    "mx-central-1": 2025,
}


def fetch() -> list[Facility]:
    snapshot = {
        feat["properties"]["region"]: feat
        for feat in load_snapshot_features("datacenters-aws")
        if "region" in feat["properties"]
    }

    live: list[dict] = []
    if not offline():
        try:
            live = list(get_json(AWS_JSON_URL))
        except Exception:
            live = []

    recs: list[Facility] = []
    seen: set[str] = set()
    for row in live:
        code = row.get("code")
        if not code:
            continue
        seen.add(code)
        name = row.get("full_name") or row.get("name") or code
        country = row.get("country_code")
        lat = row.get("latitude")
        lng = row.get("longitude")
        if lat is None or lng is None:
            if code in snapshot:
                lng, lat = snapshot[code]["geometry"]["coordinates"]
            else:
                continue
        provenance = make(sources=[AWS_JSON_URL], confidence=0.95)
        recs.append(
            Facility(
                id=f"aws-{code}",
                name=name,
                operator="AWS",
                type="datacenter",
                lng=float(lng),
                lat=float(lat),
                country=country,
                region=code,
                opened=_REGION_OPENED.get(code),
                provenance=provenance,
            )
        )

    # Always include snapshot rows the live feed didn't cover (e.g. GovCloud,
    # isolated regions that jsonmaur/aws-regions omits).
    for region, feat in snapshot.items():
        if region in seen:
            continue
        p = feat["properties"]
        lng, lat = feat["geometry"]["coordinates"]
        recs.append(
            Facility(
                id=p["id"],
                name=p["name"],
                operator=p.get("operator", "AWS"),
                type="datacenter",
                lng=lng,
                lat=lat,
                country=p.get("country"),
                region=region,
                opened=p.get("opened") or _REGION_OPENED.get(region),
                provenance=make(
                    sources=["https://aws.amazon.com/about-aws/global-infrastructure/"],
                    confidence=0.85,
                ),
            )
        )

    return recs
