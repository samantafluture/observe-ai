from pipeline.core.provenance import make
from pipeline.core.schema import Facility, MoneyFlow, TradeArc


def test_facility_to_feature_carries_provenance() -> None:
    f = Facility(
        id="f1", name="F1", operator="op", type="fab",
        lng=1.0, lat=2.0, country="US", city="X",
        node_nm=5, wafer_size_mm=300,
        provenance=make(sources=["a", "b"], confidence=0.5),
    )
    feat = f.to_feature()
    assert feat["geometry"]["coordinates"] == [1.0, 2.0]
    assert feat["properties"]["provenance"]["sources"] == ["a", "b"]
    assert feat["properties"]["provenance"]["confidence"] == 0.5
    assert feat["properties"]["node_nm"] == 5


def test_money_flow_feature() -> None:
    m = MoneyFlow(
        id="m1", country_iso="US", country_name="US", year=2024,
        amount_usd=1e9, lng=0.0, lat=0.0,
        provenance=make(sources=["x"]),
    )
    feat = m.to_feature()
    assert feat["properties"]["amount_usd"] == 1e9
    assert "provenance" in feat["properties"]


def test_trade_arc_feature() -> None:
    t = TradeArc(
        id="t1", from_iso="TW", to_iso="CN",
        from_name="Taipei", to_name="Beijing",
        from_lng=1.0, from_lat=2.0, to_lng=3.0, to_lat=4.0,
        year=2023, value_usd=1e10,
        provenance=make(sources=["x"]),
    )
    feat = t.to_feature()
    assert feat["geometry"]["type"] == "LineString"
    assert feat["properties"]["hs_code"] == "8542"
