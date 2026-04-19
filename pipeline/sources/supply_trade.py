"""UN Comtrade HS 8542 (integrated circuits) bilateral trade fetcher.

API docs: https://comtradeplus.un.org/Data-Api-Reference
Endpoint:  https://comtradeapi.un.org/data/v1/get/C/A/HS
Free-tier limit: 500 rows per query; we scope to top reporters + HS=8542,
year=2023 (the most recent year with complete mirror data as of 2026-04).

Because the free endpoint requires an `Ocp-Apim-Subscription-Key` header,
we gracefully no-op when ``COMTRADE_API_KEY`` is absent and fall back to a
curated snapshot derived from OEC.world for the largest flows. Every emitted
arc carries full provenance including the raw HS code and year.
"""
from __future__ import annotations

import os

from ..core.provenance import make
from ..core.schema import TradeArc
from ._http import offline, get_json

COMTRADE_API = "https://comtradeapi.un.org/data/v1/get/C/A/HS"
OEC_HS8542 = "https://oec.world/en/profile/hs/integrated-circuits"

# Capitals used as bilateral anchors.  Kept in one place so new reporters
# slot in without widening the record shape.
_CAPITALS: dict[str, tuple[str, float, float]] = {
    "TW": ("Taipei", 25.0330, 121.5654),
    "CN": ("Beijing", 39.9042, 116.4074),
    "KR": ("Seoul", 37.5665, 126.9780),
    "US": ("Washington", 38.9072, -77.0369),
    "JP": ("Tokyo", 35.6762, 139.6503),
    "SG": ("Singapore", 1.3521, 103.8198),
    "MY": ("Kuala Lumpur", 3.1390, 101.6869),
    "VN": ("Hanoi", 21.0285, 105.8542),
    "DE": ("Berlin", 52.5200, 13.4050),
    "PH": ("Manila", 14.5995, 120.9842),
    "NL": ("Amsterdam", 52.3676, 4.9041),
    "HK": ("Hong Kong", 22.3193, 114.1694),
    "MX": ("Mexico City", 19.4326, -99.1332),
}

# Curated 2023 bilateral IC flows (USD billions). Source: OEC.world HS 8542
# "Trade by Country" bilateral breakdown, 2023, largest flows > $5B.
# The pipeline uses this as a baseline and, if COMTRADE_API_KEY is set,
# overlays live Comtrade values over the matching (from, to) pairs.
_2023_BILATERAL_USD_B = [
    ("TW", "CN", 109.3),
    ("KR", "CN",  74.8),
    ("CN", "HK",  62.0),
    ("TW", "US",  52.1),
    ("KR", "VN",  38.4),
    ("JP", "CN",  30.1),
    ("CN", "US",  27.9),
    ("MY", "US",  24.3),
    ("SG", "US",  22.7),
    ("TW", "JP",  18.4),
    ("KR", "US",  16.2),
    ("PH", "US",  13.0),
    ("TW", "SG",  12.9),
    ("MY", "SG",  11.5),
    ("JP", "US",  10.2),
    ("MX", "US",   9.1),
    ("NL", "US",   8.3),
    ("DE", "US",   7.8),
    ("TW", "KR",   6.4),
    ("MY", "CN",   6.1),
    ("VN", "US",   5.9),
    ("NL", "TW",   5.4),
]


def _make_arc(from_iso: str, to_iso: str, value_usd_b: float, year: int, sources: list[str]) -> TradeArc | None:
    if from_iso not in _CAPITALS or to_iso not in _CAPITALS:
        return None
    f_name, f_lat, f_lng = _CAPITALS[from_iso]
    t_name, t_lat, t_lng = _CAPITALS[to_iso]
    return TradeArc(
        id=f"trade-{from_iso}-{to_iso}-{year}",
        from_iso=from_iso,
        to_iso=to_iso,
        from_name=f_name,
        to_name=t_name,
        from_lng=f_lng,
        from_lat=f_lat,
        to_lng=t_lng,
        to_lat=t_lat,
        year=year,
        value_usd=value_usd_b * 1e9,
        hs_code="8542",
        provenance=make(sources=sources, confidence=0.9),
    )


def _fetch_live(year: int, api_key: str) -> dict[tuple[str, str], float]:
    """Best-effort Comtrade overlay. Returns a {(from,to): value_usd} map.

    The API returns one row per reporter-partner-commodity; we filter to
    exports (flowCode = X) of HS 8542 among our tracked reporters.
    """
    reporters = ",".join(_CAPITALS.keys())
    try:
        payload = get_json(
            COMTRADE_API,
            params={
                "reporterCode": reporters,
                "period": year,
                "cmdCode": "8542",
                "flowCode": "X",
            },
            headers={"Ocp-Apim-Subscription-Key": api_key},
        )
    except Exception:
        return {}
    out: dict[tuple[str, str], float] = {}
    for row in payload.get("data", []):
        f = row.get("reporterISO")
        t = row.get("partnerISO")
        v = row.get("primaryValue") or row.get("cifvalue") or row.get("fobvalue")
        if f and t and v and f in _CAPITALS and t in _CAPITALS:
            out[(f, t)] = float(v)
    return out


def fetch() -> list[TradeArc]:
    year = 2023
    api_key = os.environ.get("COMTRADE_API_KEY")
    live = {}
    if api_key and not offline():
        live = _fetch_live(year, api_key)

    sources = [OEC_HS8542]
    if live:
        sources.insert(0, COMTRADE_API)

    arcs: list[TradeArc] = []
    seen: set[tuple[str, str]] = set()
    # Prefer live values where available.
    for (f, t), v in live.items():
        if f == t:
            continue
        arc = _make_arc(f, t, v / 1e9, year, sources)
        if arc:
            arcs.append(arc)
            seen.add((f, t))
    # Fill in from the curated baseline for any pair the live call missed.
    for (f, t, v) in _2023_BILATERAL_USD_B:
        if (f, t) in seen:
            continue
        arc = _make_arc(f, t, v, year, sources)
        if arc:
            arcs.append(arc)
    return arcs
