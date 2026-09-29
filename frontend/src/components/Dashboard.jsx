import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getHistory, browseListings, updateListingStatus, deleteListing, getDemandForecast } from '../api';
import StatusChip from './StatusChip';
import { PhoneIcon, LaptopIcon, MonitorIcon, BoxIcon, ArrowRightIcon } from './Icons';

const TABS = [
  { id: 'history',  label: 'Diagnostic History' },
  { id: 'listings', label: 'My Listings' },
  { id: 'stats',    label: 'Market & Impact Insights' },
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
    user.getIdToken().then((token) =>
      getHistory(token)
        .then(setEntries)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false))
    );
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
          {(entries || []).map((e) => (
            <div key={e.id} className="card p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-[var(--surface-2)] border-[var(--border-subtle)] rounded-xl hover:border-[var(--accent)] transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--surface)] flex items-center justify-center border border-[var(--border-subtle)]">
                  <DeviceIcon type={e.device_type} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <StatusChip status={e.recommendation} size="sm" />
                    <span className="text-xs font-medium text-[var(--text-muted)] capitalize">{e.damage_type.replaceAll('_', ' ')}</span>
                  </div>
                  <p className="text-xs text-[var(--text-dim)] mt-0.5 capitalize">
                    {e.device_type} · Ref #{e.id.slice(-6).toUpperCase()}
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
          ))}
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

/* ── Activity statistics ─────────────────────────────────────────────────── */
function StatsTab() {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDemandForecast()
      .then((data) => setForecast(data.forecasts))
      .catch((e) => console.error("Failed to load forecast:", e))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 pt-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { metric: 'Scans Performed', val: '3', desc: 'Condition assessments run' },
          { metric: 'Active Listings', val: '2 Units', desc: 'Parts listed on marketplace' },
          { metric: 'Recovered Value', val: '₹12,400', desc: 'Estimated hardware residual value' },
          { metric: 'E-Waste Offset', val: '14.2 kg', desc: 'Calculated electronic waste diverted' },
        ].map((item, idx) => (
          <div key={idx} className="card bg-[var(--surface-2)] border-[var(--border-subtle)] p-4 flex flex-col justify-between rounded-xl">
            <span className="text-xs font-semibold text-[var(--text-dim)]">{item.metric}</span>
            <p className="text-xl font-bold text-[var(--accent)] mt-2">{item.val}</p>
            <p className="text-[11px] text-[var(--text-muted)] mt-1 leading-tight">{item.desc}</p>
          </div>
        ))}
      </div>

      <div className="card p-6 border-[var(--border)] rounded-xl space-y-4">
        <h4 className="text-sm font-bold text-[var(--text)]">Assessment Recommendations Distribution</h4>
        <div className="space-y-3">
          {[
            { tag: 'Sell for Value', count: 1, total: 3, color: 'var(--sell)' },
            { tag: 'Repair Device',  count: 1, total: 3, color: 'var(--repair)' },
            { tag: 'Eco Recycle',    count: 1, total: 3, color: 'var(--recycle)' },
            { tag: 'Upgrade Ready',  count: 0, total: 3, color: 'var(--upgrade)' },
          ].map((bar) => {
            const pct = (bar.count / bar.total) * 100;
            return (
              <div key={bar.tag} className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="font-semibold" style={{ color: bar.color }}>{bar.tag}</span>
                  <span className="text-[var(--text-dim)]">{bar.count} of {bar.total}</span>
                </div>
                <div className="h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: bar.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card p-6 border-[var(--border)] rounded-xl space-y-4">
        <h4 className="text-sm font-bold text-[var(--text)]">Component Sourcing & Demand Trends</h4>
        {loading ? (
          <div className="skeleton h-16 rounded-xl" />
        ) : forecast ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.entries(forecast).map(([part, data]) => (
              <div key={part} className="border border-[var(--border-subtle)] bg-[var(--surface-2)] p-4 rounded-xl flex justify-between items-center">
                <div>
                  <p className="text-xs font-semibold text-[var(--text-dim)] uppercase">{part.replace('_', ' ')}</p>
                  <p className="font-bold text-sm text-[var(--text)] mt-0.5 capitalize">{data.trend} Demand</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase">Index Score</p>
                  <p className="text-lg text-[var(--accent)] font-bold">{data.predicted_demand_score}/100</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[var(--text-dim)]">Trend information updating...</p>
        )}
      </div>
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
          Review your previous evaluations, manage active marketplace listings, and check hardware demand.
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
        {tab === 'stats'    && <StatsTab />}
      </div>
    </section>
  );
}
