"""Orchestrates a full simulation run: Monte Carlo → stats → RQ → recommendations."""
from __future__ import annotations

import time
from typing import Dict, List, Optional

import numpy as np

from . import data_loader
from .monte_carlo import SimConfig, run_simulation
from .rq import (
    equity_signal,
    regional_rq,
    representation_equity_score,
    summarize_regional,
)
from .stats import chi_square_empirical_rate, jsd_per_run, summarize_jsd
from .recommendations import rank_candidates


def _executive_summary(
    config: SimConfig,
    disease_label: str,
    res: float,
    jsd_summary: Dict,
    underrep_regions: List[str],
    rec_countries: List[str],
    total_delta_res: float,
) -> str:
    underrep_str = ", ".join(underrep_regions) if underrep_regions else "no region"
    verb = "are" if len(underrep_regions) > 1 else "is"
    recs_str = ", ".join(rec_countries) if rec_countries else "additional sites"
    return (
        f"This {config.n_simulations:,}-run simulation of a {config.target_n}-patient "
        f"{disease_label.lower()} trial across {len(config.countries)} countries projects a "
        f"Representation Equity Score of {res:.2f}. Jensen-Shannon divergence from the "
        f"incidence-proportionate baseline is {jsd_summary['mean']:.3f} (simulation interval: "
        f"{jsd_summary['p10']:.3f}–{jsd_summary['p90']:.3f}). "
        f"{underrep_str.capitalize()} {verb} projected to be underrepresented relative to "
        f"global {disease_label.lower()} burden. Adding sites in {recs_str} would improve "
        f"the RES by approximately {total_delta_res:.3f}."
    )


