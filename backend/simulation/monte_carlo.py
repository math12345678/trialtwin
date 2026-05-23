"""Vectorized Monte Carlo simulation engine for trial enrollment composition.

Design notes (must match the v3 spec):
 - Inclusion criteria modify priors BEFORE sampling, not as filters after.
 - Sites are allocated per country via largest-remainder, then each site activates
   independently. This is per-site Bernoulli, not per-country.
 - Each simulation run enforces exactly `target_n` enrolled patients via a per-row
   largest-remainder scaling after the screening-Poisson stage.
 - Representation is measured at ENROLLMENT (pre-dropout). Dropout is reported
   separately as a secondary metric.
 - Random seeds are deterministic per chunk so that fixing a base seed gives a
   fully reproducible run.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

import numpy as np

from . import data_loader
from .utils import fraction_age_eligible, largest_remainder, largest_remainder_vector


# ---------------------------------------------------------------------------
# Config (a lightweight mirror of the API TrialConfig — keeps this module
# independent of pydantic / FastAPI so it can run in a worker process).
# ---------------------------------------------------------------------------


@dataclass
class SimConfig:
    target_n: int
    n_sites_total: int
    countries: List[str]
    site_distribution: Dict[str, float]      # already normalized; sums to 1.0
    disease: str = "kidney_cancer"
    min_age: int = 18
    max_age: int = 90
    sex_restriction: Optional[str] = None    # "male_only" | "female_only" | None
    prior_treatment_required: bool = False
    n_simulations: int = 5000
    random_seed: Optional[int] = None
    n_chunks: int = 10                       # number of chunks for SSE progress


# ---------------------------------------------------------------------------
# Prior preparation (applies inclusion criteria to the demographic priors)
# ---------------------------------------------------------------------------


def _prepare_country_priors(config: SimConfig) -> Dict[str, Dict]:
    """Return per-country preprocessed priors with inclusion criteria applied.

    Returns a dict keyed by country with:
      - sex_p: np.array([p_male, p_female])    (sex_restriction zeroes one side)
      - age_eligible_frac: float in [0, 1]
      - accessibility_index: float in [0, 1]   (downweighted if prior_treatment_required)
      - sites: int (allocated for this country)
      - dropout_mean, dropout_std: floats
      - region: str
    """
    enroll = data_loader.enrollment_priors()
    demo = data_loader.demographic_priors()
    site_alloc = largest_remainder(
        {c: config.site_distribution.get(c, 0.0) for c in config.countries},
        config.n_sites_total,
    )

    out: Dict[str, Dict] = {}
    for c in config.countries:
        c_enroll = enroll.get(c)
        c_demo = demo.get(c)
        if c_enroll is None or c_demo is None:
            raise ValueError(f"Country {c!r} is not in our priors. Supported: {sorted(set(enroll) & set(demo))[:10]}...")

        # Sex prior with inclusion-criteria reweighting
        sex_p = np.array([c_demo["sex"]["male"], c_demo["sex"]["female"]], dtype=np.float64)
        if config.sex_restriction == "male_only":
            sex_p = np.array([1.0, 0.0])
        elif config.sex_restriction == "female_only":
            sex_p = np.array([0.0, 1.0])
        sex_p = sex_p / sex_p.sum() if sex_p.sum() > 0 else sex_p

        # Age-eligibility correction
        frac_age = fraction_age_eligible(
            mean=c_demo["age"]["mean"],
            std=c_demo["age"]["std"],
            min_age=config.min_age,
            max_age=config.max_age,
        )

        # Accessibility (downweight if prior-treatment requirement applies)
        acc = float(c_enroll["accessibility_index"])
        if config.prior_treatment_required:
            # Assumption: prior-treatment requirement shrinks accessible pool ~30%.
            # This is a modeling convention, not a measured value.
            acc *= 0.70

        out[c] = {
            "sex_p": sex_p,
            "age_eligible_frac": frac_age,
            "age_mean": c_demo["age"]["mean"],
            "age_std": c_demo["age"]["std"],
            "age_min_clip": c_demo["age"]["min_clip"],
            "age_max_clip": c_demo["age"]["max_clip"],
            "accessibility_index": acc,
            "sites": site_alloc.get(c, 0),
            "site_weight": config.site_distribution.get(c, 0.0),
            "dropout_mean": float(c_enroll["dropout_rate_mean"]),
            "dropout_std": float(c_enroll["dropout_rate_std"]),
            "region": c_enroll["region"],
            "fallback": bool(c_demo.get("sex", {}).get("_fallback") or c_demo.get("age", {}).get("_fallback")),
        }
    return out


# ---------------------------------------------------------------------------
# Chunked vectorized simulation
# ---------------------------------------------------------------------------


def _run_chunk(
    chunk_idx: int,
    batch_size: int,
    config: SimConfig,
    country_priors: Dict[str, Dict],
    base_seed: int,
) -> Dict[str, np.ndarray]:
    """Run a single chunk of `batch_size` simulations.

    Returns arrays keyed by:
      - 'enrolled_by_country':  (batch_size, n_countries) int
      - 'enrolled_by_region':   (batch_size, n_regions)   int
      - 'screened_by_country':  (batch_size, n_countries) int
      - 'dropouts_by_country':  (batch_size, n_countries) int
      - 'sex_counts':           (batch_size, 2) int            [male, female]
      - 'age_mean_per_run':     (batch_size,)  float
      - 'us_race_counts':       (batch_size, 5) int   [white, black, asian_pi, aian, other]
      - 'us_ethnicity_counts':  (batch_size, 2) int   [hispanic, non_hispanic]
    """
    chunk_seed = (base_seed + chunk_idx * 1_000_007) % (2**31)
    rng = np.random.default_rng(chunk_seed)

    countries = config.countries
    n_countries = len(countries)
    incidence = data_loader.incidence_for(config.disease)["regions"]
    region_order = list(incidence.keys())
    n_regions = len(region_order)
    region_index = {r: i for i, r in enumerate(region_order)}

    # ----- Site activation (per site, not per country) ----------------------
    # Build a flat per-site array: site_country_idx[i] = country index for site i.
    site_country_idx: List[int] = []
    site_country_codes: List[str] = []
    for ci, c in enumerate(countries):
        for _ in range(country_priors[c]["sites"]):
            site_country_idx.append(ci)
            site_country_codes.append(c)
    n_sites = len(site_country_idx)

    if n_sites == 0:
        # Degenerate: no sites allocated. Return zeros.
        zeros_country = np.zeros((batch_size, n_countries), dtype=np.int64)
        zeros_region = np.zeros((batch_size, n_regions), dtype=np.int64)
        return {
            "enrolled_by_country": zeros_country,
            "enrolled_by_region": zeros_region,
            "screened_by_country": zeros_country.copy(),
            "dropouts_by_country": zeros_country.copy(),
            "sex_counts": np.zeros((batch_size, 2), dtype=np.int64),
            "age_mean_per_run": np.zeros(batch_size, dtype=np.float64),
            "us_race_counts": np.zeros((batch_size, 5), dtype=np.int64),
            "us_ethnicity_counts": np.zeros((batch_size, 2), dtype=np.int64),
        }

    # Per-site accessibility probability
    site_acc = np.array(
        [country_priors[c]["accessibility_index"] for c in site_country_codes],
        dtype=np.float64,
    )
    # Activate sites: Bernoulli per site per run
    site_active = rng.binomial(1, site_acc[None, :], size=(batch_size, n_sites)).astype(np.int64)

    # ----- Screening: Poisson per site (vectorized) -------------------------
    # Distribute the target_n target across all sites proportional to site weight.
    # Each country's site_weight is its share of the trial; spread evenly across that country's sites.
    site_target = np.zeros(n_sites, dtype=np.float64)
    for ci, c in enumerate(countries):
        nc = country_priors[c]["sites"]
        if nc == 0:
            continue
        # The country gets share `site_weight` of patients; split across nc sites.
        per_site_lambda = config.target_n * country_priors[c]["site_weight"] / nc
        # Apply age-eligibility correction to expected screening yield
        per_site_lambda *= country_priors[c]["age_eligible_frac"]
        for i, code in enumerate(site_country_codes):
            if code == c:
                site_target[i] = per_site_lambda

    efficiency = rng.lognormal(mean=0.0, sigma=0.25, size=(batch_size, n_sites))
    # Inactive sites contribute zero
    lam = np.maximum(site_target[None, :] * efficiency * site_active, 0.0)
    screened_per_site = rng.poisson(lam)

    # Aggregate screened per country
    screened_by_country = np.zeros((batch_size, n_countries), dtype=np.int64)
    site_country_idx_arr = np.array(site_country_idx, dtype=np.int64)
    for ci in range(n_countries):
        mask = site_country_idx_arr == ci
        if mask.any():
            screened_by_country[:, ci] = screened_per_site[:, mask].sum(axis=1)

    # ----- Enforce target_n via per-run largest-remainder scaling -----------
    enrolled_by_country = np.zeros_like(screened_by_country)
    row_totals = screened_by_country.sum(axis=1)
    for i in range(batch_size):
        if row_totals[i] == 0:
            # No screening yield this run — fall back to site-weight-proportional allocation
            fallback = np.array(
                [country_priors[c]["site_weight"] for c in countries], dtype=np.float64
            )
            enrolled_by_country[i] = largest_remainder_vector(fallback, config.target_n)
        else:
            enrolled_by_country[i] = largest_remainder_vector(
                screened_by_country[i].astype(np.float64), config.target_n
            )

    # ----- Aggregate enrolled by region -------------------------------------
    enrolled_by_region = np.zeros((batch_size, n_regions), dtype=np.int64)
    for ci, c in enumerate(countries):
        ri = region_index[country_priors[c]["region"]]
        enrolled_by_region[:, ri] += enrolled_by_country[:, ci]

    # ----- Demographic sampling (sex, age) ----------------------------------
    # For speed we sample summary statistics, not per-patient records.
    sex_counts = np.zeros((batch_size, 2), dtype=np.int64)
    age_sum = np.zeros(batch_size, dtype=np.float64)
    age_n = np.zeros(batch_size, dtype=np.float64)
    for ci, c in enumerate(countries):
        cp = country_priors[c]
        n_per_run = enrolled_by_country[:, ci]
        # Binomial draw for male count under sex prior
        if cp["sex_p"][0] > 0:
            male_draw = rng.binomial(n_per_run, cp["sex_p"][0])
        else:
            male_draw = np.zeros_like(n_per_run)
        sex_counts[:, 0] += male_draw
        sex_counts[:, 1] += n_per_run - male_draw
        # Age contribution: assume country mean across that country's enrolled patients
        age_sum += n_per_run * cp["age_mean"]
        age_n += n_per_run

    age_mean_per_run = np.where(age_n > 0, age_sum / np.maximum(age_n, 1), 0.0)

    # ----- Race & Hispanic ethnicity (US only, from SEER) -------------------
    seer = data_loader.seer_us()
    race_p = np.array(
        [
            seer["race_nh"]["white"],
            seer["race_nh"]["black"],
            seer["race_nh"]["asian_pi"],
            seer["race_nh"]["aian"],
            seer["race_nh"]["other_unknown"],
        ],
        dtype=np.float64,
    )
    eth_p = np.array(
        [seer["ethnicity"]["hispanic"], seer["ethnicity"]["non_hispanic"]],
        dtype=np.float64,
    )
    us_idx = countries.index("US") if "US" in countries else None
    if us_idx is not None:
        us_n = enrolled_by_country[:, us_idx]
        us_race_counts = np.stack(
            [rng.multinomial(int(n), race_p) for n in us_n]
        ) if batch_size > 0 else np.zeros((0, 5), dtype=np.int64)
        us_eth_counts = np.stack(
            [rng.multinomial(int(n), eth_p) for n in us_n]
        ) if batch_size > 0 else np.zeros((0, 2), dtype=np.int64)
    else:
        us_race_counts = np.zeros((batch_size, 5), dtype=np.int64)
        us_eth_counts = np.zeros((batch_size, 2), dtype=np.int64)

    # ----- Dropout (secondary metric; does NOT feed back into RQ) -----------
    dropouts_by_country = np.zeros_like(enrolled_by_country)
    for ci, c in enumerate(countries):
        cp = country_priors[c]
        rate = rng.normal(cp["dropout_mean"], cp["dropout_std"], size=batch_size).clip(0.0, 0.5)
        dropouts_by_country[:, ci] = np.floor(enrolled_by_country[:, ci] * rate).astype(np.int64)

    return {
        "enrolled_by_country": enrolled_by_country,
        "enrolled_by_region": enrolled_by_region,
        "screened_by_country": screened_by_country,
        "dropouts_by_country": dropouts_by_country,
        "sex_counts": sex_counts,
        "age_mean_per_run": age_mean_per_run,
        "us_race_counts": us_race_counts,
        "us_ethnicity_counts": us_eth_counts,
    }


# ---------------------------------------------------------------------------
# Top-level driver
# ---------------------------------------------------------------------------


def run_simulation(
    config: SimConfig,
    progress_callback=None,
) -> Dict[str, np.ndarray]:
    """Run a full Monte Carlo simulation, chunked for progress reporting.

    `progress_callback(chunk_idx, n_chunks)` is invoked after each chunk if provided.

    Returns the stacked per-chunk results plus the resolved base seed under '_base_seed'.
    """
    base_seed = (
        config.random_seed
        if config.random_seed is not None
        else int(np.random.SeedSequence().entropy & 0x7FFFFFFF)
    )
    country_priors = _prepare_country_priors(config)
    n_chunks = max(1, min(config.n_chunks, config.n_simulations))
    chunk_sizes = [config.n_simulations // n_chunks] * n_chunks
    for i in range(config.n_simulations - sum(chunk_sizes)):
        chunk_sizes[i] += 1

    accum: Dict[str, List[np.ndarray]] = {}
    for idx, batch_size in enumerate(chunk_sizes):
        chunk = _run_chunk(idx, batch_size, config, country_priors, base_seed)
        for k, v in chunk.items():
            accum.setdefault(k, []).append(v)
        if progress_callback:
            progress_callback(idx + 1, n_chunks)

    stacked = {k: np.concatenate(v, axis=0) for k, v in accum.items()}
    stacked["_base_seed"] = np.array([base_seed])
    return stacked
