import { create } from "zustand";
import type {
  CountryMetadataResponse,
  DiseaseMeta,
  ParseResult,
  SimulationResult,
  TrialConfig,
} from "./types";

export type SimStep = "configure" | "running" | "results";

interface ProgressState {
  stage: string;
  idx: number;
  total: number;
}

interface AppState {
  step: SimStep;
  config: TrialConfig;
  countryMeta: CountryMetadataResponse | null;
  diseases: DiseaseMeta[];
  runId: string | null;
  progress: ProgressState;
  result: SimulationResult | null;
  error: string | null;
  toast: string | null;

  setStep: (s: SimStep) => void;
  setConfig: (c: Partial<TrialConfig>) => void;
  applyParsed: (p: ParseResult) => void;
  setCountryMeta: (m: CountryMetadataResponse) => void;
  setDiseases: (d: DiseaseMeta[]) => void;
  setRunId: (id: string | null) => void;
  setProgress: (p: ProgressState) => void;
  setResult: (r: SimulationResult | null) => void;
  setError: (e: string | null) => void;
  setToast: (t: string | null) => void;
  reset: () => void;
}

const defaultConfig: TrialConfig = {
  disease: "kidney_cancer",
  target_n: 600,
  n_sites_total: 30,
  countries: ["US", "DE", "FR", "GB", "CA", "AU", "JP"],
  site_distribution: {},
  min_age: 18,
  max_age: 90,
  sex_restriction: null,
  prior_treatment_required: false,
  n_simulations: 5000,
  random_seed: null,
};

export const useStore = create<AppState>((set, get) => ({
  step: "configure",
  config: defaultConfig,
  countryMeta: null,
  diseases: [],
  runId: null,
  progress: { stage: "idle", idx: 0, total: 0 },
  result: null,
  error: null,
  toast: null,

  setStep: (s) => set({ step: s }),
  setConfig: (c) => set({ config: { ...get().config, ...c } }),
  setDiseases: (d) => set({ diseases: d }),
  setToast: (t) => set({ toast: t }),
  applyParsed: (p) =>
    set((state) => {
      const next: TrialConfig = { ...state.config };
      if (typeof p.target_n === "number") next.target_n = p.target_n;
      if (typeof p.min_age === "number") next.min_age = p.min_age;
      if (typeof p.max_age === "number") next.max_age = p.max_age;
      if (p.sex_restriction) next.sex_restriction = p.sex_restriction;
      if (p.prior_treatment_required !== undefined)
        next.prior_treatment_required = p.prior_treatment_required;
      if (p.countries && p.countries.length) {
        next.countries = p.countries;
        next.site_distribution = {};
      }
      return { config: next };
    }),
  setCountryMeta: (m) => set({ countryMeta: m }),
  setRunId: (id) => set({ runId: id }),
  setProgress: (p) => set({ progress: p }),
  setResult: (r) => set({ result: r }),
  setError: (e) => set({ error: e }),
  reset: () =>
    set({
      step: "configure",
      runId: null,
      progress: { stage: "idle", idx: 0, total: 0 },
      result: null,
      error: null,
    }),
}));
