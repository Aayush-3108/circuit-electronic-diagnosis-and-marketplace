import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateListingStatus, deleteListing, createOrGetConversation } from '../api';
import { CONDITION_LABEL } from './ListingCard';
import { ChatIcon } from './Icons';

export default function ListingPage({ listing, onClose, onChanged, onChatStarted }) {
  const { user } = useAuth();
  const isOwner = user && user.uid === listing.seller_uid;
  const [busy, setBusy] = useState(false);
  const [activeImage, setActiveImage] = useState(null);

  async function handleMarkSold() {
    setBusy(true);
    try {
      const idToken = await user.getIdToken();
      const updated = await updateListingStatus(listing.id, 'sold', idToken);
      onChanged(updated);
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this listing permanently?')) return;
    setBusy(true);
    try {
      const idToken = await user.getIdToken();
      await deleteListing(listing.id, idToken);
      onChanged(null);
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleChat() {
    if (!user) {
      alert("Please sign in to chat with the seller.");
      return;
    }
    setBusy(true);
    try {
      const idToken = await user.getIdToken();
      const conversation = await createOrGetConversation({
        listingId: listing.id,
        sellerUid: listing.seller_uid
      }, idToken);
      onChatStarted(conversation);
    } catch (e) {
      alert("Error starting chat: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  const galleryImages = listing.listing_type === 'whole_device'
    ? listing.images
    : listing.parts.reduce((acc, p) => [...acc, ...p.images], []);

  const primaryImage = activeImage || galleryImages[0];

  return (
    <div className="w-full relative tech-bracket card p-6 md:p-8 space-y-6 bg-[var(--surface)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <button onClick={onClose} className="btn btn-ghost p-1 text-xs mb-4 border border-[var(--border)] px-3 py-1 rounded-lg">
            ← Back to Marketplace
          </button>
          <div className="flex items-center gap-2 mb-1.5 mt-2">
            <span className="text-xs uppercase tracking-wider text-[var(--accent)] font-semibold">
              {listing.listing_type === 'whole_device' ? 'Complete Device' : 'Modular Components'}
            </span>
            {listing.status !== 'active' && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--recycle-dim)] text-[var(--recycle)] border border-[var(--recycle)]/30 font-semibold">
                Sold
              </span>
            )}
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-[var(--text)] leading-tight">{listing.title}</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">{listing.brand} · {listing.model_name}</p>
        </div>
      </div>

      {/* Description */}
      {listing.description && (
        <p className="text-sm text-[var(--text-muted)] leading-relaxed bg-[var(--surface-2)] p-4 rounded-[var(--radius-sm)] border border-[var(--border-subtle)]">
          {listing.description}
        </p>
      )}

      {/* Image & Price layout for Whole Device */}
      {listing.listing_type === 'whole_device' ? (
        <div className="space-y-4">
          {galleryImages.length > 0 && (
            <div className="space-y-2">
              <div className="aspect-[16/9] rounded-[var(--radius-sm)] overflow-hidden border border-[var(--border)] bg-[var(--surface-2)]">
                <img
                  src={primaryImage}
                  alt="Device visual overview"
                  className="w-full h-full object-contain"
                />
              </div>
              {galleryImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto py-1">
                  {galleryImages.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImage(img)}
                      className={`w-20 h-20 rounded-[var(--radius-sm)] overflow-hidden border transition-all ${
                        primaryImage === img ? 'border-[var(--accent)] scale-95' : 'border-[var(--border)] hover:border-[var(--text-dim)]'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4 items-stretch">
            <div className="card p-4 flex flex-col justify-center rounded-[var(--radius-sm)]">
              <p className="font-mono text-[9px] text-[var(--text-dim)] uppercase tracking-wider mb-1">[STATE_CONDITION]</p>
              <p className="font-semibold text-base">{CONDITION_LABEL[listing.condition]}</p>
            </div>
            <div className="card p-4 flex flex-col justify-center items-end bg-[var(--accent-dim)] border-[var(--accent)] rounded-[var(--radius-sm)]">
              <p className="font-mono text-[9px] text-[var(--accent)] uppercase tracking-wider mb-1">[EXCHANGE_PRICE]</p>
              <p className="font-mono text-3xl font-bold text-[var(--sell)]">₹{listing.price_inr.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>
      ) : (
        /* Parts listing details layout */
        <div className="space-y-3">
          <p className="font-mono text-[9px] text-[var(--text-muted)] uppercase tracking-wider">[INVENTORY_ITEMS]</p>
          {listing.parts.map((p) => (
            <div key={p.part_id} className="card p-4 flex flex-col sm:flex-row gap-4 items-start border-[var(--border-subtle)] rounded-[var(--radius-sm)] bg-[var(--surface-2)]">
              {p.images[0] && (
                <img src={p.images[0]} alt={p.category} className="w-24 h-24 rounded-[var(--radius-sm)] object-cover border border-[var(--border)] flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex justify-between items-start">
                  <p className="font-semibold text-base capitalize text-[var(--text)]">{p.category.replaceAll('_', ' ')}</p>
                  <p className="font-mono text-xl font-bold text-[var(--sell)]">₹{p.price_inr.toLocaleString('en-IN')}</p>
                </div>
                <p className="font-mono text-[10px] px-2 py-0.5 rounded-[var(--radius-sm)] bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--border-subtle)] inline-block uppercase">
                  {CONDITION_LABEL[p.condition]}
                </p>
                {p.compatible_models && (
                  <p className="text-sm text-[var(--text-dim)]">Compatible: {p.compatible_models}</p>
                )}
                {p.description && <p className="text-sm text-[var(--text-muted)] leading-normal mt-1">{p.description}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer / Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-[var(--border-subtle)] pt-5">
        <div className="space-y-3">
          <p className="text-xs text-[var(--text-dim)]">
            Seller: <span className="text-[var(--text-muted)] font-medium">{listing.seller_email || 'Verified Community Member'}</span>
          </p>
          {!isOwner && listing.status === 'active' && (
            <button
              onClick={handleChat}
              disabled={busy}
              className="btn btn-primary text-sm px-6 py-2.5 flex items-center gap-2"
            >
              <ChatIcon className="w-4 h-4" />
              <span>Message Seller</span>
            </button>
          )}
        </div>

        {isOwner && listing.status === 'active' && (
          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleMarkSold}
              disabled={busy}
              className="btn btn-primary text-xs"
            >
              Mark as Sold
            </button>
            <button
              onClick={handleDelete}
              disabled={busy}
              className="btn text-xs text-[var(--recycle)] border-[var(--recycle)]/30 hover:bg-[var(--recycle-dim)]"
            >
              Delete Listing
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
