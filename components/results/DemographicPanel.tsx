"use client";
import type { AgeStats, RaceDistribution, SexDistribution } from "@/lib/types";
import { fmtPct, fmtNum } from "@/lib/format";

interface Props {
  sex: SexDistribution;
  age: AgeStats;
  race: RaceDistribution | null;
  hasUS: boolean;
}

export function DemographicPanel({ sex, age, race, hasUS }: Props) {
  return (
    <div className="tt-card">
      <div className="label-eyebrow text-tt-faint mb-4">Projected demographics</div>

      <div className="grid md:grid-cols-3 gap-6">
        <div>
          <div className="font-mono uppercase text-[10px] tracking-widest text-tt-muted mb-2">
            Sex
          </div>
          <div className="space-y-2 text-[13px]">
            <Bar label="Male" pct={sex.male_share_mean} />
            <Bar label="Female" pct={sex.female_share_mean} />
          </div>
        </div>
        <div>
          <div className="font-mono uppercase text-[10px] tracking-widest text-tt-muted mb-2">
            Age
          </div>
          <div className="mono-num text-[28px] leading-none">{fmtNum(age.mean, 1)}</div>
          <div className="font-mono text-[11px] text-tt-muted mt-2">
            mean · sim. interval {fmtNum(age.p10, 1)}–{fmtNum(age.p90, 1)}
          </div>
        </div>
        <div>
          <div className="font-mono uppercase text-[10px] tracking-widest text-tt-muted mb-2">
            Iterations
          </div>
          <div className="mono-num text-[28px] leading-none">∞</div>
          <div className="font-mono text-[11px] text-tt-muted mt-2">
            sex draws are binomial per country
          </div>
        </div>
      </div>

      <div className="mt-8 hairline" />
      <div className="mt-6">
        <div className="font-mono uppercase text-[10px] tracking-widest text-tt-muted mb-2">
          Race (non-Hispanic) and Hispanic ethnicity · US-only
        </div>
        {!hasUS && (
          <div className="text-[13px] text-tt-muted bg-tt-bg-alt border border-tt-border p-4">
            Race/ethnicity simulation is calibrated for US SEER data only.
            <br />
            19 of 98 audit studies had usable race data. Projections are not
            shown for trials without US sites.
          </div>
        )}
        {hasUS && race && (
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="font-mono text-[10px] text-tt-faint uppercase mb-1">
                Race (non-Hispanic)
              </div>
              <div className="space-y-2 text-[13px]">
                <Bar label="White" pct={race.white_nh} />
                <Bar label="Black" pct={race.black_nh} />
                <Bar label="Asian / Pacific Islander" pct={race.asian_pi_nh} />
                <Bar label="American Indian / AN" pct={race.aian_nh} />
                <Bar label="Other / Unknown" pct={race.other_nh} />
              </div>
            </div>
            <div>
              <div className="font-mono text-[10px] text-tt-faint uppercase mb-1">
                Hispanic ethnicity
              </div>
              <div className="space-y-2 text-[13px]">
                <Bar label="Hispanic" pct={race.hispanic} />
                <Bar label="Non-Hispanic" pct={race.non_hispanic} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Bar({ label, pct }: { label: string; pct: number }) {
  return (
    <div>
      <div className="flex justify-between text-[12px]">
        <span>{label}</span>
        <span className="mono-num text-tt-muted">{fmtPct(pct)}</span>
      </div>
      <div className="h-1.5 bg-tt-bg-alt border border-tt-border mt-1">
        <div className="h-full bg-tt-text" style={{ width: `${pct * 100}%` }} />
      </div>
    </div>
  );
}
