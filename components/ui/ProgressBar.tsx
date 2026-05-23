interface Props {
  value: number;     // 0..1
  label?: string;
}

export function ProgressBar({ value, label }: Props) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <div>
      {label && (
        <div className="font-mono uppercase text-[10px] tracking-widest text-tt-faint mb-2">
          {label}
        </div>
      )}
      <div className="h-2 w-full bg-tt-bg-alt border border-tt-border">
        <div
          className="h-full bg-tt-accent transition-[width] duration-300"
          style={{ width: `${pct * 100}%` }}
        />
      </div>
      <div className="font-mono text-[10px] mt-2 text-tt-muted">
        {(pct * 100).toFixed(0)}%
      </div>
    </div>
  );
}
