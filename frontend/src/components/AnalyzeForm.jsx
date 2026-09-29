import { useState, useCallback } from 'react';
import { analyzeDevice } from '../api';
import { CheckIcon } from './Icons';

const DEVICE_TYPES = ['phone', 'laptop', 'tablet', 'pc', 'monitor'];
const BRAND_TIERS = [
  { value: 'budget',  label: 'Budget (≤ ₹15k)' },
  { value: 'mid',     label: 'Mid-range (₹15k–50k)' },
  { value: 'premium', label: 'Premium (₹50k+)' },
];
const FUNCTIONAL_STATUS = [
  { value: 'fully_functional',    label: 'Fully functional' },
  { value: 'partially_functional',label: 'Partially functional' },
  { value: 'not_functional',      label: 'Not functional' },
];
const RAM_OPTIONS = ['1', '2', '3', '4', '6', '8', '12', '16', '32', '64'];
const STORAGE_OPTIONS = ['16', '32', '64', '128', '256', '512', '1024'];

const ANGLES = [
  { key: 'front', label: 'Front', hint: 'Screen facing up' },
  { key: 'back',  label: 'Back',  hint: 'Rear chassis' },
  { key: 'side',  label: 'Side',  hint: 'Ports & buttons' },
  { key: 'parts', label: 'Detail', hint: 'Close-up damage' },
];

const STEPS = ['Upload Photos', 'Device Specs', 'Current State'];

function StepIndicator({ current }) {
  return (
    <div className="flex items-center gap-1 mb-8">
      {STEPS.map((s, i) => (
        <div key={s} className="flex items-center gap-1 flex-1">
          {i > 0 && (
            <div className={`h-px flex-1 transition-colors ${i <= current ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'}`} />
          )}
          <div className="flex items-center gap-2 shrink-0">
            <span className={`w-6 h-6 flex items-center justify-center rounded-full text-[11px] font-bold transition-all ${
              i === current
                ? 'bg-[var(--accent-warm)] text-white'
                : i < current
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--surface-2)] text-[var(--text-dim)] border border-[var(--border)]'
            }`}>
              {i < current ? <CheckIcon className="w-3.5 h-3.5" /> : i + 1}
            </span>
            <span className={`text-xs font-medium hidden sm:block ${
              i === current ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'
            }`}>{s}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function DropZone({ angle, file, onFile }) {
  const [drag, setDrag] = useState(false);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith('image/')) onFile(angle.key, f);
  }, [angle.key, onFile]);

  const preview = file ? URL.createObjectURL(file) : null;

  return (
    <label
      htmlFor={`img-${angle.key}`}
      className={`aspect-square flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-[var(--radius-lg)] text-center transition-all cursor-pointer relative overflow-hidden ${
        drag ? 'border-[var(--accent)] bg-[var(--accent-dim)]' : 'border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--accent)] hover:bg-[var(--accent-dim)]'
      }`}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
    >
      {preview ? (
        <img src={preview} alt={angle.label} className="w-full h-full object-cover absolute inset-0 rounded-[var(--radius-lg)]" />
      ) : (
        <div className="space-y-1.5 select-none z-10">
          <div className="w-8 h-8 rounded-lg bg-[var(--surface-3)] flex items-center justify-center mx-auto text-[var(--text-muted)] text-lg">+</div>
          <p className="text-xs font-semibold text-[var(--text)]">{angle.label}</p>
          <p className="text-[10px] text-[var(--text-dim)]">{angle.hint}</p>
        </div>
      )}
      <input
        id={`img-${angle.key}`}
        type="file"
        accept="image/*"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(angle.key, f); }}
        className="sr-only"
        aria-label={`Upload ${angle.label} image`}
      />
    </label>
  );
}

function Field({ label, children, id, note }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <label htmlFor={id} className="text-xs font-medium text-[var(--text-muted)]">{label}</label>
        {note && <span className="text-[10px] text-[var(--text-dim)]">{note}</span>}
      </div>
      {children}
    </div>
  );
}

