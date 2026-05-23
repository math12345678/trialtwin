"""Computational site recommendations via delta-RES mini-simulations.

For each candidate country, we evaluate the gain in Representation Equity Score
that would result from adding it at a small site-weight allocation. We use short
1000-iteration simulations to keep latency manageable.
"""
from __future__ import annotations

from typing import Dict, List

import numpy as np

from . import data_loader
from .monte_carlo import SimConfig, run_simulation
from .rq import regional_rq, representation_equity_score

CANDIDATE_COUNTRIES: List[str] = [
    "NG", "ZA", "EG", "KE", "MA",
    "IN", "PK", "BD", "ID", "VN", "TH", "CN",
    "BR", "MX", "AR", "CL",
    "TR", "AE", "SA", "IR",
    "PL", "RO", "UA", "HU",
    "KR", "JP",
]


def _config_with_candidate(base: SimConfig, candidate: str, weight: float = 0.05) -> SimConfig:
    new_countries = list(base.countries)
    new_dist = dict(base.site_distribution)
    if candidate not in new_countries:
        new_countries.append(candidate)
        scale = max(0.0, 1.0 - weight)
        new_dist = {c: w * scale for c, w in new_dist.items()}
        new_dist[candidate] = weight
    else:
        new_dist[candidate] = new_dist.get(candidate, 0.0) + weight
        total = sum(new_dist.values())
        new_dist = {c: w / total for c, w in new_dist.items()}

    return SimConfig(
        target_n=base.target_n,
        n_sites_total=max(base.n_sites_total, len(new_countries)),
        countries=new_countries,
        site_distribution=new_dist,
        disease=base.disease,
        min_age=base.min_age,
        max_age=base.max_age,
        sex_restriction=base.sex_restriction,
        prior_treatment_required=base.prior_treatment_required,
        n_simulations=1000,
        random_seed=42,
        n_chunks=1,
    )


def _res_from_run(result: Dict[str, np.ndarray], target_n: int, disease: str) -> float:
    rq = regional_rq(result["enrolled_by_region"], target_n, disease)
    return representation_equity_score(rq.mean(axis=0), disease)


def rank_candidates(base_config: SimConfig, top_k: int = 3) -> List[Dict]:
    enroll = data_loader.enrollment_priors()
    metadata = data_loader.country_metadata()["countries"]
    incidence = data_loader.incidence_for(base_config.disease)["regions"]
    region_order = list(incidence.keys())

    base_run = run_simulation(base_config)
    base_res = _res_from_run(base_run, base_config.target_n, base_config.disease)
    base_rq_mean = regional_rq(base_run["enrolled_by_region"], base_config.target_n, base_config.disease).mean(axis=0)
    region_idx = {r: i for i, r in enumerate(region_order)}

    scored: List[Dict] = []
    for cand in CANDIDATE_COUNTRIES:
        if cand not in enroll or cand in base_config.countries:
            continue
        cfg = _config_with_candidate(base_config, cand, weight=0.05)
        run = run_simulation(cfg)
        new_res = _res_from_run(run, cfg.target_n, cfg.disease)
        delta_res = new_res - base_res
        feasibility = float(enroll[cand]["accessibility_index"])
        score = delta_res * (0.5 + 0.5 * feasibility)
        region = enroll[cand]["region"]
        new_rq = regional_rq(run["enrolled_by_region"], cfg.target_n, cfg.disease).mean(axis=0)
        zero_rate = float((run["enrolled_by_region"][:, region_idx[region]] == 0).mean())

        scored.append({
            "country_code": cand,
            "country_name": metadata.get(cand, {}).get("name", cand),
            "region": region,
            "region_label": incidence[region]["label"],
            "delta_res": float(delta_res),
            "new_res": float(new_res),
            "current_region_rq": float(base_rq_mean[region_idx[region]]),
            "new_region_rq": float(new_rq[region_idx[region]]),
            "feasibility": feasibility,
            "score": float(score),
            "zero_enrollment_rate": zero_rate,
        })

    scored.sort(key=lambda x: (-round(x["score"], 3), x["zero_enrollment_rate"]))
    return scored[:top_k]
