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
