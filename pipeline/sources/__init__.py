"""Source-specific fetchers.

Each module exposes ``fetch()`` returning a list of `Facility`/`MoneyFlow`/
`TradeArc` records. Fetchers must be safe to call in offline mode: they fall
back to a bundled snapshot under `pipeline/sources/snapshots/` when
``PIPELINE_OFFLINE=1`` or when the network call raises.
"""
