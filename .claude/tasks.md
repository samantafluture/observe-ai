# Project: observe-ai

> Last agent update: 2026-04-19

## Active Sprint

### P0 -- Must do now

### P1 -- Should do this week

### P2 -- Nice to have

## Blocked

## Completed (recent)

- [x] Deploy to VPS at observe-ai.samantafluture.com `[M]` #devops 2026-04-19

## Notes
- Static Vite SPA (deck.gl + DuckDB-wasm). No backend.
- Build: `pnpm build` -> `dist/`. Local dev: `pnpm dev` (port 5173).
- Deploy: push to `main` -> CI builds -> SSH deploy -> nginx serves from `observe-ai_web` Docker volume.
- Data refresh: `pipeline.yml` runs weekly, opens PR with regenerated `public/data/*`.
- Not in vps-mcp-server allow-list yet (TBD) — fall back to SSH for remote ops.
