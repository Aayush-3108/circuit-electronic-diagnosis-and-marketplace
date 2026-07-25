import { useState } from 'react';
import { getUpgradeAdvice } from '../api';

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
    <div className="card p-6 md:p-8 space-y-6 tech-bracket">
      {/* Decorative corner indicators */}
      <div className="absolute top-2 left-2 font-mono text-[8px] text-[var(--accent-warm)]">● ADVISORY_WIZARD_SYSTEM</div>
      <div className="absolute top-2 right-2 font-mono text-[8px] text-[var(--text-dim)]">MODEL:GEMINI-1.5-FLASH</div>

      <div>
        <p className="section-label mb-2">UPGRADE_ADVISORY_MODULE</p>
        <h3 className="text-2xl font-bold mb-3 text-[var(--text)]">Target Hardware Planner</h3>
        <p className="text-xs text-[var(--text-muted)] max-w-xl">
          Structured diagnostic questionnaire matching hardware specifications, user workload constraints, and budget targets to alternative devices.
        </p>
      </div>

      {/* Steps telemetry indicators */}
      <div className="flex items-center gap-1.5 mb-6 border-b border-[var(--border-subtle)] pb-4">
        {[
          { label: '01.STATE_EVALUATION', active: step === 1 },
          { label: '02.PARAMETRIC_TARGETS', active: step === 2 },
          { label: '03.REPAIR_RECOMMENDATION', active: step === 3 },
        ].map((s, idx) => (
          <span
            key={idx}
            className={`font-mono text-[9px] px-2.5 py-1 border rounded-[var(--radius-sm)] ${
              s.active
                ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-dim)] font-bold'
                : 'border-transparent text-[var(--text-dim)]'
            }`}
          >
            {s.label}
          </span>
        ))}
      </div>

      {/* STEP 1: Specs and Pain Points */}
      {step === 1 && (
        <div className="space-y-5 fade-up">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-mono text-[9px] text-[var(--text-dim)] uppercase mb-1.5">[DEVICE_CLASS]</label>
              <select value={deviceType} onChange={(e) => setDeviceType(e.target.value)} className="input-field">
                {DEVICE_TYPES.map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-mono text-[9px] text-[var(--text-dim)] uppercase mb-1.5">[MODEL_STAMP]</label>
              <input
                value={brandModel}
                onChange={(e) => setBrandModel(e.target.value)}
                placeholder="e.g. DELL XPS 13 9310"
                className="input-field font-mono uppercase text-xs"
              />
            </div>
            <div>
              <label className="block font-mono text-[9px] text-[var(--text-dim)] uppercase mb-1.5">[CPU_PROCESSOR_LEVEL]</label>
              <select value={cpu} onChange={(e) => setCpu(e.target.value)} className="input-field">
                <option value="budget">ENTRY LEVEL / CHIPSETS_LOW</option>
                <option value="mid">MID RANGE / CHIPSETS_NORMAL</option>
                <option value="premium">HIGH PERFORMANCE / CHIPSETS_PRO</option>
              </select>
            </div>
            <div>
              <label className="block font-mono text-[9px] text-[var(--text-dim)] uppercase mb-1.5">[SYSTEM_MEMORY_RAM]</label>
              <select value={ram} onChange={(e) => setRam(e.target.value)} className="input-field">
                <option value="4GB">4 GB</option>
                <option value="8GB">8 GB</option>
                <option value="16GB">16 GB</option>
                <option value="32GB">32 GB+</option>
              </select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-mono text-[9px] text-[var(--text-dim)] uppercase mb-1.5">[DISK_CAPACITY_STORAGE]</label>
              <select value={storage} onChange={(e) => setStorage(e.target.value)} className="input-field">
                <option value="64GB">64 GB</option>
                <option value="128GB">128 GB</option>
                <option value="256GB">256 GB</option>
                <option value="512GB">512 GB</option>
                <option value="1TB">1 TB+</option>
              </select>
            </div>
            <div>
              <label className="block font-mono text-[9px] text-[var(--text-dim)] uppercase mb-1.5">[ESTIMATED_AGE: {age} MO]</label>
              <input
                type="range"
                min="6"
                max="96"
                step="6"
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="w-full cursor-pointer mt-2"
                style={{ accentColor: 'var(--accent)' }}
                aria-label="Device age slider selector"
              />
              <div className="flex justify-between font-mono text-[8px] text-[var(--text-dim)] mt-1 select-none">
                <span>0.5 YR</span><span>2 YRS</span><span>4 YRS</span><span>8 YRS</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block font-mono text-[9px] text-[var(--text-dim)] uppercase">[OBSERVED_HARDWARE_LIMITATIONS]</label>
            <div className="flex flex-wrap gap-2">
              {PAIN_POINTS.map((pain) => {
                const active = selectedPains.includes(pain);
                return (
                  <button
                    type="button"
                    key={pain}
                    onClick={() => togglePain(pain)}
                    className={`font-mono text-[9px] tracking-wide px-3 py-1.5 rounded-[var(--radius-sm)] border transition-all ${
                      active
                        ? 'border-[var(--accent)] bg-[var(--accent-dim)] text-[var(--accent)]'
                        : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] hover:border-[var(--text-dim)]'
                    }`}
                  >
                    {pain.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button type="button" onClick={() => setStep(2)} className="btn btn-primary text-xs">
              NEXT: SET PARAMETRIC TARGETS →
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Goals */}
      {step === 2 && (
        <div className="space-y-5 fade-up">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-mono text-[9px] text-[var(--text-dim)] uppercase mb-1.5">[INR_BUDGET_CAP]</label>
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="e.g. 50000"
                className="input-field font-mono"
              />
              <div className="flex gap-1.5 mt-2">
                {PRESETS_BUDGET.map((p) => (
                  <button
                    key={p.val}
                    type="button"
                    onClick={() => setBudget(p.val.toString())}
                    className="font-mono text-[9px] px-2 py-0.5 rounded bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--text-dim)]"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block font-mono text-[9px] text-[var(--text-dim)] uppercase mb-1.5">[TARGET_WORKLOAD]</label>
              <select value={useCase} onChange={(e) => setUseCase(e.target.value)} className="input-field">
                {USE_CASES.map((uc) => <option key={uc} value={uc}>{uc.toUpperCase()}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-mono text-[9px] text-[var(--text-dim)] uppercase mb-1.5">[SPECIFIC_CAPABILITY_GOALS]</label>
            <textarea
              value={additionalGoals}
              onChange={(e) => setAdditionalGoals(e.target.value)}
              placeholder="e.g. Needs to run local ML models, render raw 4K tracks, or fits inside a micro-chassis casing..."
              rows={3}
              className="input-field resize-none text-xs"
            />
          </div>

          <div className="flex justify-between pt-3">
            <button type="button" onClick={() => setStep(1)} className="btn btn-outline text-xs">
              ← BACK
            </button>
            <button type="button" onClick={handleGetAdvice} className="btn btn-warm text-xs">
              CALCULATE UPGRADE ADVICE →
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Results (Terminal screen layout) */}
      {step === 3 && (
        <div className="space-y-5 fade-up">
          {loading && (
            <div className="py-12 space-y-4 text-center">
              <div className="flex justify-center items-center gap-1.5">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
              <p className="font-mono text-[10px] text-[var(--text-dim)] uppercase">[PROCESSING: INFERENCE_RUNNING]</p>
            </div>
          )}

          {error && (
            <div className="space-y-4">
              <p className="font-mono text-xs text-[var(--recycle)] uppercase">[ERROR: RUNTIME_FAULT] {error}</p>
              <button onClick={() => setStep(2)} className="btn btn-outline text-xs">RETRY INFERENCE</button>
            </div>
          )}

          {advice && !loading && (
            <div className="space-y-5 pt-2">
              <div className="terminal-box whitespace-pre-wrap font-mono select-text">
                {`/* CIRCUIT ADVISORY ENGINE EVALUATION SYSTEM */\n\n${advice}`}
              </div>

              <div className="flex justify-between items-center border-t border-[var(--border-subtle)] pt-4">
                <span className="font-mono text-[8px] text-[var(--text-dim)] uppercase">[TELEMETRY_ENGINE_OK]</span>
                <button onClick={resetAdvisor} className="btn btn-outline text-xs">
                  RESET PLANS
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
