"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Link as LinkIcon, RefreshCw } from "lucide-react";

import { api, streamRun } from "@/lib/api";
import { useStore } from "@/lib/store";
import { fmtNum } from "@/lib/format";

import { FreeTextParser } from "@/components/forms/FreeTextParser";
import { TrialConfigForm } from "@/components/forms/TrialConfigForm";
import { CoverageSummary } from "@/components/forms/CoverageSummary";
import { WorldMap } from "@/components/map/WorldMap";
import { TerminalPanel } from "@/components/ui/TerminalPanel";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { MethodologyModal } from "@/components/ui/MethodologyModal";

import { RESScore } from "@/components/results/RESScore";
import { RegionalTable } from "@/components/results/RegionalTable";
import { DivergenceMetrics } from "@/components/results/DivergenceMetrics";
import { DemographicPanel } from "@/components/results/DemographicPanel";
import { ScenarioComparisonView } from "@/components/results/ScenarioComparison";
import { RecommendationCard } from "@/components/results/RecommendationCard";
import { ExecutiveSummary } from "@/components/results/ExecutiveSummary";

export default function SimulatePage() {
  const router = useRouter();
  const params = useSearchParams();
  const {
    step,
    config,
    runId,
    progress,
    result,
    error,
    setStep,
    setRunId,
    setProgress,
    setResult,
    setError,
    reset,
  } = useStore();

  const [methOpen, setMethOpen] = useState(false);

  // Recover from share link
  useEffect(() => {
    const urlRun = params.get("run");
    if (urlRun && urlRun !== runId) {
      setRunId(urlRun);
      api
        .getResult(urlRun)
        .then((r) => {
          setResult(r);
          setStep("results");
        })
        .catch(() => {
          setError("Could not load that run — it may have expired.");
        });
    }
  }, [params, runId, setRunId, setResult, setStep, setError]);

  const onSubmit = useCallback(async () => {
    setError(null);
    setProgress({ stage: "queueing", idx: 0, total: 10 });
    setStep("running");
    try {
      const { run_id } = await api.createRun(config);
      setRunId(run_id);
      router.replace(`/simulate?run=${run_id}`);

      streamRun(run_id, (ev) => {
        if (ev.event === "progress") {
          setProgress({ stage: ev.data.stage, idx: ev.data.idx, total: ev.data.total });
        } else if (ev.event === "result") {
          setResult(ev.data);
          setStep("results");
        } else if (ev.event === "error") {
          setError(ev.data.error);
          setStep("configure");
        }
      });
    } catch (e: any) {
      setError(e?.message ?? "failed");
      setStep("configure");
    }
  }, [config, router, setError, setProgress, setRunId, setResult, setStep]);

  return (
    <div className="mx-auto max-w-tt-container px-6 md:px-12 py-10">
      <StepIndicator step={step} />

      {step === "configure" && (
        <ConfigureStep onSubmit={onSubmit} error={error} />
      )}
      {step === "running" && <RunningStep />}
      {step === "results" && result && (
        <ResultsStep
          result={result}
          onMethodology={() => setMethOpen(true)}
          onReset={() => {
            reset();
            router.replace("/simulate");
          }}
        />
      )}

      <MethodologyModal open={methOpen} onClose={() => setMethOpen(false)} />
    </div>
  );
}

