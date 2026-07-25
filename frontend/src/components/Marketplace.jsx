import { useEffect, useState } from 'react';
import { browseListings } from '../api';
import ListingCard from './ListingCard';

const DEVICE_TYPES = ['phone', 'laptop', 'tablet', 'pc', 'monitor'];
const CATEGORIES = ['screen', 'battery', 'motherboard', 'camera', 'keyboard', 'chassis', 'charging_port', 'speaker', 'ram', 'storage', 'gpu', 'other'];

export default function Marketplace({ onOpenListing, onSell }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [deviceType, setDeviceType] = useState('');
  const [listingType, setListingType] = useState('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    browseListings({ device_type: deviceType, listing_type: listingType, category, search })
      .then((data) => { if (!cancelled) setListings(data); })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [deviceType, listingType, category, search]);

  return (
    <section className="mx-auto max-w-6xl px-5 py-14 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="section-label">Spare Parts Exchange</span>
          <h1 className="text-3xl font-bold text-[var(--text)] mt-1">Inventory Marketplace</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1.5">{listings.length} listing{listings.length !== 1 ? 's' : ''} available</p>
        </div>
        <button
          onClick={onSell}
          className="btn btn-warm shrink-0"
        >
          + Create Listing
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="space-y-1.5">
          <label htmlFor="mk-s" className="block text-xs font-medium text-[var(--text-muted)]">Search</label>
          <input
            id="mk-s"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Keyword search…"
            className="input-field text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="mk-d" className="block text-xs font-medium text-[var(--text-muted)]">Device type</label>
          <select
            id="mk-d"
            value={deviceType}
            onChange={(e) => setDeviceType(e.target.value)}
            className="input-field text-sm"
          >
            <option value="">All devices</option>
            {DEVICE_TYPES.map((d) => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="mk-l" className="block text-xs font-medium text-[var(--text-muted)]">Listing type</label>
          <select
            id="mk-l"
            value={listingType}
            onChange={(e) => setListingType(e.target.value)}
            className="input-field text-sm"
          >
            <option value="">Whole + Parts</option>
            <option value="whole_device">Whole device only</option>
            <option value="parts">Parts only</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="mk-c" className="block text-xs font-medium text-[var(--text-muted)]">Component</label>
          <select
            id="mk-c"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input-field text-sm"
          >
            <option value="">Any component</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
          </select>
        </div>
      </div>

      {/* Content area */}
      <div>
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[240px] rounded-xl bg-[var(--surface-2)] animate-pulse" />
            ))}
          </div>
        )}

        {error && (
          <div className="text-center py-12 space-y-2">
            <p className="text-sm text-[var(--recycle)]">{error}</p>
          </div>
        )}

        {!loading && !error && listings.length === 0 && (
          <div className="text-center py-20 border border-dashed border-[var(--border)] rounded-2xl space-y-4">
            <p className="text-3xl">📦</p>
            <p className="text-sm font-semibold text-[var(--text)]">No listings match your filters</p>
            <p className="text-xs text-[var(--text-muted)]">Try broadening your search, or be the first to list a component.</p>
            <button onClick={onSell} className="btn btn-outline text-xs mt-2">Create a listing</button>
          </div>
        )}

        {!loading && listings.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((l) => (
              <ListingCard key={l.id} listing={l} onOpen={onOpenListing} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
