import pytest

from pipeline.core.provenance import make
from pipeline.core.schema import Facility, MoneyFlow
from pipeline.core.validate import (
    ValidationError,
    validate_facilities,
    validate_money_flow,
)


def _ok_fac() -> Facility:
    return Facility(
        id="f1",
        name="F1",
        operator="op",
        type="datacenter",
        lng=10.0,
        lat=10.0,
        provenance=make(sources=["x"]),
    )


def test_validate_rejects_bad_coords() -> None:
    bad = _ok_fac()
    bad.lng = 999.0
    with pytest.raises(ValidationError):
        validate_facilities([bad])


def test_validate_rejects_duplicate_ids() -> None:
    a = _ok_fac()
    b = _ok_fac()
    with pytest.raises(ValidationError):
        validate_facilities([a, b])


def test_validate_rejects_negative_money() -> None:
    rec = MoneyFlow(
        id="m", country_iso="US", country_name="US", year=2024,
        amount_usd=-1.0, lng=0.0, lat=0.0, provenance=make(sources=["x"]),
    )
    with pytest.raises(ValidationError):
        validate_money_flow([rec])
