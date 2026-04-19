"""AI job-posting concentration — curated city snapshots.

Per the Phase 5 spec, authoritative feeds here are either macro-only (BLS
OEWS — U.S. state-level totals) or paywalled (Lightcast / Revelio Labs). We
bundle a curated snapshot instead: the top ~25 metros globally by active AI
postings, sourced from published Stanford HAI AI Index tables and Lightcast
public reports.

Figures are **2023 annual cumulative postings** mentioning AI skills (SOC
15-1299.09 "data scientists" + related) within the metro area. They are
rough-order estimates intended for visual comparison, not downstream
analytics. Confidence 0.6.
"""
from __future__ import annotations

from ..core.provenance import make
from ..core.schema import JobPosting

HAI_REPORT = "https://aiindex.stanford.edu/report/"
LIGHTCAST_REPORT = "https://lightcast.io/resources/research/the-state-of-the-ai-workforce"
BLS_OEWS = "https://www.bls.gov/oes/"

YEAR = 2023

# (city, country, lng, lat, postings, source-note)
_SNAPSHOT = [
    # North America
    ("San Francisco Bay Area", "US", -122.4194, 37.7749, 52_000, "Lightcast + HAI 2024"),
    ("New York",               "US", -74.0060, 40.7128, 31_000, "Lightcast + HAI 2024"),
    ("Seattle",                "US", -122.3321, 47.6062, 22_500, "Lightcast + HAI 2024"),
    ("Boston",                 "US", -71.0589, 42.3601, 15_800, "Lightcast + HAI 2024"),
    ("Washington",             "US", -77.0369, 38.9072, 14_400, "Lightcast + HAI 2024"),
    ("Austin",                 "US", -97.7431, 30.2672, 11_200, "Lightcast + HAI 2024"),
    ("Los Angeles",            "US", -118.2437, 34.0522, 10_800, "Lightcast + HAI 2024"),
    ("Toronto",                "CA", -79.3832, 43.6532, 9_200,  "Lightcast 2024"),
    ("Atlanta",                "US", -84.3880, 33.7490, 8_900,  "Lightcast + HAI 2024"),
    ("Denver",                 "US", -104.9903, 39.7392, 6_700, "Lightcast + HAI 2024"),
    # Europe
    ("London",                 "GB", -0.1278, 51.5074, 18_600, "Lightcast 2024"),
    ("Paris",                  "FR", 2.3522,  48.8566, 8_900,  "Lightcast 2024"),
    ("Berlin",                 "DE", 13.4050, 52.5200, 7_400,  "Lightcast 2024"),
    ("Munich",                 "DE", 11.5820, 48.1351, 5_600,  "Lightcast 2024"),
    ("Zurich",                 "CH", 8.5417,  47.3769, 4_100,  "Lightcast 2024"),
    ("Dublin",                 "IE", -6.2603, 53.3498, 3_800,  "Lightcast 2024"),
    ("Amsterdam",              "NL", 4.9041,  52.3676, 3_500,  "Lightcast 2024"),
    ("Stockholm",              "SE", 18.0686, 59.3293, 2_900,  "Lightcast 2024"),
    # Middle East
    ("Tel Aviv",               "IL", 34.7818, 32.0853, 6_200,  "Lightcast 2024"),
    ("Dubai",                  "AE", 55.2708, 25.2048, 2_400,  "Lightcast 2024"),
    # Asia–Pacific
    ("Beijing",                "CN", 116.4074, 39.9042, 24_000, "HAI AI Index 2024"),
    ("Shanghai",               "CN", 121.4737, 31.2304, 19_000, "HAI AI Index 2024"),
    ("Shenzhen",               "CN", 114.0579, 22.5431, 14_500, "HAI AI Index 2024"),
    ("Hangzhou",               "CN", 120.1551, 30.2741, 8_700,  "HAI AI Index 2024"),
    ("Bangalore",              "IN", 77.5946,  12.9716, 16_300, "Lightcast 2024"),
    ("Hyderabad",              "IN", 78.4867,  17.3850, 8_100,  "Lightcast 2024"),
    ("Tokyo",                  "JP", 139.6503, 35.6762, 9_800,  "Lightcast 2024"),
    ("Seoul",                  "KR", 126.9780, 37.5665, 7_600,  "Lightcast 2024"),
    ("Singapore",              "SG", 103.8198, 1.3521,  7_300,  "Lightcast 2024"),
    ("Sydney",                 "AU", 151.2093, -33.8688, 5_400, "Lightcast 2024"),
    # South America
    ("São Paulo",              "BR", -46.6333, -23.5505, 4_200, "Lightcast 2024"),
]


def _slug(s: str) -> str:
    return "".join(c.lower() if c.isalnum() else "-" for c in s).strip("-")


def fetch() -> list[JobPosting]:
    prov = make(
        sources=[HAI_REPORT, LIGHTCAST_REPORT, BLS_OEWS],
        confidence=0.6,
    )
    out: list[JobPosting] = []
    for city, country, lng, lat, postings, source in _SNAPSHOT:
        out.append(
            JobPosting(
                id=f"job-{_slug(city)}-{country.lower()}-{YEAR}",
                city=city,
                country=country,
                lng=lng,
                lat=lat,
                year=YEAR,
                postings=int(postings),
                source=source,
                provenance=prov,
            )
        )
    return out
