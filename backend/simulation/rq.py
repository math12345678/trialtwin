"""Representation Quotient (RQ) and Representation Equity Score (RES)."""
from __future__ import annotations

from typing import Dict, List, Tuple

import numpy as np

from . import data_loader

# Locked epsilon. Sensitivity-tested across [1e-5, 1e-3]; rank order is stable.
# See docs/res_epsilon_sensitivity.md.
EPSILON = 1e-4


def _incidence(disease: str = "kidney_cancer") -> Dict[str, Dict]:
    return data_loader.incidence_for(disease)["regions"]


def regional_rq(enrolled_by_region: np.ndarray, target_n: int, disease: str = "kidney_cancer") -> np.ndarray:
    """Compute RQ per region for each simulation run.

    enrolled_by_region: (n_runs, n_regions) integer counts.
    Returns (n_runs, n_regions) floats. Zero enrollment -> RQ = 0.0 (valid data point).
    """
    incidence = _incidence(disease)
    region_order = list(incidence.keys())
    inc_shares = np.array([incidence[r]["incidence_share"] for r in region_order], dtype=np.float64)

    enrolled_share = enrolled_by_region / max(target_n, 1)
    inc_safe = np.where(inc_shares > 0, inc_shares, 1e-12)
    return enrolled_share / inc_safe[None, :]


def representation_equity_score(rq_vector: np.ndarray, disease: str = "kidney_cancer") -> float:
    """Weighted geometric mean of RQ across regions, weighted by global incidence share."""
    incidence = _incidence(disease)
    region_order = list(incidence.keys())
    weights = np.array([incidence[r]["incidence_share"] for r in region_order], dtype=np.float64)

    log_sum = float(np.sum(weights * np.log(rq_vector + EPSILON)))
    res_raw = float(np.exp(log_sum) - EPSILON)
    return float(np.clip(res_raw, 0.0, 2.0))


def res_per_run(rq_matrix: np.ndarray, disease: str = "kidney_cancer") -> np.ndarray:
    incidence = _incidence(disease)
    region_order = list(incidence.keys())
    weights = np.array([incidence[r]["incidence_share"] for r in region_order], dtype=np.float64)
    log_sum = (weights[None, :] * np.log(rq_matrix + EPSILON)).sum(axis=1)
    res = np.exp(log_sum) - EPSILON
    return np.clip(res, 0.0, 2.0)


def equity_signal(res: float) -> Tuple[str, str]:
    """Map RES -> (label, symbol)."""
    if res < 0.40:
        return ("POOR", "▼▼")
    if res < 0.75:
        return ("MODERATE", "▼")
    if res < 1.25:
        return ("GOOD", "≈")
    return ("OVER", "▲")


def regional_status(rq_mean: float) -> Tuple[str, str]:
    if rq_mean < 0.25:
        return ("SEVERE", "▼▼")
    if rq_mean < 0.75:
        return ("UNDER", "▼")
    if rq_mean < 1.25:
        return ("FAIR", "≈")
    return ("OVER", "▲")


def summarize_regional(
    enrolled_by_region: np.ndarray,
    target_n: int,
    disease: str = "kidney_cancer",
) -> List[Dict]:
    """Per-region summary: mean / p10 / p90 / zero-enrollment rate / status."""
    incidence = _incidence(disease)
    region_order = list(incidence.keys())
    rq = regional_rq(enrolled_by_region, target_n, disease)

    out: List[Dict] = []
    for i, r in enumerate(region_order):
        r_rq = rq[:, i]
        zero_rate = float((enrolled_by_region[:, i] == 0).mean())
        mean_v = float(r_rq.mean())
        p10 = float(np.percentile(r_rq, 10))
        p90 = float(np.percentile(r_rq, 90))
        label, symbol = regional_status(mean_v)
        out.append(
            {
                "region": r,
                "label": incidence[r]["label"],
                "incidence_share": incidence[r]["incidence_share"],
                "enrolled_share_mean": float(enrolled_by_region[:, i].mean() / max(target_n, 1)),
                "rq_mean": mean_v,
                "rq_p10": p10,
                "rq_p90": p90,
                "zero_enrollment_rate": zero_rate,
                "status_label": label,
                "status_symbol": symbol,
            }
        )
    return out
