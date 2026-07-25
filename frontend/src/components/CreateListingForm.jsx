import { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { uploadListingImage, cloudinaryConfigured } from '../lib/cloudinary';
import { createListing } from '../api';

const DEVICE_TYPES = ['phone', 'laptop', 'tablet', 'pc', 'monitor'];
const CATEGORIES = ['screen', 'battery', 'motherboard', 'camera', 'keyboard', 'chassis', 'charging_port', 'speaker', 'ram', 'storage', 'gpu', 'other'];
const CONDITIONS = ['excellent', 'good', 'fair', 'damaged', 'for_parts'];

let partIdCounter = 0;
function newPart() {
  partIdCounter += 1;
  return {
    part_id: `p${Date.now()}_${partIdCounter}`,
    category: 'screen', condition: 'good',
    price_inr: '', description: '', compatible_models: '',
    files: [], previews: [], images: [],
  };
}

function Field({ label, children, id, note, className = '' }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex justify-between items-center">
        <label htmlFor={id} className="text-xs font-medium text-[var(--text-muted)]">{label}</label>
        {note && <span className="text-[10px] text-[var(--text-dim)]">{note}</span>}
      </div>
      {children}
    </div>
  );
}

function ImageUploadZone({ id, files, previews, onChange, multiple = true }) {
  const [drag, setDrag] = useState(false);

  const handleFiles = useCallback((incoming) => {
    const imgs = Array.from(incoming).filter((f) => f.type.startsWith('image/'));
    if (!imgs.length) return;
    const newPreviews = imgs.map((f) => URL.createObjectURL(f));
    onChange(imgs, newPreviews);
  }, [onChange]);

  return (
    <div className="space-y-3">
      <label
        htmlFor={id}
        className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all ${
          drag ? 'border-[var(--accent)] bg-[var(--accent-dim)]' : 'border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--accent)] hover:bg-[var(--accent-dim)]'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
      >
        <div className="w-10 h-10 rounded-xl bg-[var(--surface-3)] flex items-center justify-center text-xl text-[var(--text-muted)]">📷</div>
        <p className="text-xs font-medium text-[var(--text)]">Drop photos here or click to browse</p>
        <p className="text-[10px] text-[var(--text-dim)]">JPEG, PNG or WebP · max 10 MB per file</p>
        <input
          id={id}
          type="file"
          multiple={multiple}
          accept="image/*"
          className="sr-only"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>
      {previews.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {previews.map((src, i) => (
            <div key={i} className="relative group">
              <img
                src={src}
                alt={`Photo ${i + 1}`}
                className="w-16 h-16 object-cover rounded-lg border border-[var(--border)]"
              />
              <button
                type="button"
                onClick={() => onChange(files.filter((_, j) => j !== i), previews.filter((_, j) => j !== i))}
                className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--recycle)] text-white rounded-full text-[9px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove photo"
              >×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CreateListingForm({ onCreated, prefill }) {
  const { user, firebaseConfigured } = useAuth();

  const [deviceType, setDeviceType] = useState(prefill?.deviceType || 'phone');
  const [brand, setBrand] = useState('');
  const [modelName, setModelName] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [listingType, setListingType] = useState('whole_device');

  // whole-device fields
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState('good');
  const [wholeFiles, setWholeFiles] = useState([]);
  const [wholePreviews, setWholePreviews] = useState([]);

  // parts
  const [parts, setParts] = useState([newPart()]);

  // upload progress state
  const [uploadProgress, setUploadProgress] = useState(null); // null | 'uploading' | 'done'
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function updatePart(id, patch) {
    setParts((ps) => ps.map((p) => (p.part_id === id ? { ...p, ...patch } : p)));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!firebaseConfigured || !user) {
      setError('You need to be signed in to create a listing.');
      return;
    }
    if (!brand.trim() || !modelName.trim() || !title.trim()) {
      setError('Brand, model name, and listing title are all required.');
      return;
    }

    setSubmitting(true);
    try {
      const idToken = await user.getIdToken();
      let payload;

      if (listingType === 'whole_device') {
        if (!price || wholeFiles.length === 0) {
          throw new Error('A price and at least one photo are required for whole-device listings.');
        }
        setUploadProgress('uploading');
        const images = await Promise.all(wholeFiles.map((f) => uploadListingImage(f)));
        setUploadProgress('done');
        payload = {
          device_type: deviceType, brand, model_name: modelName,
          listing_type: 'whole_device', title, description: description || null,
          images, price_inr: Number(price), condition,
        };
      } else {
        if (parts.length === 0) throw new Error('Add at least one part to your listing.');
        for (const p of parts) {
          if (!p.price_inr) throw new Error(`Set a price for the ${p.category.replace(/_/g, ' ')} part.`);
        }
        setUploadProgress('uploading');
        const uploadedParts = await Promise.all(
          parts.map(async (p) => ({
            part_id: p.part_id,
            category: p.category,
            condition: p.condition,
            price_inr: Number(p.price_inr),
            description: p.description || null,
            compatible_models: p.compatible_models || null,
            images: p.files.length ? await Promise.all(p.files.map((f) => uploadListingImage(f))) : [],
          }))
        );
        setUploadProgress('done');
        payload = {
          device_type: deviceType, brand, model_name: modelName,
          listing_type: 'parts', title, description: description || null,
          parts: uploadedParts,
        };
      }

      const created = await createListing(payload, idToken);
      onCreated(created);
    } catch (err) {
      setUploadProgress(null);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 md:p-8 space-y-6">
      {/* Warnings */}
      {!firebaseConfigured && (
        <div className="rounded-xl border border-[var(--repair)] bg-[var(--repair-dim)] px-4 py-3 text-xs text-[var(--repair)] font-medium flex items-center gap-2">
          <span className="text-base">⚠️</span>
          Firebase auth is not configured — sign in won't work until keys are added to <code className="font-mono">frontend/.env</code>.
        </div>
      )}
      {!cloudinaryConfigured && (
        <div className="rounded-xl border border-[var(--repair)] bg-[var(--repair-dim)] px-4 py-3 text-xs text-[var(--repair)] font-medium flex items-center gap-2">
          <span className="text-base">⚠️</span>
          Cloudinary is not configured — image uploads won't work until <code className="font-mono">VITE_CLOUDINARY_CLOUD_NAME</code> is set in <code className="font-mono">frontend/.env</code>.
        </div>
      )}

      {/* Device metadata */}
      <div>
        <p className="text-sm font-semibold text-[var(--text)] mb-1">Device details</p>
        <p className="text-xs text-[var(--text-muted)] mb-4">Tell buyers exactly what they're getting.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Device type" id="cr-dt">
            <select id="cr-dt" value={deviceType} onChange={(e) => setDeviceType(e.target.value)} className="input-field">
              {DEVICE_TYPES.map((d) => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
            </select>
          </Field>
          <Field label="Brand" id="cr-b" note="Required">
            <input id="cr-b" value={brand} onChange={(e) => setBrand(e.target.value)} className="input-field" placeholder="e.g. Samsung, Apple, Lenovo" />
          </Field>
          <Field label="Model name" id="cr-mn" note="Required">
            <input id="cr-mn" value={modelName} onChange={(e) => setModelName(e.target.value)} className="input-field" placeholder="e.g. Galaxy S21, iPhone 13" />
          </Field>
          <Field label="Listing title" id="cr-t" note="Required">
            <input id="cr-t" value={title} onChange={(e) => setTitle(e.target.value)} className="input-field" placeholder="e.g. Galaxy S21 – cracked screen" />
          </Field>
          <Field label="Description" id="cr-d" className="sm:col-span-2" note="Optional">
            <textarea id="cr-d" value={description} onChange={(e) => setDescription(e.target.value)} className="input-field h-20 resize-none text-sm" placeholder="Describe the condition, what works, what doesn't…" />
          </Field>
        </div>
      </div>

      {/* Listing type toggle */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-[var(--text)]">What are you listing?</p>
        <div className="flex gap-2">
          {['whole_device', 'parts'].map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => setListingType(t)}
              className={`btn text-sm ${listingType === t ? 'btn-primary' : 'btn-outline'}`}
            >
              {t === 'whole_device' ? 'Whole device' : 'Parts only'}
            </button>
          ))}
        </div>
      </div>

      {/* Whole device */}
      {listingType === 'whole_device' && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Asking price (₹)" id="cr-p" note="Required">
              <input id="cr-p" type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} className="input-field" placeholder="e.g. 15000" />
            </Field>
            <Field label="Condition" id="cr-c">
              <select id="cr-c" value={condition} onChange={(e) => setCondition(e.target.value)} className="input-field">
                {CONDITIONS.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Photos" id="cr-f" note="Required — at least one">
            <ImageUploadZone
              id="cr-f"
              files={wholeFiles}
              previews={wholePreviews}
              onChange={(files, previews) => { setWholeFiles(files); setWholePreviews(previews); }}
            />
          </Field>
        </div>
      )}

      {/* Parts */}
      {listingType === 'parts' && (
        <div className="space-y-4">
          <p className="text-xs text-[var(--text-muted)]">List each salvageable component separately so buyers can find exactly what they need.</p>
          {parts.map((p, idx) => (
            <div key={p.part_id} className="p-5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-[var(--text)]">Part {idx + 1}</p>
                {parts.length > 1 && (
                  <button type="button" onClick={() => setParts((ps) => ps.filter((x) => x.part_id !== p.part_id))} className="text-xs text-[var(--recycle)] hover:underline">
                    Remove
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="Component type" id={`cat-${p.part_id}`}>
                  <select id={`cat-${p.part_id}`} value={p.category} onChange={(e) => updatePart(p.part_id, { category: e.target.value })} className="input-field text-sm">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
                  </select>
                </Field>
                <Field label="Condition" id={`cond-${p.part_id}`}>
                  <select id={`cond-${p.part_id}`} value={p.condition} onChange={(e) => updatePart(p.part_id, { condition: e.target.value })} className="input-field text-sm">
                    {CONDITIONS.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
                  </select>
                </Field>
                <Field label="Price (₹)" id={`price-${p.part_id}`} note="Required">
                  <input id={`price-${p.part_id}`} type="number" min="0" value={p.price_inr} onChange={(e) => updatePart(p.part_id, { price_inr: e.target.value })} className="input-field text-sm" placeholder="e.g. 1000" />
                </Field>
              </div>
              <Field label="Compatible with" id={`models-${p.part_id}`} note="Optional">
                <input id={`models-${p.part_id}`} value={p.compatible_models} onChange={(e) => updatePart(p.part_id, { compatible_models: e.target.value })} className="input-field text-sm" placeholder="e.g. Galaxy S21, S21+" />
              </Field>
              <Field label="Photos" id={`photos-${p.part_id}`} note="Optional">
                <ImageUploadZone
                  id={`photos-${p.part_id}`}
                  files={p.files}
                  previews={p.previews}
                  onChange={(files, previews) => updatePart(p.part_id, { files, previews })}
                />
              </Field>
            </div>
          ))}
          <button type="button" onClick={() => setParts((ps) => [...ps, newPart()])} className="btn btn-outline text-sm">
            + Add another part
          </button>
        </div>
      )}

      {/* Upload progress indicator */}
      {uploadProgress === 'uploading' && (
        <div className="flex items-center gap-2 text-xs text-[var(--accent)] font-medium">
          <span className="animate-spin inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full" />
          Uploading photos to Cloudinary…
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-[var(--recycle)] bg-[var(--recycle-dim,#fee2e2)] px-4 py-3 text-xs text-[var(--recycle)] font-medium">
          {error}
        </div>
      )}

      <div className="pt-2 flex justify-end">
        <button type="submit" disabled={submitting} className="btn btn-warm">
          {submitting ? 'Publishing…' : 'Publish listing →'}
        </button>
      </div>
    </form>
  );
}
