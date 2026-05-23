"use client";
import { X } from "lucide-react";
import { useEffect } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function MethodologyModal({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white max-w-3xl w-full max-h-[85vh] overflow-y-auto border border-tt-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-tt-border">
          <div>
            <div className="label-eyebrow text-tt-faint">Methodology</div>
            <h2 className="display-h2 mt-1">How TrialTwin works</h2>
          </div>
          <button
            onClick={onClose}
            className="text-tt-muted hover:text-tt-text"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 text-[14px] leading-relaxed">
          <section>
            <h3 className="font-mono uppercase text-[11px] tracking-widest text-tt-faint mb-2">
              What TrialTwin does
            </h3>
            <p>
              TrialTwin runs a Monte Carlo simulation of a planned clinical trial.
              For each of 5,000–10,000 simulated runs, it samples site activation,
              patient screening, demographic composition, and dropout — then
              aggregates the results into regional Representation Quotient (RQ)
              scores and a composite Representation Equity Score (RES).
            </p>
            <p className="mt-2 text-tt-muted">
              It simulates. It does not predict. Outputs reflect what would be
              likely under historical publication patterns, not causal recruitment
              probabilities.
            </p>
          </section>

          <section>
            <h3 className="font-mono uppercase text-[11px] tracking-widest text-tt-faint mb-2">
              Data sources
            </h3>
            <ul className="space-y-2">
              <li>
                <strong>Incidence baseline:</strong> GLOBOCAN 2022 (IARC) regional
                kidney-cancer (C64) shares. Verified at startup to sum to 1.000.
              </li>
              <li>
                <strong>Enrollment priors:</strong> observed country participation
                across 98 NCCN-cited RCC studies in the MIT Critical Data audit.
              </li>
              <li>
                <strong>Demographic priors:</strong> sex and age from national
                cancer registries (SEER, RKI, JCR, etc.) with UN sub-region
                medians as fallbacks (flagged with † in the regional table).
              </li>
              <li>
                <strong>US race/ethnicity:</strong> SEER Explorer, Kidney/Renal
                Pelvis, 2015–2021. Race and Hispanic ethnicity are reported
                separately, never merged.
              </li>
            </ul>
          </section>

          <section>
            <h3 className="font-mono uppercase text-[11px] tracking-widest text-tt-faint mb-2">
              Accessibility index formula
            </h3>
            <pre className="font-mono text-[12px] bg-tt-bg-alt border border-tt-border p-3">
              0.35 · HDI + 0.25 · trials_per_million + 0.20 · cancer_centers_per_million + 0.20 · urbanization
            </pre>
            <p className="mt-2 text-tt-muted text-[13px]">
              Each component is normalized 0–1 across the country set. The result
              shapes site activation probability in the Monte Carlo loop.
            </p>
          </section>

          <section>
            <h3 className="font-mono uppercase text-[11px] tracking-widest text-tt-faint mb-2">
              RES epsilon (ε = 1×10⁻⁴)
            </h3>
            <p>
              RES is a weighted geometric mean of regional RQs with a small additive
              epsilon to keep log(0) defined. Sensitivity-tested across ε ∈ {`{1e-5, 1e-4, 1e-3}`}{" "}
              — regional rankings are stable; see <code>docs/res_epsilon_sensitivity.md</code>.
            </p>
          </section>

          <section>
            <h3 className="font-mono uppercase text-[11px] tracking-widest text-tt-faint mb-2">
              Divergence metrics
            </h3>
            <p>
              We report two descriptive measures, not classical inferential tests:
            </p>
            <ul className="mt-2 space-y-2">
              <li>
                <strong>Jensen-Shannon divergence (JSD):</strong> symmetric,
                bounded [0, 1]. 0 = enrollment perfectly proportionate to disease
                burden; 1 = maximum divergence.
              </li>
              <li>
                <strong>Empirical Chi-Square rate:</strong> fraction of simulated
                runs whose Chi-Square statistic exceeds the α = 0.05 critical
                value. Avoids the spurious analytical p-value problem.
              </li>
            </ul>
          </section>

          <section>
            <h3 className="font-mono uppercase text-[11px] tracking-widest text-tt-faint mb-2">
              Known limitations
            </h3>
            <ol className="list-decimal ml-5 space-y-2 text-[13px]">
              <li>
                Priors reflect publication patterns, not clinical recruitment
                feasibility — they may encode historical exclusion.
              </li>
              <li>
                Regional shares sum to 1 (compositional data); simulation draws
                are not fully independent. Metrics are descriptive.
              </li>
              <li>
                Race/ethnicity simulation is calibrated against US SEER data only.
                It does not apply globally.
              </li>
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
