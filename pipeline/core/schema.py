"""Canonical record shapes the pipeline passes between stages.

The frontend consumes GeoJSON, so these dataclasses are an *intermediate*
representation that `export.to_geojson` / `export.to_parquet` serialize. They
exist so that every stage agrees on field names and types without having to
repeat validation.
"""
from __future__ import annotations

from dataclasses import dataclass, field, asdict
from typing import Literal, Optional


FacilityType = Literal["datacenter", "ai_facility", "fab"]
Regime = Literal["strict", "executive-order", "state-directed", "emerging", "minimal"]


@dataclass
class Provenance:
    """Per-feature provenance block. Every emitted feature carries one."""

    sources: list[str] = field(default_factory=list)
    updated: str = ""  # ISO-8601 date (YYYY-MM-DD)
    confidence: float = 1.0  # 0-1; 1.0 means the record is trusted/manual

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class Facility:
    """Point facility: data centers, AI labs, fabs."""

    id: str
    name: str
    operator: str
    type: FacilityType
    lng: float
    lat: float
    country: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = None
    role: Optional[str] = None
    opened: Optional[int] = None
    # Fab-only
    node_nm: Optional[int] = None
    wafer_size_mm: Optional[int] = None
    provenance: Provenance = field(default_factory=Provenance)

    def to_feature(self) -> dict:
        props = {
            "id": self.id,
            "name": self.name,
            "operator": self.operator,
            "type": self.type,
        }
        for k in ("country", "city", "region", "role", "opened", "node_nm", "wafer_size_mm"):
            v = getattr(self, k)
            if v is not None:
                props[k] = v
        props["provenance"] = self.provenance.to_dict()
        return {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [self.lng, self.lat]},
            "properties": props,
        }


@dataclass
class MoneyFlow:
    """Country-level private AI investment observation for a given year."""

    id: str
    country_iso: str
    country_name: str
    year: int
    amount_usd: float  # total private investment in USD
    lng: float
    lat: float
    provenance: Provenance = field(default_factory=Provenance)

    def to_feature(self) -> dict:
        return {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [self.lng, self.lat]},
            "properties": {
                "id": self.id,
                "country_iso": self.country_iso,
                "country_name": self.country_name,
                "year": self.year,
                "amount_usd": self.amount_usd,
                "provenance": self.provenance.to_dict(),
            },
        }


@dataclass
class TradeArc:
    """Bilateral HS 8542 (integrated circuits) trade flow for a given year."""

    id: str
    from_iso: str
    to_iso: str
    from_name: str
    to_name: str
    from_lng: float
    from_lat: float
    to_lng: float
    to_lat: float
    year: int
    value_usd: float
    hs_code: str = "8542"
    provenance: Provenance = field(default_factory=Provenance)

    def to_feature(self) -> dict:
        return {
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": [
                    [self.from_lng, self.from_lat],
                    [self.to_lng, self.to_lat],
                ],
            },
            "properties": {
                "id": self.id,
                "from_iso": self.from_iso,
                "to_iso": self.to_iso,
                "from_name": self.from_name,
                "to_name": self.to_name,
                "year": self.year,
                "value_usd": self.value_usd,
                "hs_code": self.hs_code,
                "provenance": self.provenance.to_dict(),
            },
        }


@dataclass
class Patent:
    """City-level AI patent activity for a given year (PatentsView, USPTO).

    Aggregated count of granted patents matching AI-related CPC subgroups
    (G06N, G06F18, G06V, G10L) for the assignee's primary inventor location.
    """

    id: str
    city: str
    country: str
    lng: float
    lat: float
    year: int
    count: int
    top_assignee: Optional[str] = None
    provenance: Provenance = field(default_factory=Provenance)

    def to_feature(self) -> dict:
        props = {
            "id": self.id,
            "city": self.city,
            "country": self.country,
            "year": self.year,
            "count": self.count,
            "provenance": self.provenance.to_dict(),
        }
        if self.top_assignee is not None:
            props["top_assignee"] = self.top_assignee
        return {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [self.lng, self.lat]},
            "properties": props,
        }


@dataclass
class ExportControl:
    """Entity on a U.S. export-screening list (Consolidated Screening List).

    A single physical address per entity. `listed_year` is the year the entity
    first appeared on any of the 11 covered lists; the time scrubber uses it
    to surface the wave of post-2018 EAR Entity List additions.
    """

    id: str
    name: str
    list_name: str  # e.g. "Entity List", "SDN", "Unverified"
    country: str
    lng: float
    lat: float
    listed_year: int
    provenance: Provenance = field(default_factory=Provenance)

    def to_feature(self) -> dict:
        return {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [self.lng, self.lat]},
            "properties": {
                "id": self.id,
                "name": self.name,
                "list_name": self.list_name,
                "country": self.country,
                "listed_year": self.listed_year,
                "provenance": self.provenance.to_dict(),
            },
        }


@dataclass
class CoauthorArc:
    """OpenAlex co-authorship arc between two institutions for a year window.

    `weight` is the count of co-authored papers in the year. Paths are drawn
    as great circles between the institutions' geocoded centroids.
    """

    id: str
    from_id: str
    to_id: str
    from_name: str
    to_name: str
    from_lng: float
    from_lat: float
    to_lng: float
    to_lat: float
    year: int
    weight: int
    provenance: Provenance = field(default_factory=Provenance)

    def to_feature(self) -> dict:
        return {
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": [
                    [self.from_lng, self.from_lat],
                    [self.to_lng, self.to_lat],
                ],
            },
            "properties": {
                "id": self.id,
                "from_id": self.from_id,
                "to_id": self.to_id,
                "from_name": self.from_name,
                "to_name": self.to_name,
                "year": self.year,
                "weight": self.weight,
                "provenance": self.provenance.to_dict(),
            },
        }
