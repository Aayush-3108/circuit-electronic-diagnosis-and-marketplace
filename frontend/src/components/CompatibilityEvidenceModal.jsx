import { useState } from 'react';
import { createReservation, reportListing } from '../api';

export function CompatibilityEvidenceModal({ candidate, onClose, user, idToken, onReserved }) {
  const [reserving, setReserving] = useState(false);
  const [reservedSuccess, setReservedSuccess] = useState(false);
  const [buyerNotes, setBuyerNotes] = useState('');
  const [error, setError] = useState(null);
  const [reporting, setReporting] = useState(false);
  const [reportReason, setReportReason] = useState('misleading_specs');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSuccess, setReportSuccess] = useState(false);

  if (!candidate) return null;

  async function handleReserve() {
    if (!user || !idToken) {
      setError('Please sign in to reserve this component.');
      return;
    }
    setError(null);
    setReserving(true);
    try {
      const idempotencyKey = `idem_${candidate.listing_id}_${Date.now()}`;
      await createReservation(
        {
          listingId: candidate.listing_id,
          partId: candidate.part_id,
          buyerNotes,
          idempotencyKey,
        },
        idToken
      );
      setReservedSuccess(true);
      if (onReserved) onReserved(candidate.listing_id);
    } catch (err) {
      setError(err.message || 'Reservation failed.');
    } finally {
      setReserving(false);
    }
  }

  async function handleReport() {
    if (!user || !idToken) {
      setError('Please sign in to report a listing.');
      return;
    }
    try {
      await reportListing(
        {
          listingId: candidate.listing_id,
          reason: reportReason,
          details: reportDetails || 'User reported specification mismatch',
        },
        idToken
      );
      setReportSuccess(true);
    } catch (err) {
      setError(err.message || 'Report submission failed.');
    }
  }

  const outcomeColors = {
    VERIFIED_COMPATIBLE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    LIKELY_COMPATIBLE: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    INCOMPATIBLE: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    UNKNOWN: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="card w-full max-w-2xl p-6 space-y-6 relative border border-[var(--border)] bg-[var(--surface-1)]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--text-dim)] hover:text-[var(--text)] text-lg font-bold"
        >
          ✕
        </button>

        <div>
          <span className="section-label">Technical Compatibility Audit</span>
          <h2 className="text-xl font-bold mt-1 text-[var(--text)]">{candidate.title}</h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Seller: {candidate.seller_email || 'Verified Seller'} • Location: India
          </p>
        </div>

        {/* Compatibility Outcome Chip & Score */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-lg border text-xs font-bold uppercase tracking-wider ${
                outcomeColors[candidate.compatibility_outcome] || outcomeColors.UNKNOWN
              }`}
            >
              {candidate.compatibility_outcome.replace('_', ' ')}
            </span>
            <span className="text-xs text-[var(--text-dim)]">
              Verification: <strong className="text-[var(--text)] capitalize">{candidate.verification_level.replace('_', ' ')}</strong>
            </span>
          </div>

          <div className="text-right">
            <div className="text-xs text-[var(--text-dim)]">Compatibility Score</div>
            <div className="text-lg font-extrabold text-[var(--accent)]">{candidate.compatibility_score.toFixed(0)} / 100</div>
          </div>
        </div>

        {/* Price & Cost Breakdown */}
        <div className="grid grid-cols-2 gap-4 text-xs p-3 rounded-lg bg-[var(--surface-2)]/50 border border-[var(--border-subtle)]">
          <div>
            <span className="text-[var(--text-dim)] block">Asking Price</span>
            <span className="text-sm font-bold text-[var(--text)]">₹{candidate.price_inr.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-[var(--text-dim)] block">Total Estimated Cost (inc. shipping)</span>
            <span className="text-sm font-bold text-[var(--accent)]">₹{candidate.total_estimated_cost_inr.toLocaleString()}</span>
          </div>
        </div>

        {/* Explanation & Technical Evidence */}
        <div className="space-y-4">
          <div>
            <h4 className="text-xs font-semibold text-[var(--text)] mb-1">Compatibility Summary</h4>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed bg-[var(--surface-2)] p-3 rounded-lg border border-[var(--border-subtle)]">
              {candidate.explanation}
            </p>
          </div>

          {candidate.matched_specs && candidate.matched_specs.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-emerald-400 mb-1.5 flex items-center gap-1.5">
                ✓ Verified Specs Matched ({candidate.matched_specs.length})
              </h4>
              <ul className="space-y-1 text-xs text-[var(--text-muted)] pl-2">
                {candidate.matched_specs.map((spec, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    {spec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {candidate.unverified_specs && candidate.unverified_specs.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-amber-400 mb-1.5 flex items-center gap-1.5">
                ⚠ Unverified Specifications (Check before assembly)
              </h4>
              <ul className="space-y-1 text-xs text-[var(--text-muted)] pl-2">
                {candidate.unverified_specs.map((spec, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    {spec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Evidence Sources */}
          {candidate.evidence_sources && candidate.evidence_sources.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-[var(--text)] mb-1.5">Traceable Evidence Sources</h4>
              <div className="space-y-2">
                {candidate.evidence_sources.map((src, i) => (
                  <div key={i} className="p-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-xs">
                    <div className="font-semibold text-[var(--text)]">{src.title}</div>
                    <div className="text-[11px] text-[var(--text-dim)] font-mono mt-0.5">{src.url_or_ref} • Verified: {src.verification_date}</div>
                    {src.notes && <div className="text-[11px] text-[var(--text-muted)] mt-1">{src.notes}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            {error}
          </div>
        )}

        {reservedSuccess ? (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs space-y-2 text-center">
            <div className="font-bold text-sm">✓ Component Successfully Reserved!</div>
            <p>The seller has been notified. This listing is locked to prevent double selling.</p>
            <button onClick={onClose} className="btn btn-outline text-xs mt-2">
              Close Window
            </button>
          </div>
        ) : (
          <div className="space-y-4 pt-2 border-t border-[var(--border)]">
            <div>
              <label className="block text-xs font-semibold text-[var(--text)] mb-1">Buyer Notes (Optional)</label>
              <input
                value={buyerNotes}
                onChange={(e) => setBuyerNotes(e.target.value)}
                placeholder="e.g. Please package LCD flex cable carefully..."
                className="input-field text-xs"
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setReporting(!reporting)}
                className="text-xs text-[var(--text-dim)] hover:text-rose-400 underline"
              >
                {reporting ? 'Cancel Report' : 'Report Misleading Listing'}
              </button>

              <div className="flex gap-2">
                <button type="button" onClick={onClose} className="btn btn-outline text-xs">
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleReserve}
                  disabled={reserving || candidate.compatibility_outcome === 'INCOMPATIBLE'}
                  className="btn btn-primary text-xs font-semibold"
                >
                  {reserving ? 'Reserving Component...' : 'Reserve Component'}
                </button>
              </div>
            </div>

            {reporting && (
              <div className="p-3 rounded-lg bg-rose-500/5 border border-rose-500/20 space-y-2 mt-2">
                <div className="text-xs font-semibold text-rose-400">Report Listing / Specification Mismatch</div>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="input-field text-xs"
                >
                  <option value="misleading_specs">Misleading specifications / model info</option>
                  <option value="incompatible_claim">False compatibility claim</option>
                  <option value="counterfeit_suspected">Suspected counterfeit or replica</option>
                  <option value="damaged_hazard">Safety hazard (e.g. swollen battery)</option>
                  <option value="other">Other issue</option>
                </select>
                <input
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Provide details about the issue..."
                  className="input-field text-xs"
                />
                <button onClick={handleReport} className="btn btn-outline text-xs text-rose-400 border-rose-500/30">
                  {reportSuccess ? '✓ Report Submitted' : 'Submit Report'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
