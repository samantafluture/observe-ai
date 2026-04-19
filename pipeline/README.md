# Pipeline — Phase 3

Automated data pipeline that rewrites `public/data/` from upstream sources and
publishes a Parquet mirror in `public/data/parquet/`. Runs locally and under
the weekly `.github/workflows/pipeline.yml` cron.

## Stages

```
 sources/*   →   normalize   →   geocode   →   dedupe   →   provenance   →   validate   →   export
```

Each source fetcher returns a list of dataclass records (`Facility`,
`MoneyFlow`, `TradeArc`). `run.py` wires them through the shared core
modules and writes both GeoJSON and Parquet outputs.

## Run

```sh
pip install -r pipeline/requirements.txt
python -m pipeline.run                      # full refresh
python -m pipeline.run --offline            # no network; snapshots only
python -m pipeline.run --only fabs --only money   # subset
```

`PIPELINE_OFFLINE=1` is the env-var form of `--offline`. The cron workflow
runs without it; local runs during development should prefer it to avoid
hammering Nominatim / Comtrade.

## Provenance

Every emitted feature carries a `provenance` property:

```json
{
  "sources": ["https://cloud.google.com/about/locations"],
  "updated": "2026-04-19",
  "confidence": 0.95
}
```

The frontend renders a small source-list section in the facility detail
panel. Confidence 1.0 = trusted/manual; 0.7-0.95 = live scraped; <0.7 = best-
effort derivation.

## Sources

| Layer              | Upstream                                      | Auth           |
|--------------------|-----------------------------------------------|----------------|
| datacenters-google | datacenters.google / cloud.google.com         | none           |
| datacenters-aws    | github.com/jsonmaur/aws-regions               | none           |
| datacenters-azure  | azure.microsoft.com (scrape, snapshot-only)   | none           |
| fabs               | Wikipedia + CHIPS Act + SIA + Silicon Analysts| none           |
| ai-facilities      | Public company websites (+ Crunchbase opt.)   | `CRUNCHBASE_API_KEY` (optional) |
| regulatory-zones   | OECD.AI + Stanford HAI + TechieRay            | none           |
| supply-arcs        | Hand-curated public reporting                 | none           |
| money-flow         | Stanford HAI AI Index 2025                    | none           |
| supply-trade       | UN Comtrade HS 8542 + OEC.world               | `COMTRADE_API_KEY` (optional) |

## Tests

```sh
python -m pytest pipeline/tests -q
```

Tests cover schema serialization, dedup merging, and validation invariants.
Fetchers aren't network-mocked — they degrade to snapshots on failure and
produce a stable output regardless.
