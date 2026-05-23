"""Smoke tests covering the simulation engine end-to-end.

Run with:
    cd /Users/smyan/trialtwin
    PYTHONPATH=. python -m pytest backend/tests/test_engine_smoke.py -v

Or without pytest:
    PYTHONPATH=. python backend/tests/test_engine_smoke.py
"""
from __future__ import annotations


def test_data_files_validate():
    from backend.simulation import data_loader

    data_loader.validate_all()
    rcc = data_loader.rcc_incidence()
    total = sum(r["incidence_share"] for r in rcc["regions"].values())
    assert abs(total - 1.0) < 0.005


def test_largest_remainder_sums_exactly():
    from backend.simulation.utils import largest_remainder

    weights = {"US": 0.37, "DE": 0.07, "FR": 0.06, "NG": 0.001, "ZA": 0.003}
    for total in [1, 7, 23, 100, 500]:
        out = largest_remainder(weights, total)
        assert sum(out.values()) == total, f"largest_remainder doesn't sum to {total}: {out}"


def test_simulation_enforces_target_n():
    from backend.simulation.monte_carlo import SimConfig, run_simulation

    cfg = SimConfig(
        target_n=600,
        n_sites_total=20,
        countries=["US", "DE", "FR", "JP"],
        site_distribution={"US": 0.5, "DE": 0.2, "FR": 0.2, "JP": 0.1},
        n_simulations=200,
        random_seed=42,
        n_chunks=2,
    )
    result = run_simulation(cfg)
    totals = result["enrolled_by_country"].sum(axis=1)
    assert (totals == 600).all(), f"target_n not enforced. Got totals: {totals[:5]}"
    assert result["enrolled_by_region"].sum(axis=1).max() == 600


def test_reproducibility_with_seed():
    from backend.simulation.monte_carlo import SimConfig, run_simulation

    cfg = SimConfig(
        target_n=300, n_sites_total=10,
        countries=["US", "DE"],
        site_distribution={"US": 0.7, "DE": 0.3},
        n_simulations=100, random_seed=7, n_chunks=2,
    )
    a = run_simulation(cfg)
    b = run_simulation(cfg)
    assert (a["enrolled_by_country"] == b["enrolled_by_country"]).all()


def test_sex_restriction_zeroes_female_prior():
    from backend.simulation.monte_carlo import SimConfig, run_simulation

    cfg = SimConfig(
        target_n=200, n_sites_total=5,
        countries=["US"],
        site_distribution={"US": 1.0},
        sex_restriction="male_only",
        n_simulations=50, random_seed=1, n_chunks=1,
    )
    result = run_simulation(cfg)
    assert result["sex_counts"][:, 1].sum() == 0, "female_only count must be zero under male_only"


def test_rq_calculation():
    from backend.simulation.monte_carlo import SimConfig, run_simulation
    from backend.simulation.rq import regional_rq, representation_equity_score

    cfg = SimConfig(
        target_n=600, n_sites_total=20,
        countries=["US", "DE", "FR", "JP", "BR"],
        site_distribution={"US": 0.4, "DE": 0.15, "FR": 0.15, "JP": 0.15, "BR": 0.15},
        n_simulations=500, random_seed=42, n_chunks=2,
    )
    result = run_simulation(cfg)
    rq = regional_rq(result["enrolled_by_region"], cfg.target_n)
    assert rq.shape == (500, 8)   # 8 regions in rcc_incidence.json
    assert (rq >= 0).all(), "RQ must be non-negative"
    res = representation_equity_score(rq.mean(axis=0))
    assert 0 <= res <= 2.0


def test_jsd_in_unit_interval():
    from backend.simulation.monte_carlo import SimConfig, run_simulation
    from backend.simulation.stats import jsd_per_run

    cfg = SimConfig(
        target_n=400, n_sites_total=10,
        countries=["US", "DE"],
        site_distribution={"US": 0.8, "DE": 0.2},
        n_simulations=100, random_seed=42, n_chunks=1,
    )
    result = run_simulation(cfg)
    jsd = jsd_per_run(result["enrolled_by_region"], cfg.target_n)
    assert (jsd >= 0).all() and (jsd <= 1).all()


def test_parser_finds_countries_and_n():
    from backend.parsers.trial_text_parser import parse_trial_text

    text = "Phase III RCC trial enrolling 600 patients across US, Germany, France, UK. Adults 18-80."
    parsed = parse_trial_text(text)
    assert parsed.get("target_n") == 600
    assert parsed.get("min_age") == 18
    assert parsed.get("max_age") == 80
    countries = parsed.get("countries", [])
    for required in ("US", "DE", "FR", "GB"):
        assert required in countries, f"{required} missing from {countries}"


def test_parser_handles_male_only():
    from backend.parsers.trial_text_parser import parse_trial_text

    parsed = parse_trial_text("400 male-only participants in USA")
    assert parsed.get("sex_restriction") == "male_only"
    assert parsed.get("target_n") == 400


if __name__ == "__main__":
    import sys

    tests = [
        test_data_files_validate,
        test_largest_remainder_sums_exactly,
        test_simulation_enforces_target_n,
        test_reproducibility_with_seed,
        test_sex_restriction_zeroes_female_prior,
        test_rq_calculation,
        test_jsd_in_unit_interval,
        test_parser_finds_countries_and_n,
        test_parser_handles_male_only,
    ]
    failed = 0
    for t in tests:
        try:
            t()
            print(f"  PASS  {t.__name__}")
        except Exception as exc:  # noqa: BLE001
            failed += 1
            print(f"  FAIL  {t.__name__}: {exc}")
    print(f"\n{len(tests) - failed}/{len(tests)} passed")
    sys.exit(1 if failed else 0)
