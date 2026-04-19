"""Corporate AI investment flow fetcher.

Data source: Stanford HAI AI Index 2025 report — private AI investment by
geography, 2024. The AI Index does not expose a JSON API; the numbers come
from the PDF tables. The curated subset below covers the top investment
countries which account for ~98% of global 2024 private AI investment.

A future pass can ingest the Crunchbase funding-rounds stream
(``CRUNCHBASE_API_KEY``) to refine the country totals.
"""
from __future__ import annotations

from ..core.provenance import make
from ..core.schema import MoneyFlow

HAI_REPORT = "https://aiindex.stanford.edu/report/"
OECD_AI_INVEST = "https://oecd.ai/en/data?selectedTab=investments"

# (country_iso, country_name, 2024 private AI investment in USD billions,
#  capital lat/lng used as the visual anchor)
# Values from Stanford HAI AI Index 2025, Chapter 4 (Private Investment,
# geography breakdown). Rounded to nearest $0.1B where the report reports a
# decimal; otherwise to the nearest $1B.
_2024_PRIVATE_INVESTMENT = [
    ("US",  "United States",   109.1, 38.9072, -77.0369),
    ("CN",  "China",             9.3, 39.9042, 116.4074),
    ("GB",  "United Kingdom",    4.5, 51.5074, -0.1278),
    ("CA",  "Canada",            3.0, 45.4215, -75.6972),
    ("IL",  "Israel",            2.8, 31.7683, 35.2137),
    ("DE",  "Germany",           2.1, 52.5200, 13.4050),
    ("FR",  "France",            1.9, 48.8566, 2.3522),
    ("IN",  "India",             1.7, 28.6139, 77.2090),
    ("KR",  "South Korea",       1.3, 37.5665, 126.9780),
    ("JP",  "Japan",             1.1, 35.6762, 139.6503),
    ("SG",  "Singapore",         0.9, 1.3521, 103.8198),
    ("AU",  "Australia",         0.6, -35.2809, 149.1300),
    ("SE",  "Sweden",            0.5, 59.3293, 18.0686),
    ("NL",  "Netherlands",       0.5, 52.3676, 4.9041),
    ("CH",  "Switzerland",       0.4, 46.9481, 7.4474),
    ("AE",  "UAE",               0.4, 24.4539, 54.3773),
    ("IE",  "Ireland",           0.3, 53.3498, -6.2603),
    ("BR",  "Brazil",            0.2, -15.7942, -47.8822),
]


def fetch() -> list[MoneyFlow]:
    year = 2024
    prov = make(sources=[HAI_REPORT, OECD_AI_INVEST], confidence=0.9)
    return [
        MoneyFlow(
            id=f"money-{iso.lower()}-{year}",
            country_iso=iso,
            country_name=name,
            year=year,
            amount_usd=billions * 1e9,
            lng=lng,
            lat=lat,
            provenance=prov,
        )
        for (iso, name, billions, lat, lng) in _2024_PRIVATE_INVESTMENT
    ]
