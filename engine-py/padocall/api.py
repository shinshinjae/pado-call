"""Optional FastAPI server exposing the reference engine (pip install fastapi uvicorn).

    uvicorn padocall.api:app --reload      # from the engine-py folder
"""
from __future__ import annotations

from fastapi import FastAPI, HTTPException, Query

from .crowd import run_model
from .drt import simulate_day, wait_summary
from .scenario import load_scenario

app = FastAPI(title="PADO CALL reference engine", version="0.1.0",
              description="Virtual demo data only. DRT wait model: simplified generic form of the team's prior study [1].")
DAYS = ("weekday", "weekend", "cruise", "drone")


def _day(zone: str, day: str):
    sc = load_scenario()
    if zone not in sc["zones"] or day not in DAYS:
        raise HTTPException(404, "unknown zone or day type")
    z = sc["zones"][zone]
    return z, simulate_day(z["params"], z["open"], z["close"], sc["lam"][zone][day], sc["fleet"][zone][day], sc["standard"])


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/drt/day")
def drt_day(zone: str = Query("A"), day: str = Query("drone")):
    _, r = _day(zone, day)
    return {
        "zone": zone, "day": day, "totalCalls": r.totalCalls, "vehicleHours": r.vehicleHours, "q": r.q, "meetShare": r.meetShare,
        "hours": [h.__dict__ for h in r.hours],
    }


@app.get("/drt/quote")
def drt_quote(zone: str = Query("A"), day: str = Query("drone"), minute: int = Query(19 * 60 + 30)):
    z, r = _day(zone, day)
    if not (z["open"] <= minute < z["close"]):
        return {"open": False, "opens": z["open"], "closes": z["close"]}
    return {"open": True, **wait_summary(z["params"], r, minute)}


@app.get("/crowd/baseline")
def crowd_baseline(day: str = Query("drone")):
    sc = load_scenario()
    if day not in DAYS:
        raise HTTPException(404, "unknown day type")
    sites = sc["sites"]
    run = run_model(sites, day, [1.0] * len(sites))
    return {s["id"]: [float(run[k, h * 60 + 30 - 360] / s["K"]) for h in range(6, 24)] for k, s in enumerate(sites)}
