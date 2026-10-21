"""PADO CALL — Python reference engine.

Independent NumPy/SciPy implementation of the engines that run in the web app
(web/src/engine/*.ts). It is used to cross-check the TypeScript results and as a
starting point for a server-side API (padocall.api, FastAPI).

All inputs are virtual demo data. The DRT wait model follows the modelling approach
of the team's prior study [1] in a simplified, generic form; no data or calibrated
results of [1] are included.

[1] 신재완·김민수(2026), 「부산시 저수요 시내버스 운행의 수요응답형 교통 전환 조건:
    1분 단위 정류장 수요 재구성과 Kolmogorov 전진방정식 모형」, 대한교통학회지 투고 원고.
"""
from .drt import ZoneParams, ServiceStandard, TOURIST_STANDARD, simulate_day, wait_summary, required_fleet_by_hour
from .crowd import run_model, enkf_update, crowd_forecast
from .choice import choice_probs, hhi
from .scenario import load_scenario

__all__ = [
    "ZoneParams", "ServiceStandard", "TOURIST_STANDARD", "simulate_day", "wait_summary", "required_fleet_by_hour",
    "run_model", "enkf_update", "crowd_forecast", "choice_probs", "hhi", "load_scenario",
]
