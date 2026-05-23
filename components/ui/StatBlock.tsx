"use client";
import { useState } from "react";
import { motion } from "framer-motion";

interface Props {
  value: string;
  label: string;
  tooltip?: string;
}

export function StatBlock({ value, label, tooltip }: Props) {
  const [hover, setHover] = useState(false);
  return (
    <motion.div
      className="relative border-l border-tt-border pl-5 cursor-default"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      whileHover={{ x: 4, transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] } }}
    >
      <div className="mono-num text-[44px] font-medium leading-none tracking-tight">
        {value}
      </div>
      <div className="mt-2 text-[13px] text-tt-muted leading-snug max-w-[200px]">
        {label}
      </div>
      {tooltip && hover && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute z-20 top-full left-0 mt-2 w-[280px] bg-tt-dark text-white text-[11px] font-mono p-3 leading-snug shadow-lg"
        >
          <div className="text-tt-faint mb-1 text-[9px] uppercase tracking-widest">
            Source
          </div>
          {tooltip}
        </motion.div>
      )}
    </motion.div>
  );
}
