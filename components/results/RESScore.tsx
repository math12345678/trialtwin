"use client";
import { motion } from "framer-motion";
import { RQPill } from "@/components/ui/RQPill";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { useState } from "react";

interface Props {
  score: number;
  label: string;
  symbol: string;
}

export function RESScore({ score, label, symbol }: Props) {
  const [hover, setHover] = useState(false);
  const pct = Math.min(1, score / 1.5);

  return (
    <div className="tt-card relative">
      <div className="flex items-baseline justify-between gap-6">
        <div>
          <div className="label-eyebrow text-tt-faint">Representation Equity Score</div>
          <div className="mt-3 flex items-baseline gap-4">
            <div className="display-h1">
              <AnimatedNumber value={score} decimals={2} duration={1.0} />
            </div>
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6, duration: 0.3 }}
            >
              <RQPill label={label} symbol={symbol} />
            </motion.div>
          </div>
        </div>
        <div
          className="text-right relative cursor-help"
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
        >
          <div className="font-mono text-[10px] uppercase tracking-widest text-tt-faint mb-1">
            Formula
          </div>
          <div className="font-mono text-[11px] text-tt-muted leading-relaxed">
            weighted geo-mean(RQ + ε)
            <br />
            ε = 1×10⁻⁴
          </div>
          {hover && (
            <div className="absolute right-0 top-full mt-2 w-[300px] bg-tt-dark text-white text-[10px] font-mono p-3 leading-snug z-10 text-left">
              RES = exp(Σ incidence_share_r · ln(RQ_r + ε)) − ε,
              clipped to [0, 2]. ε is sensitivity-tested across [1e-5, 1e-3];
              ranking is stable.
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <div className="h-2 bg-tt-bg-alt border border-tt-border relative overflow-hidden">
          <motion.div
            className="h-full bg-tt-accent"
            initial={{ width: 0 }}
            animate={{ width: `${pct * 100}%` }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />
          <div
            className="absolute top-0 bottom-0 border-l border-tt-text"
            style={{ left: `${(1 / 1.5) * 100}%` }}
            aria-hidden
            title="RES = 1.0 (proportionate)"
          />
        </div>
        <div className="mt-2 flex justify-between font-mono text-[10px] text-tt-muted">
          <span>0.00 · severe inequity</span>
          <span>1.00 · proportionate</span>
          <span>1.50 · over</span>
        </div>
      </div>
    </div>
  );
}
