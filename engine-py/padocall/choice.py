"""Congestion-avoiding choice (multinomial logit with a congestion penalty) and HHI."""
from __future__ import annotations

import numpy as np


def choice_probs(V, CI, theta: float = 1.6, avail=None) -> np.ndarray:
    u = np.asarray(V, float) - theta * np.asarray(CI, float)
    if avail is not None:
        u = np.where(np.asarray(avail, bool), u, -np.inf)
    if not np.isfinite(u).any():
        return np.zeros_like(u)
    e = np.exp(u - u[np.isfinite(u)].max())
    return e / e.sum()


def hhi(shares) -> float:
    s = np.asarray(shares, float)
    tot = s.sum()
    return float(((s / tot) ** 2).sum()) if tot > 0 else 0.0
