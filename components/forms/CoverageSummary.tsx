"use client";
import { useStore } from "@/lib/store";
import { useMemo } from "react";
import { fmtPct } from "@/lib/format";

export function CoverageSummary() {
  const { config, countryMeta } = useStore();

  const stats = useMemo(() => {
    if (!countryMeta) return null;
    const regions = countryMeta.regions;
    const coverage: Record<string, number> = {};
    let totalIncidence = 0;
    for (const code of config.countries) {
      const meta = countryMeta.countries[code];
      if (!meta) continue;
      const region = meta.region;
      // Approximate: each country contributes its observed_participation_share
      // toward its region's incidence representation in this selection.
      coverage[region] = (coverage[region] ?? 0) + 1;
    }
    // Coverage % = sum of incidence share over regions that have ≥1 site
    for (const region of Object.keys(coverage)) {
      totalIncidence += regions[region]?.incidence_share ?? 0;
    }
    return { totalIncidence, regionCount: Object.keys(coverage).length };
  }, [config, countryMeta]);

  if (!stats) {
    return (
      <div className="font-mono text-[11px] text-tt-muted">
        Loading metadata…
      </div>
    );
  }

  return (
    <div className="bg-tt-bg-alt border border-tt-border p-4 font-mono text-[11px]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-tt-faint uppercase tracking-widest">
          Disease burden covered
        </span>
        <span className="mono-num text-[14px] text-tt-text">
          {fmtPct(stats.totalIncidence, 0)}
        </span>
      </div>
      <div className="h-1.5 w-full bg-white border border-tt-border">
        <div
          className="h-full bg-tt-accent"
          style={{ width: `${stats.totalIncidence * 100}%` }}
        />
      </div>
      <div className="mt-3 text-tt-muted">
        {config.countries.length} countries · {stats.regionCount} regions ·
        target N = {config.target_n.toLocaleString()} · {config.n_sites_total}{" "}
        sites
      </div>
    </div>
  );
}
