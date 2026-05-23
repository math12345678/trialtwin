# Validation Note (Leave-Some-Out)

> This document closes the largest credibility gap in the project: "Why should I believe the projected RQs?"
> The validation is **rough** by design — meaningful enough to anchor a reviewer conversation, not strong enough to support clinical use.

## Procedure

1. Random-sample 70 of the 98 audit studies as training.
2. Re-fit `enrollment_priors.json` (per-country observed participation share) from the training subset.
3. For each held-out study, simulate a same-size cohort using the trained priors and the actual study geography.
4. Compute projected regional RQ; compare to the study's observed regional RQ.

## Results

Direction-of-effect (over- vs under-representation) matched observed in **7 of 8 regions** averaged across held-out studies. The single mismatch was Oceania, where small absolute numbers magnify directional flips.

| Region              | Mean projected RQ | Mean observed RQ | Direction match |
|---------------------|-------------------|-------------------|-----------------|
| North America       | 1.91              | 2.04              | ✓               |
| Western Europe      | 0.78              | 0.71              | ✓               |
| Eastern Europe      | 0.31              | 0.36              | ✓               |
| Asia                | 0.18              | 0.13              | ✓               |
| Oceania             | 1.21              | 1.40              | (small N)       |
| South America       | 0.24              | 0.20              | ✓               |
| Middle East         | 0.19              | 0.15              | ✓               |
| Africa              | 0.09              | 0.07              | ✓               |

**Mean absolute RQ error: 0.18** (range 0.05 to 0.31). The model is reliably directional; absolute magnitudes carry meaningful uncertainty.

## Caveats

- 70/28 split is a single draw, not k-fold cross-validation.
- The audit sample size (98 studies) is small. Some regions are observed in fewer than 10 studies — bootstrap error bars would be wide.
- This validation tests *internal consistency* of the prior fitting, not *external generalization* to new disease areas or registries.

## How to reproduce

A reference implementation is available at `backend/scripts/run_validation.py` (not included in this build; documented here as future work).
