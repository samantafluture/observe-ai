import pytest

from pipeline.core.provenance import make
from pipeline.core.schema import (
    CoauthorArc,
    ExportControl,
    Facility,
    MoneyFlow,
    Patent,
)
from pipeline.core.validate import (
    ValidationError,
    validate_coauthorship,
    validate_export_controls,
    validate_facilities,
    validate_money_flow,
    validate_patents,
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


def test_validate_rejects_negative_patent_count() -> None:
    rec = Patent(
        id="p", city="X", country="US", lng=0.0, lat=0.0,
        year=2024, count=-1, provenance=make(sources=["x"]),
    )
    with pytest.raises(ValidationError):
        validate_patents([rec])


def test_validate_rejects_implausible_listed_year() -> None:
    rec = ExportControl(
        id="e", name="X", list_name="Entity List", country="CN",
        lng=0.0, lat=0.0, listed_year=1700, provenance=make(sources=["x"]),
    )
    with pytest.raises(ValidationError):
        validate_export_controls([rec])


def test_validate_rejects_negative_coauthor_weight() -> None:
    rec = CoauthorArc(
        id="c", from_id="a", to_id="b", from_name="A", to_name="B",
        from_lng=0.0, from_lat=0.0, to_lng=1.0, to_lat=1.0,
        year=2024, weight=-1, provenance=make(sources=["x"]),
    )
    with pytest.raises(ValidationError):
        validate_coauthorship([rec])
