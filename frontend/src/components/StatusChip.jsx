import { useEffect, useRef } from 'react';

const STATUS_CONFIG = {
  sell:    { color: 'var(--sell)',    label: 'SELL',    desc: 'Still holds resale value as-is' },
  color_sell_dim: 'var(--sell-dim)',
  repair:  { color: 'var(--repair)',  label: 'REPAIR',  desc: 'Fixing it recovers more than it costs' },
  color_repair_dim: 'var(--repair-dim)',
  recycle: { color: 'var(--recycle)', label: 'RECYCLE', desc: 'Not economical to fix or resell whole' },
  color_recycle_dim: 'var(--recycle-dim)',
  upgrade: { color: 'var(--upgrade)', label: 'UPGRADE', desc: 'Past its useful life — time for new hardware' },
  color_upgrade_dim: 'var(--upgrade-dim)',
};

export default function StatusChip({ status, size = 'md', animate = false }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.sell;
  const ref = useRef(null);

  useEffect(() => {
    if (!animate || !ref.current) return;
    ref.current.style.animation = 'none';
    void ref.current.offsetHeight; // Force reflow
    ref.current.style.animation = '';
  }, [animate, status]);

  const sizeClass = size === 'lg' ? 'text-[9px] px-3.5 py-1.5' : 'text-[8px] px-2.5 py-1';
  const dotSize = size === 'lg' ? 'h-1.5 w-1.5' : 'h-1 w-1';

  return (
    <span
      ref={ref}
      className={`chip rounded-full ${sizeClass} ${animate ? 'status-chip-pulse' : ''}`}
      style={{
        color: cfg.color,
        background: `color-mix(in srgb, ${cfg.color} 10%, transparent)`,
        borderColor: `color-mix(in srgb, ${cfg.color} 25%, transparent)`,
      }}
    >
      <span className={`${dotSize} rounded-full`} style={{ background: cfg.color }} />
      {cfg.label}
      <style>{`
        @keyframes chipPulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        .status-chip-pulse { animation: chipPulse 0.4s ease-out; }
      `}</style>
    </span>
  );
}

export { STATUS_CONFIG };
