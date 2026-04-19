"""Entity-level deduplication across heterogeneous sources.

Many sources describe the same facility (e.g. "TSMC Fab 18" in Wikipedia and
the CHIPS Act tracker). We collapse them by fuzzy-matching a composite key.
The winner is the record with the higher provenance confidence; ties broken
by the record with the most non-null fields.
"""
from __future__ import annotations

import re
from dataclasses import replace
from thefuzz import fuzz

from .schema import Facility


def _richness(f: Facility) -> int:
    return sum(
        1
        for v in (f.country, f.city, f.region, f.role, f.opened, f.node_nm, f.wafer_size_mm)
        if v is not None
    )


_PUNCT_RE = re.compile(r"[().,\-_/\\]+")
_LETTER_DIGIT_RE = re.compile(r"([A-Za-z])(\d)")
_DIGIT_LETTER_RE = re.compile(r"(\d)([A-Za-z])")


def _normalize(s: str) -> str:
    # Casefold, split punctuation, and force a word break between letters and
    # digits so "Fab18" and "Fab 18" compare as the same token bag.
    out = _PUNCT_RE.sub(" ", s.lower())
    out = _LETTER_DIGIT_RE.sub(r"\1 \2", out)
    out = _DIGIT_LETTER_RE.sub(r"\1 \2", out)
    return " ".join(out.split())


def _digits(s: str) -> frozenset[str]:
    return frozenset(re.findall(r"\d+", s))


def _key(f: Facility) -> str:
    return f"{f.operator}|{_normalize(f.name)}|{_normalize(f.city or '')}"


def _digit_tokens(f: Facility) -> frozenset[str]:
    return _digits(f.name)


def dedupe_facilities(records: list[Facility], threshold: int = 88) -> list[Facility]:
    """Collapse near-duplicate facilities.

    Matching strategy: exact operator + fuzzy name+city `token_set_ratio`
    after casefold/punctuation normalization. Fabs named with distinct
    integers ("Fab 12" vs "Fab 14") are treated as different even when the
    rest of the name matches — we compare the set of numeric tokens.
    """
    kept: list[Facility] = []
    for rec in records:
        matched_idx = -1
        rec_digits = _digit_tokens(rec)
        for i, existing in enumerate(kept):
            if existing.operator != rec.operator:
                continue
            # If both names contain numeric tokens and they disagree, the
            # records refer to different physical sites (e.g. Fab 12 vs 14).
            ex_digits = _digit_tokens(existing)
            if rec_digits and ex_digits and rec_digits != ex_digits:
                continue
            score = fuzz.token_set_ratio(_key(existing), _key(rec))
            if score >= threshold:
                matched_idx = i
                break
        if matched_idx == -1:
            kept.append(rec)
            continue
        current = kept[matched_idx]
        winner = _merge(current, rec)
        kept[matched_idx] = winner
    return kept


def _merge(a: Facility, b: Facility) -> Facility:
    # Higher confidence wins; tie → richer record. Then backfill any null fields
    # from the loser so we don't lose detail the winner lacked.
    primary, secondary = (
        (a, b) if (a.provenance.confidence, _richness(a)) >= (b.provenance.confidence, _richness(b)) else (b, a)
    )
    merged_provenance = replace(
        primary.provenance,
        sources=_merge_sources(primary.provenance.sources, secondary.provenance.sources),
    )
    patch: dict = {"provenance": merged_provenance}
    for attr in ("country", "city", "region", "role", "opened", "node_nm", "wafer_size_mm"):
        if getattr(primary, attr) is None and getattr(secondary, attr) is not None:
            patch[attr] = getattr(secondary, attr)
    return replace(primary, **patch)


def _merge_sources(a: list[str], b: list[str]) -> list[str]:
    seen: dict[str, None] = {}
    for s in (*a, *b):
        seen.setdefault(s, None)
    return list(seen.keys())
