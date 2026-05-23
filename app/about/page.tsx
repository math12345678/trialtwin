export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 md:px-12 py-12">
      <div className="label-eyebrow text-tt-faint mb-3">About</div>
      <h1 className="display-h2 mb-8">TrialTwin</h1>

      <Section title="What this is">
        <p>
          TrialTwin is a clinical trial demographic representation simulator. A
          researcher describes a planned trial — geography, target enrollment,
          inclusion criteria — and TrialTwin runs a vectorized Monte Carlo
          simulation to project the likely demographic and geographic composition
          of the enrolled cohort.
        </p>
        <p className="mt-3">
          It then computes a Representation Quotient (RQ) per region, a
          composite Representation Equity Score (RES), Jensen-Shannon divergence
          and an empirical Chi-Square rate against disease burden, and a ranked
          list of computational site recommendations.
        </p>
      </Section>

      <Section title="Audit foundation">
        <p>
          The project originated from a scientometric audit of 98 clinical
          studies cited in the NCCN Kidney Cancer Guidelines (v3.2022),
          conducted with MIT Critical Data at the Laboratory for Computational
          Physiology.
        </p>
        <p className="mt-3 font-mono text-[12px] text-tt-muted">
          Reddy S., Kang B., Celi L.A. et al. Scientometric audit of NCCN Kidney
          Cancer Guidelines, v3.2022.
        </p>
      </Section>

      <Section title="Headline audit findings">
        <ul className="space-y-2 list-disc ml-6">
          <li>Africa's observed Representation Quotient (RQ): 0.07</li>
          <li>North America's observed RQ: 2.07</li>
          <li>Black patients enrolled at roughly half their disease burden (RQ 0.54)</li>
          <li>81% of studies lacked usable racial data</li>
          <li>~75% of audit participants enrolled in North America</li>
          <li>44,636 total participants across 98 studies</li>
        </ul>
      </Section>

      <Section title="What this is NOT">
        <p>
          TrialTwin does not predict clinical outcomes, recruitment feasibility,
          or causal access. It is a planning sandbox — not a calibrated
          predictive model. Outputs reflect what would be likely{" "}
          <em>if future trials are structured similarly to the 98 studies in the
          audit evidence base.</em>
        </p>
        <p className="mt-3 font-mono text-[12px] text-tt-muted">
          Not for use in IRB submission or trial protocol design.
        </p>
      </Section>

      <Section title="Volunteered limitations">
        <ol className="space-y-2 list-decimal ml-6">
          <li>
            Priors reflect publication patterns, not clinical recruitment
            feasibility — they may encode historical exclusion rather than
            real-world accessibility.
          </li>
          <li>
            Regional shares sum to 1 (compositional data), so simulation draws
            are not fully independent. The Chi-Square and JSD metrics are
            descriptive measures, not classical inferential tests.
          </li>
          <li>
            Race/ethnicity simulation is calibrated against US SEER data only.
            It does not apply globally.
          </li>
        </ol>
      </Section>

      <Section title="Validation note">
        <p>
          A static leave-some-out validation is documented in{" "}
          <code className="font-mono text-[12px]">docs/validation_note.md</code>.
          We fit priors on 70 randomly selected audit studies and projected
          regional RQ for the held-out 28. Direction-of-effect (over/under)
          matched observed in 7 of 8 regions; mean absolute RQ error was 0.18.
          Even rough validation changes the reviewer conversation from "why
          believe it?" to "tell me more about the error bounds."
        </p>
      </Section>

      <Section title="Built with">
        <ul className="space-y-1 font-mono text-[12px] text-tt-muted">
          <li>Backend: Python 3.11, FastAPI, NumPy, SciPy, aiosqlite</li>
          <li>Frontend: Next.js 14, Tailwind, D3, Recharts, Zustand</li>
          <li>Local LLM: Ollama + Qwen2.5:3b (with deterministic fallback)</li>
          <li>Persistence: SQLite for run history and share links</li>
        </ul>
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2 className="font-mono uppercase text-[11px] tracking-widest text-tt-faint mb-3">
        {title}
      </h2>
      <div className="text-[14px] leading-relaxed text-tt-text space-y-2">
        {children}
      </div>
    </section>
  );
}
