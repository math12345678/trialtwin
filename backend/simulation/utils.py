"""Utility helpers shared across the simulation engine."""
from __future__ import annotations

import math
from typing import Dict, Iterable, List

import numpy as np


def largest_remainder(weights: Dict[str, float], total: int) -> Dict[str, int]:
    """Allocate an integer total across keys using the largest-remainder method.

    Guarantees the returned integers sum exactly to `total`. Handles the case
    where some weights are zero by giving those keys zero allocation.
    """
    if total <= 0:
        return {k: 0 for k in weights}
    weight_sum = sum(weights.values())
    if weight_sum <= 0:
        # All zero weights: allocate evenly
        keys = list(weights.keys())
        base = total // len(keys)
        remainder = total - base * len(keys)
        out = {k: base for k in keys}
        for k in keys[:remainder]:
            out[k] += 1
        return out

    raw = {k: total * (w / weight_sum) for k, w in weights.items()}
    floored = {k: int(math.floor(v)) for k, v in raw.items()}
    allocated = sum(floored.values())
    leftover = total - allocated
    # Order by fractional remainder descending, tie-break by key for determinism
    fracs = sorted(
        weights.keys(),
        key=lambda k: (-(raw[k] - floored[k]), k),
    )
    for i in range(leftover):
        floored[fracs[i % len(fracs)]] += 1
    return floored


def largest_remainder_vector(weights: np.ndarray, total: int) -> np.ndarray:
    """Vectorized largest-remainder for a single 1D weight vector."""
    if total <= 0 or weights.sum() <= 0:
        return np.zeros_like(weights, dtype=np.int64)
    normalized = weights / weights.sum()
    raw = normalized * total
    floored = np.floor(raw).astype(np.int64)
    leftover = int(total - floored.sum())
    if leftover > 0:
        remainders = raw - floored
        idx = np.argsort(-remainders, kind="stable")
        floored[idx[:leftover]] += 1
    return floored


def fraction_age_eligible(mean: float, std: float, min_age: int, max_age: int) -> float:
    """Fraction of a normal(mean, std) age distribution falling in [min_age, max_age]."""
    from scipy.stats import norm
    if std <= 0:
        return 1.0 if min_age <= mean <= max_age else 0.0
    return float(norm.cdf(max_age, loc=mean, scale=std) - norm.cdf(min_age, loc=mean, scale=std))
