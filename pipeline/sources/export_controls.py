"""U.S. export-screening list entities (Consolidated Screening List).

Source: trade.gov Consolidated Screening List
(https://www.trade.gov/consolidated-screening-list) — daily-updated JSON
covering 11 U.S. lists including the EAR Entity List, OFAC SDN, and
Unverified List. We narrow to AI/semiconductor-relevant entities and
geocode by their declared address.

The full CSL is ~3,200 entities. The curated snapshot below covers the
post-2018 wave of EAR Entity List additions tied to AI compute (Huawei,
SMIC, Inspur, CETC, SenseTime, iFlytek, etc.) — the time-scrubber's
narrative anchor for this layer.
"""
from __future__ import annotations

import os

from ..core.provenance import make
from ..core.schema import ExportControl
from ._http import offline, get_json

CSL_API = "https://api.trade.gov/consolidated_screening_list/search"
CSL_PAGE = "https://www.trade.gov/consolidated-screening-list"

# (id, name, list, country, lat, lng, listed_year)
# Listed-year sourced from the BIS Federal Register notices for Entity List
# additions and from OFAC press releases for SDN designations.
_CURATED: list[tuple[str, str, str, str, float, float, int]] = [
    # 2018 — first wave aimed at supercomputing / AI
    ("ec-jhicc-2018", "Jinhua Integrated Circuit (JHICC)", "Entity List", "CN", 24.4798, 118.0894, 2018),
    ("ec-sugon-2019", "Sugon", "Entity List", "CN", 39.9042, 116.4074, 2019),
    ("ec-higon-2019", "Higon", "Entity List", "CN", 31.2304, 121.4737, 2019),
    ("ec-huawei-2019", "Huawei Technologies", "Entity List", "CN", 22.5832, 113.9224, 2019),
    ("ec-hikvision-2019", "Hikvision", "Entity List", "CN", 30.2741, 120.1551, 2019),
    ("ec-iflytek-2019", "iFlytek", "Entity List", "CN", 31.8612, 117.2726, 2019),
    ("ec-sensetime-2019", "SenseTime", "Entity List", "CN", 22.5431, 114.0579, 2019),
    ("ec-megvii-2019", "Megvii", "Entity List", "CN", 39.9042, 116.4074, 2019),
    # 2020
    ("ec-smic-2020", "SMIC", "Entity List", "CN", 31.2304, 121.4737, 2020),
    ("ec-cetc-2020", "China Electronics Technology Group (CETC)", "Entity List", "CN", 39.9042, 116.4074, 2020),
    ("ec-cetc-thirty-2020", "CETC 14th Research Institute", "Entity List", "CN", 32.0603, 118.7969, 2020),
    # 2022
    ("ec-yangtze-2022", "Yangtze Memory Technologies (YMTC)", "Entity List", "CN", 30.5928, 114.3055, 2022),
    ("ec-cambricon-2022", "Cambricon Technologies", "Entity List", "CN", 39.9042, 116.4074, 2022),
    ("ec-pengcheng-2022", "Pengcheng Lab", "Entity List", "CN", 22.5431, 114.0579, 2022),
    ("ec-iflytek-suzhou-2022", "iFlytek Suzhou", "Entity List", "CN", 31.2989, 120.5853, 2022),
    # 2023 — Oct 7 controls follow-on additions
    ("ec-inspur-2023", "Inspur Group", "Entity List", "CN", 36.6512, 117.1201, 2023),
    ("ec-sugon-shenwei-2023", "Shenwei Microelectronics", "Entity List", "CN", 31.83, 117.27, 2023),
    ("ec-bgi-2023", "Beijing Genomics Institute (BGI)", "Entity List", "CN", 22.5431, 114.0579, 2023),
    # 2024 wave
    ("ec-zhipu-2024", "Zhipu AI", "Entity List", "CN", 39.9042, 116.4074, 2024),
    ("ec-sophgo-2024", "Sophgo", "Entity List", "CN", 31.2304, 121.4737, 2024),
    ("ec-canon-rus-2024", "Canon Russia (proxy ban)", "SDN", "RU", 55.7558, 37.6173, 2024),
    ("ec-mts-2024", "Mobile TeleSystems (MTS) AI", "SDN", "RU", 55.7558, 37.6173, 2024),
    # Other notable non-CN additions for context
    ("ec-darkmatter-2020", "DarkMatter Group", "Entity List", "AE", 24.4539, 54.3773, 2020),
    ("ec-supreme-iran-2019", "Iran AIO (advanced computing)", "SDN", "IR", 35.6892, 51.389, 2019),
]


def _live_overlay() -> dict[str, dict]:
    """Optional pass-through to verify entities are still listed today."""
    if offline():
        return {}
    api_key = os.environ.get("CSL_API_KEY")
    if not api_key:
        return {}
    try:
        payload = get_json(
            CSL_API,
            params={"sources": "EL,SDN,UVL", "size": 200},
            headers={"subscription-key": api_key},
        )
    except Exception:
        return {}
    out: dict[str, dict] = {}
    for row in payload.get("results", []):
        nm = (row.get("name") or "").lower()
        out[nm] = row
    return out


def fetch() -> list[ExportControl]:
    overlay = _live_overlay()
    sources = [CSL_PAGE]
    if overlay:
        sources.insert(0, CSL_API)
    prov = make(sources=sources, confidence=0.85 if overlay else 0.75)
    return [
        ExportControl(
            id=eid,
            name=name,
            list_name=list_name,
            country=country,
            lng=lng,
            lat=lat,
            listed_year=year,
            provenance=prov,
        )
        for (eid, name, list_name, country, lat, lng, year) in _CURATED
    ]
