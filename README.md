# AI Globe — Phase 1

> The physical map of AI: where the compute actually lives.

Interactive deck.gl globe rendering ~130 cloud data centers (Google, AWS, Azure)
plus ~25 principal AI lab locations on a phosphor-green CRT basemap.

This is **Phase 1** of a longer build laid out in
`docs/specs/gods-eye-view.md` (in the blog repo). The five-layer architecture
(input → processing → storage → visualization → output) starts here with a
static-GeoJSON storage layer and a single visualization. Later phases add
fabs, regulatory zones, talent flows, money flows, supply chains, and
temporal animation.

## Stack

| Layer        | Choice                                                      |
| ------------ | ----------------------------------------------------------- |
| Build        | Vite 6 + React 19 + TypeScript 5                            |
| Visualization| `@deck.gl/core` `_GlobeView` 9.3 (resolution 5)             |
| State        | Zustand 5                                                   |
| URL state    | nuqs 2 (`lng`, `lat`, `z`, `layers`, `sel`)                 |
| Styling      | Tailwind CSS 4 (via `@tailwindcss/vite`)                    |
| Data         | Static GeoJSON in `public/data/`                            |
| Basemap      | Natural Earth 110m (countries + land), public domain        |

## Run

```sh
pnpm install
pnpm dev          # http://localhost:5173
pnpm build        # tsc -b && vite build  →  ./dist
pnpm typecheck
```

## What's in Phase 1

- **Globe basemap** — Natural Earth 110m polygons drawn dark phosphor-green over
  black. Country outlines in brighter phosphor. Spherical projection via
  `_GlobeView`.
- **Four facility layers** — Google Cloud regions (40), AWS regions (29), Azure
  regions (37), AI labs (25). Each is its own `ScatterplotLayer` pair (halo +
  core) for the glow effect described in the spec.
- **Pulse + auto-rotate** — single `requestAnimationFrame` loop drives both a
  `radiusScale` oscillation (one GPU uniform) and the auto-rotate longitude
  delta. Auto-rotation pauses on user drag.
- **Click → side panel** — pickable core layer; selected feature shows a
  detail panel with operator, region, country, coordinates.
- **Hover → tooltip** — minimal floating tooltip follows the cursor.
- **Layer toggles** — sidebar checkboxes per layer, with feature counts.
- **URL state** — every meaningful piece of state is round-trippable via the
  query string (great for embeds and shareable links).
- **Mobile** — sidebar is left-anchored on `md+`, detail panel becomes a
  bottom sheet on small screens.

### Shareable URL parameters

| Param   | Type           | Default                 |
| ------- | -------------- | ----------------------- |
| `lng`   | float          | `-40`                   |
| `lat`   | float          | `20`                    |
| `z`     | float (zoom)   | `0.8`                   |
| `layers`| comma list     | all four layer IDs      |
| `sel`   | facility id    | none                    |

Example: `/?lng=121&lat=24.8&z=4&layers=datacenters-google,ai-facilities&sel=ai-deepmind-london`

## Project structure

```
public/data/
  ne_110m_countries.geojson      Natural Earth basemap (committed)
  ne_110m_land.geojson           Natural Earth landmass (committed)
  datacenters-google.geojson     Phase 1 dataset
  datacenters-aws.geojson        Phase 1 dataset
  datacenters-azure.geojson      Phase 1 dataset
  ai-facilities.geojson          Phase 1 dataset
src/
  components/
    Globe.tsx                    DeckGL + GlobeView + rAF loop
    layers/basemap.ts            Land + countries factory
    layers/facilities.ts         Halo + core + selection-ring factory
    controls/LayerToggles.tsx
    controls/AutoRotateToggle.tsx
    ui/Header.tsx
    ui/Tooltip.tsx
    ui/DetailPanel.tsx
    ui/Legend.tsx
  hooks/
    useBasemapData.ts            Loads Natural Earth GeoJSON
    useFacilityData.ts           Loads four facility layers in parallel
    useUrlState.ts               nuqs-backed view + layers + selection
  store/globeStore.ts            Zustand: selected, hovered, autoRotate
  utils/colors.ts                Phosphor palette + per-operator accents
  utils/constants.ts             Layer registry, view defaults
  types/index.ts                 Facility shapes
pipeline/                        (Phase 3) Python ingest/normalize/geocode
scripts/                         (Phase 4+) screenshot, deploy helpers
```

## Data provenance

All Phase 1 coordinates are public-source metro centroids for cloud regions
plus manually curated company HQ locations. Each `*.geojson` carries a
top-level `metadata.source` field documenting where the facts came from. No
API keys required. Phase 3 replaces this manual curation with a Python
pipeline driven by GitHub Actions cron.

## Known constraints (deck.gl GlobeView)

- No camera pitch/bearing — the globe always shows north up.
- No `HeatmapLayer` / `ContourLayer` / `TerrainLayer` — they don't run on
  the sphere projection. Heatmap-style overlays are deferred (see spec).
- `lineWidth` and `getRadius` use meters in `LNGLAT` coordinate system,
  with `*MinPixels` / `*MaxPixels` clamps so dots stay legible at any zoom.

## Roadmap

This repo will grow into the full spec. Next:

- **Phase 2** — Add fabs (~80, Wikipedia + CHIPS Act), regulatory zone
  polygons, prototype `ArcLayer` (great-circle) for fab → DC supply links.
- **Phase 3** — Python pipeline + Cloudflare R2 + DuckDB-WASM in browser.
- **Phase 4** — `DataFilterExtension` timeline scrubber + `TripsLayer`
  animated flows.
- **Phase 5** — Cross-layer correlation engine.
