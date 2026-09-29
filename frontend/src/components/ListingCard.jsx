import { WrenchIcon } from './Icons';

const CONDITION_LABEL = {
  excellent: 'Excellent',
  good: 'Good',
  fair: 'Fair',
  damaged: 'Damaged',
  for_parts: 'For parts',
};

export default function ListingCard({ listing, onOpen }) {
  const coverImage = listing.listing_type === 'whole_device'
    ? listing.images[0]
    : listing.parts.find((p) => p.images.length)?.images[0];

  const priceLabel = listing.listing_type === 'whole_device'
    ? `₹${listing.price_inr.toLocaleString('en-IN')}`
    : `${listing.parts.length} part${listing.parts.length > 1 ? 's' : ''} from ₹${Math.min(...listing.parts.map((p) => p.price_inr)).toLocaleString('en-IN')}`;

  return (
    <button
      onClick={() => onOpen(listing)}
      className="card card-hover text-left overflow-hidden flex flex-col h-full rounded-xl border-[var(--border)] bg-[var(--surface)] relative focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
    >
      <div className="aspect-[4/3] bg-[var(--surface-2)] flex items-center justify-center overflow-hidden border-b border-[var(--border-subtle)] relative">
        {coverImage ? (
          <img
            src={coverImage}
            alt={listing.title}
            className="w-full h-full object-cover transition-transform duration-200"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center gap-1 z-10" aria-hidden="true">
            <WrenchIcon className="w-6 h-6 text-[var(--text-dim)] opacity-40" />
            <span className="text-[10px] text-[var(--text-dim)] font-medium">No photo</span>
          </div>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] uppercase tracking-wider text-[var(--accent)] font-semibold">
              {listing.listing_type === 'whole_device' ? 'Complete Device' : 'Modular Parts'}
            </span>
            {listing.listing_type === 'whole_device' && listing.condition && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--surface-2)] text-[var(--text-muted)] border border-[var(--border-subtle)] font-medium">
                {CONDITION_LABEL[listing.condition]}
              </span>
            )}
          </div>
          <h3 className="font-semibold text-sm leading-snug text-[var(--text)] line-clamp-2">{listing.title}</h3>
          <p className="text-xs text-[var(--text-muted)]">{listing.brand} · {listing.model_name}</p>
        </div>

        <p className="text-sm font-bold text-[var(--sell)]">
          {priceLabel}
        </p>
      </div>
    </button>
  );
}

export { CONDITION_LABEL };
