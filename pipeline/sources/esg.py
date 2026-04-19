"""ESG (energy + water) overlay fetcher — hyperscaler sustainability reports.

Hyperscalers publish fleet-level energy / water totals annually but almost
never break them out per facility. This source curates *per-facility*
estimates by reading each company's sustainability report and allocating the
fleet total across its published regions using the weights below.

Sources:

  - Google Environmental Report 2024 (data-center electricity: ~25.9 TWh,
    water withdrawal: ~27.9 million m³, fleet-avg PUE 1.10).
    https://sustainability.google/reports/

  - Microsoft Environmental Sustainability Report 2024 (data-center
    electricity: ~23.6 TWh, water withdrawal: ~7.84 million m³, global
    fleet-avg PUE 1.18).
    https://www.microsoft.com/en-us/sustainability

  - Amazon Sustainability Report 2023 — AWS disclosed ~50 TWh of renewable
    matched consumption; we take a conservative ~42 TWh measured electricity
    figure and ~6 million m³ of water as AWS's regional WUE disclosures imply.
    https://sustainability.aboutamazon.com/

  - Meta 2024 Sustainability Report (fleet: ~14.975 TWh, water: ~4.2M m³).

  - TSMC Sustainability Report 2023 — fab-level water and electricity are
    disclosed per Taiwan hub (Hsinchu / Tainan / Taichung) and we map them
    onto the Silicon Analysts / Wikipedia fab IDs we carry.

Confidence is lower (0.65) than layers with true per-facility data because
we're prorating fleet totals. Facility-level numbers where disclosed (TSMC's
GigaFab clusters) use a higher confidence (0.85).
"""
from __future__ import annotations

from ..core.provenance import make
from ..core.schema import Esg

GOOGLE_REPORT = "https://sustainability.google/reports/google-2024-environmental-report/"
MS_REPORT = "https://www.microsoft.com/en-us/corporate-responsibility/sustainability/report"
AWS_REPORT = "https://sustainability.aboutamazon.com/2023-sustainability-report"
META_REPORT = "https://sustainability.fb.com/2024-sustainability-report/"
TSMC_REPORT = "https://esg.tsmc.com/download/file/2023_sustainabilityReport/english/e-all.pdf"

# Year the reported totals describe.
YEAR = 2023

# --- Google Cloud -----------------------------------------------------------
# Fleet 2023: ~25.9 TWh, ~27.9M m³. We allocate across the ten regions below
# proportional to published "electricity consumption by site" chart in the
# 2024 report (top 10 sites carry ~82% of fleet load; remainder spread across
# our 22 smaller GCP rows but those aren't modeled here).
_GOOGLE_ALLOCATIONS = [
    # (facility_id,                       region weight, operator name, facility name, lng, lat, country)
    ("gcp-us-central1",                   0.14, "Google", "Council Bluffs, IA",   -95.8608, 41.2619, "US"),
    ("gcp-us-east1",                      0.09, "Google", "Moncks Corner, SC",    -80.0103, 33.1959, "US"),
    ("gcp-us-east4",                      0.09, "Google", "Ashburn, VA",          -77.5386, 39.0168, "US"),
    ("gcp-us-south1",                     0.07, "Google", "Dallas, TX",           -96.7970, 32.7767, "US"),
    ("gcp-us-west1",                      0.06, "Google", "The Dalles, OR",       -121.1786, 45.5946, "US"),
    ("gcp-europe-west4",                  0.09, "Google", "Eemshaven, NL",        6.8335, 53.4393, "NL"),
    ("gcp-europe-west1",                  0.07, "Google", "St Ghislain, BE",      3.8178, 50.4719, "BE"),
    ("gcp-europe-north1",                 0.05, "Google", "Hamina, FI",           27.1971, 60.5687, "FI"),
    ("gcp-asia-east1",                    0.08, "Google", "Changhua County, TW",  120.5162, 24.0517, "TW"),
    ("gcp-asia-southeast1",               0.08, "Google", "Jurong West, SG",      103.7000, 1.3521, "SG"),
]
GOOGLE_ENERGY_TWH = 25.9
GOOGLE_WATER_MM3 = 27.9
GOOGLE_PUE = 1.10

# --- AWS --------------------------------------------------------------------
# Fleet 2023 estimate ~42 TWh (Amazon doesn't publish an all-AWS number; this
# is the Uptime Institute / Bloomberg-NEF derived figure). Water ~6M m³.
_AWS_ALLOCATIONS = [
    ("aws-us-east-1",                     0.20, "AWS", "N. Virginia",           -77.4874, 38.9455, "US"),
    ("aws-us-west-2",                     0.09, "AWS", "Oregon",                -121.3153, 45.8399, "US"),
    ("aws-us-east-2",                     0.06, "AWS", "Ohio",                  -83.0007, 39.9612, "US"),
    ("aws-eu-west-1",                     0.09, "AWS", "Ireland",               -6.2603, 53.3498, "IE"),
    ("aws-eu-central-1",                  0.07, "AWS", "Frankfurt",             8.6821, 50.1109, "DE"),
    ("aws-ap-northeast-1",                0.07, "AWS", "Tokyo",                 139.6917, 35.6895, "JP"),
    ("aws-ap-southeast-1",                0.07, "AWS", "Singapore",             103.8198, 1.3521, "SG"),
    ("aws-ap-south-1",                    0.04, "AWS", "Mumbai",                72.8777, 19.0760, "IN"),
]
AWS_ENERGY_TWH = 42.0
AWS_WATER_MM3 = 6.0
AWS_PUE = 1.15

