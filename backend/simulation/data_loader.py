"""Loads, validates, and caches all data files at startup."""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def _load(name: str) -> Dict[str, Any]:
    path = DATA_DIR / name
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


@lru_cache(maxsize=1)
def rcc_incidence() -> Dict[str, Any]:
    """Backwards-compatible RCC incidence accessor (delegates to disease_priors)."""
    return incidence_for("kidney_cancer")


@lru_cache(maxsize=1)
def disease_priors() -> Dict[str, Any]:
    data = _load("disease_priors.json")
    for disease, payload in data["diseases"].items():
        total = sum(r["incidence_share"] for r in payload["regions"].values())
        assert abs(total - 1.0) < 0.005, (
            f"disease_priors.json[{disease}] regional shares sum to {total}, expected 1.0 (+/- 0.005)"
        )
    return data


def incidence_for(disease: str) -> Dict[str, Any]:
    """Return the incidence baseline dict for `disease`.

    Falls back to kidney_cancer if the disease isn't known.
    """
    data = disease_priors()
    d = data["diseases"].get(disease) or data["diseases"]["kidney_cancer"]
    return {
        "_provenance": data.get("_provenance"),
        "disease": disease,
        "label": d["label"],
        "icd10": d.get("icd10"),
        "audit_calibrated": d.get("audit_calibrated", False),
        "regions": d["regions"],
    }


def available_diseases() -> List[Dict[str, Any]]:
    data = disease_priors()
    return [
        {
            "key": k,
            "label": v["label"],
            "icd10": v.get("icd10"),
            "audit_calibrated": v.get("audit_calibrated", False),
        }
        for k, v in data["diseases"].items()
    ]


@lru_cache(maxsize=1)
def demographic_priors() -> Dict[str, Any]:
    return _load("demographic_priors.json")


@lru_cache(maxsize=1)
def seer_us() -> Dict[str, Any]:
    data = _load("seer_us_demographics.json")
    race_total = sum(data["race_nh"].values())
    eth_total = sum(data["ethnicity"].values())
    assert abs(race_total - 1.0) < 0.01, f"SEER race_nh sums to {race_total}"
    assert abs(eth_total - 1.0) < 0.01, f"SEER ethnicity sums to {eth_total}"
    return data


@lru_cache(maxsize=1)
def enrollment_priors() -> Dict[str, Any]:
    return _load("enrollment_priors.json")


@lru_cache(maxsize=1)
def audit_studies() -> Dict[str, Any]:
    return _load("audit_98_studies.json")


@lru_cache(maxsize=1)
def country_metadata() -> Dict[str, Any]:
    return _load("country_metadata.json")


def validate_all() -> None:
    """Run all startup assertions. Called from FastAPI lifespan."""
    rcc_incidence()
    disease_priors()
    demographic_priors()
    seer_us()
    enrollment_priors()
    audit_studies()
    country_metadata()


def region_for(country: str) -> str:
    priors = enrollment_priors()
    if country in priors and isinstance(priors[country], dict):
        return priors[country].get("region", "unknown")
    return "unknown"


def supported_countries() -> list[str]:
    return [k for k, v in enrollment_priors().items() if isinstance(v, dict) and "region" in v]
