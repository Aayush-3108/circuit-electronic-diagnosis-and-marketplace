import { useState } from 'react';
import { createListing } from '../api';

const COMPONENT_CATEGORIES = [
  'screen', 'battery', 'motherboard', 'camera', 'keyboard',
  'chassis', 'charging_port', 'speaker', 'ram', 'storage', 'gpu',
  'cpu', 'trackpad', 'fans', 'power_adapter', 'other'
];

export function ComponentRecoveryModal({ device, onClose, idToken, onListingCreated }) {
  const [title, setTitle] = useState(`${device.brand || 'Device'} ${device.model_name || 'Parts'} Recovered Components`);
  const [brand, setBrand] = useState(device.brand || 'Generic');
  const [modelName, setModelName] = useState(device.model_name || '');
  const [exactModelNumber, setExactModelNumber] = useState(device.exact_model_number || '');
  const [deviceType, setDeviceType] = useState(device.device_type || 'phone');
  const [parts, setParts] = useState([
    {
      part_id: 'part_1',
      category: 'screen',
      condition: 'good',
      price_inr: 2500,
      description: 'Functional display assembly recovered from diagnosed device',
      verification_level: 'diagnostically_tested',
      compatible_models: `${device.brand || ''} ${device.model_name || ''}`,
      exact_model_number: device.exact_model_number || '',
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function addPart() {
    setParts((prev) => [
      ...prev,
      {
        part_id: `part_${prev.length + 1}`,
        category: 'battery',
        condition: 'good',
        price_inr: 1500,
        description: '',
        verification_level: 'diagnostically_tested',
        compatible_models: `${brand} ${modelName}`,
        exact_model_number: exactModelNumber,
      },
    ]);
  }

  function updatePart(index, field, value) {
    setParts((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  }

  function removePart(index) {
    setParts((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!idToken) {
      setError('Please sign in to list components.');
      return;
    }
    if (parts.length === 0) {
      setError('Please add at least one component to list.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await createListing(
        {
          device_type: deviceType,
          brand,
          model_name: modelName,
          exact_model_number: exactModelNumber,
          listing_type: 'parts',
          title,
          description: `Recovered functional component listings for ${brand} ${modelName}`,
          parts,
          recommendation_source: 'repair',
        },
        idToken
      );
      if (onListingCreated) onListingCreated();
      onClose();
    } catch (err) {
      setError(err.message || 'Component recovery listing failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="card w-full max-w-3xl p-6 space-y-6 relative border border-[var(--border)] bg-[var(--surface-1)]">
        <button onClick={onClose} className="absolute top-4 right-4 text-[var(--text-dim)] hover:text-[var(--text)] text-lg">✕</button>

        <div>
          <span className="section-label">Circular Hardware Recovery</span>
          <h2 className="text-xl font-bold mt-1 text-[var(--text)]">Dismantle & Recover Usable Components</h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Select individual functional components from your diagnosed device to list on the marketplace for other repairers.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold mb-1">Brand</label>
              <input value={brand} onChange={(e) => setBrand(e.target.value)} className="input-field" required />
            </div>
            <div>
              <label className="block font-semibold mb-1">Model Name</label>
              <input value={modelName} onChange={(e) => setModelName(e.target.value)} className="input-field" required />
            </div>
            <div>
              <label className="block font-semibold mb-1">SKU / Model Number</label>
              <input value={exactModelNumber} onChange={(e) => setExactModelNumber(e.target.value)} className="input-field" placeholder="e.g. A2407" />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-sm text-[var(--text)]">Recovered Components List ({parts.length})</h4>
              <button type="button" onClick={addPart} className="btn btn-outline text-xs">+ Add Component</button>
            </div>

            {parts.map((part, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[var(--accent)] text-xs">Component #{idx + 1}</span>
                  {parts.length > 1 && (
                    <button type="button" onClick={() => removePart(idx)} className="text-xs text-rose-400 hover:underline">
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Category</label>
                    <select
                      value={part.category}
                      onChange={(e) => updatePart(idx, 'category', e.target.value)}
                      className="input-field capitalize"
                    >
                      {COMPONENT_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Condition</label>
                    <select
                      value={part.condition}
                      onChange={(e) => updatePart(idx, 'condition', e.target.value)}
                      className="input-field capitalize"
                    >
                      <option value="excellent">Excellent</option>
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="damaged">Damaged / For Parts</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Price (₹)</label>
                    <input
                      type="number"
                      value={part.price_inr}
                      onChange={(e) => updatePart(idx, 'price_inr', Number(e.target.value))}
                      className="input-field"
                      min="0"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Verification Level</label>
                    <select
                      value={part.verification_level}
                      onChange={(e) => updatePart(idx, 'verification_level', e.target.value)}
                      className="input-field capitalize"
                    >
                      <option value="seller_reported">Seller Reported</option>
                      <option value="diagnostically_tested">Diagnostically Tested</option>
                      <option value="technician_verified">Technician Verified</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Technical Specs & Description</label>
                  <input
                    value={part.description || ''}
                    onChange={(e) => updatePart(idx, 'description', e.target.value)}
                    placeholder="e.g. Clean flex cable connector, battery health 85%, tested charging pass..."
                    className="input-field"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)]">
            <button type="button" onClick={onClose} className="btn btn-outline">Cancel</button>
            <button type="submit" disabled={loading} className="btn btn-primary font-semibold">
              {loading ? 'Publishing Component Listings...' : 'Publish Component Listings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
