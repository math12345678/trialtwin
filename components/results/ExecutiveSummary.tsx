interface Props {
  text: string;
  warnings: string[];
}

export function ExecutiveSummary({ text, warnings }: Props) {
  return (
    <div className="tt-card-alt">
      <div className="label-eyebrow text-tt-faint mb-3">Executive summary</div>
      <p className="text-[15px] leading-relaxed text-tt-text">{text}</p>
      {warnings.length > 0 && (
        <div className="mt-5 pt-4 border-t border-tt-border">
          <div className="font-mono uppercase text-[10px] tracking-widest text-tt-caution mb-2">
            ▲ Warnings
          </div>
          <ul className="text-[12px] text-tt-muted space-y-1 list-disc ml-5">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
