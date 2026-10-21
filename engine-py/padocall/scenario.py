"""The virtual demo scenario, exported from the TypeScript app (npm run fixtures)."""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

from .drt import ServiceStandard, ZoneParams

DATA = Path(__file__).with_name("data") / "scenario.json"


@lru_cache(maxsize=1)
def load_scenario() -> dict:
    raw = json.loads(DATA.read_text(encoding="utf-8"))
    zones = {}
    for z, v in raw["zones"].items():
        zones[z] = {
            "params": ZoneParams(v["ellKm"], v["rideKm"], v["speedKmh"], v["detour"], v["t0"], v["dwell"], v["xi"]),
            "open": int(v["open"]),
            "close": int(v["close"]),
        }
    std = raw["standard"]
    return {
        "zones": zones,
        "lam": raw["lam"],
        "fleet": raw["fleet"],
        "sites": raw["sites"],
        "standard": ServiceStandard(std["meanMax"], std["tailMin"], std["tailProb"]),
        "theta": raw["theta"],
    }
