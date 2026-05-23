"use client";
import type { Recommendation } from "@/lib/types";
import { fmtNum, fmtPct } from "@/lib/format";
import { motion } from "framer-motion";

export function RecommendationCard({ rec, index }: { rec: Recommendation; index: number }) {
  return (
    <motion.div
      className="tt-card relative cursor-default"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.12, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
    >
      <div className="flex items-center justify-between">
        <div className="label-eyebrow text-tt-faint">
          Recommendation #{index + 1}
        </div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-tt-accent">
          Δ RES + {fmtNum(rec.delta_res, 3)}
        </div>
      </div>

      <div className="mt-4">
        <div className="font-mono text-[11px] text-tt-faint mb-1 tracking-widest uppercase">
          {rec.region_label}
        </div>
        <div className="text-[22px] font-semibold leading-tight">
          {rec.country_name} <span className="text-tt-muted font-normal">({rec.country_code})</span>
        </div>
      </div>

      <div className="mt-4 hairline" />

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Stat
          label="Region RQ now"
          value={fmtNum(rec.current_region_rq, 2)}
        />
        <Stat
          label="After site"
          value={fmtNum(rec.new_region_rq, 2)}
          accent
        />
        <Stat
          label="Feasibility"
          value={fmtPct(rec.feasibility, 0)}
        />
      </div>

      <p className="mt-5 text-[13px] leading-relaxed text-tt-text">
        {rec.rationale}
      </p>

      {rec.zero_enrollment_rate > 0.05 && (
        <div className="mt-3 font-mono text-[10px] text-tt-caution">
          zero-enrollment risk: {fmtPct(rec.zero_enrollment_rate, 0)}
        </div>
      )}
    </motion.div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className="font-mono uppercase text-[9px] tracking-widest text-tt-faint">
        {label}
      </div>
      <div
        className={`mono-num text-[18px] mt-1 ${accent ? "text-tt-accent" : "text-tt-text"}`}
      >
        {value}
      </div>
    </div>
  );
}
