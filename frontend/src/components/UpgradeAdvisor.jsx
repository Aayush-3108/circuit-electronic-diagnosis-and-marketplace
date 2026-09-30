import { useState } from 'react';
import { getUpgradeAdvice } from '../api';
import { UpgradeIcon, ArrowRightIcon } from './Icons';

const DEVICE_TYPES = ['phone', 'laptop', 'tablet', 'pc', 'monitor'];
const USE_CASES = ['Gaming', 'College/Work', 'Content Creation', 'Casual/Media', 'Coding/Development'];
const PAIN_POINTS = [
  'Sluggish / slow response',
  'Battery life is terrible',
  'Low storage space',
  'Cannot run new software/games',
  'Overheating / loud fan noise',
];

const PRESETS_BUDGET = [
  { val: 15000, label: '₹15k' },
  { val: 30000, label: '₹30k' },
  { val: 50000, label: '₹50k' },
  { val: 80000, label: '₹80k' },
];

export default function UpgradeAdvisor({ prefillDeviceType }) {
  const [step, setStep] = useState(1);
  const [deviceType, setDeviceType] = useState(prefillDeviceType || 'phone');

  // Specs
  const [brandModel, setBrandModel] = useState('');
  const [cpu, setCpu] = useState('mid');
  const [ram, setRam] = useState('8GB');
  const [storage, setStorage] = useState('128GB');
  const [gpu, setGpu] = useState('');
  const [age, setAge] = useState(24);
  const [selectedPains, setSelectedPains] = useState([]);

  // Goals
  const [budget, setBudget] = useState('');
  const [useCase, setUseCase] = useState('College/Work');
  const [additionalGoals, setAdditionalGoals] = useState('');

  // Output
  const [advice, setAdvice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const togglePain = (pain) => {
    setSelectedPains((prev) =>
      prev.includes(pain) ? prev.filter((p) => p !== pain) : [...prev, pain]
    );
  };

  async function handleGetAdvice() {
    setError(null);
    setLoading(true);
    setStep(3);

    const currentSpecsString = [
      `Device Type: ${deviceType}`,
      `Brand & Model: ${brandModel || 'Generic'}`,
      `Age: ${age} months`,
      `Hardware: CPU tier is ${cpu}, RAM is ${ram}, Storage is ${storage}${gpu ? `, GPU is ${gpu}` : ''}`,
      selectedPains.length > 0 ? `Reported Issues: ${selectedPains.join(', ')}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    try {
      const res = await getUpgradeAdvice({
        deviceType,
        currentSpecs: currentSpecsString,
        budgetInr: budget ? Number(budget) : null,
        useCase: `${useCase}. ${additionalGoals}`,
      });
      setAdvice(res.advice);
    } catch (err) {
      setError(err.message || 'Upgrade advisory lookup failed.');
    } finally {
      setLoading(false);
    }
  }

  function resetAdvisor() {
    setStep(1);
    setAdvice(null);
    setBudget('');
    setAdditionalGoals('');
    setSelectedPains([]);
  }

  return (
    <div className="card p-6 md:p-8 space-y-6">
      <div>
        <span className="section-label">Upgrade & Compatibility</span>
        <h2 className="text-2xl font-bold mt-1 text-[var(--text)]">Hardware Longevity Planner</h2>
        <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1 max-w-xl">
          Identify hardware bottlenecks, compare upgrade paths against replacement costs, and explore practical solutions for your current machine.
        </p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-4 text-xs">
        {[
          { num: '01', label: 'Device Specs', active: step === 1 },
          { num: '02', label: 'Workload & Budget', active: step === 2 },
          { num: '03', label: 'Recommended Path', active: step === 3 },
        ].map((s, idx) => (
          <span
            key={idx}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              s.active
                ? 'bg-[var(--accent-dim)] text-[var(--accent)] font-semibold border border-[var(--accent)]/30'
                : 'text-[var(--text-dim)]'
            }`}
          >
            {s.num}. {s.label}
          </span>
        ))}
      </div>

      {/* STEP 1: Specs and Pain Points */}
      {step === 1 && (
        <div className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text)] mb-1.5">Device Type</label>
              <select value={deviceType} onChange={(e) => setDeviceType(e.target.value)} className="input-field text-sm capitalize">
                {DEVICE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text)] mb-1.5">Brand & Model</label>
              <input
                value={brandModel}
                onChange={(e) => setBrandModel(e.target.value)}
                placeholder="e.g. Dell XPS 13, MacBook Air"
                className="input-field text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text)] mb-1.5">Processor Tier</label>
              <select value={cpu} onChange={(e) => setCpu(e.target.value)} className="input-field text-sm">
                <option value="budget">Entry Level / Basic</option>
                <option value="mid">Mid-Range / Mainstream</option>
                <option value="premium">High Performance / Pro</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text)] mb-1.5">RAM Capacity</label>
              <select value={ram} onChange={(e) => setRam(e.target.value)} className="input-field text-sm">
                <option value="4GB">4 GB</option>
                <option value="8GB">8 GB</option>
                <option value="16GB">16 GB</option>
                <option value="32GB">32 GB+</option>
              </select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text)] mb-1.5">Storage Capacity</label>
              <select value={storage} onChange={(e) => setStorage(e.target.value)} className="input-field text-sm">
                <option value="64GB">64 GB</option>
                <option value="128GB">128 GB</option>
                <option value="256GB">256 GB</option>
                <option value="512GB">512 GB</option>
                <option value="1TB">1 TB or higher</option>
              </select>
            </div>
            <div>
              <div className="flex justify-between text-xs font-semibold text-[var(--text)] mb-1.5">
                <span>Device Age</span>
                <span className="text-[var(--text-muted)] font-normal">{Math.round(age / 12 * 10) / 10} Years ({age} Months)</span>
              </div>
              <input
                type="range"
                min="6"
                max="96"
                step="6"
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="w-full cursor-pointer mt-2"
                style={{ accentColor: 'var(--accent)' }}
                aria-label="Device age slider"
              />
              <div className="flex justify-between text-[11px] text-[var(--text-dim)] mt-1 select-none">
                <span>6 mos</span><span>2 yrs</span><span>4 yrs</span><span>8 yrs</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[var(--text)]">Observed Hardware Issues</label>
            <div className="flex flex-wrap gap-2">
              {PAIN_POINTS.map((pain) => {
                const active = selectedPains.includes(pain);
                return (
                  <button
                    type="button"
                    key={pain}
                    onClick={() => togglePain(pain)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                      active
                        ? 'border-[var(--accent)] bg-[var(--accent-dim)] text-[var(--accent)] font-semibold'
                        : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] hover:border-[var(--text-dim)]'
                    }`}
                  >
                    {pain}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button type="button" onClick={() => setStep(2)} className="btn btn-primary text-xs font-semibold">
              Continue to Goals
              <ArrowRightIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Goals */}
      {step === 2 && (
        <div className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text)] mb-1.5">Target Budget (₹)</label>
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="e.g. 25000"
                className="input-field text-sm"
              />
              <div className="flex gap-2 mt-2">
                {PRESETS_BUDGET.map((p) => (
                  <button
                    key={p.val}
                    type="button"
                    onClick={() => setBudget(p.val.toString())}
                    className="text-xs px-2.5 py-1 rounded-md bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors text-[var(--text)]"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text)] mb-1.5">Primary Workload</label>
              <select value={useCase} onChange={(e) => setUseCase(e.target.value)} className="input-field text-sm">
                {USE_CASES.map((uc) => <option key={uc} value={uc}>{uc}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text)] mb-1.5">Specific Needs or Requirements</label>
            <textarea
              value={additionalGoals}
              onChange={(e) => setAdditionalGoals(e.target.value)}
              placeholder="e.g. Needs smooth video editing playback, larger storage for projects, or longer battery life on the go..."
              rows={3}
              className="input-field resize-none text-sm"
            />
          </div>

          <div className="flex justify-between pt-3">
            <button type="button" onClick={() => setStep(1)} className="btn btn-outline text-xs">
              Back
            </button>
            <button type="button" onClick={handleGetAdvice} className="btn btn-primary text-xs font-semibold">
              Generate Upgrade Plan
              <ArrowRightIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Results */}
      {step === 3 && (
        <div className="space-y-5">
          {loading && (
            <div className="py-12 space-y-4 text-center">
              <div className="inline-block animate-spin w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
              <p className="text-xs text-[var(--text-muted)] font-medium">Analyzing hardware bottlenecks and compatible upgrade paths...</p>
            </div>
          )}

          {error && (
            <div className="space-y-4">
              <p className="text-xs text-[var(--recycle)] bg-[var(--recycle-dim)] p-3 rounded-lg border border-[var(--recycle)]/30">
                {error}
              </p>
              <button onClick={() => setStep(2)} className="btn btn-outline text-xs">
                Retry
              </button>
            </div>
          )}

          {advice && !loading && (
            <div className="space-y-5">
              <div className="p-6 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm leading-relaxed text-[var(--text)] whitespace-pre-wrap">
                {advice}
              </div>

              <div className="flex justify-between items-center border-t border-[var(--border-subtle)] pt-4">
                <span className="text-xs text-[var(--text-dim)]">Assessment complete</span>
                <button onClick={resetAdvisor} className="btn btn-outline text-xs">
                  Start New Plan
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
