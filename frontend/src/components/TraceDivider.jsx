export default function TraceDivider({ label }) {
  if (!label) {
    return <div className="trace-divider my-4" aria-hidden="true" />;
  }
  return (
    <div className="flex items-center gap-3 py-2 select-none" aria-hidden="true">
      <div className="trace-divider flex-1" />
      <span className="font-mono text-[9px] tracking-wider text-[var(--text-dim)] uppercase whitespace-nowrap px-2 border border-[var(--border)] rounded-[var(--radius-sm)] bg-[var(--surface-2)]">
        {label}
      </span>
      <div className="trace-divider flex-1" />
    </div>
  );
}
