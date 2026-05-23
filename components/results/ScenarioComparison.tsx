import type { ScenarioComparison } from "@/lib/types";
import { fmtNum } from "@/lib/format";
import { ArrowRight } from "lucide-react";

interface Props {
  scenario: ScenarioComparison | null;
}

export function ScenarioComparisonView({ scenario }: Props) {
  if (!scenario) return null;
  return (
    <div className="tt-card">
      <div className="label-eyebrow text-tt-faint mb-4">Scenario comparison</div>
      <div className="grid grid-cols-2 gap-6">
        <Column
          label="Base plan"
          res={scenario.base_res}
          jsd={scenario.base_jsd}
        />
        <Column
          label={`+ ${scenario.applied_country ?? "top recommendation"}`}
          res={scenario.corrected_res}
          jsd={scenario.corrected_jsd}
          highlight
        />
      </div>
      <div className="hairline mt-6" />
      <div className="font-mono text-[10px] text-tt-faint mt-3 flex items-center gap-2">
        <ArrowRight size={11} /> Equity-corrected plan applies the top
        recommendation at 5% site weight, scaling other countries proportionally.
      </div>
    </div>
  );
}

function Column({
  label,
  res,
  jsd,
  highlight,
}: {
  label: string;
  res: number;
  jsd: number;
  highlight?: boolean;
}) {
  return (
    <div className={highlight ? "border-l border-tt-accent pl-4" : "border-l border-tt-border pl-4"}>
      <div className="font-mono uppercase text-[10px] tracking-widest text-tt-faint mb-2">
        {label}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[10px] text-tt-muted">RES</span>
        <span className="mono-num text-[28px] leading-none">{fmtNum(res, 2)}</span>
      </div>
      <div className="flex items-baseline gap-2 mt-2">
        <span className="font-mono text-[10px] text-tt-muted">JSD</span>
        <span className="mono-num text-[16px] text-tt-muted">{fmtNum(jsd, 3)}</span>
      </div>
    </div>
  );
}
