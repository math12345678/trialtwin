"use client";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import { fmtPct } from "@/lib/format";
import { X, Plus } from "lucide-react";

export function TrialConfigForm() {
  const { config, countryMeta, diseases, setConfig, setCountryMeta, setDiseases } = useStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!countryMeta) {
      api.countryMetadata().then(setCountryMeta).catch(console.error);
    }
    if (diseases.length === 0) {
      api.diseases().then((r) => setDiseases(r.diseases)).catch(console.error);
    }
  }, [countryMeta, diseases.length, setCountryMeta, setDiseases]);

  const availableCountries = useMemo(() => {
    if (!countryMeta) return [];
    return Object.values(countryMeta.countries).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [countryMeta]);

  function setCountryWeight(code: string, weight: number) {
    const next = { ...config.site_distribution, [code]: Math.max(0, weight) };
    setConfig({ site_distribution: next });
  }

  function addCountry(code: string) {
    if (!code) return;
    if (config.countries.includes(code)) return;
    const equal = 1 / (config.countries.length + 1);
    const newDist: Record<string, number> = {};
    [...config.countries, code].forEach((c) => (newDist[c] = equal));
    setConfig({
      countries: [...config.countries, code],
      site_distribution: newDist,
    });
  }

  function removeCountry(code: string) {
    const next = config.countries.filter((c) => c !== code);
    const dist = { ...config.site_distribution };
    delete dist[code];
    setConfig({ countries: next, site_distribution: dist });
  }

  const weightSum = useMemo(() => {
    return config.countries.reduce(
      (acc, c) => acc + (config.site_distribution[c] ?? 0),
      0
    );
  }, [config]);

  return (
    <div className="space-y-8">
      {error && (
        <div className="border border-tt-risk bg-white text-tt-risk p-3 text-[12px]">
          {error}
        </div>
      )}

      <Section title="Disease & Cohort">
        <Field label="Disease Area">
          <select
            className="tt-input"
            value={config.disease}
            onChange={(e) => setConfig({ disease: e.target.value })}
          >
            {diseases.length === 0 && (
              <option value="kidney_cancer">Kidney Cancer (RCC)</option>
            )}
            {diseases.map((d) => (
              <option key={d.key} value={d.key}>
                {d.label}
                {d.icd10 ? `  ·  ${d.icd10}` : ""}
                {d.audit_calibrated ? "  · audit-calibrated" : ""}
              </option>
            ))}
          </select>
          {(() => {
            const d = diseases.find((x) => x.key === config.disease);
            if (!d) return null;
            return (
              <div className="font-mono text-[10px] text-tt-muted mt-2 leading-snug">
                {d.audit_calibrated
                  ? `Calibrated against MIT Critical Data audit · ${d.icd10 ?? ""}`
                  : `Demonstration priors only · ${d.icd10 ?? ""}`}
              </div>
            );
          })()}
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Target Enrollment (N) *">
            <input
              type="number"
              min={50}
              max={10000}
              className="tt-input mono-num"
              value={config.target_n}
              onChange={(e) =>
                setConfig({ target_n: parseInt(e.target.value || "0", 10) })
              }
            />
          </Field>
          <Field label="Total Sites *">
            <input
              type="number"
              min={1}
              max={500}
              className="tt-input mono-num"
              value={config.n_sites_total}
              onChange={(e) =>
                setConfig({ n_sites_total: parseInt(e.target.value || "0", 10) })
              }
            />
          </Field>
        </div>
      </Section>

      <Section title="Geography">
        <Field label={`Site Countries (${config.countries.length}) *`}>
          <div className="border border-tt-border bg-white">
            <div className="max-h-[260px] overflow-y-auto">
              {config.countries.length === 0 && (
                <div className="text-tt-muted text-[13px] p-4">
                  Add countries below to define the trial geography.
                </div>
              )}
              {config.countries.map((code) => {
                const meta = countryMeta?.countries[code];
                const weight = config.site_distribution[code] ?? 0;
                return (
                  <div
                    key={code}
                    className="flex items-center gap-3 px-3 py-2 border-b border-tt-border last:border-0"
                  >
                    <span className="font-mono text-[11px] text-tt-faint w-6">
                      {code}
                    </span>
                    <span className="flex-1 text-[13px]">{meta?.name ?? code}</span>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={weight.toFixed(3)}
                      onChange={(e) =>
                        setCountryWeight(code, parseFloat(e.target.value || "0"))
                      }
                      className="tt-input mono-num !w-[100px] !py-1 !text-[12px]"
                    />
                    <button
                      onClick={() => removeCountry(code)}
                      className="text-tt-muted hover:text-tt-risk"
                      aria-label="Remove"
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-tt-border p-2">
              <CountrySelect
                onAdd={addCountry}
                exclude={config.countries}
                options={availableCountries}
              />
            </div>
          </div>
          <div className="font-mono text-[10px] text-tt-muted mt-2">
            Weights auto-normalize on submission. Current sum: {weightSum.toFixed(3)}
          </div>
        </Field>
      </Section>

      <Section title="Inclusion Criteria">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Min Age *">
            <input
              type="number"
              min={0}
              max={100}
              className="tt-input mono-num"
              value={config.min_age}
              onChange={(e) =>
                setConfig({ min_age: parseInt(e.target.value || "0", 10) })
              }
            />
          </Field>
          <Field label="Max Age *">
            <input
              type="number"
              min={0}
              max={100}
              className="tt-input mono-num"
              value={config.max_age}
              onChange={(e) =>
                setConfig({ max_age: parseInt(e.target.value || "0", 10) })
              }
            />
          </Field>
        </div>

        <Field label="Sex Restriction">
          <div className="flex gap-4 text-[13px]">
            {[
              { v: null, label: "Any" },
              { v: "male_only", label: "Male only" },
              { v: "female_only", label: "Female only" },
            ].map((opt) => (
              <label key={String(opt.v)} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="sex_restriction"
                  checked={config.sex_restriction === opt.v}
                  onChange={() =>
                    setConfig({ sex_restriction: opt.v as any })
                  }
                />
                {opt.label}
              </label>
            ))}
          </div>
        </Field>

        <Field label="Prior treatment required">
          <label className="flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={config.prior_treatment_required}
              onChange={(e) =>
                setConfig({ prior_treatment_required: e.target.checked })
              }
            />
            Patients must be treatment-experienced
          </label>
          {config.prior_treatment_required && (
            <div className="font-mono text-[10px] text-tt-muted mt-1">
              Modeling assumption: accessible patient pool reduced by ~30%.
            </div>
          )}
        </Field>
      </Section>

      <Section title="Simulation">
        <Field label="Iterations">
          <div className="flex gap-2 font-mono text-[12px]">
            {[1000, 5000, 10000].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setConfig({ n_simulations: n })}
                className={`px-4 py-2 border ${
                  config.n_simulations === n
                    ? "border-tt-text bg-tt-text text-white"
                    : "border-tt-border bg-white text-tt-text hover:bg-tt-bg-alt"
                }`}
              >
                {n.toLocaleString()}
              </button>
            ))}
          </div>
        </Field>

        <details>
          <summary className="cursor-pointer text-[12px] font-mono uppercase tracking-widest text-tt-muted">
            Advanced
          </summary>
          <div className="mt-3">
            <Field label="Random seed (optional)">
              <input
                type="number"
                className="tt-input mono-num"
                value={config.random_seed ?? ""}
                placeholder="leave empty for random"
                onChange={(e) =>
                  setConfig({
                    random_seed: e.target.value
                      ? parseInt(e.target.value, 10)
                      : null,
                  })
                }
              />
            </Field>
          </div>
        </details>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="label-eyebrow text-tt-faint mb-4 border-b border-tt-border pb-2">
        {title}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-mono uppercase text-[10px] tracking-widest text-tt-faint mb-2">
        {label}
      </div>
      {children}
    </div>
  );
}

function CountrySelect({
  onAdd,
  exclude,
  options,
}: {
  onAdd: (code: string) => void;
  exclude: string[];
  options: { code: string; name: string }[];
}) {
  const [value, setValue] = useState("");
  return (
    <div className="flex gap-2">
      <select
        className="tt-input flex-1 !py-1 !text-[12px]"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      >
        <option value="">+ Add country…</option>
        {options
          .filter((o) => !exclude.includes(o.code))
          .map((o) => (
            <option key={o.code} value={o.code}>
              {o.name} ({o.code})
            </option>
          ))}
      </select>
      <button
        type="button"
        className="tt-btn tt-btn-secondary"
        disabled={!value}
        onClick={() => {
          onAdd(value);
          setValue("");
        }}
      >
        <Plus size={12} />
      </button>
    </div>
  );
}
