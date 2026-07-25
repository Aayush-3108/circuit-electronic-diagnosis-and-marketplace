import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getHistory, browseListings, updateListingStatus, deleteListing } from '../api';
import StatusChip from './StatusChip';
import TraceDivider from './TraceDivider';

const TABS = [
  { id: 'history',    label: 'ANALYSIS_LOG' },
  { id: 'listings',   label: 'ACTIVE_LISTINGS' },
  { id: 'stats',      label: 'DIAGNOSTIC_STATS' },
];

const DEVICE_ICONS = {
  phone: '📱', laptop: '💻', tablet: '🖥', pc: '🖥', monitor: '🖥',
};

function fmtDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).replace(',', ' @');
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
      <div className="text-center py-12 border border-dashed border-[var(--border)] rounded-[var(--radius-sm)] space-y-4">
        <p className="font-mono text-xs text-[var(--text-dim)] uppercase">[ERROR: AUTH_REQUIRED]</p>
        <p className="text-sm text-[var(--text-muted)]">Sign in to view your diagnostic scanning logs.</p>
      </div>
    );
  }

  if (loading) return <div className="skeleton h-32 rounded-[var(--radius-sm)]" />;
  if (error) return <p className="font-mono text-xs text-[var(--recycle)]">{error}</p>;

  return (
    <div className="space-y-3 pt-2">
      {entries && entries.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-[var(--border)] rounded-[var(--radius-sm)]">
          <p className="font-mono text-xs text-[var(--text-dim)] mb-4">[STATUS: HIST_LOG_EMPTY]</p>
          <button onClick={() => onNavigate('analyze')} className="btn btn-primary text-xs">
            RUN CLASSIFICATION ENGINE
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {(entries || []).map((e) => (
            <div key={e.id} className="card p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-[var(--surface-2)] border-[var(--border-subtle)] rounded-[var(--radius-sm)] hover:border-[var(--text-dim)] transition-all">
              <div className="flex items-center gap-3">
                <span className="text-xl">{DEVICE_ICONS[e.device_type] || '📱'}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <StatusChip status={e.recommendation} size="sm" />
                    <span className="font-mono text-[9px] uppercase text-[var(--text-dim)]">{e.damage_type.replaceAll('_', ' ')}</span>
                  </div>
                  <p className="font-mono text-[9px] text-[var(--text-muted)] uppercase mt-1">ID: #{e.id.slice(-6).toUpperCase()} · {e.device_type}</p>
                </div>
              </div>
              <div className="flex items-center gap-6 justify-between sm:justify-end">
                <div className="text-left sm:text-right font-mono text-xs">
                  <p className="text-[var(--repair)]">REP: {fmtINR(e.estimated_repair_cost_inr)}</p>
                  <p className="text-[var(--sell)]">VAL: {fmtINR(e.estimated_resale_value_inr)}</p>
                </div>
                <span className="font-mono text-[9px] text-[var(--text-dim)] shrink-0">{fmtDate(e.created_at)}</span>
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
    if (!user || !confirm('Permanently remove listing?')) return;
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
      <div className="text-center py-12 border border-dashed border-[var(--border)] rounded-[var(--radius-sm)] space-y-4">
        <p className="font-mono text-xs text-[var(--text-dim)] uppercase">[ERROR: AUTH_REQUIRED]</p>
        <p className="text-sm text-[var(--text-muted)]">Sign in to list and manage your component units.</p>
      </div>
    );
  }

  if (loading) return <div className="skeleton h-32 rounded-[var(--radius-sm)]" />;

  return (
    <div className="space-y-3 pt-2">
      {listings && listings.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-[var(--border)] rounded-[var(--radius-sm)]">
          <p className="font-mono text-xs text-[var(--text-dim)] mb-4">[STATUS: NO_ACTIVE_LISTINGS]</p>
          <button onClick={() => onNavigate('sell')} className="btn btn-warm text-xs">
            CREATE COMPONENT LISTING
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {(listings || []).map((l) => {
            const price = l.listing_type === 'whole_device'
              ? fmtINR(l.price_inr)
              : `${l.parts.length} part${l.parts.length !== 1 ? 's' : ''}`;
            return (
              <div key={l.id} className="card p-4 flex items-center justify-between gap-4 bg-[var(--surface-2)] border-[var(--border-subtle)] rounded-[var(--radius-sm)]">
                <div className="min-w-0">
                  <p className="font-bold text-sm text-[var(--text)] truncate">{l.title}</p>
                  <p className="font-mono text-[9px] text-[var(--text-dim)] uppercase mt-1">
                    {l.brand} · {l.device_type.toUpperCase()} · {l.listing_type.toUpperCase()}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`font-mono text-[9px] px-2 py-0.5 border rounded-[var(--radius-sm)] ${
                    l.status === 'active' ? 'border-[var(--sell)] text-[var(--sell)]' : 'border-[var(--border)] text-[var(--text-dim)]'
                  }`}>
                    {l.status.toUpperCase()}
                  </span>
                  {l.status === 'active' && (
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleMarkSold(l.id)}
                        disabled={busy === l.id}
                        className="btn text-[9px] py-1 px-2.5"
                      >
                        SOLD
                      </button>
                      <button
                        onClick={() => handleDelete(l.id)}
                        disabled={busy === l.id}
                        className="btn btn-danger text-[9px] py-1 px-2.5"
                      >
                        DEL
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
  // Pure local stats calculation mockup
  return (
    <div className="space-y-6 pt-2 fade-up">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { metric: 'SCAN_COUNT',  val: '3',      desc: 'Completed telemetry logs' },
          { metric: 'PARTS_LIST',  val: '2 Units', desc: 'Hardware marketplace listings' },
          { metric: 'VAL_RECOV',   val: '₹12,400', desc: 'Recovered second-hand value' },
          { metric: 'SAVED_EMIS',  val: '14.2 kg', desc: 'Est. e-waste CO2 offset' },
        ].map((item, idx) => (
          <div key={idx} className="card bg-[var(--surface-2)] border-[var(--border-subtle)] p-4 flex flex-col justify-between rounded-[var(--radius-sm)]">
            <span className="font-mono text-[8px] text-[var(--text-dim)] uppercase">{item.metric}</span>
            <p className="font-mono text-xl font-bold text-[var(--accent)] mt-2">{item.val}</p>
            <p className="text-[10px] text-[var(--text-muted)] mt-1.5 leading-tight">{item.desc}</p>
          </div>
        ))}
      </div>

      <div className="card p-5 border-[var(--border)] rounded-[var(--radius-sm)]">
        <p className="font-mono text-[9px] text-[var(--accent-warm)] font-bold tracking-wider mb-4">CLASSIFICATION_HISTOGRAM</p>
        <div className="space-y-4">
          {[
            { tag: 'SELL',    count: 1, total: 3, color: 'var(--sell)' },
            { tag: 'REPAIR',  count: 1, total: 3, color: 'var(--repair)' },
            { tag: 'RECYCLE', count: 1, total: 3, color: 'var(--recycle)' },
            { tag: 'UPGRADE', count: 0, total: 3, color: 'var(--upgrade)' },
          ].map((bar) => {
            const pct = (bar.count / bar.total) * 100;
            return (
              <div key={bar.tag} className="space-y-1.5">
                <div className="flex justify-between font-mono text-[9px]">
                  <span className="font-bold" style={{ color: bar.color }}>{bar.tag}</span>
                  <span className="text-[var(--text-dim)]">{bar.count}/{bar.total}</span>
                </div>
                <div className="h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: bar.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Dashboard root ──────────────────────────────────────────────────────── */
export default function Dashboard({ onNavigate }) {
  const [tab, setTab] = useState('history');

  return (
    <section className="mx-auto max-w-4xl px-5 py-14 space-y-6">
      <div>
        <p className="section-label mb-2">TELEMETRY_DASHBOARD</p>
        <h1 className="text-3xl font-bold text-[var(--text)]">Your Scanning Profile</h1>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab-item ${tab === t.id ? 'active font-bold text-[var(--accent)] border-b-2 border-[var(--accent)]' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="pt-2">
        {tab === 'history'  && <HistoryTab onNavigate={onNavigate} />}
        {tab === 'listings' && <ListingsTab onNavigate={onNavigate} />}
        {tab === 'stats'    && <StatsTab />}
      </div>
    </section>
  );
}