def run_full_simulation(
    config_dict: Dict,
    run_id: str,
    progress_path: Optional[str] = None,
) -> Dict:
    t0 = time.time()
    config = SimConfig(**{k: v for k, v in config_dict.items() if k in SimConfig.__dataclass_fields__})
    disease_meta = data_loader.incidence_for(config.disease)
    disease_label = disease_meta["label"]

    def write_progress(stage: str, idx: int, total: int) -> None:
        if progress_path is None:
            return
        try:
            with open(progress_path, "a", encoding="utf-8") as f:
                f.write(f"{stage}|{idx}|{total}\n")
        except Exception:
            pass

    def cb(i: int, total: int) -> None:
        write_progress("simulate", i, total)

    write_progress("start", 0, 1)
    result = run_simulation(config, progress_callback=cb)
    base_seed = int(result["_base_seed"][0])

    # -------- Stats --------
    write_progress("stats", 1, 3)
    rq = regional_rq(result["enrolled_by_region"], config.target_n, config.disease)
    rq_mean = rq.mean(axis=0)
    res = representation_equity_score(rq_mean, config.disease)
    label, symbol = equity_signal(res)

    jsd_arr = jsd_per_run(result["enrolled_by_region"], config.target_n, config.disease)
    jsd_summary = summarize_jsd(jsd_arr)
    chi_sq = chi_square_empirical_rate(result["enrolled_by_region"], config.target_n, config.disease)

    # Regional summary
    region_rows = summarize_regional(result["enrolled_by_region"], config.target_n, config.disease)
    # Annotate which regions contain countries using fallback priors
    demo = data_loader.demographic_priors()
    enroll = data_loader.enrollment_priors()
    fallback_regions = set()
    for c in config.countries:
        d = demo.get(c, {})
        if d.get("sex", {}).get("_fallback") or d.get("age", {}).get("_fallback"):
            fallback_regions.add(enroll.get(c, {}).get("region"))
    for row in region_rows:
        row["fallback_demographic_prior"] = row["region"] in fallback_regions

    # -------- Sex, Age, Race --------
    sex_counts = result["sex_counts"]
    total_per_run = sex_counts.sum(axis=1)
    male_share = sex_counts[:, 0] / np.maximum(total_per_run, 1)
    sex_dist = {
        "male_share_mean": float(male_share.mean()),
        "female_share_mean": float(1.0 - male_share.mean()),
    }
    age_arr = result["age_mean_per_run"]
    valid_ages = age_arr[age_arr > 0]
    if len(valid_ages) == 0:
        age_stats = {"mean": 0.0, "p10": 0.0, "p90": 0.0}
    else:
        age_stats = {
            "mean": float(valid_ages.mean()),
            "p10": float(np.percentile(valid_ages, 10)),
            "p90": float(np.percentile(valid_ages, 90)),
        }

    race_dist = None
    if "US" in config.countries:
        race_counts = result["us_race_counts"]
        eth_counts = result["us_ethnicity_counts"]
        race_total = race_counts.sum(axis=1)
        eth_total = eth_counts.sum(axis=1)
        race_means = (race_counts / np.maximum(race_total, 1)[:, None]).mean(axis=0)
        eth_means = (eth_counts / np.maximum(eth_total, 1)[:, None]).mean(axis=0)
        race_dist = {
            "white_nh": float(race_means[0]),
            "black_nh": float(race_means[1]),
            "asian_pi_nh": float(race_means[2]),
            "aian_nh": float(race_means[3]),
            "other_nh": float(race_means[4]),
            "hispanic": float(eth_means[0]),
            "non_hispanic": float(eth_means[1]),
        }

    # -------- Recommendations --------
    write_progress("recommend", 2, 3)
    try:
        recs = rank_candidates(config, top_k=3)
    except Exception:
        recs = []

    # -------- Scenario comparison --------
    scenario = None
    if recs:
        top = recs[0]
        from .recommendations import _config_with_candidate, _res_from_run
        corrected_config = _config_with_candidate(config, top["country_code"], 0.05)
        corrected_run = run_simulation(corrected_config)
        corrected_res = _res_from_run(corrected_run, corrected_config.target_n, corrected_config.disease)
        corrected_jsd = float(jsd_per_run(corrected_run["enrolled_by_region"], corrected_config.target_n, corrected_config.disease).mean())
        scenario = {
            "base_res": res,
            "corrected_res": corrected_res,
            "base_jsd": jsd_summary["mean"],
            "corrected_jsd": corrected_jsd,
            "applied_country": top["country_code"],
        }

    # -------- Warnings --------
    warnings: List[str] = []
    if fallback_regions:
        warnings.append(
            f"Demographic priors fall back to regional medians for some selected countries (regions: {', '.join(fallback_regions)})."
        )
    if race_dist is None:
        warnings.append(
            "Race/ethnicity simulation is disabled because the selected country set does not include the US. "
            "Race priors are calibrated to US SEER data only."
        )
    if any(r["zero_enrollment_rate"] > 0.5 for r in region_rows):
        warnings.append(
            "One or more regions had zero enrollment in over half of simulated runs. "
            "Site allocation may be insufficient for those regions."
        )
    if config.disease == "hypertension":
        warnings.append(
            "Hypertension demographics are projected using the kidney-cancer-calibrated "
            "country-level age/sex priors as a first-order approximation. Regional projections "
            "are the primary calibrated output."
        )

    underrep = [r["label"] for r in region_rows if r["rq_mean"] < 0.75]
    rec_countries = [r["country_name"] for r in recs]
    total_delta_res = sum(r["delta_res"] for r in recs)
    exec_summary = _executive_summary(config, disease_label, res, jsd_summary, underrep, rec_countries, total_delta_res)

    elapsed_ms = int((time.time() - t0) * 1000)
    write_progress("done", 3, 3)

    return {
        "run_id": run_id,
        "config": config_dict,
        "disease_label": disease_label,
        "disease_audit_calibrated": disease_meta.get("audit_calibrated", False),
        "n_simulations_run": config.n_simulations,
        "base_seed": base_seed,
        "regional_rq": region_rows,
        "sex_distribution": sex_dist,
        "age_stats": age_stats,
        "race_distribution": race_dist,
        "representation_equity_score": res,
        "equity_signal_label": label,
        "equity_signal_symbol": symbol,
        "jsd": jsd_summary,
        "chi_square_empirical": chi_sq,
        "recommendations": recs,
        "scenario_comparison": scenario,
        "executive_summary": exec_summary,
        "warnings": warnings,
        "computation_time_ms": elapsed_ms,
    }
