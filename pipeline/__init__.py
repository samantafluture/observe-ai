"""Phase 3 data pipeline for the AI Globe.

Pipeline stages (each is its own module):

    sources/   — source-specific fetchers. Each returns a list of raw dicts.
    core/      — shared building blocks: geocode, dedupe, provenance, export.
    run.py     — orchestrator: ingest -> normalize -> geocode -> dedupe ->
                 enrich -> validate -> export.

Outputs land in `public/data/` as GeoJSON (the frontend's default) and
`public/data/parquet/` as Parquet (the DuckDB-WASM opt-in path). Every emitted
feature carries a `provenance` object. See `pipeline/README.md` for the
end-to-end contract.
"""

__version__ = "0.3.0"
