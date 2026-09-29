import { useState, useEffect } from 'react';
import StatusChip, { STATUS_CONFIG } from './StatusChip';
import { getPartMatches } from '../api';
import { CameraIcon, WrenchIcon, MapPinIcon, InfoIcon, ArrowRightIcon } from './Icons';

const DAMAGE_TO_PART_CATEGORY = {
  screen_crack: 'screen',
  screen_scratch: 'screen',
  dead_pixel: 'screen',
  battery_issue: 'battery',
  keyboard_damage: 'keyboard',
  port_damage: 'charging_port',
  body_damage: 'chassis'
};

export default function ResultPanel({ result, meta, imageFile, onReset, onGoUpgrade, onGoSell, onGoShops }) {
  const {
    detection,
    recommendation,
    recommendation_confidence,
    estimated_repair_cost_inr,
    estimated_resale_value_inr,
    explanation,
  } = result;

  const [imgSrc, setImgSrc] = useState(null);
  const [donorMatches, setDonorMatches] = useState(null);
  const [loadingMatches, setLoadingMatches] = useState(false);

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

  useEffect(() => {
    if (recommendation === 'repair' && meta && detection.damage_type) {
      const category = DAMAGE_TO_PART_CATEGORY[detection.damage_type];
      if (category) {
        setLoadingMatches(true);
        getPartMatches({
          deviceType: meta.deviceType,
          brand: meta.brand,
          modelName: meta.modelName,
          neededPartCategory: category
        })
          .then(res => setDonorMatches(res.matches))
          .catch(err => console.error("Failed to fetch matches", err))
          .finally(() => setLoadingMatches(false));
      }
    }
  }, [recommendation, meta, detection.damage_type]);

  const isMock = detection.source === 'mock_fallback';
  const recommendationColor = STATUS_CONFIG[recommendation]?.color || 'var(--accent)';
  
  const detectionConfidencePct = Math.round((detection.confidence || 0.85) * 100);
  const decisionConfidencePct = Math.round((recommendation_confidence || 0.5) * 100);

  return (
    <div className="space-y-6">
      {isMock && (
        <div className="rounded-xl border border-[var(--repair)] bg-[var(--repair-dim)] px-4 py-3 text-xs text-[var(--repair)] font-medium flex items-center gap-2.5">
          <InfoIcon className="w-4 h-4 shrink-0" />
          <span>Offline inspection mode active. Results are calculated locally.</span>
        </div>
      )}

      {/* Main verdict card */}
      <div className="card p-6 md:p-8 space-y-6">
        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
          <div>
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">
              Assessment Summary
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
              Visual Inspection
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
                    <CameraIcon className="w-8 h-8 opacity-30" />
                    <span className="text-xs">Photo preview</span>
                  </div>
                )}
                {/* Detection overlay */}
                <div
                  className="absolute inset-4 border border-[var(--recycle)] rounded-lg flex flex-col justify-between p-2 pointer-events-none"
                  style={{ background: 'rgba(185, 28, 28, 0.04)' }}
                >
                  <span className="text-[10px] font-bold text-[var(--recycle)] bg-[var(--surface)]/90 backdrop-blur-sm px-2 py-0.5 rounded-md self-start border border-[var(--recycle)]/20 shadow-sm capitalize">
                    {detection.damage_type.replace(/_/g, ' ')} · {detectionConfidencePct}% match
                  </span>
                  <div className="self-end w-3 h-3 border-r-2 border-b-2 border-[var(--recycle)] rounded-sm" />
                </div>
              </div>
            </div>
            <div className="px-4 py-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
              <p className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider font-semibold mb-0.5">
                Evaluation Mode
              </p>
              <p className="text-sm font-semibold text-[var(--text)] capitalize">
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
                  {estimated_repair_cost_inr > 0 
                    ? `₹${Math.round(estimated_repair_cost_inr).toLocaleString('en-IN')}`
                    : '₹0 (None)'}
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

            {/* Assessment Confidence bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-[10px] font-semibold text-[var(--text-dim)] uppercase tracking-wider">
                <span>Assessment Confidence</span>
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

      {/* Donor Matches */}
      {recommendation === 'repair' && (loadingMatches || (donorMatches && donorMatches.length > 0)) && (
        <div className="card p-6 md:p-8 space-y-4 bg-[var(--surface-2)]">
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">
            Compatible Donor Parts Available
          </p>
          {loadingMatches ? (
            <div className="skeleton h-32 w-full rounded-xl" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {donorMatches.map((m, i) => (
                <div key={i} className="border border-[var(--border)] bg-[var(--surface)] p-4 rounded-xl flex flex-col gap-3">
                  {m.image_url ? (
                    <img src={m.image_url} alt={m.title} className="w-full h-24 object-cover rounded-lg" />
                  ) : (
                    <div className="w-full h-24 bg-[var(--surface-2)] rounded-lg flex items-center justify-center">
                      <WrenchIcon className="w-6 h-6 text-[var(--text-dim)] opacity-40" />
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-bold text-[var(--text)] line-clamp-1">{m.title}</h4>
                    <p className="text-[10px] text-[var(--text-dim)] uppercase">Compatible: {m.compatible_with}</p>
                    <p className="text-[10px] text-[var(--text-dim)] uppercase mt-0.5">Condition: {m.condition}</p>
                  </div>
                  <div className="mt-auto flex justify-between items-center pt-2 border-t border-[var(--border-subtle)]">
                    <span className="text-sm font-bold text-[var(--sell)]">₹{m.price.toLocaleString('en-IN')}</span>
                    <span className="text-[9px] px-2 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)] font-bold uppercase">
                      {m.type === 'part' ? 'Part' : 'Donor Unit'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <button
          onClick={onGoShops}
          className="btn btn-outline text-xs flex items-center gap-2"
        >
          <MapPinIcon className="w-4 h-4 text-[var(--accent)]" />
          <span>Find Nearby Repair Shops</span>
        </button>

        <div className="flex flex-wrap gap-3">
          {recommendation === 'upgrade' && (
            <button onClick={onGoUpgrade} className="btn btn-primary flex items-center gap-2">
              <span>Open Upgrade Advisor</span>
              <ArrowRightIcon className="w-4 h-4" />
            </button>
          )}
          {(recommendation === 'sell' || recommendation === 'repair' || recommendation === 'recycle') && (
            <button onClick={onGoSell} className="btn btn-warm flex items-center gap-2">
              <span>
                {recommendation === 'sell'
                  ? 'Create Marketplace Listing'
                  : recommendation === 'repair'
                  ? 'List Salvageable Parts'
                  : 'List for Parts / Recycling'}
              </span>
              <ArrowRightIcon className="w-4 h-4" />
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
