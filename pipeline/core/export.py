"""Serialize pipeline records to GeoJSON and Parquet.

GeoJSON is written to `public/data/<name>.geojson` — the frontend's default
loader path. Parquet is written to `public/data/parquet/<name>.parquet` for
the DuckDB-WASM opt-in path.
"""
from __future__ import annotations

import json
from dataclasses import asdict
from pathlib import Path
from typing import Iterable, Sequence, Protocol

import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq


class HasFeature(Protocol):
    def to_feature(self) -> dict: ...


def to_geojson(
    records: Sequence[HasFeature],
    *,
    name: str,
    path: Path,
    source_notes: str,
    updated: str,
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fc = {
        "type": "FeatureCollection",
        "name": name,
        "metadata": {"source": source_notes, "updated": updated},
        "features": [r.to_feature() for r in records],
    }
    # Compact but line-per-feature for diff friendliness.
    body = _format_geojson(fc)
    path.write_text(body)


def _format_geojson(fc: dict) -> str:
    lines = [
        "{",
        f'  "type": "FeatureCollection",',
        f'  "name": {json.dumps(fc["name"])},',
        f'  "metadata": {json.dumps(fc["metadata"], ensure_ascii=False)},',
        '  "features": [',
    ]
    feats = fc["features"]
    for i, feat in enumerate(feats):
        suffix = "," if i < len(feats) - 1 else ""
        lines.append("    " + json.dumps(feat, ensure_ascii=False) + suffix)
    lines.append("  ]")
    lines.append("}")
    return "\n".join(lines) + "\n"


def to_parquet(records: Iterable, *, path: Path) -> None:
    """Flatten dataclass records to a Parquet file.

    Expects `records` to be dataclasses whose fields are all JSON-serializable.
    `provenance` is written as a nested struct so DuckDB can dot-navigate.
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    rows = []
    for r in records:
        d = asdict(r)
        rows.append(d)
    if not rows:
        # Touch an empty file so downstream readers don't see a missing table.
        pq.write_table(pa.table({}), path)
        return
    df = pd.DataFrame(rows)
    table = pa.Table.from_pandas(df, preserve_index=False)
    pq.write_table(table, path, compression="zstd")
