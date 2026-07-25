import { useState, useEffect } from 'react';
import StatusChip, { STATUS_CONFIG } from './StatusChip';

export default function ResultPanel({ result, imageFile, onReset, onGoUpgrade, onGoSell, onGoShops }) {
  const {
    detection,
    recommendation,
    recommendation_confidence,
    estimated_repair_cost_inr,
    estimated_resale_value_inr,
    explanation,
  } = result;

  // React state for object URL to handle React 18 strict mode re-mounts cleanly
  const [imgSrc, setImgSrc] = useState(null);

  useEffect(() => {
    if (!imageFile) {
      setImgSrc(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImgSrc(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [imageFile]);

  const isMock = detection.source === 'mock_fallback';
  const recommendationColor = STATUS_CONFIG[recommendation]?.color || 'var(--accent)';
  
  // Separate YOLO detection confidence from Decision Model confidence
  const detectionConfidencePct = Math.round((detection.confidence || 0.85) * 100);
  const decisionConfidencePct = Math.round((recommendation_confidence || 0.5) * 100);

  return (
    <div className="space-y-6">
      {isMock && (
        <div className="rounded-xl border border-[var(--repair)] bg-[var(--repair-dim)] px-4 py-3 text-xs text-[var(--repair)] font-medium flex items-center gap-2">
          <span className="text-base">⚠️</span>
          Simulated results — the CV model is running in local fallback mode. Results are illustrative only.
        </div>
      )}

      {/* Main verdict card */}
      <div className="card p-6 md:p-8 space-y-6">
        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
          <div>
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">
              Our recommendation
            </p>
            <h2 className="text-2xl font-bold text-[var(--text)]">Diagnostic Complete</h2>
          </div>
          <StatusChip status={recommendation} size="lg" animate={true} />
        </div>

        {/* Grid split */}
        <div className="grid md:grid-cols-5 gap-8 items-start">
          {/* Left: Damage preview */}
          <div className="md:col-span-2 space-y-3">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Damage preview
            </p>
            <div className="border border-[var(--border)] rounded-xl bg-[var(--surface-2)] overflow-hidden">
              <div className="aspect-[4/3] flex items-center justify-center relative bg-[var(--surface-2)]">
                {imgSrc ? (
                  <img
                    src={imgSrc}
                    alt="Uploaded device photo"
                    className="w-full h-full object-cover absolute inset-0"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-[var(--text-dim)]">
                    <span className="text-4xl opacity-30 select-none" aria-hidden="true">📸</span>
                    <span className="text-xs">Photo preview</span>
                  </div>
                )}
                {/* Detection overlay */}
                <div
                  className="absolute inset-4 border border-[var(--recycle)] rounded-lg flex flex-col justify-between p-2 pointer-events-none"
                  style={{ background: 'rgba(185, 28, 28, 0.04)' }}
                >
                  <span className="text-[10px] font-bold text-[var(--recycle)] bg-[var(--surface)]/90 backdrop-blur-sm px-2 py-0.5 rounded-md self-start border border-[var(--recycle)]/20 shadow-sm">
                    {detection.damage_type.replace(/_/g, ' ')} · {detectionConfidencePct}% vision match
                  </span>
                  <div className="self-end w-3 h-3 border-r-2 border-b-2 border-[var(--recycle)] rounded-sm" />
                </div>
              </div>
            </div>
            <div className="px-4 py-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
              <p className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider font-semibold mb-0.5">
                Vision Model Source
              </p>
              <p className="text-sm font-semibold text-[var(--text)]">
                {detection.source.replace(/_/g, ' ')}
              </p>
            </div>
          </div>

          {/* Right: Verdict & Explanation */}
          <div className="md:col-span-3 space-y-5">
            <div>
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                Why this recommendation?
              </p>
              <p className="text-sm leading-relaxed text-[var(--text-muted)]">{explanation}</p>
            </div>

            {/* Financial estimates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] space-y-1">
                <p className="text-[10px] font-semibold text-[var(--text-dim)] uppercase tracking-wider">
                  Est. repair cost
                </p>
                <p className="text-xl font-bold text-[var(--repair)]">
                  ₹{Math.round(estimated_repair_cost_inr).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] space-y-1">
                <p className="text-[10px] font-semibold text-[var(--text-dim)] uppercase tracking-wider">
                  Resale value
                </p>
                <p className="text-xl font-bold text-[var(--sell)]">
                  ₹{Math.round(estimated_resale_value_inr).toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            {/* Decision Model Confidence bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-[10px] font-semibold text-[var(--text-dim)] uppercase tracking-wider">
                <span>Decision Model Confidence (Top match of 4 options)</span>
                <span>{decisionConfidencePct}%</span>
              </div>
              <div className="h-2 rounded-full bg-[var(--surface-3)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${decisionConfidencePct}%`, background: recommendationColor }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <button
          onClick={onGoShops}
          className="btn btn-outline text-xs flex items-center gap-2"
        >
          <span>📍</span> Find Nearby Repair Shops
        </button>

        <div className="flex flex-wrap gap-3">
          {recommendation === 'upgrade' && (
            <button onClick={onGoUpgrade} className="btn btn-primary">
              Open Upgrade Advisor →
            </button>
          )}
          {(recommendation === 'sell' || recommendation === 'repair' || recommendation === 'recycle') && (
            <button onClick={onGoSell} className="btn btn-warm">
              {recommendation === 'sell'
                ? 'Create Marketplace Listing →'
                : recommendation === 'repair'
                ? 'List Salvageable Parts →'
                : 'Scrap or Sell Parts →'}
            </button>
          )}
          <button onClick={onReset} className="btn btn-ghost">
            Start New Scan
          </button>
        </div>
      </div>
    </div>
  );
}
