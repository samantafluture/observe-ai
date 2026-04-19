# AI Globe — Phase 4

> The temporal dimension. Scrub through 2005-2026 and watch compute, capital,
> regulation, patents, export controls and research collaboration flicker
> in and out as they actually happened.

Interactive deck.gl globe. **Phase 4** adds a `DataFilterExtension`-driven
timeline scrubber, a `TripsLayer` overlay that animates chip shipments along
supply arcs, three new layers (**AI patents**, **U.S. export controls**,
**OpenAlex co-authorship**), and an absence-detection panel that surfaces
the structural gaps the data implies (regulating an industry you don't
host; compute without capital; severed knowledge ties).

## Stack

| Layer        | Choice                                                      |
| ------------ | ----------------------------------------------------------- |
| Build        | Vite 6 + React 19 + TypeScript 5                            |
| Visualization| `@deck.gl/core` `_GlobeView` 9 (resolution 5)               |
| Time filter  | `@deck.gl/extensions` `DataFilterExtension` (GPU-side)      |
| Animated flows | `@deck.gl/geo-layers` `TripsLayer`                        |
| State        | Zustand 5                                                   |
| URL state    | nuqs 2 (`lng`, `lat`, `z`, `layers`, `sel`, `source`, `t0`, `t1`, `play`) |
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

## Phase 4 highlights

- **Timeline scrubber** — bottom-of-viewport dual-thumb range over 2005-2026
  with Play/Pause and Reset. Year window is URL-synced (`t0`, `t1`, `play`)
  so a deep link reproduces whichever moment the reader was looking at.
- **GPU-side time filtering** — every temporal layer (datacenters, fabs,
  AI labs, money flow, IC trade, patents, export controls, co-authorship,
  curated supply arcs) hangs `DataFilterExtension` on a single year value.
  Per-vertex filtering happens on the GPU; CPU work is zero per frame.
- **Animated supply trips** — when the timeline plays, a `TripsLayer`
  overlays the curated supply arcs and animates a comet-tail head along
  each fab → customer edge so chip shipments visibly move.
- **AI patents (USPTO)** — city-level annual counts of granted patents in
  the AI CPC cluster (G06N, G06F18, G06V, G10L), sourced via PatentsView
  with a curated 2010-2024 fallback. Sized lavender bubbles with sqrt
  scaling.
- **Export controls (CSL)** — entities on the U.S. Consolidated Screening
  List (Entity List + SDN), narrowed to the AI/semiconductor wave of
  post-2018 designations. Pulsing red rings keyed to listing year.
- **Co-authorship (OpenAlex)** — annual co-authored AI paper counts between
  top global institutions (US/CN/UK/CA/JP/KR/IN/SG/CH). Cool-teal arcs,
  log-scaled width.
- **Backfilled "opened" years** — AWS regions (33 entries), Azure regions
  (45 entries), AI labs (30 entries) get founding/launch years so the time
  scrubber has signal. Regulatory polygons gain `effective_year`.
- **Absence-detection panel** — surfaces structural correlations *by their
  absence*: strict-regime countries with no fabs, compute hosts with no
  recorded private investment, severed US↔CN co-authorship under sanctions.
  Recomputes live with the timeline window.

## Shareable URL parameters

| Param    | Type           | Default                 |
| -------- | -------------- | ----------------------- |
| `lng`    | float          | `-40`                   |
| `lat`    | float          | `20`                    |
| `z`      | float (zoom)   | `0.8`                   |
| `layers` | comma list     | all layer IDs           |
| `sel`    | feature id     | none                    |
| `source` | `geojson` or `parquet` | `geojson`       |
| `t0`     | int (year)     | `2005`                  |
| `t1`     | int (year)     | `2026`                  |
| `play`   | bool           | `false`                 |

Example — Taiwan in 2018, scrubber paused on the year, fabs + supply arcs +
export controls only:
`/?lng=121&lat=24.8&z=4&layers=fabs,supply-arcs,export-controls&t0=2005&t1=2018`

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
      patents.ts exportControls.ts coauthorship.ts
    controls/
      LayerToggles.tsx AutoRotateToggle.tsx TimelineScrubber.tsx
    ui/
      Header.tsx Legend.tsx Tooltip.tsx DetailPanel.tsx AbsencePanel.tsx
  hooks/
    useBasemapData.ts
    useDataSource.ts              ?source= URL flag
    useFacilityData.ts            dispatches by source
    useFacilityDataParquet.ts     DuckDB-WASM path
    useUrlState.ts                view + layers + selection + timeline
  store/globeStore.ts
  utils/
    colors.ts constants.ts duckdb.ts format.ts temporal.ts
  types/index.ts
pipeline/
  core/        schema / provenance / geocode / dedupe / validate / export
  sources/     per-source fetchers + HTTP helper (incl. patents,
               export_controls, coauthorship)
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
- `DataFilterExtension` uses 32-bit floats — we filter on integer years
  rather than Unix timestamps to dodge precision loss.

## Roadmap

- **Phase 5** — cross-layer correlation engine (click a fab, highlight
  every entity related across layers), energy/water ESG overlays from
  hyperscaler reports, comparative side-by-side globe views, embeddable
  mini-globes for blog posts.
