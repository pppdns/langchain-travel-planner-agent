export function AgentStatus({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1.5" role="status" aria-live="polite">
      <span className="hud-pips" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span className="font-mono text-[12px] text-accent">{label}</span>
    </div>
  );
}
