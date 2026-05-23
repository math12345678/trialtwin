interface Props {
  children: React.ReactNode;
  label?: string;
}

export function TerminalPanel({ children, label }: Props) {
  return (
    <div className="relative">
      {label && (
        <div className="absolute right-3 top-2 font-mono text-[9px] tracking-widest text-tt-faint uppercase">
          {label}
        </div>
      )}
      <pre className="terminal">{children}</pre>
    </div>
  );
}
