import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getHistory, browseListings, updateListingStatus, deleteListing } from '../api';
import StatusChip from './StatusChip';
import { PhoneIcon, LaptopIcon, MonitorIcon } from './Icons';

const TABS = [
  { id: 'history',  label: 'Diagnostic History' },
  { id: 'listings', label: 'My Listings' },
];

function DeviceIcon({ type, className = "w-5 h-5 text-[var(--accent)]" }) {
  if (type === 'laptop') return <LaptopIcon className={className} />;
  if (type === 'pc' || type === 'monitor' || type === 'tablet') return <MonitorIcon className={className} />;
  return <PhoneIcon className={className} />;
}

function fmtDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false
  });
}

function fmtINR(n) {
  return `₹${Number(n).toLocaleString('en-IN')}`;
}

/* ── History log ────────────────────────────────────────────────────────── */
function HistoryTab({ onNavigate }) {
  const { user } = useAuth();
  const [entries, setEntries] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const localKey = `recircuit_history_${user.uid}`;
    let localCached = [];
    try {
      localCached = JSON.parse(localStorage.getItem(localKey) || '[]');
    } catch {
      localCached = [];
    }

    user.getIdToken()
      .then((token) => getHistory(token))
      .then((backendEntries) => {
        const combined = [...(backendEntries || [])];
        const ids = new Set(combined.map((e) => e.id));
        for (const item of localCached) {
          if (item && item.id && !ids.has(item.id)) {
            combined.push(item);
            ids.add(item.id);
          }
        }
        combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setEntries(combined);
        try {
          localStorage.setItem(localKey, JSON.stringify(combined));
        } catch {}
      })
      .catch((e) => {
        if (localCached && localCached.length > 0) {
          setEntries(localCached);
        } else {
          setError(e.message || 'Failed to fetch diagnostic history');
        }
      })
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    return (
      <div className="text-center py-12 border border-dashed border-[var(--border)] rounded-xl space-y-4">
        <p className="text-xs font-semibold text-[var(--text-dim)] uppercase">Authentication Required</p>
        <p className="text-sm text-[var(--text-muted)]">Sign in to view your diagnostic scanning history.</p>
      </div>
    );
  }

  if (loading) return <div className="skeleton h-32 rounded-xl" />;
  if (error) return <p className="text-xs text-[var(--recycle)]">{error}</p>;

  return (
    <div className="space-y-3 pt-2">
      {entries && entries.length === 0 ? (
        <div className="text-center py-14 border border-dashed border-[var(--border)] rounded-xl space-y-3">
          <p className="text-sm text-[var(--text-muted)]">No past diagnostic scans recorded yet.</p>
          <button onClick={() => onNavigate('analyze')} className="btn btn-primary text-xs">
            Start First Diagnostic
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {(entries || []).map((e) => {
            const damageLabel = (e.damage_type || 'undetermined').replaceAll('_', ' ');
            const refId = (e.id || '').length >= 6 ? e.id.slice(-6).toUpperCase() : (e.id || 'SCAN');
            return (
              <div key={e.id} className="card p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-[var(--surface-2)] border-[var(--border-subtle)] rounded-xl hover:border-[var(--accent)] transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[var(--surface)] flex items-center justify-center border border-[var(--border-subtle)]">
                    <DeviceIcon type={e.device_type} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <StatusChip status={e.recommendation} size="sm" />
                      <span className="text-xs font-medium text-[var(--text-muted)] capitalize">{damageLabel}</span>
                    </div>
                    <p className="text-xs text-[var(--text-dim)] mt-0.5 capitalize">
                      {e.device_type} · Ref #{refId}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6 justify-between sm:justify-end">
                  <div className="text-left sm:text-right text-xs">
                    <p className="text-[var(--repair)] font-semibold">Repair: {fmtINR(e.estimated_repair_cost_inr)}</p>
                    <p className="text-[var(--sell)] font-semibold">Resale: {fmtINR(e.estimated_resale_value_inr)}</p>
                  </div>
                  <span className="text-xs text-[var(--text-dim)] shrink-0">{fmtDate(e.created_at)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Listings log ────────────────────────────────────────────────────────── */
function ListingsTab({ onNavigate }) {
  const { user } = useAuth();
  const [listings, setListings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    browseListings({})
      .then((data) => {
        if (user) {
          setListings(data.filter((l) => l.seller_uid === user.uid));
        } else {
          setListings([]);
        }
      })
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  }, [user]);

  async function handleMarkSold(id) {
    if (!user) return;
    setBusy(id);
    try {
      const token = await user.getIdToken();
      await updateListingStatus(id, 'sold', token);
      setListings((prev) => prev.map((l) => l.id === id ? { ...l, status: 'sold' } : l));
    } catch (e) {
      alert(e.message);
    } finally { setBusy(null); }
  }

  async function handleDelete(id) {
    if (!user || !confirm('Are you sure you want to remove this listing?')) return;
    setBusy(id);
    try {
      const token = await user.getIdToken();
      await deleteListing(id, token);
      setListings((prev) => prev.filter((l) => l.id !== id));
    } catch (e) {
      alert(e.message);
    } finally { setBusy(null); }
  }

  if (!user) {
    return (
      <div className="text-center py-12 border border-dashed border-[var(--border)] rounded-xl space-y-4">
        <p className="text-xs font-semibold text-[var(--text-dim)] uppercase">Authentication Required</p>
        <p className="text-sm text-[var(--text-muted)]">Sign in to view and manage your marketplace listings.</p>
      </div>
    );
  }

  if (loading) return <div className="skeleton h-32 rounded-xl" />;

  return (
    <div className="space-y-3 pt-2">
      {listings && listings.length === 0 ? (
        <div className="text-center py-14 border border-dashed border-[var(--border)] rounded-xl space-y-3">
          <p className="text-sm text-[var(--text-muted)]">You don't have any active marketplace listings yet.</p>
          <button onClick={() => onNavigate('sell')} className="btn btn-warm text-xs font-semibold">
            Create Listing
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {(listings || []).map((l) => {
            const price = l.listing_type === 'whole_device'
              ? fmtINR(l.price_inr)
              : `${l.parts.length} part${l.parts.length !== 1 ? 's' : ''}`;
            return (
              <div key={l.id} className="card p-4 flex items-center justify-between gap-4 bg-[var(--surface-2)] border-[var(--border-subtle)] rounded-xl">
                <div className="min-w-0">
                  <p className="font-bold text-sm text-[var(--text)] truncate">{l.title}</p>
                  <p className="text-xs text-[var(--text-dim)] capitalize mt-0.5">
                    {l.brand} · {l.device_type} · {l.listing_type === 'whole_device' ? 'Complete Device' : 'Modular Parts'} · {price}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                    l.status === 'active' ? 'bg-[var(--accent-dim)] text-[var(--accent)]' : 'bg-[var(--surface-3)] text-[var(--text-dim)]'
                  }`}>
                    {l.status === 'active' ? 'Active' : 'Sold'}
                  </span>
                  {l.status === 'active' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleMarkSold(l.id)}
                        disabled={busy === l.id}
                        className="btn btn-outline text-xs py-1 px-3"
                      >
                        Mark Sold
                      </button>
                      <button
                        onClick={() => handleDelete(l.id)}
                        disabled={busy === l.id}
                        className="btn text-xs py-1 px-3 text-[var(--recycle)] border-[var(--recycle)]/30 hover:bg-[var(--recycle-dim)]"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Dashboard root ──────────────────────────────────────────────────────── */
export default function Dashboard({ onNavigate }) {
  const [tab, setTab] = useState('history');

  return (
    <section className="mx-auto max-w-4xl px-5 py-12 space-y-8">
      <div>
        <span className="section-label">Account Activity</span>
        <h1 className="text-3xl font-bold mt-1 text-[var(--text)]">Your Hardware Dashboard</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Review your previous diagnostic evaluations and manage your marketplace listings.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border)] gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`pb-3 px-3 text-sm font-semibold transition-all border-b-2 ${
              tab === t.id
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div>
        {tab === 'history'  && <HistoryTab onNavigate={onNavigate} />}
        {tab === 'listings' && <ListingsTab onNavigate={onNavigate} />}
      </div>
    </section>
  );
}

