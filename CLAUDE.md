# observe-ai

Interactive globe visualization of AI infrastructure and related systems. Static Vite SPA with a data pipeline and VPS deployment flow.

**Live:** `observe-ai.samantafluture.com`

## Stack

Vite, React 19, TypeScript, deck.gl, DuckDB-WASM, Zustand, Tailwind v4, pnpm.

## Structure

```text
src/
  components/
  layers/
  store/
  utils/
public/data/             # Curated static datasets
pipeline/                # Data generation and tests
scripts/                 # Deploy or support scripts
nginx/                   # VPS serving config
```

## Commands

```bash
pnpm dev
pnpm build
pnpm typecheck
```

Pipeline:

```bash
python -m pipeline.run --offline
python -m pytest pipeline/tests -q
```

## Key Patterns

- Static SPA only, no backend
- Visualization clarity matters more than feature count
- Large dataset changes should stay explainable and inspectable
- Deep links and embed behavior are part of the product surface, not an afterthought

## Deploy

Push to `main` triggers CI build and VPS deploy. Nginx serves the built `dist/` output from the `observe-ai_web` Docker volume.

## Rules

- Prefer deterministic data transforms over opaque one-off scripts
- Do not add a backend unless there is a clear hard requirement
- Keep interactions legible on both desktop and embedded contexts