export default function AnalyzeForm({ onResult }) {
  const [step, setStep] = useState(0);

  // Form State
  const [images, setImages] = useState({ front: null, back: null, side: null, parts: null });
  const [deviceType, setDeviceType] = useState('phone');
  const [brand, setBrand] = useState('');
  const [modelName, setModelName] = useState('');
  const [brandTier, setBrandTier] = useState('mid');
  const [ramGb, setRamGb] = useState('4');
  const [storageGb, setStorageGb] = useState('128');
  const [originalPrice, setOriginalPrice] = useState('');
  const [ageMonths, setAgeMonths] = useState('');
  const [batteryHealth, setBatteryHealth] = useState(80);
  const [functionalStatus, setFunctionalStatus] = useState('fully_functional');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const setImage = useCallback((key, file) => {
    setImages((prev) => ({ ...prev, [key]: file }));
  }, []);

  const primaryImage = images.front || images.back || images.side || images.parts;

  function next() {
    if (step === 0 && !primaryImage) {
      setError('At least one photo is required for damage assessment. Upload the front view first.');
      return;
    }
    if (step === 1 && !brand.trim()) {
      setError('Please enter the device brand before continuing.');
      return;
    }
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function prev() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!originalPrice || !ageMonths) {
      setError('Please fill in the original price and device age to continue.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await analyzeDevice({
        image: primaryImage,
        deviceType,
        brandTier,
        originalPriceInr: Number(originalPrice),
        ageMonths: Number(ageMonths),
        batteryHealthPct: Number(batteryHealth),
        functionalStatus,
      });
      onResult(result, { deviceType, brand, modelName, ramGb, storageGb, originalPrice, ageMonths }, primaryImage);
    } catch (err) {
      setError(err.message || 'Diagnostic scan failed. Please check that the backend is running.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 md:p-8 space-y-6">
      <StepIndicator current={step} />

      {/* STEP 0: Upload photos */}
      {step === 0 && (
        <div className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-[var(--text)] mb-1">Upload device photos</p>
            <p className="text-xs text-[var(--text-muted)] mb-5">
              Add up to 4 angle shots of your device. The front photo is used for primary damage assessment — all others help improve accuracy.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {ANGLES.map((a) => (
                <DropZone key={a.key} angle={a} file={images[a.key]} onFile={setImage} />
              ))}
            </div>
          </div>
          {error && <p className="text-xs text-[var(--recycle)] bg-[var(--recycle-dim)] px-3 py-2 rounded-lg border border-[var(--recycle)]/20">{error}</p>}
          <div className="flex justify-end pt-2">
            <button type="button" onClick={next} className="btn btn-primary">
              Continue to Specs →
            </button>
          </div>
        </div>
      )}

      {/* STEP 1: Specs */}
      {step === 1 && (
        <div className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-[var(--text)] mb-1">Hardware specifications</p>
            <p className="text-xs text-[var(--text-muted)] mb-5">Tell us about the device so we can calculate market resale value accurately.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Device type" id="an-dt">
              <select id="an-dt" value={deviceType} onChange={(e) => setDeviceType(e.target.value)} className="input-field">
                {DEVICE_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </Field>
            <Field label="Price tier" id="an-bt">
              <select id="an-bt" value={brandTier} onChange={(e) => setBrandTier(e.target.value)} className="input-field">
                {BRAND_TIERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Brand" id="an-b" note="Required">
              <input id="an-b" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. Apple, Samsung, Lenovo" className="input-field" />
            </Field>
            <Field label="Model name" id="an-mn" note="Optional">
              <input id="an-mn" value={modelName} onChange={(e) => setModelName(e.target.value)} placeholder="e.g. iPhone 13, Galaxy S22" className="input-field" />
            </Field>
            <Field label="RAM" id="an-r">
              <select id="an-r" value={ramGb} onChange={(e) => setRamGb(e.target.value)} className="input-field">
                {RAM_OPTIONS.map((r) => <option key={r} value={r}>{r} GB</option>)}
              </select>
            </Field>
            <Field label="Storage" id="an-s">
              <select id="an-s" value={storageGb} onChange={(e) => setStorageGb(e.target.value)} className="input-field">
                {STORAGE_OPTIONS.map((s) => <option key={s} value={s}>{Number(s) >= 1024 ? '1 TB' : `${s} GB`}</option>)}
              </select>
            </Field>
          </div>
          {error && <p className="text-xs text-[var(--recycle)] bg-[var(--recycle-dim)] px-3 py-2 rounded-lg border border-[var(--recycle)]/20">{error}</p>}
          <div className="flex justify-between pt-2">
            <button type="button" onClick={prev} className="btn btn-outline">← Back</button>
            <button type="button" onClick={next} className="btn btn-primary">Continue to State →</button>
          </div>
        </div>
      )}

      {/* STEP 2: Condition & Battery */}
      {step === 2 && (
        <div className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-[var(--text)] mb-1">Current device condition</p>
            <p className="text-xs text-[var(--text-muted)] mb-5">These values influence the repair cost estimate and the overall recommendation score.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Original purchase price (₹)" id="an-p" note="Required">
              <input id="an-p" type="number" min="0" value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} placeholder="e.g. 30000" className="input-field" />
            </Field>
            <Field label="How long have you owned it?" id="an-a" note="In months">
              <input id="an-a" type="number" min="0" value={ageMonths} onChange={(e) => setAgeMonths(e.target.value)} placeholder="e.g. 24" className="input-field" />
            </Field>
            <Field label="Power status" id="an-fs">
              <select id="an-fs" value={functionalStatus} onChange={(e) => setFunctionalStatus(e.target.value)} className="input-field">
                {FUNCTIONAL_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-medium text-[var(--text-muted)]">Battery health</label>
                <span className="text-sm font-bold text-[var(--accent)]">{batteryHealth}%</span>
              </div>
              <input
                id="an-bh"
                type="range"
                min="0"
                max="100"
                value={batteryHealth}
                onChange={(e) => setBatteryHealth(Number(e.target.value))}
                className="w-full cursor-pointer"
                style={{ accentColor: 'var(--accent)' }}
                aria-label="Battery health percentage"
              />
              <div className="flex justify-between text-[10px] text-[var(--text-dim)]">
                <span>Dead (0%)</span>
                <span>Good (80%)</span>
                <span>Full (100%)</span>
              </div>
            </div>
          </div>
          {error && <p className="text-xs text-[var(--recycle)] bg-[var(--recycle-dim)] px-3 py-2 rounded-lg border border-[var(--recycle)]/20">{error}</p>}
          <div className="flex justify-between pt-2">
            <button type="button" onClick={prev} className="btn btn-outline">← Back</button>
            <button type="submit" disabled={loading} className="btn btn-warm">
              {loading ? 'Analyzing your device…' : 'Run Diagnostic →'}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
