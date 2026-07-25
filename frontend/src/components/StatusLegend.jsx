import StatusChip, { STATUS_CONFIG } from './StatusChip';

// Clean SVG inline icons representing Sell, Repair, Recycle, and Upgrade actions
function SellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--sell)]">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  );
}

function RepairIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--repair)]">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
  );
}

function RecycleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--recycle)]">
      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
    </svg>
  );
}

function UpgradeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--upgrade)]">
      <polyline points="18 8 22 12 18 16"/><line x1="2" y1="12" x2="22" y2="12"/>
    </svg>
  );
}

const ACTION_ICONS = {
  sell: <SellIcon />,
  repair: <RepairIcon />,
  recycle: <RecycleIcon />,
  upgrade: <UpgradeIcon />,
};

export default function StatusLegend() {
  const configs = {
    sell: STATUS_CONFIG.sell,
    repair: STATUS_CONFIG.repair,
    recycle: STATUS_CONFIG.recycle,
    upgrade: STATUS_CONFIG.upgrade,
  };

  return (
    <section className="mx-auto max-w-6xl px-6 py-24 md:py-32 space-y-12 relative" aria-label="Diagnostic verdicts explanation">
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <span className="section-label">Structured Diagnostics</span>
        <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text)] tracking-tight">Four Intelligent Verdicts</h2>
        <p className="text-sm sm:text-base text-[var(--text-muted)] leading-relaxed">
          Our classification models evaluate device age, power status, and primary damage values to determine the most economical option.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {Object.entries(configs).map(([key, cfg]) => {
          return (
            <div
              key={key}
              className="card p-6 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-xl)] shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--surface-2)] shadow-sm">
                    {ACTION_ICONS[key]}
                  </div>
                  <StatusChip status={key} size="sm" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-[var(--text)]">{cfg.label} Option</h3>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">{cfg.desc}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