function StepIndicator({ step }: { step: string }) {
  const steps = [
    { id: "configure", label: "01 · Configure" },
    { id: "running", label: "02 · Simulate" },
    { id: "results", label: "03 · Results" },
  ];
  return (
    <div className="flex items-center gap-6 mb-10 font-mono uppercase text-[10px] tracking-widest border-b border-tt-border pb-3">
      {steps.map((s) => (
        <span
          key={s.id}
          className={`${
            step === s.id ? "text-tt-text" : "text-tt-faint"
          } transition-colors`}
        >
          {s.label}
        </span>
      ))}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Step 1: Configure
// -----------------------------------------------------------------------------

function ConfigureStep({
  onSubmit,
  error,
}: {
  onSubmit: () => void;
  error: string | null;
}) {
  const { config } = useStore();
  const validate = (): string | null => {
    if (!config.target_n || config.target_n < 50) return "Target N must be ≥ 50";
    if (!config.n_sites_total) return "Total sites must be ≥ 1";
    if (config.countries.length === 0) return "Select at least one country";
    if (config.max_age < config.min_age) return "Max age must be ≥ Min age";
    return null;
  };
  const valErr = validate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !valErr) {
        e.preventDefault();
        onSubmit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [valErr, onSubmit]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7">
          <h2 className="display-h2 mb-2">Configure trial</h2>
          <p className="text-tt-muted text-[14px] mb-8">
            Describe your planned trial. All required fields are marked with *.
            Country site weights auto-normalize.
          </p>
          <FreeTextParser />
          <TrialConfigForm />

          {(valErr || error) && (
            <div className="mt-6 border border-tt-risk bg-white text-tt-risk p-3 text-[12px] font-mono">
              {valErr ?? error}
            </div>
          )}

          <div className="mt-8 flex items-center justify-end gap-4">
            <span className="font-mono text-[10px] text-tt-faint uppercase tracking-widest hidden md:inline">
              ⌘ + Enter to run
            </span>
            <button
              className="tt-btn tt-btn-primary disabled:opacity-50"
              onClick={onSubmit}
              disabled={!!valErr}
            >
              Run simulation <ArrowRight size={14} />
            </button>
          </div>
        </div>

        <div className="lg:col-span-5 hidden md:block">
          <div className="sticky top-6 space-y-6">
            <WorldMap />
            <CoverageSummary />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// -----------------------------------------------------------------------------
// Step 2: Running
// -----------------------------------------------------------------------------

function RunningStep() {
  const { progress, runId, config } = useStore();
  const pct = progress.total > 0 ? progress.idx / progress.total : 0;

  const stageLabel: Record<string, string> = {
    queueing: "Allocating workers",
    start: "Initializing",
    simulate: "Running Monte Carlo",
    stats: "Computing divergence metrics",
    recommend: "Ranking candidate sites",
    done: "Finalizing",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-2xl mx-auto"
    >
      <div className="font-mono text-[10px] uppercase tracking-widest text-tt-faint mb-2">
        RUN_ID · {runId}
      </div>
      <TerminalPanel>
        <span className="dim">$ trialtwin simulate</span>
        {"\n"}
        <span className="dim">  --target_n={config.target_n}</span>
        {"\n"}
        <span className="dim">  --sites={config.n_sites_total}</span>
        {"\n"}
        <span className="dim">  --countries={config.countries.join(",")}</span>
        {"\n"}
        <span className="dim">  --iterations={config.n_simulations}</span>
        {"\n\n"}
        <span className="ok">▸ {stageLabel[progress.stage] ?? progress.stage}</span>
        <span className="terminal-cursor" />
        {"\n"}
        <span className="dim">  chunk {progress.idx} / {progress.total}</span>
      </TerminalPanel>
      <div className="mt-6">
        <ProgressBar value={pct} label="Simulation progress" />
      </div>
      <div className="mt-6 font-mono text-[11px] text-tt-muted leading-relaxed">
        Simulation runs in a process pool. Each chunk is a vectorized NumPy batch.
        Progress streams over Server-Sent Events. Results persist to SQLite — your
        share link will work after refresh.
      </div>
    </motion.div>
  );
}

// -----------------------------------------------------------------------------
// Step 3: Results
// -----------------------------------------------------------------------------

function ResultsStep({
  result,
  onMethodology,
  onReset,
}: {
  result: any;
  onMethodology: () => void;
  onReset: () => void;
}) {
  const hasUS = result.config.countries.includes("US");
  const setToast = useStore((s) => s.setToast);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (topRef.current) {
      topRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result.run_id]);

  function copyShareLink() {
    const url = `${window.location.origin}/simulate?run=${result.run_id}`;
    navigator.clipboard.writeText(url);
    setToast("Share link copied");
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      <div ref={topRef}>
        <div className="flex items-center gap-3 mb-1">
          <h2 className="display-h2">Simulation result</h2>
          {result.disease_label && (
            <span className="font-mono uppercase text-[10px] tracking-widest bg-tt-bg-alt border border-tt-border px-2 py-1 text-tt-muted">
              {result.disease_label}
              {result.disease_audit_calibrated && " · audit-calibrated"}
            </span>
          )}
        </div>
        <p className="mt-2 text-tt-muted text-[14px]">
          Run ID <span className="font-mono text-[12px]">{result.run_id}</span>{" "}
          · seed <span className="font-mono text-[12px]">{result.base_seed}</span>{" "}
          · computed in {fmtNum(result.computation_time_ms / 1000, 1)}s
        </p>
        <div className="mt-3 font-mono text-[11px] text-tt-faint border-l border-tt-border pl-3">
          Simulation priors: 98 NCCN-cited RCC studies (MIT Critical Data audit) ·
          GLOBOCAN 2022 incidence · US SEER 2015–2021 ·{" "}
          <button
            onClick={onMethodology}
            className="text-tt-accent underline underline-offset-2 hover:no-underline"
          >
            View methodology
          </button>
        </div>
      </div>

      <RESScore
        score={result.representation_equity_score}
        label={result.equity_signal_label}
        symbol={result.equity_signal_symbol}
      />

      <RegionalTable rows={result.regional_rq} />

      <DivergenceMetrics jsd={result.jsd} chi={result.chi_square_empirical} />

      <DemographicPanel
        sex={result.sex_distribution}
        age={result.age_stats}
        race={result.race_distribution}
        hasUS={hasUS}
      />

      {result.scenario_comparison && (
        <ScenarioComparisonView scenario={result.scenario_comparison} />
      )}

      {result.recommendations.length > 0 && (
        <section>
          <div className="label-eyebrow text-tt-faint mb-4">
            Computational recommendations
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {result.recommendations.map((r: any, i: number) => (
              <RecommendationCard key={r.country_code} rec={r} index={i} />
            ))}
          </div>
        </section>
      )}

      <ExecutiveSummary
        text={result.executive_summary}
        warnings={result.warnings}
      />

      <div className="flex justify-end gap-3 border-t border-tt-border pt-6">
        <button className="tt-btn tt-btn-secondary" onClick={onReset}>
          <RefreshCw size={14} /> Reconfigure trial
        </button>
        <button className="tt-btn tt-btn-primary" onClick={copyShareLink}>
          <LinkIcon size={14} /> Copy share link
        </button>
      </div>
    </motion.div>
  );
}
