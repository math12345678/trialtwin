# RES Epsilon Sensitivity

The Representation Equity Score is a weighted geometric mean with an additive ε to keep `log(0)` defined:

```
RES = exp(Σ incidence_share_r · ln(RQ_r + ε)) − ε,   clipped to [0, 2]
```

We use **ε = 1×10⁻⁴**. This value was chosen for numerical stability, not for tuning effect. The sensitivity table below shows the baseline-audit RES and regional ranking under three orders of magnitude.

## Baseline audit configuration

Trial: 600 patients, audit-typical site distribution (US 37%, DE 7%, FR 6%, GB 6%, IT 4%, ES 4%, CA 4%, AU 2%, JP 4%, BR 2%, KR 2%, other 22%), 5,000 simulation iterations.

| ε       | RES   | Africa rank | Middle East rank | Asia rank | North America rank |
|---------|-------|-------------|-------------------|-----------|--------------------|
| 1×10⁻⁵  | 0.286 | 8           | 7                 | 6         | 1                  |
| 1×10⁻⁴  | 0.291 | 8           | 7                 | 6         | 1                  |
| 1×10⁻³  | 0.304 | 8           | 7                 | 6         | 1                  |

The absolute RES varies by ±5% across this range; **the regional ranking is identical**. We pick the middle value (1×10⁻⁴) as a balance between sensitivity to true zero-enrollment regions and numerical stability.

## What changes if you change ε

- **Smaller ε (1×10⁻⁵)** — slightly more punitive when a region has near-zero enrollment. RES collapses faster.
- **Larger ε (1×10⁻³)** — slightly more forgiving when a region has near-zero enrollment. RES is buoyed up.

If you have a domain reason to push ε in either direction, document it here and re-run this table. As long as rank order is stable across [1e-5, 1e-3], the choice is a calibration choice, not a methodological one.

## How to reproduce

```python
from backend.simulation.monte_carlo import SimConfig, run_simulation
from backend.simulation import rq as rq_mod
from backend.simulation.rq import representation_equity_score

for eps in [1e-5, 1e-4, 1e-3]:
    rq_mod.EPSILON = eps
    cfg = SimConfig(
        target_n=600, n_sites_total=30,
        countries=["US","DE","FR","GB","IT","ES","CA","AU","JP","BR","KR"],
        site_distribution={"US":0.37,"DE":0.07,"FR":0.06,"GB":0.06,"IT":0.04,
                           "ES":0.04,"CA":0.04,"AU":0.02,"JP":0.04,"BR":0.02,"KR":0.02},
        n_simulations=5000, random_seed=42,
    )
    out = run_simulation(cfg)
    rq = rq_mod.regional_rq(out["enrolled_by_region"], cfg.target_n).mean(axis=0)
    print(eps, representation_equity_score(rq))
```
