# AI Globe — Phase 5

> Correlations, not layers. Click any entity and the globe dims the
> unrelated world and lights up every first-order neighbor: upstream fabs,
> downstream customers, the regulator over the head, the dollars on deposit,
> the patents nearby, the jobs in the city, the water and electricity used.

Interactive deck.gl globe. **Phase 5** adds a cross-layer **correlation
engine** that walks the full entity graph when you click something, two new
data layers (**Energy + water / ESG** and **AI job postings**), a
side-by-side **compare mode**, and an iframe-friendly **embed mode** with
`?focus=<id>` deep-linking.

## Stack

| Layer         | Choice                                                      |
| ------------- | ----------------------------------------------------------- |
| Build         | Vite 6 + React 19 + TypeScript 5                            |
| Visualization | `@deck.gl/core` `_GlobeView` 9 (resolution 5)               |
| Time filter   | `@deck.gl/extensions` `DataFilterExtension` (GPU-side)      |
| Animated flows | `@deck.gl/geo-layers` `TripsLayer`                         |
| State         | Zustand 5                                                   |
| URL state     | nuqs 2 (see the param table below)                          |
| Styling       | Tailwind CSS 4 (via `@tailwindcss/vite`)                    |
| Data (default)| Static GeoJSON in `public/data/`                            |
| Data (opt-in) | Parquet in `public/data/parquet/` via DuckDB-WASM           |
| Pipeline      | Python 3.12 (`pipeline/`) — weekly GitHub Actions cron      |
| Basemap       | Natural Earth 110m, public domain                           |

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

## Phase 5 highlights

- **Correlation engine** — selecting any feature triggers a pure traversal
  (`src/utils/correlate.ts`) that walks every first-order edge across the
  loaded data: supply arcs, same-country facilities, the governing
  regulatory zone, investment dollars, export-control listings, trade
  partners, co-authorship ties, patent clusters, job clusters, and ESG
  annotations. The result is published to the store as a `CorrelationSet`.
- **Dim + highlight propagation** — every layer factory accepts the active
  correlation and fades unrelated alphas to ~18%. Related features keep
  full saturation plus a bright line stroke, so the graph reads at a
  glance.
- **Great-circle correlation arcs** — `buildCorrelationLayers` drops an
  `ArcLayer` keyed to relation kind (supply / regulation / investment /
  trade / patents / jobs / ESG) plus a pulsing white anchor ring on the
  selected coordinate, even if its own layer is off.
- **Energy + water ESG overlay** — `public/data/esg.geojson`, curated from
  Google / Microsoft / AWS / Meta sustainability reports and TSMC
  fab-level disclosure. Rendered as concentric disks: water-cyan halo +
  energy-yellow core, sized per site.
- **AI job postings layer** — `public/data/ai-jobs.geojson`, ~30 curated
  metro-level counts for 2023 from Stanford HAI + Lightcast + BLS OEWS.
  GlobeView rules out `HeatmapLayer`, so we approximate heat with two
  stacked `ScatterplotLayer`s at low alpha and sqrt sizing.
- **Related · cross-layer panel** — the detail panel grows a Related
  section grouped by relation kind. Each row is a click-through that
  reselects the neighbor, cascading through URL state and the correlation
  engine to the layers, which lets readers walk the graph one hop at a
  time.
- **Side-by-side compare mode** — toggle `Compare` (or `?cmp=1`) to split
  the viewport into two independent globes. The compare pane reads a full
  mirror set of URL params (`cmp_lng`, `cmp_lat`, `cmp_z`, `cmp_layers`,
  `cmp_sel`, `cmp_t0`, `cmp_t1`, `cmp_play`) so a deep link encodes both
  viewports.
- **Embeddable mini-globes** — `?embed=1` strips the sidebar, scrubber and
  attribution footer so the canvas fits in an iframe. `?focus=<feature_id>`
  recenters the camera on that entity and auto-selects it. Intended for
  per-post embeds in the Astro blog.

## Layers

| Kind            | Layer ID              | Source                               |
| --------------- | --------------------- | ------------------------------------ |
| Compute         | `datacenters-google`  | Google Cloud locations               |
| Compute         | `datacenters-aws`     | `jsonmaur/aws-regions`               |
| Compute         | `datacenters-azure`   | Azure global infrastructure          |
| AI              | `ai-facilities`       | Manually curated from company sites  |
| Semiconductor   | `fabs`                | Wikipedia + CHIPS Act + SIA          |
| Regulation      | `regulatory-zones`    | OECD.AI + Stanford HAI + TechieRay   |
| Regulation      | `export-controls`     | U.S. Consolidated Screening List     |
| Supply          | `supply-arcs`         | Hand-curated fab → customer links    |
| Supply          | `supply-trade`        | UN Comtrade HS 8542 (bilateral)      |
| Money           | `money-flow`          | Stanford HAI AI Index 2025           |
| Research        | `patents`             | PatentsView (USPTO)                  |
| Research        | `coauthorship`        | OpenAlex institution pairs           |
| Environment     | `esg`                 | Google / Microsoft / AWS / Meta / TSMC ESG reports |
| Labor           | `ai-jobs`             | Lightcast + Stanford HAI + BLS OEWS  |

