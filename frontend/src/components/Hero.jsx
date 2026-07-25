export default function Hero({ onStart }) {
  return (
    <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-28 bg-[var(--bg)]">
      {/* Background radial gradient glow for premium feel */}
      <div className="hero-glow" aria-hidden="true" />

      <div className="mx-auto max-w-6xl px-6 relative z-10 grid lg:grid-cols-12 gap-12 items-center">
        {/* Left copy: 5 columns */}
        <div className="lg:col-span-6 space-y-8 text-left">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-[var(--accent)] bg-[var(--accent-dim)] rounded-full border border-[var(--accent)]/10">
              ● capstone electronics diagnostic platform
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[var(--text)] leading-[1.1]">
              Every dead gadget has a <span className="text-[var(--accent)]">salvage value.</span>
            </h1>
          </div>

          <p className="text-base sm:text-lg text-[var(--text-muted)] leading-relaxed max-w-xl">
            Photograph your damaged electronics. Our trained classifier models analyze the cracks, scratches, and battery health to deliver an instant sell, repair, or recycle recommendation with local repair shop fallbacks.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={onStart}
              className="btn btn-warm text-sm font-semibold px-7 py-3.5 shadow-md hover:-translate-y-0.5 transition-transform"
            >
              Analyze Your Device →
            </button>
            <span className="text-xs text-[var(--text-dim)] border border-[var(--border)] px-3 py-2 rounded-lg bg-[var(--surface)] shadow-sm font-medium">
              Spark free tier APIs only
            </span>
          </div>

          {/* Premium trust markers row */}
          <div className="pt-8 border-t border-[var(--border)]">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">Diagnostic Verification Stats</p>
            <div className="grid grid-cols-3 gap-6">
              {[
                { val: '87.3%', label: 'RF accuracy' },
                { val: '1,200+', label: 'scans processed' },
                { val: '₹0 budget', label: 'genuiningly free' },
              ].map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <p className="text-lg font-bold text-[var(--text)]">{item.val}</p>
                  <p className="text-xs text-[var(--text-muted)]">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right device mockup graphic: 6 columns */}
        <div className="lg:col-span-6 flex justify-center items-center relative">
          <div className="relative w-full max-w-[340px] aspect-[3/4] bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 shadow-xl hover:-translate-y-1 transition-transform duration-300">
            {/* Bounding box HUD overlays styled like a premium SaaS dashboard */}
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)] animate-pulse" />
              <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Inference Scan Active</span>
            </div>
            <div className="absolute bottom-4 right-4 text-[10px] text-[var(--text-dim)] font-medium">
              YOLOv8 Damage Segmenter
            </div>

            <svg viewBox="0 0 200 250" className="w-full h-full" role="img" aria-label="Visual diagnostic interface simulation">
              <defs>
                <clipPath id="mock-screen-clip">
                  <rect x="40" y="30" width="120" height="190" rx="10" />
                </clipPath>
                <linearGradient id="laser-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity="0" />
                  <stop offset="50%" stopColor="var(--accent)" stopOpacity="0.75" />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Grid backdrop */}
              <g stroke="var(--border-subtle)" strokeWidth="0.8" fill="none">
                <line x1="0" y1="60" x2="200" y2="60" />
                <line x1="0" y1="120" x2="200" y2="120" />
                <line x1="0" y1="180" x2="200" y2="180" />
                <line x1="50" y1="0" x2="50" y2="250" />
                <line x1="100" y1="0" x2="100" y2="250" />
                <line x1="150" y1="0" x2="150" y2="250" />
              </g>

              {/* Phone frame */}
              <rect x="40" y="30" width="120" height="190" rx="10" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="2" />
              <rect x="46" y="38" width="108" height="174" rx="6" fill="var(--bg)" stroke="var(--border-subtle)" strokeWidth="1" />

              {/* SVG Mockup vectors */}
              <g clipPath="url(#mock-screen-clip)">
                {/* Cracked screen segment display */}
                <path d="M80,60 L110,120 L95,160 L115,190" stroke="var(--recycle)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.9" />
                <path d="M110,120 L130,135" stroke="var(--recycle)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.6" />

                {/* Laser scan line sweep */}
                <rect x="40" y="30" width="120" height="16" fill="url(#laser-grad)" className="laser-sweep" />
              </g>

              {/* Bounding box marker highlights overlay */}
              <rect x="75" y="85" width="55" height="85" rx="4" fill="rgba(220, 38, 38, 0.05)" stroke="var(--recycle)" strokeWidth="1.5" strokeDasharray="3 3" />
              <text x="80" y="98" fill="var(--recycle)" fontSize="7" fontWeight="bold" fontFamily="sans-serif">crack_detected</text>
            </svg>
          </div>
        </div>
      </div>

      <style>{`
        .laser-sweep {
          animation: laserSweep 2.5s ease-in-out infinite;
        }
        @keyframes laserSweep {
          0% { transform: translateY(0); opacity: 0; }
          10% { opacity: 1; }
          45% { transform: translateY(176px); opacity: 1; }
          55% { opacity: 0; }
          100% { transform: translateY(176px); opacity: 0; }
        }
      `}</style>
    </section>
  );
}
