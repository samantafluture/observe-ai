"""Pipeline orchestrator.

Usage:
    python -m pipeline.run                 # full refresh
    python -m pipeline.run --offline       # skip network; use snapshots only
    python -m pipeline.run --only fabs     # refresh a single logical layer

Stages per layer:  ingest -> normalize -> (geocode) -> dedupe -> provenance
-> validate -> export (GeoJSON + Parquet). Exit code is non-zero on any
validation failure.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Callable

from .core.dedupe import dedupe_facilities
from .core.export import to_geojson, to_parquet
from .core.geocode import Geocoder
from .core.schema import Facility, MoneyFlow, TradeArc
from .core.validate import (
    validate_facilities,
    validate_money_flow,
    validate_trade,
)
from .sources import gcp, aws, azure, fabs, ai_labs, money, supply_trade
from .sources import regulations as regulations_src
from .sources import supply_arcs as supply_arcs_src

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public" / "data"
PARQUET = PUBLIC / "parquet"


def _fill_missing_coords(records: list[Facility], geocoder: Geocoder) -> list[Facility]:
    """Only hits the network for the (rare) records that arrived sans coords."""
    for r in records:
        if r.lng == 0.0 and r.lat == 0.0:
            q = ", ".join(p for p in (r.city, r.country) if p) or r.name
            coords = geocoder.lookup(q)
            if coords:
                r.lng, r.lat = coords
    return records


def _emit_facility_layer(
    name: str,
    records: list[Facility],
    *,
    source_notes: str,
    updated: str,
) -> None:
    validate_facilities(records)
    to_geojson(records, name=name, path=PUBLIC / f"{name}.geojson",
               source_notes=source_notes, updated=updated)
    to_parquet(records, path=PARQUET / f"{name}.parquet")


def _emit_money(records: list[MoneyFlow], updated: str) -> None:
    validate_money_flow(records)
    to_geojson(
        records,
        name="money-flow",
        path=PUBLIC / "money-flow.geojson",
        source_notes="Stanford HAI AI Index 2025 (Chapter 4, private investment by geography) + OECD.AI",
        updated=updated,
    )
    to_parquet(records, path=PARQUET / "money-flow.parquet")


def _emit_trade(records: list[TradeArc], updated: str) -> None:
    validate_trade(records)
    to_geojson(
        records,
        name="supply-trade",
        path=PUBLIC / "supply-trade.geojson",
        source_notes="UN Comtrade HS 8542 (integrated circuits), 2023; OEC.world bilateral breakdown",
        updated=updated,
    )
    to_parquet(records, path=PARQUET / "supply-trade.parquet")


def _emit_passthrough(name: str, text: str) -> None:
    path = PUBLIC / f"{name}.geojson"
    if text:
        path.write_text(text + "\n")


LayerFn = Callable[[], None]


def _build_layer_fns(geocoder: Geocoder, updated: str) -> dict[str, LayerFn]:
    def run_gcp() -> None:
        recs = _fill_missing_coords(gcp.fetch(), geocoder)
        _emit_facility_layer(
            "datacenters-google",
            recs,
            source_notes="Google Cloud regions (datacenters.google + cloud.google.com/about/locations)",
            updated=updated,
        )

    def run_aws() -> None:
        recs = _fill_missing_coords(aws.fetch(), geocoder)
        _emit_facility_layer(
            "datacenters-aws",
            recs,
            source_notes="AWS regions (github.com/jsonmaur/aws-regions)",
            updated=updated,
        )

    def run_azure() -> None:
        recs = _fill_missing_coords(azure.fetch(), geocoder)
        _emit_facility_layer(
            "datacenters-azure",
            recs,
            source_notes="Azure regions (azure.microsoft.com/global-infrastructure)",
            updated=updated,
        )

    def run_fabs() -> None:
        recs = dedupe_facilities(_fill_missing_coords(fabs.fetch(), geocoder))
        _emit_facility_layer(
            "fabs",
            recs,
            source_notes="Wikipedia List of Semiconductor Fabs + CHIPS Act tracker + SIA + Silicon Analysts",
            updated=updated,
        )

    def run_ai_labs() -> None:
        recs = _fill_missing_coords(ai_labs.fetch(), geocoder)
        _emit_facility_layer(
            "ai-facilities",
            recs,
            source_notes="Manually curated from public company websites",
            updated=updated,
        )

    def run_money() -> None:
        _emit_money(money.fetch(), updated)

    def run_supply_trade() -> None:
        _emit_trade(supply_trade.fetch(), updated)

    def run_regulations() -> None:
        _emit_passthrough("regulatory-zones", regulations_src.fetch_geojson_text())

    def run_supply_arcs() -> None:
        _emit_passthrough("supply-arcs", supply_arcs_src.fetch_geojson_text())

    return {
        "gcp": run_gcp,
        "aws": run_aws,
        "azure": run_azure,
        "fabs": run_fabs,
        "ai_labs": run_ai_labs,
        "money": run_money,
        "supply_trade": run_supply_trade,
        "regulations": run_regulations,
        "supply_arcs": run_supply_arcs,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="AI Globe data pipeline")
    parser.add_argument("--offline", action="store_true", help="skip network calls")
    parser.add_argument(
        "--only",
        action="append",
        help="run a single layer by name (repeatable)",
    )
    args = parser.parse_args(argv)

    if args.offline:
        os.environ["PIPELINE_OFFLINE"] = "1"

    updated = _today()
    geocoder = Geocoder()
    fns = _build_layer_fns(geocoder, updated)
    target = args.only or list(fns.keys())

    unknown = [t for t in target if t not in fns]
    if unknown:
        parser.error(f"unknown layer(s): {', '.join(unknown)}")

    manifest = {"updated": updated, "layers": {}}
    for name in target:
        print(f"[pipeline] {name} …")
        fns[name]()
        manifest["layers"][name] = "ok"
    (PUBLIC / "manifest.json").write_text(
        json.dumps(manifest, indent=2, sort_keys=True) + "\n"
    )
    print(f"[pipeline] wrote manifest: {PUBLIC / 'manifest.json'}")
    return 0


def _today() -> str:
    from datetime import date

    return date.today().isoformat()


if __name__ == "__main__":
    sys.exit(main())