## Shareable URL parameters

| Param        | Type                     | Default       |
| ------------ | ------------------------ | ------------- |
| `lng`        | float                    | `-40`         |
| `lat`        | float                    | `20`          |
| `z`          | float (zoom)             | `0.8`         |
| `layers`     | comma list               | all layer IDs |
| `sel`        | feature id               | none          |
| `source`     | `geojson` or `parquet`   | `geojson`     |
| `t0`         | int (year)               | `2005`        |
| `t1`         | int (year)               | `2026`        |
| `play`       | bool                     | `false`       |
| `cmp`        | bool (Phase 5)           | `false`       |
| `cmp_lng`    | float (Phase 5)          | `-40`         |
| `cmp_lat`    | float (Phase 5)          | `20`          |
| `cmp_z`      | float (Phase 5)          | `0.8`         |
| `cmp_layers` | comma list (Phase 5)     | all layer IDs |
| `cmp_sel`    | feature id (Phase 5)     | none          |
| `cmp_t0`     | int (year) (Phase 5)     | `2005`        |
| `cmp_t1`     | int (year) (Phase 5)     | `2026`        |
| `cmp_play`   | bool (Phase 5)           | `false`       |
| `embed`      | bool (Phase 5)           | `false`       |
| `focus`      | feature id (Phase 5)     | none          |

Examples:

- **Select TSMC Fab 18 and watch the correlation graph** —
  `/?sel=fab-tsmc-f18&lng=121&lat=24&z=3`
- **Compare the 2015 Taiwan fab cluster vs the 2024 one** —
  `/?cmp=1&lng=121&lat=24&z=3&t0=2005&t1=2015&cmp_lng=121&cmp_lat=24&cmp_z=3&cmp_t0=2015&cmp_t1=2024`
- **Blog-embed NVIDIA as a mini-globe** —
  `/?embed=1&focus=ai-nvidia`

## Project structure

```
public/data/
  *.geojson                      Canonical outputs (pipeline-maintained)
  parquet/*.parquet              DuckDB-WASM mirrors
src/
  components/
    Globe.tsx                    accepts variant: 'primary' | 'compare'
    layers/
      basemap.ts facilities.ts regulatory.ts
      supply.ts  money.ts       trade.ts
      patents.ts exportControls.ts coauthorship.ts
      esg.ts     aiJobs.ts      correlation.ts    (Phase 5)
    controls/
      LayerToggles.tsx AutoRotateToggle.tsx TimelineScrubber.tsx
      CompareToggle.tsx                             (Phase 5)
    ui/
      Header.tsx Legend.tsx Tooltip.tsx DetailPanel.tsx AbsencePanel.tsx
  hooks/
    useBasemapData.ts
    useDataSource.ts              ?source= URL flag
    useFacilityData.ts            dispatches by source
    useFacilityDataParquet.ts     DuckDB-WASM path
    useUrlState.ts                per-variant view/layers/selection/time + cmp/embed/focus
  store/globeStore.ts             + correlation slice (Phase 5)
  utils/
    colors.ts constants.ts duckdb.ts format.ts temporal.ts
    correlate.ts                  Phase 5 — entity graph traversal
  types/index.ts
pipeline/
  core/        schema / provenance / geocode / dedupe / validate / export
  sources/     per-source fetchers (incl. Phase 5: esg, ai_jobs)
  tests/       unit tests for schema / dedupe / validate
  run.py       `python -m pipeline.run [--offline] [--only <name>]`
  README.md
.github/workflows/pipeline.yml    weekly refresh cron
```

## Data provenance

Every feature carries:

```json
"provenance": {
  "sources": ["https://sustainability.google/reports/…"],
  "updated": "2026-04-19",
  "confidence": 0.65
}
```

Rendered in the detail panel as a clickable source list with live-updated
dates and a confidence score. Confidence 1.0 = curated/manual; 0.7-0.95 =
live-scraped; <0.7 = best-effort derivation. ESG at 0.65 reflects the fact
that hyperscalers publish fleet totals that we prorate across sites.

## Known constraints (deck.gl GlobeView)

- No camera pitch/bearing — the globe always shows north up.
- No `HeatmapLayer` / `ContourLayer` / `TerrainLayer`. The Phase 5 jobs
  layer simulates heat with stacked `ScatterplotLayer`s at low alpha.
- `lineWidth` and `getRadius` are meters in `LNGLAT`, clamped by
  `*MinPixels` / `*MaxPixels` so dots stay legible at any zoom.
- `DataFilterExtension` uses 32-bit floats — we filter on integer years
  rather than Unix timestamps to dodge precision loss.
- `CorrelationSet` traversal is O(N) per click, which is cheap at the
  current ~1–2K total features and scales through Phase 6 without a graph
  DB. If live connectivity ever becomes prohibitive we can pre-build a
  per-id adjacency index at load time.

## Roadmap

- **Phase 6** — deeper causal overlays: facility-level energy trajectories
  over time (once the ESG layer carries multiple years), patent-to-fab
  IP linkage via assignee matching, and a sankey-style flow cross-section
  mode orthogonal to the globe.