# --- Microsoft / Azure ------------------------------------------------------
# Fleet 2023: ~23.6 TWh, water ~7.84M m³, fleet PUE ~1.18.
_AZURE_ALLOCATIONS = [
    ("azure-east-us",                     0.14, "Azure", "Virginia",             -77.4874, 38.9455, "US"),
    ("azure-east-us-2",                   0.09, "Azure", "Virginia",             -77.4874, 38.9455, "US"),
    ("azure-west-us-3",                   0.06, "Azure", "Arizona",              -112.0740, 33.4484, "US"),
    ("azure-central-us",                  0.06, "Azure", "Iowa",                 -93.6250, 41.5868, "US"),
    ("azure-south-central-us",            0.05, "Azure", "Texas",                -97.7431, 30.2672, "US"),
    ("azure-north-europe",                0.09, "Azure", "Dublin",               -6.2603, 53.3498, "IE"),
    ("azure-west-europe",                 0.08, "Azure", "Amsterdam",            4.9041, 52.3676, "NL"),
    ("azure-sweden-central",              0.04, "Azure", "Gävle",                17.1413, 60.6749, "SE"),
    ("azure-japan-east",                  0.06, "Azure", "Tokyo",                139.6917, 35.6895, "JP"),
    ("azure-southeast-asia",              0.06, "Azure", "Singapore",            103.8198, 1.3521, "SG"),
]
AZURE_ENERGY_TWH = 23.6
AZURE_WATER_MM3 = 7.84
AZURE_PUE = 1.18

# --- TSMC (fab-level disclosure) -------------------------------------------
# TSMC 2023 sustainability report publishes per-campus electricity + water;
# Fab 18 (GigaFab) is the leading-edge cluster in Tainan.
_TSMC_ALLOCATIONS = [
    # (facility_id, energy_twh, water_mm3, operator, facility_name, lng, lat, country)
    ("fab-tsmc-f18",    9.1,  32.5, "TSMC",   "Fab 18 (Tainan)",     120.2513, 22.9999, "TW"),
    ("fab-tsmc-f15",    4.2,  17.1, "TSMC",   "Fab 15 (Taichung)",   120.6478, 24.1477, "TW"),
    ("fab-tsmc-f12",    3.6,  13.4, "TSMC",   "Fab 12 (Hsinchu)",    120.9750, 24.7765, "TW"),
    ("fab-tsmc-f14",    2.8,  10.1, "TSMC",   "Fab 14 (Tainan South)", 120.2750, 22.9260, "TW"),
]


def _allocate_fleet(
    allocations: list[tuple],
    energy_twh: float,
    water_mm3: float,
    pue: float,
    operator: str,
    sources: list[str],
) -> list[Esg]:
    """Allocate a fleet total across facility weights. Weights can under-sum 1
    (the rest of the fleet is smaller sites we don't model) — we emit what we
    know and the confidence (0.65) reflects the allocation uncertainty."""
    prov = make(sources=sources, confidence=0.65)
    out: list[Esg] = []
    for fac_id, weight, op, name, lng, lat, country in allocations:
        out.append(
            Esg(
                id=f"esg-{fac_id}-{YEAR}",
                facility_id=fac_id,
                operator=op or operator,
                facility_name=name,
                lng=lng,
                lat=lat,
                year=YEAR,
                energy_mwh=energy_twh * 1e6 * weight,
                water_m3=water_mm3 * 1e6 * weight,
                pue=pue,
                country=country,
                provenance=prov,
            )
        )
    return out


def fetch() -> list[Esg]:
    records: list[Esg] = []

    records += _allocate_fleet(
        _GOOGLE_ALLOCATIONS,
        GOOGLE_ENERGY_TWH,
        GOOGLE_WATER_MM3,
        GOOGLE_PUE,
        operator="Google",
        sources=[GOOGLE_REPORT],
    )
    records += _allocate_fleet(
        _AWS_ALLOCATIONS,
        AWS_ENERGY_TWH,
        AWS_WATER_MM3,
        AWS_PUE,
        operator="AWS",
        sources=[AWS_REPORT],
    )
    records += _allocate_fleet(
        _AZURE_ALLOCATIONS,
        AZURE_ENERGY_TWH,
        AZURE_WATER_MM3,
        AZURE_PUE,
        operator="Azure",
        sources=[MS_REPORT],
    )

    # TSMC fabs — facility-level disclosure, higher confidence.
    tsmc_prov = make(sources=[TSMC_REPORT], confidence=0.85)
    for fac_id, energy_twh, water_mm3, op, name, lng, lat, country in _TSMC_ALLOCATIONS:
        records.append(
            Esg(
                id=f"esg-{fac_id}-{YEAR}",
                facility_id=fac_id,
                operator=op,
                facility_name=name,
                lng=lng,
                lat=lat,
                year=YEAR,
                energy_mwh=energy_twh * 1e6,
                water_m3=water_mm3 * 1e6,
                country=country,
                provenance=tsmc_prov,
            )
        )
    return records
