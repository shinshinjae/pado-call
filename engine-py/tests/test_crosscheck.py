"""Cross-check the Python reference engine against results exported from the TypeScript engine."""
import json
from pathlib import Path

import numpy as np
import pytest

from padocall.choice import choice_probs, hhi
from padocall.crowd import DAY_START, crowd_forecast, enkf_update, run_model
from padocall.drt import cycle_min, kappa, pickup_min, required_fleet_by_hour, simulate_day, wait_summary
from padocall.scenario import load_scenario

REF = json.loads((Path(__file__).parent / "fixtures" / "reference.json").read_text(encoding="utf-8"))
SC = load_scenario()
DAYS = ("weekday", "weekend", "cruise", "drone")


def test_geometry_and_cycle():
    assert np.allclose([kappa(I) for I in range(1, 7)], REF["basic"]["kappa"], rtol=1e-14)
    for z in ("A", "B"):
        p = SC["zones"][z]["params"]
        assert np.allclose([pickup_min(p, I) for I in range(1, 5)], REF["basic"]["pickup"][z], rtol=1e-14)
        assert np.allclose([cycle_min(p, I) for I in range(1, 5)], REF["basic"]["cycle"][z], rtol=1e-14)


@pytest.mark.parametrize("zone", ["A", "B"])
@pytest.mark.parametrize("day", DAYS)
def test_forward_equation_matches_typescript(zone, day):
    """expm (Python) vs uniformization (TypeScript): hourly mean wait, 30-min tail, 90% wait."""
    z = SC["zones"][zone]
    r = simulate_day(z["params"], z["open"], z["close"], SC["lam"][zone][day], SC["fleet"][zone][day], SC["standard"])
    ref = REF["days"][f"{zone}:{day}"]
    assert len(r.hours) == len(ref["hours"])
    for h, e in zip(r.hours, ref["hours"]):
        assert h.hour == e["hour"]
        assert h.fleet == e["fleet"]
        assert h.mean == pytest.approx(e["mean"], abs=1e-8)
        assert h.p30 == pytest.approx(e["p30"], abs=1e-9)
        assert h.q90 == pytest.approx(e["q90"], abs=1e-9)
        assert h.meets == e["meets"]
    assert r.totalCalls == pytest.approx(ref["totalCalls"], rel=1e-12)
    assert r.q == pytest.approx(ref["q"], rel=1e-12)
    for pr in ref["probes"]:
        w = wait_summary(z["params"], r, pr["t"])
        for key in ("mean", "q90", "p10", "p20", "p30"):
            assert w[key] == pytest.approx(pr[key], abs=1e-8), key
        assert w["fleet"] == pr["fleet"]


def test_pilot_standard_and_required_fleet():
    """Zone B cruise day: 3 vehicles all day miss the standard, the plan's 4 (daytime) meet it."""
    z = SC["zones"]["B"]
    lam = SC["lam"]["B"]["cruise"]
    n = z["close"] - z["open"]
    r3 = simulate_day(z["params"], z["open"], z["close"], lam, [3] * n)
    assert r3.meetShare < 1
    r = simulate_day(z["params"], z["open"], z["close"], lam, SC["fleet"]["B"]["cruise"])
    assert r.meetShare == 1
    req = required_fleet_by_hour(z["params"], z["open"], z["close"], lam)
    assert max(x["required"] for x in req) == 4


@pytest.mark.parametrize("day", DAYS)
def test_compartment_model_matches_typescript(day):
    ref = REF["crowd"][day]
    run = run_model(SC["sites"], day, ref["mult"])
    got = run[:, ::30]
    assert np.allclose(got, np.asarray(ref["every30"]), rtol=1e-11, atol=1e-9)


def test_choice_and_hhi():
    for c in REF["choiceCases"]:
        P = choice_probs(c["V"], c["CI"], c["theta"], c["avail"])
        assert np.allclose(P, c["P"], atol=1e-14)
    for c in REF["hhiCases"]:
        assert hhi(c["s"]) == pytest.approx(c["hhi"], abs=1e-15)


def test_enkf_matches_kalman_in_the_linear_gaussian_case():
    rng = np.random.default_rng(1)
    E, m0, P0, R, y = 20000, 10.0, 4.0, 1.0, 13.0
    ens = (m0 + np.sqrt(P0) * rng.standard_normal(E))[:, None]
    post = enkf_update(ens, np.array([y]), np.array([np.sqrt(R)]), rng)
    K = P0 / (P0 + R)
    assert post.mean() == pytest.approx(m0 + K * (y - m0), abs=0.03)
    assert post.var(ddof=1) == pytest.approx((1 - K) * P0, abs=0.03)


def test_forecast_learns_the_day():
    f = crowd_forecast(SC["sites"], "cruise", 18 * 60, seed=7)
    rel = np.abs(f["mult_est"] / f["mult_true"] - 1)
    assert rel.mean() < 0.12
    k = [s["id"] for s in SC["sites"]].index("gamcheon")
    i = 13 * 60 - DAY_START
    assert abs(f["mean"][k, i] - f["truth"][k, i]) / SC["sites"][k]["K"] < 0.15


def test_api_smoke():
    pytest.importorskip("fastapi")
    pytest.importorskip("httpx")
    from fastapi.testclient import TestClient

    from padocall.api import app

    c = TestClient(app)
    assert c.get("/health").json()["ok"] is True
    day = c.get("/drt/day", params={"zone": "A", "day": "drone"}).json()
    assert day["meetShare"] == 1
    q = c.get("/drt/quote", params={"zone": "A", "day": "drone", "minute": 1170}).json()
    assert q["open"] and 0 < q["mean"] < 15
