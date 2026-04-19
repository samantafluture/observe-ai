"""Lightweight invariants checked before emitting a dataset.

These are cheap but catch the most common mistakes: coords outside the valid
range, duplicate feature IDs, missing required fields. Raise `ValidationError`
so the CI workflow surfaces failures loudly.
"""
from __future__ import annotations

from collections.abc import Iterable
from .schema import Facility, MoneyFlow, TradeArc


class ValidationError(RuntimeError):
    pass


def _check_coords(lng: float, lat: float, rec_id: str) -> None:
    if not (-180 <= lng <= 180) or not (-90 <= lat <= 90):
        raise ValidationError(f"{rec_id}: coordinates out of range: ({lng}, {lat})")


def _check_unique_ids(ids: Iterable[str]) -> None:
    seen: set[str] = set()
    for i in ids:
        if i in seen:
            raise ValidationError(f"duplicate id: {i}")
        seen.add(i)


def validate_facilities(records: list[Facility]) -> None:
    for r in records:
        if not r.id or not r.name or not r.operator:
            raise ValidationError(f"facility missing required fields: {r}")
        _check_coords(r.lng, r.lat, r.id)
    _check_unique_ids(r.id for r in records)


def validate_money_flow(records: list[MoneyFlow]) -> None:
    for r in records:
        if r.amount_usd < 0:
            raise ValidationError(f"{r.id}: negative amount_usd")
        _check_coords(r.lng, r.lat, r.id)
    _check_unique_ids(r.id for r in records)


def validate_trade(records: list[TradeArc]) -> None:
    for r in records:
        if r.value_usd < 0:
            raise ValidationError(f"{r.id}: negative value_usd")
        _check_coords(r.from_lng, r.from_lat, r.id)
        _check_coords(r.to_lng, r.to_lat, r.id)
    _check_unique_ids(r.id for r in records)
