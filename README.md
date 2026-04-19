# AI Globe — Phase 3

> The physical map of AI — now with an automated data pipeline and the first
> economic layers on top of the infrastructure.

Interactive deck.gl globe. **Phase 3** adds an automated Python pipeline, a
weekly refresh cron, per-feature provenance, two new layers (**private AI
investment** and **HS 8542 integrated-circuit trade flows**), and an opt-in
DuckDB-WASM Parquet path alongside the default static GeoJSON.

## Stack

| Layer        | Choice                                                      |
| ------------ | ----------------------------------------------------------- |
| Build        | Vite 6 + React 19 + TypeScript 5                            |
| Visualization| `@deck.gl/core` `_GlobeView` 9 (resolution 5)               |
| State        | Zustand 5                                                   |
| URL state    | nuqs 2 (`lng`, `lat`, `z`, `layers`, `sel`, `source`)       |
| Styling      | Tailwind CSS 4 (via `@tailwindcss/vite`)                    |
| Data (default)| Static GeoJSON in `public/data/`                           |
| Data (opt-in) | Parquet in `public/data/parquet/` via DuckDB-WASM          |
| Pipeline     | Python 3.12 (`pipeline/`) — weekly GitHub Actions cron      |
| Basemap      | Natural Earth 110m, public domain                           |

## Run

```sh
pnpm install
pnpm dev          # http://localhost:5173
pnpm build
pnpm typecheck

# Pipeline
pip install -r pipeline/requirements.txt
python -m pipeline.run --offline   # regenerate data from snapshots
python -m pytest pipeline/tests -q
```

## Phase 3 highlights

- **Python pipeline** (`pipeline/`) with source-specific fetchers (Google
  Cloud, AWS, Azure, Wikipedia fabs, CHIPS Act, OECD.AI, Stanford HAI, UN
  Comtrade). Cached Nominatim geocoder, fuzzy entity dedup
  (`thefuzz.token_set_ratio` + numeric-token preservation), per-feature
  provenance, validation invariants, dual GeoJSON + Parquet export.
- **Weekly cron** at `.github/workflows/pipeline.yml` — runs tests, runs
  pipeline, opens a PR with the diff on `public/data/**`. API keys
  (`CRUNCHBASE_API_KEY`, `COMTRADE_API_KEY`) read from repo secrets.
- **Private AI investment layer** — country-level 2024 figures from Stanford
  HAI AI Index 2025, rendered as sized glowing bubbles on capitals.
  sqrt-scaled radius so Israel and the US coexist on the same screen.
- **IC trade layer** — bilateral HS 8542 flows from UN Comtrade / OEC.world.
  Rendered as log-scaled cool-blue arcs behind the curated supply arcs.
- **Provenance** — every emitted feature carries `{ sources, updated,
  confidence }`. The detail panel shows a clickable source list.
- **DuckDB-WASM opt-in** — append `?source=parquet` to query Parquet mirrors
  in the browser. Lazy-loaded (~4 MB) so default loads aren't penalized.

## Shareable URL parameters

| Param    | Type           | Default                 |
| -------- | -------------- | ----------------------- |
| `lng`    | float          | `-40`                   |
| `lat`    | float          | `20`                    |
| `z`      | float (zoom)   | `0.8`                   |
| `layers` | comma list     | all layer IDs           |
| `sel`    | feature id     | none                    |
| `source` | `geojson` or `parquet` | `geojson`       |

Example: `/?lng=121&lat=24.8&z=4&layers=fabs,supply-trade&sel=trade-TW-US-2023`

## Project structure

```
public/data/
  *.geojson                      Canonical outputs (pipeline-maintained)
  parquet/*.parquet              DuckDB-WASM mirrors
src/
  components/
    Globe.tsx
    layers/
      basemap.ts facilities.ts regulatory.ts
      supply.ts  money.ts       trade.ts
    controls/ ui/
  hooks/
    useBasemapData.ts
    useDataSource.ts              ?source= URL flag
    useFacilityData.ts            dispatches by source
    useFacilityDataParquet.ts     DuckDB-WASM path
    useUrlState.ts
  store/globeStore.ts
  utils/
    colors.ts constants.ts duckdb.ts format.ts
  types/index.ts
pipeline/
  core/        schema / provenance / geocode / dedupe / validate / export
  sources/     per-source fetchers + HTTP helper
  tests/       unit tests for schema / dedupe / validate
  run.py       orchestrator; `python -m pipeline.run [--offline] [--only <name>]`
  README.md
.github/workflows/pipeline.yml    weekly refresh cron
```

## Data provenance

Every feature carries:

```json
"provenance": {
  "sources": ["https://cloud.google.com/about/locations"],
  "updated": "2026-04-19",
  "confidence": 0.95
}
```

Rendered in the detail panel as a source list with live-updated dates and a
confidence score. Confidence 1.0 = curated/manual; 0.7-0.95 = live-scraped;
<0.7 = best-effort derivation.

## Known constraints (deck.gl GlobeView)

- No camera pitch/bearing — the globe always shows north up.
- No `HeatmapLayer` / `ContourLayer` / `TerrainLayer`.
- `lineWidth` and `getRadius` are meters in `LNGLAT`, clamped by
  `*MinPixels` / `*MaxPixels` so dots stay legible at any zoom.

## Roadmap

- **Phase 4** — `DataFilterExtension` timeline scrubber, `TripsLayer` flows,
  patent/export-control/co-authorship layers, absence-detection signals.
- **Phase 5** — cross-layer correlation engine, energy/water ESG overlays,
  comparative globe views, embeddable mini-globes.
