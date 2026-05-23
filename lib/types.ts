// Mirrors backend/schemas.py

export interface TrialConfig {
  disease: string;
  target_n: number;
  n_sites_total: number;
  countries: string[];
  site_distribution: Record<string, number>;
  min_age: number;
  max_age: number;
  sex_restriction: "male_only" | "female_only" | null;
  prior_treatment_required: boolean;
  n_simulations: number;
  random_seed: number | null;
}

export interface RQStats {
  region: string;
  label: string;
  incidence_share: number;
  enrolled_share_mean: number;
  rq_mean: number;
  rq_p10: number;
  rq_p90: number;
  zero_enrollment_rate: number;
  status_label: string;
  status_symbol: string;
  fallback_demographic_prior: boolean;
}

export interface SexDistribution {
  male_share_mean: number;
  female_share_mean: number;
}

export interface AgeStats {
  mean: number;
  p10: number;
  p90: number;
}

export interface RaceDistribution {
  white_nh: number;
  black_nh: number;
  asian_pi_nh: number;
  aian_nh: number;
  other_nh: number;
  hispanic: number;
  non_hispanic: number;
}

export interface JSDStats {
  mean: number;
  p10: number;
  p90: number;
  min: number;
  max: number;
}

export interface ChiSquareEmpirical {
  alpha: number;
  df: number;
  critical_value: number;
  empirical_significance_rate: number;
  stat_mean: number;
  stat_p10: number;
  stat_p90: number;
}

export interface Recommendation {
  country_code: string;
  country_name: string;
  region: string;
  region_label: string;
  delta_res: number;
  new_res: number;
  current_region_rq: number;
  new_region_rq: number;
  feasibility: number;
  score: number;
  zero_enrollment_rate: number;
  rationale: string;
}

export interface ScenarioComparison {
  base_res: number;
  corrected_res: number;
  base_jsd: number;
  corrected_jsd: number;
  applied_country: string | null;
}

export interface DiseaseMeta {
  key: string;
  label: string;
  icd10?: string;
  audit_calibrated: boolean;
}

export interface SimulationResult {
  run_id: string;
  config: TrialConfig;
  disease_label: string;
  disease_audit_calibrated: boolean;
  n_simulations_run: number;
  base_seed: number;
  regional_rq: RQStats[];
  sex_distribution: SexDistribution;
  age_stats: AgeStats;
  race_distribution: RaceDistribution | null;
  representation_equity_score: number;
  equity_signal_label: string;
  equity_signal_symbol: string;
  jsd: JSDStats;
  chi_square_empirical: ChiSquareEmpirical;
  recommendations: Recommendation[];
  scenario_comparison: ScenarioComparison | null;
  executive_summary: string;
  warnings: string[];
  computation_time_ms: number;
}

export interface CountryMeta {
  code: string;
  name: string;
  region: string;
  lat: number;
  lon: number;
  accessibility_index?: number;
  observed_participation_share?: number;
}

export interface CountryMetadataResponse {
  countries: Record<string, CountryMeta>;
  regions: Record<string, { incidence_share: number; label: string }>;
}

export interface AuditStudy {
  id: string;
  title_abbrev: string;
  year: number;
  journal: string;
  design: string;
  n: number;
  countries: string[];
  regions: string[];
  sex_usable: boolean;
  sex_male_pct: number | null;
  race_usable: boolean;
  age_median: number | null;
  region_primary: string;
}

export interface AuditDataResponse {
  studies: AuditStudy[];
  _provenance: string;
}

export interface ParseResult {
  target_n?: number;
  min_age?: number;
  max_age?: number;
  sex_restriction?: "male_only" | "female_only";
  prior_treatment_required?: boolean;
  countries?: string[];
}
