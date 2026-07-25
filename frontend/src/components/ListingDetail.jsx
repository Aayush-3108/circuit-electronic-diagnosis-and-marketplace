import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateListingStatus, deleteListing } from '../api';
import { CONDITION_LABEL } from './ListingCard';

export default function ListingDetail({ listing, onClose, onChanged }) {
  const { user } = useAuth();
  const isOwner = user && user.uid === listing.seller_uid;
  const [busy, setBusy] = useState(false);
  const [activeImage, setActiveImage] = useState(null);

  async function handleMarkSold() {
    setBusy(true);
    try {
      const idToken = await user.getIdToken();
      const updated = await updateListingStatus(listing.id, 'sold', idToken);
      onChanged(updated);
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this listing permanently?')) return;
    setBusy(true);
    try {
      const idToken = await user.getIdToken();
      await deleteListing(listing.id, idToken);
      onChanged(null);
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  const galleryImages = listing.listing_type === 'whole_device'
    ? listing.images
    : listing.parts.reduce((acc, p) => [...acc, ...p.images], []);

  const primaryImage = activeImage || galleryImages[0];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-panel max-w-2xl w-full max-h-[85vh] overflow-y-auto rounded-[var(--radius-md)] relative tech-bracket"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="p-6 md:p-8 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-mono text-[9px] tracking-wider uppercase text-[var(--accent)] font-semibold">
                  {listing.listing_type === 'whole_device' ? 'WHOLE_UNIT_EXCHANGE' : 'SPARE_COMPONENTS'}
                </span>
                {listing.status !== 'active' && (
                  <span className="font-mono text-[9px] px-1.5 py-0.5 rounded-[var(--radius-sm)] bg-[var(--recycle-dim)] text-[var(--recycle)] border border-[var(--recycle)]">
                    {listing.status.toUpperCase()}
                  </span>
                )}
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-[var(--text)] leading-tight">{listing.title}</h2>
              <p className="text-xs text-[var(--text-muted)] mt-1">{listing.brand} · {listing.model_name}</p>
            </div>
            <button onClick={onClose} className="btn btn-ghost p-1 text-xs font-mono">
              ✕ CLOSE
            </button>
          </div>

          {/* Description */}
          {listing.description && (
            <p className="text-sm text-[var(--text-muted)] leading-relaxed bg-[var(--surface-2)] p-4 rounded-[var(--radius-sm)] border border-[var(--border-subtle)]">
              {listing.description}
            </p>
          )}

          {/* Image & Price layout for Whole Device */}
          {listing.listing_type === 'whole_device' ? (
            <div className="space-y-4">
              {galleryImages.length > 0 && (
                <div className="space-y-2">
                  <div className="aspect-[16/9] rounded-[var(--radius-sm)] overflow-hidden border border-[var(--border)] bg-[var(--surface-2)]">
                    <img
                      src={primaryImage}
                      alt="Device visual overview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {galleryImages.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto py-1">
                      {galleryImages.map((img, i) => (
                        <button
                          key={i}
                          onClick={() => setActiveImage(img)}
                          className={`w-16 h-16 rounded-[var(--radius-sm)] overflow-hidden border transition-all ${
                            primaryImage === img ? 'border-[var(--accent)] scale-95' : 'border-[var(--border)] hover:border-[var(--text-dim)]'
                          }`}
                        >
                          <img src={img} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4 items-stretch">
                <div className="card p-4 flex flex-col justify-center rounded-[var(--radius-sm)]">
                  <p className="font-mono text-[9px] text-[var(--text-dim)] uppercase tracking-wider mb-1">[STATE_CONDITION]</p>
                  <p className="font-semibold text-sm">{CONDITION_LABEL[listing.condition]}</p>
                </div>
                <div className="card p-4 flex flex-col justify-center items-end bg-[var(--accent-dim)] border-[var(--accent)] rounded-[var(--radius-sm)]">
                  <p className="font-mono text-[9px] text-[var(--accent)] uppercase tracking-wider mb-1">[EXCHANGE_PRICE]</p>
                  <p className="font-mono text-2xl font-bold text-[var(--sell)]">₹{listing.price_inr.toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>
          ) : (
            /* Parts listing details layout */
            <div className="space-y-3">
              <p className="font-mono text-[9px] text-[var(--text-muted)] uppercase tracking-wider">[INVENTORY_ITEMS]</p>
              {listing.parts.map((p) => (
                <div key={p.part_id} className="card p-4 flex flex-col sm:flex-row gap-4 items-start border-[var(--border-subtle)] rounded-[var(--radius-sm)] bg-[var(--surface-2)]">
                  {p.images[0] && (
                    <img src={p.images[0]} alt={p.category} className="w-20 h-20 rounded-[var(--radius-sm)] object-cover border border-[var(--border)] flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex justify-between items-start">
                      <p className="font-semibold text-sm capitalize text-[var(--text)]">{p.category.replaceAll('_', ' ')}</p>
                      <p className="font-mono text-base font-bold text-[var(--sell)]">₹{p.price_inr.toLocaleString('en-IN')}</p>
                    </div>
                    <p className="font-mono text-[8px] px-1.5 py-0.5 rounded-[var(--radius-sm)] bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--border-subtle)] inline-block uppercase">
                      {CONDITION_LABEL[p.condition]}
                    </p>
                    {p.compatible_models && (
                      <p className="text-xs text-[var(--text-dim)]">Compatible: {p.compatible_models}</p>
                    )}
                    {p.description && <p className="text-xs text-[var(--text-muted)] leading-normal mt-1">{p.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer / Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-[var(--border-subtle)] pt-5">
            <p className="font-mono text-[9px] text-[var(--text-dim)] uppercase">
              SELLER_UID: {listing.seller_email || 'hidden'}
            </p>
            {isOwner && listing.status === 'active' && (
              <div className="flex gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={handleMarkSold}
                  disabled={busy}
                  className="btn btn-primary text-xs"
                >
                  MARK SOLD
                </button>
                <button
                  onClick={handleDelete}
                  disabled={busy}
                  className="btn btn-danger text-xs"
                >
                  DELETE
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
