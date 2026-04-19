from pipeline.core.dedupe import dedupe_facilities
from pipeline.core.provenance import make
from pipeline.core.schema import Facility


def _fab(id_: str, name: str, operator: str, city: str, confidence: float, **kw) -> Facility:
    return Facility(
        id=id_,
        name=name,
        operator=operator,
        type="fab",
        lng=0.0,
        lat=0.0,
        city=city,
        provenance=make(sources=["x"], confidence=confidence),
        **kw,
    )


def test_dedupe_merges_same_fab_across_sources() -> None:
    a = _fab("fab-tsmc-f18", "TSMC Fab 18", "TSMC", "Tainan", 0.9, node_nm=3)
    b = _fab("fab-tsmc-fab18", "TSMC FAB18", "TSMC", "Tainan", 0.7, wafer_size_mm=300)
    [merged] = dedupe_facilities([a, b])
    assert merged.id == "fab-tsmc-f18"
    assert merged.node_nm == 3
    assert merged.wafer_size_mm == 300  # back-filled from loser


def test_dedupe_keeps_distinct_operators() -> None:
    a = _fab("fab-a", "Campus 1", "TSMC", "Tainan", 0.9)
    b = _fab("fab-b", "Campus 1", "Samsung", "Tainan", 0.9)
    out = dedupe_facilities([a, b])
    assert {r.operator for r in out} == {"TSMC", "Samsung"}
