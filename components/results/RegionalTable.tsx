"use client";
import type { RQStats } from "@/lib/types";
import { RQPill } from "@/components/ui/RQPill";
import { FallbackBadge } from "@/components/ui/FallbackBadge";
import { fmtNum, fmtPct } from "@/lib/format";

interface Props {
  rows: RQStats[];
}

export function RegionalTable({ rows }: Props) {
  return (
    <div className="tt-card !p-0 overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-left">
            {[
              "Region",
              "Incidence",
              "Projected share",
              "RQ (mean)",
              "Sim. interval (10–90%)",
              "Zero enrollment rate",
              "Status",
            ].map((h) => (
              <th
                key={h}
                className="font-mono uppercase text-[10px] tracking-widest text-tt-faint px-4 py-3 border-b border-tt-border"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.region} className="border-b border-tt-border last:border-0">
              <td className="px-4 py-3 align-top">
                <div className="font-medium">
                  {r.label}
                  {r.fallback_demographic_prior && <FallbackBadge />}
                </div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-tt-faint">
                  {r.region}
                </div>
              </td>
              <td className="px-4 py-3 mono-num align-top">
                {fmtPct(r.incidence_share)}
              </td>
              <td className="px-4 py-3 mono-num align-top">
                {fmtPct(r.enrolled_share_mean)}
              </td>
              <td className="px-4 py-3 mono-num align-top">
                {fmtNum(r.rq_mean, 2)}
              </td>
              <td className="px-4 py-3 mono-num align-top text-tt-muted">
                {fmtNum(r.rq_p10, 2)}–{fmtNum(r.rq_p90, 2)}
              </td>
              <td className="px-4 py-3 mono-num align-top">
                {r.zero_enrollment_rate > 0.01 ? fmtPct(r.zero_enrollment_rate, 0) : "—"}
              </td>
              <td className="px-4 py-3 align-top">
                <RQPill label={r.status_label} symbol={r.status_symbol} size="sm" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-tt-border px-4 py-3 font-mono text-[10px] text-tt-faint">
        Priors reflect observed participation in 98 published studies, not causal
        recruitment probability. † = country uses regional fallback for demographic
        prior.
      </div>
    </div>
  );
}
