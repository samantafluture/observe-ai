"""Helpers for building `Provenance` blocks consistently across sources."""
from __future__ import annotations

from datetime import date
from .schema import Provenance


def make(sources: list[str], confidence: float = 1.0, updated: str | None = None) -> Provenance:
    """Build a Provenance block with today's date by default.

    Keep `sources` as canonical URLs or stable identifiers so the UI can show
    a clickable list.
    """
    return Provenance(
        sources=list(sources),
        updated=updated or date.today().isoformat(),
        confidence=float(confidence),
    )
