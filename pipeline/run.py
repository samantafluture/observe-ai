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
from .core.schema import (
    CoauthorArc,
    Esg,
    ExportControl,
    Facility,
    JobPosting,
    MoneyFlow,
    Patent,
    TradeArc,
)
from .core.validate import (
    validate_coauthorship,
    validate_esg,
    validate_export_controls,
    validate_facilities,
    validate_job_postings,
    validate_money_flow,
    validate_patents,
    validate_trade,
)
from .sources import (
    ai_jobs,
    ai_labs,
    aws,
    azure,
    coauthorship,
    esg,
    export_controls,
    fabs,
    gcp,
    money,
    patents,
    supply_trade,
)
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


def _emit_patents(records: list[Patent], updated: str) -> None:
    validate_patents(records)
    to_geojson(
        records,
        name="patents",
        path=PUBLIC / "patents.geojson",
        source_notes="PatentsView (USPTO grants, AI CPC clusters G06N/G06F18/G06V/G10L)",
        updated=updated,
    )
    to_parquet(records, path=PARQUET / "patents.parquet")


def _emit_export_controls(records: list[ExportControl], updated: str) -> None:
    validate_export_controls(records)
    to_geojson(
        records,
        name="export-controls",
        path=PUBLIC / "export-controls.geojson",
        source_notes="trade.gov Consolidated Screening List (EAR Entity List + OFAC SDN), AI/semi subset",
        updated=updated,
    )
    to_parquet(records, path=PARQUET / "export-controls.parquet")


def _emit_coauthorship(records: list[CoauthorArc], updated: str) -> None:
    validate_coauthorship(records)
    to_geojson(
        records,
        name="coauthorship",
        path=PUBLIC / "coauthorship.geojson",
        source_notes="OpenAlex co-authorship graph (top AI institutions, 2018-2024)",
        updated=updated,
    )
    to_parquet(records, path=PARQUET / "coauthorship.parquet")


def _emit_esg(records: list[Esg], updated: str) -> None:
    validate_esg(records)
    to_geojson(
        records,
        name="esg",
        path=PUBLIC / "esg.geojson",
        source_notes="Corporate sustainability reports: Google / Microsoft / Amazon / Meta / TSMC (2023-2024)",
        updated=updated,
    )
    to_parquet(records, path=PARQUET / "esg.parquet")


def _emit_ai_jobs(records: list[JobPosting], updated: str) -> None:
    validate_job_postings(records)
    to_geojson(
        records,
        name="ai-jobs",
        path=PUBLIC / "ai-jobs.geojson",
        source_notes="Stanford HAI AI Index 2024 + Lightcast AI Workforce reports + BLS OEWS",
        updated=updated,
    )
    to_parquet(records, path=PARQUET / "ai-jobs.parquet")


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

    def run_patents() -> None:
        _emit_patents(patents.fetch(), updated)

    def run_export_controls() -> None:
        _emit_export_controls(export_controls.fetch(), updated)

    def run_coauthorship() -> None:
        _emit_coauthorship(coauthorship.fetch(), updated)

    def run_esg() -> None:
        _emit_esg(esg.fetch(), updated)

    def run_ai_jobs() -> None:
        _emit_ai_jobs(ai_jobs.fetch(), updated)

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
        "patents": run_patents,
        "export_controls": run_export_controls,
        "coauthorship": run_coauthorship,
        "esg": run_esg,
        "ai_jobs": run_ai_jobs,
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
