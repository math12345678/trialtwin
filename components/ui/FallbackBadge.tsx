"use client";
import { useState } from "react";

export function FallbackBadge() {
  const [hover, setHover] = useState(false);
  return (
    <span
      className="relative inline-block cursor-help"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <sup className="text-tt-caution font-mono text-[11px]">†</sup>
      {hover && (
        <span className="absolute z-30 top-full left-0 mt-1 w-[260px] bg-tt-dark text-white text-[10px] font-mono p-2 leading-snug whitespace-normal">
          Sex and age priors fall back to a regional median — country-specific
          registry data was unavailable.
        </span>
      )}
    </span>
  );
}
