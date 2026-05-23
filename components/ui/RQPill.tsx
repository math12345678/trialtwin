interface Props {
  label: string;
  symbol: string;
  size?: "sm" | "md";
}

const COLORS: Record<string, string> = {
  SEVERE: "bg-tt-risk text-white",
  POOR: "bg-tt-risk text-white",
  UNDER: "bg-tt-caution text-white",
  MODERATE: "bg-tt-caution text-white",
  FAIR: "bg-tt-bg-alt text-tt-text border border-tt-border",
  GOOD: "bg-tt-ok text-white",
  OVER: "bg-tt-ok text-white",
};

export function RQPill({ label, symbol, size = "md" }: Props) {
  const cls = COLORS[label] ?? "bg-tt-bg-alt text-tt-muted";
  const padding = size === "sm" ? "px-2 py-[2px] text-[10px]" : "px-3 py-[4px] text-[11px]";
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono tracking-widest uppercase ${cls} ${padding}`}
    >
      <span aria-hidden>{symbol}</span>
      <span>{label}</span>
    </span>
  );
}
