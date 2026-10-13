import { useState, useEffect } from 'react';
import { registerDevice, getUserDevices, getUserReservations, searchCompatibleComponents } from '../api';
import { CompatibilityEvidenceModal } from './CompatibilityEvidenceModal';

const DEVICE_TYPES = ['phone', 'laptop', 'tablet', 'pc', 'monitor'];
const PART_CATEGORIES = [
  'screen', 'battery', 'motherboard', 'camera', 'keyboard',
  'chassis', 'charging_port', 'speaker', 'ram', 'storage', 'gpu',
  'cpu', 'trackpad', 'fans', 'power_adapter', 'other'
];

export default function MyDevicesTab({ user, idToken }) {
  const [devices, setDevices] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [deviceType, setDeviceType] = useState('phone');
  const [brand, setBrand] = useState('Apple');
  const [modelName, setModelName] = useState('');
  const [exactModelNumber, setExactModelNumber] = useState('');
  const [variantRegion, setVariantRegion] = useState('');
  const [condition, setCondition] = useState('good');
  const [purchaseYear, setPurchaseYear] = useState(2023);
  const [saving, setSaving] = useState(false);

  // Compatibility Search State
  const [selectedDeviceForSearch, setSelectedDeviceForSearch] = useState(null);
  const [neededCategory, setNeededCategory] = useState('screen');
  const [searchCandidates, setSearchCandidates] = useState([]);
  const [searching, setSearching] = useState(false);

  // Selected candidate for evidence modal
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  useEffect(() => {
    if (user && idToken) {
      loadData();
    }
  }, [user, idToken]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [devList, resList] = await Promise.all([
        getUserDevices(idToken),
        getUserReservations(idToken),
      ]);
      setDevices(devList || []);
      setReservations(resList || []);
    } catch (err) {
      setError(err.message || 'Failed to load user devices.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddDevice(e) {
    e.preventDefault();
    if (!modelName || !exactModelNumber) {
      setError('Model Name and Exact Model Code/SKU are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await registerDevice(
        {
          device_type: deviceType,
          brand,
          model_name: modelName,
          exact_model_number: exactModelNumber,
          variant_region: variantRegion || null,
          condition,
          purchase_year: Number(purchaseYear) || 2023,
          ownership_declared: true,
        },
        idToken
      );
      setShowAddModal(false);
      resetForm();
      await loadData();
    } catch (err) {
      setError(err.message || 'Device registration failed.');
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setModelName('');
    setExactModelNumber('');
    setVariantRegion('');
  }

  async function handleSearchForDevice(device, category) {
    setSelectedDeviceForSearch(device);
    setNeededCategory(category);
    setSearching(true);
    setError(null);
    try {
      const candidates = await searchCompatibleComponents({
        deviceType: device.device_type,
        brand: device.brand,
        modelName: device.model_name,
        exactModelNumber: device.exact_model_number,
        neededPartCategory: category,
      });
      setSearchCandidates(candidates || []);
    } catch (err) {
      setError(err.message || 'Compatible component search failed.');
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="section-label">Device Vault & Component Reuse</span>
          <h2 className="text-2xl font-bold mt-1 text-[var(--text)]">My Registered Devices</h2>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1 max-w-xl">
            Register your hardware models to automatically discover evidence-backed compatible replacement parts and donor devices across the circular marketplace.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary text-xs font-semibold"
        >
          + Register New Device
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
          {error}
        </div>
      )}

      {/* Registered Devices List */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-[var(--text)]">My Hardware Arsenal ({devices.length})</h3>

        {loading ? (
          <div className="py-8 text-center text-xs text-[var(--text-muted)]">Loading registered devices...</div>
        ) : devices.length === 0 ? (
          <div className="card p-8 text-center space-y-3 border-dashed border-[var(--border)]">
            <p className="text-xs text-[var(--text-muted)]">No devices registered in your vault yet.</p>
            <button onClick={() => setShowAddModal(true)} className="btn btn-outline text-xs">
              Register Your First Device
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {devices.map((dev) => (
              <div key={dev.id} className="card p-5 space-y-4 border border-[var(--border)] bg-[var(--surface-1)]">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent)] bg-[var(--accent-dim)] px-2 py-0.5 rounded">
                      {dev.device_type}
                    </span>
                    <h4 className="text-base font-bold text-[var(--text)] mt-1">{dev.brand} {dev.model_name}</h4>
                    <p className="text-xs text-[var(--text-dim)] font-mono">SKU / Model: {dev.exact_model_number}</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded bg-[var(--surface-2)] text-[var(--text-muted)] capitalize">
                    Condition: {dev.condition}
                  </span>
                </div>

                <div className="border-t border-[var(--border-subtle)] pt-3 space-y-2">
                  <label className="block text-xs font-semibold text-[var(--text)]">Find Compatible Replacement Part:</label>
                  <div className="flex gap-2">
                    <select
                      value={selectedDeviceForSearch?.id === dev.id ? neededCategory : 'screen'}
                      onChange={(e) => handleSearchForDevice(dev, e.target.value)}
                      className="input-field text-xs capitalize py-1.5"
                    >
                      {PART_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c.replace('_', ' ')}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleSearchForDevice(dev, neededCategory)}
                      className="btn btn-primary text-xs whitespace-nowrap"
                    >
                      Search Parts
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Compatible Component Search Results */}
      {selectedDeviceForSearch && (
        <div className="card p-6 space-y-6 border border-[var(--accent)]/30 bg-[var(--surface-1)]">
          <div className="flex justify-between items-center border-b border-[var(--border)] pb-4">
            <div>
              <span className="section-label">Evidence-Backed Component Matches</span>
              <h3 className="text-lg font-bold text-[var(--text)] mt-1">
                Compatible {neededCategory.replace('_', ' ').toUpperCase()} parts for {selectedDeviceForSearch.brand} {selectedDeviceForSearch.model_name}
              </h3>
            </div>
            <button onClick={() => setSelectedDeviceForSearch(null)} className="text-xs text-[var(--text-dim)] hover:text-[var(--text)]">
              Close Results ✕
            </button>
          </div>

          {searching ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)]">Running technical compatibility engine & AI agent ranking...</div>
          ) : searchCandidates.length === 0 ? (
            <div className="p-6 text-center text-xs text-[var(--text-muted)] bg-[var(--surface-2)] rounded-xl">
              No active compatible {neededCategory.replace('_', ' ')} listings found matching {selectedDeviceForSearch.brand} {selectedDeviceForSearch.model_name} right now.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {searchCandidates.map((candidate, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 uppercase">
                        {candidate.compatibility_outcome.replace('_', ' ')}
                      </span>
                      <h4 className="text-sm font-bold text-[var(--text)] mt-1.5">{candidate.title}</h4>
                      <p className="text-xs text-[var(--text-dim)]">Seller: {candidate.seller_email || 'Verified Seller'}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-[var(--accent)]">₹{candidate.price_inr.toLocaleString()}</div>
                      <div className="text-[11px] text-[var(--text-dim)]">Total: ₹{candidate.total_estimated_cost_inr.toLocaleString()}</div>
                    </div>
                  </div>

                  <p className="text-xs text-[var(--text-muted)] line-clamp-2">{candidate.explanation}</p>

                  <button
                    onClick={() => setSelectedCandidate(candidate)}
                    className="btn btn-outline text-xs w-full font-semibold"
                  >
                    Inspect Evidence & Reserve
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Active Reservations */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-[var(--text)]">My Active Reservations & Component Holds ({reservations.length})</h3>
        {reservations.length === 0 ? (
          <div className="p-4 text-center text-xs text-[var(--text-muted)] bg-[var(--surface-2)] rounded-xl">
            You have no active component reservations.
          </div>
        ) : (
          <div className="space-y-2">
            {reservations.map((r) => (
              <div key={r.id} className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] flex justify-between items-center text-xs">
                <div>
                  <span className="font-mono text-[var(--accent)] font-bold">{r.id}</span> • Listing ID: {r.listing_id}
                  {r.buyer_notes && <div className="text-[11px] text-[var(--text-muted)] italic">Note: "{r.buyer_notes}"</div>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold uppercase text-[10px]">
                    {r.status}
                  </span>
                  <span className="text-[11px] text-[var(--text-dim)]">Expires: {new Date(r.expires_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Device Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="card w-full max-w-lg p-6 space-y-4 border border-[var(--border)] bg-[var(--surface-1)]">
            <h3 className="text-lg font-bold text-[var(--text)]">Register Hardware Device</h3>
            <form onSubmit={handleAddDevice} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Device Category</label>
                <select value={deviceType} onChange={(e) => setDeviceType(e.target.value)} className="input-field capitalize">
                  {DEVICE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Brand</label>
                  <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. Apple, Dell, Samsung" className="input-field" required />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Model Name</label>
                  <input value={modelName} onChange={(e) => setModelName(e.target.value)} placeholder="e.g. iPhone 12 Pro, XPS 13" className="input-field" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Exact SKU / Model Number</label>
                  <input value={exactModelNumber} onChange={(e) => setExactModelNumber(e.target.value)} placeholder="e.g. A2407, 9310-XPS" className="input-field" required />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Regional Variant (Optional)</label>
                  <input value={variantRegion} onChange={(e) => setVariantRegion(e.target.value)} placeholder="e.g. Global 5G, US Dual-SIM" className="input-field" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Condition</label>
                  <select value={condition} onChange={(e) => setCondition(e.target.value)} className="input-field capitalize">
                    <option value="excellent">Excellent</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair / Damaged</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Purchase Year</label>
                  <input type="number" value={purchaseYear} onChange={(e) => setPurchaseYear(e.target.value)} min="2010" max="2026" className="input-field" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" disabled={saving} className="btn btn-primary">
                  {saving ? 'Saving...' : 'Register Device'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Compatibility Evidence Modal */}
      {selectedCandidate && (
        <CompatibilityEvidenceModal
          candidate={selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
          user={user}
          idToken={idToken}
          onReserved={loadData}
        />
      )}
    </div>
  );
}
