import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { StatBlock } from "@/components/ui/StatBlock";
import { TerminalPanel } from "@/components/ui/TerminalPanel";

export default function LandingPage() {
  return (
    <div className="mx-auto max-w-tt-container px-6 md:px-12 py-16">
      {/* Hero */}
      <div className="grid md:grid-cols-12 gap-10 items-start">
        <div className="md:col-span-7">
          <div className="label-eyebrow text-tt-accent mb-6">
            ● Clinical trial representation simulator
          </div>
          <h1 className="display-h1">
            Stress-test representation
            <br />
            before recruitment begins.
          </h1>
          <p className="mt-8 text-[17px] text-tt-muted leading-relaxed max-w-[560px]">
            TrialTwin simulates the likely demographic and geographic composition
            of planned clinical trials — grounded in a scientometric audit of 98
            NCCN Kidney Cancer studies conducted with MIT Critical Data.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link href="/simulate" className="tt-btn tt-btn-primary">
              Run simulation <ArrowRight size={14} />
            </Link>
            <Link href="/audit" className="tt-btn tt-btn-secondary">
              Explore audit data
            </Link>
          </div>
          <p className="mt-10 text-[12px] text-tt-faint font-mono">
            Audit: Reddy S., Kang B., Celi L.A. et al. · MIT Critical Data
            Laboratory for Computational Physiology · NCCN Kidney Cancer
            Guidelines v3.2022.
          </p>
        </div>

        <div className="md:col-span-5">
          <TerminalPanel label="Illustrative sample · baseline audit">
            <span className="dim">$ trialtwin --simulate --audit-baseline</span>
            {"\n"}
            <span className="dim"># 98 NCCN-cited RCC studies · 44,636 participants</span>
            {"\n\n"}
            <span className="accent">REGION              INC %    ENROLL %   RQ</span>
            {"\n"}
            North America        22.0     74.8       <span className="risk">2.07</span>
            {"\n"}
            Western Europe       23.2     16.3       <span className="warn">0.70</span>
            {"\n"}
            Eastern Europe       11.2      3.8       <span className="warn">0.34</span>
            {"\n"}
            Asia                 28.5      3.1       <span className="risk">0.11</span>
            {"\n"}
            Oceania               1.8      2.4       <span className="ok">1.33</span>
            {"\n"}
            South America         4.7      1.0       <span className="warn">0.21</span>
            {"\n"}
            Middle East           2.7      0.4       <span className="risk">0.15</span>
            {"\n"}
            <span className="risk">Africa                6.4      0.4       0.07</span>
            {"\n\n"}
            <span className="dim">RES = 0.31  · JSD = 0.42  · χ² rate = 100%</span>
            {"\n"}
            <span className="dim">81% of studies lacked usable racial data.</span>
          </TerminalPanel>
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-10">
        <StatBlock
          value="81%"
          label="of cited RCC studies lacked usable racial data"
          tooltip="Across 98 NCCN-cited RCC studies (MIT Critical Data audit), only 19 reported race/ethnicity in a format that could be analyzed."
        />
        <StatBlock
          value="0.07"
          label="Africa's observed RQ across 98 audit studies"
          tooltip="Africa contributes ~6% of global kidney cancer burden but ~0.4% of audit participants. RQ = enrolled share / incidence share."
        />
        <StatBlock
          value="75%"
          label="of audit participants from North America despite 22% of global disease burden"
          tooltip="Of 44,636 audit participants, ~75% were enrolled at North American sites. North America's observed RQ is 2.07."
        />
      </div>

      {/* Pitch */}
      <div className="mt-24 grid md:grid-cols-2 gap-10 border-t border-tt-border pt-12">
        <div>
          <div className="label-eyebrow text-tt-faint mb-3">The question</div>
          <p className="text-[15px] leading-relaxed text-tt-text">
            If future trials are structured similarly to the 98 published RCC
            studies in the audit evidence base, what demographic and geographic
            composition would we likely observe?
          </p>
        </div>
        <div>
          <div className="label-eyebrow text-tt-faint mb-3">What this is not</div>
          <p className="text-[15px] leading-relaxed text-tt-muted">
            TrialTwin does not predict clinical outcomes, recruitment feasibility,
            or causal access. It is a planning sandbox — not a calibrated
            predictive model.
          </p>
        </div>
      </div>
    </div>
  );
}
