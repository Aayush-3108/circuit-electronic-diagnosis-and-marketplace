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
      className="card card-hover text-left overflow-hidden flex flex-col h-full rounded-[var(--radius-md)] border-[var(--border)] bg-[var(--surface)] relative focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
    >
      {/* Decorative hud dot */}
      <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[var(--border)] pointer-events-none" />

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
            <span className="text-2xl opacity-40">🛠️</span>
            <span className="font-mono text-[8px] text-[var(--text-dim)] uppercase tracking-wider">NO_SPEC_IMAGE</span>
          </div>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[9px] tracking-wider uppercase text-[var(--accent)] font-semibold">
              {listing.listing_type === 'whole_device' ? 'WHOLE_UNIT' : 'COMPONENTS'}
            </span>
            {listing.listing_type === 'whole_device' && listing.condition && (
              <span className="font-mono text-[8px] px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[var(--text-muted)] border border-[var(--border-subtle)] uppercase">
                {CONDITION_LABEL[listing.condition]}
              </span>
            )}
          </div>
          <h3 className="font-semibold text-sm leading-snug text-[var(--text)] line-clamp-2">{listing.title}</h3>
          <p className="text-xs text-[var(--text-muted)]">{listing.brand} · {listing.model_name}</p>
        </div>

        <p className="font-mono text-xs font-bold text-[var(--sell)]">
          {priceLabel}
        </p>
      </div>
    </button>
  );
}

export { CONDITION_LABEL };
