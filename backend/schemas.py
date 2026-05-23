"""Pydantic v2 schemas for the API surface."""
from __future__ import annotations

from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator


class TrialConfig(BaseModel):
    disease: str = "kidney_cancer"
    target_n: int = Field(default=500, ge=50, le=10000)
    n_sites_total: int = Field(default=20, ge=1, le=500)
    countries: List[str] = Field(default_factory=list)
    site_distribution: Dict[str, float] = Field(default_factory=dict)
    min_age: int = Field(default=18, ge=0, le=100)
    max_age: int = Field(default=90, ge=0, le=100)
    sex_restriction: Optional[Literal["male_only", "female_only"]] = None
    prior_treatment_required: bool = False
    n_simulations: int = Field(default=5000, ge=100, le=10000)
    random_seed: Optional[int] = None

    @field_validator("countries")
    @classmethod
    def _at_least_one_country(cls, v):
        if not v:
            raise ValueError("countries must contain at least one ISO alpha-2 code")
        return [c.upper() for c in v]

    @model_validator(mode="after")
    def _post(self):
        if self.max_age < self.min_age:
            raise ValueError("max_age must be >= min_age")
        if not self.site_distribution:
            self.site_distribution = {c: 1.0 / len(self.countries) for c in self.countries}
        else:
            up = {k.upper(): float(v) for k, v in self.site_distribution.items()}
            total = sum(up.values())
            if total <= 0:
                raise ValueError("site_distribution cannot all be zero")
            normalized = {k: v / total for k, v in up.items()}
            for c in self.countries:
                normalized.setdefault(c, 0.0)
            self.site_distribution = normalized
        return self


class RQStats(BaseModel):
    region: str
    label: str
    incidence_share: float
    enrolled_share_mean: float
    rq_mean: float
    rq_p10: float
    rq_p90: float
    zero_enrollment_rate: float
    status_label: str
    status_symbol: str
    fallback_demographic_prior: bool = False


class SexDistribution(BaseModel):
    male_share_mean: float
    female_share_mean: float


class AgeStats(BaseModel):
    mean: float
    p10: float
    p90: float


class RaceDistribution(BaseModel):
    white_nh: float
    black_nh: float
    asian_pi_nh: float
    aian_nh: float
    other_nh: float
    hispanic: float
    non_hispanic: float


class JSDStats(BaseModel):
    mean: float
    p10: float
    p90: float
    min: float
    max: float


class ChiSquareEmpirical(BaseModel):
    alpha: float
    df: int
    critical_value: float
    empirical_significance_rate: float
    stat_mean: float
    stat_p10: float
    stat_p90: float


class Recommendation(BaseModel):
    country_code: str
    country_name: str
    region: str
    region_label: str
    delta_res: float
    new_res: float
    current_region_rq: float
    new_region_rq: float
    feasibility: float
    score: float
    zero_enrollment_rate: float
    rationale: str


class ScenarioComparison(BaseModel):
    base_res: float
    corrected_res: float
    base_jsd: float
    corrected_jsd: float
    applied_country: Optional[str] = None


class DiseaseMeta(BaseModel):
    key: str
    label: str
    icd10: Optional[str] = None
    audit_calibrated: bool = False


class DiseaseListResponse(BaseModel):
    diseases: List[DiseaseMeta]


class SimulationResult(BaseModel):
    run_id: str
    config: TrialConfig
    disease_label: str = "Kidney Cancer (RCC)"
    disease_audit_calibrated: bool = True
    n_simulations_run: int
    base_seed: int
    regional_rq: List[RQStats]
    sex_distribution: SexDistribution
    age_stats: AgeStats
    race_distribution: Optional[RaceDistribution] = None
    representation_equity_score: float
    equity_signal_label: str
    equity_signal_symbol: str
    jsd: JSDStats
    chi_square_empirical: ChiSquareEmpirical
    recommendations: List[Recommendation]
    scenario_comparison: Optional[ScenarioComparison] = None
    executive_summary: str
    warnings: List[str]
    computation_time_ms: int


class ParsedTrial(BaseModel):
    target_n: Optional[int] = None
    min_age: Optional[int] = None
    max_age: Optional[int] = None
    sex_restriction: Optional[Literal["male_only", "female_only"]] = None
    countries: List[str] = Field(default_factory=list)


class HealthResponse(BaseModel):
    status: str
    ollama_available: bool
    model: str


class RunMeta(BaseModel):
    run_id: str
    status: str
    created_at: str
