import type { ChiSquareEmpirical, JSDStats } from "@/lib/types";
import { fmtNum, fmtPct } from "@/lib/format";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";

interface Props {
  jsd: JSDStats;
  chi: ChiSquareEmpirical;
}

export function DivergenceMetrics({ jsd, chi }: Props) {
  return (
    <div className="tt-card">
      <div className="label-eyebrow text-tt-faint mb-4">
        Divergence from incidence-proportionate baseline
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <div className="font-mono uppercase text-[10px] tracking-widest text-tt-muted mb-1">
            Jensen-Shannon divergence
          </div>
          <div className="text-[36px] font-medium leading-none">
            <AnimatedNumber value={jsd.mean} decimals={3} duration={1.0} />
          </div>
          <div className="font-mono text-[11px] text-tt-muted mt-2">
            Sim. interval (10–90%): {fmtNum(jsd.p10, 3)}–{fmtNum(jsd.p90, 3)}
          </div>
          <div className="text-[12px] text-tt-muted mt-3 leading-snug">
            0 = enrollment perfectly proportionate to disease burden.
            1 = maximum divergence.
          </div>
        </div>
        <div>
          <div className="font-mono uppercase text-[10px] tracking-widest text-tt-muted mb-1">
            Chi-square empirical rate
          </div>
          <div className="text-[36px] font-medium leading-none">
            <AnimatedNumber
              value={chi.empirical_significance_rate * 100}
              decimals={1}
              duration={1.0}
              suffix="%"
            />
          </div>
          <div className="font-mono text-[11px] text-tt-muted mt-2">
            of simulated runs exceed the χ² critical value at α = {chi.alpha},
            df = {chi.df}
          </div>
          <div className="text-[12px] text-tt-muted mt-3 leading-snug">
            Critical value: {fmtNum(chi.critical_value, 2)}. Statistic mean:{" "}
            {fmtNum(chi.stat_mean, 2)} (range {fmtNum(chi.stat_p10, 1)}–{fmtNum(chi.stat_p90, 1)}).
          </div>
        </div>
      </div>
      <div className="mt-6 hairline" />
      <div className="mt-3 font-mono text-[10px] text-tt-faint">
        Descriptive divergence measures, not classical inferential tests.
        Simulation draws are compositional; independence assumptions do not hold.
      </div>
    </div>
  );
}
