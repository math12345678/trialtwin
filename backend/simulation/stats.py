"""Statistical metrics: Jensen-Shannon Divergence + empirical Chi-Square rate."""
from __future__ import annotations

from typing import Dict

import numpy as np
from scipy.spatial.distance import jensenshannon
from scipy.stats import chi2

from . import data_loader


def _incidence(disease: str = "kidney_cancer") -> Dict[str, Dict]:
    return data_loader.incidence_for(disease)["regions"]


def jsd_per_run(enrolled_by_region: np.ndarray, target_n: int, disease: str = "kidney_cancer") -> np.ndarray:
    incidence = _incidence(disease)
    region_order = list(incidence.keys())
    inc_shares = np.array([incidence[r]["incidence_share"] for r in region_order])

    proj = enrolled_by_region / max(target_n, 1)
    out = np.empty(proj.shape[0], dtype=np.float64)
    for i in range(proj.shape[0]):
        out[i] = float(jensenshannon(proj[i] + 1e-12, inc_shares + 1e-12, base=2)) ** 2
    return out


def chi_square_empirical_rate(
    enrolled_by_region: np.ndarray,
    target_n: int,
    disease: str = "kidney_cancer",
    alpha: float = 0.05,
) -> Dict:
    incidence = _incidence(disease)
    region_order = list(incidence.keys())
    inc_shares = np.array([incidence[r]["incidence_share"] for r in region_order])
    expected = inc_shares * target_n

    n_regions = enrolled_by_region.shape[1]
    df = max(1, n_regions - 1)
    critical = float(chi2.ppf(1.0 - alpha, df=df))

    stats = ((enrolled_by_region - expected[None, :]) ** 2 / np.maximum(expected[None, :], 1.0)).sum(axis=1)
    rate = float((stats > critical).mean())

    return {
        "alpha": alpha,
        "df": df,
        "critical_value": critical,
        "empirical_significance_rate": rate,
        "stat_mean": float(stats.mean()),
        "stat_p10": float(np.percentile(stats, 10)),
        "stat_p90": float(np.percentile(stats, 90)),
    }


def summarize_jsd(jsd_array: np.ndarray) -> Dict:
    return {
        "mean": float(jsd_array.mean()),
        "p10": float(np.percentile(jsd_array, 10)),
        "p90": float(np.percentile(jsd_array, 90)),
        "min": float(jsd_array.min()),
        "max": float(jsd_array.max()),
    }
